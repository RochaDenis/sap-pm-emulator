/**
 * AUFK + AFKO (Ordem de Manutenção) — Integration Tests
 * Jest + Supertest against the Express app
 *
 * Minimum 14 tests covering all CRUD + business rules.
 */
const request = require('supertest');
const app = require('../../server');
const { db } = require('../database');

const BASE = '/sap/opu/odata/sap/PM_ORDER_SRV/AUFKSet';

// Track created AUFNR for later tests
let createdAUFNR_PM01 = null;
let createdAUFNR_PM02 = null;
let testQMNUM = null;

beforeAll(() => {
  // Clean slate — disable FK checks to clear dependent tables safely
  db.pragma('foreign_keys = OFF');
  db.prepare('DELETE FROM AFKO').run();
  db.prepare('DELETE FROM AUFK').run();
  db.prepare('DELETE FROM QMEL').run();
  db.prepare('DELETE FROM EQUI').run();
  db.prepare('DELETE FROM IFLOT').run();
  db.pragma('foreign_keys = ON');

  // Insert prerequisite IFLOT record (FK target)
  db.prepare(`
    INSERT INTO IFLOT (TPLNR, PLTXT, IWERK, SWERK, BUKRS, ERDAT, FLTYP)
    VALUES ('FL-TEST-001', 'Linha de Produção Teste', '1000', '1000', '1000', '20260310', 'M')
  `).run();

  // Insert prerequisite EQUI record (FK target)
  db.prepare(`
    INSERT INTO EQUI (EQUNR, EQTXT, TPLNR, IWERK, BUKRS, ERDAT, EQART)
    VALUES ('EQ-TEST-001', 'Bomba Centrífuga Teste', 'FL-TEST-001', '1000', '1000', '20260310', 'BOMB')
  `).run();

  // Insert prerequisite QMEL record (for QMNUM FK and status update test)
  db.prepare(`
    INSERT INTO QMEL (QMNUM, QMART, QMTXT, EQUNR, TPLNR, IWERK, PRIOK, ERDAT, QMST)
    VALUES ('QM-TEST-001', 'M1', 'Vazamento na bomba centrífuga', 'EQ-TEST-001', 'FL-TEST-001', '1000', '1', '20260310', 'ABER')
  `).run();
  testQMNUM = 'QM-TEST-001';
});

afterAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare('DELETE FROM AFKO').run();
  db.prepare('DELETE FROM AUFK').run();
  db.prepare('DELETE FROM QMEL').run();
  db.prepare('DELETE FROM EQUI').run();
  db.prepare('DELETE FROM IFLOT').run();
  db.pragma('foreign_keys = ON');
});

describe('AUFKSet CRUD', () => {
  // ── 1. POST PM01 valid → 201 + auto AUFNR ─────────────────────────
  test('POST valid PM01 order returns 201 with auto-generated AUFNR', async () => {
    const res = await request(app).post(BASE).send({
      AUART: 'PM01',
      AUTXT: 'Reparo emergencial na bomba centrífuga',
      EQUNR: 'EQ-TEST-001',
      TPLNR: 'FL-TEST-001',
      IWERK: '1000',
      PRIOK: '1',
      ERNAM: 'TESTUSER',
      GSTRP: '20260310',
      GLTRP: '20260315',
    });
    expect(res.status).toBe(201);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.AUFNR).toMatch(/^ORD-\d{8}-\d{4}$/);
    expect(res.body.d.AUART).toBe('PM01');
    expect(res.body.d.AUFST).toBe('CRTD');
    expect(res.body.d.EQTXT).toBe('Bomba Centrífuga Teste');
    expect(res.body.d.PLTXT).toBe('Linha de Produção Teste');
    createdAUFNR_PM01 = res.body.d.AUFNR;
  });

  // ── 2. POST PM02 valid → 201 ──────────────────────────────────────
  test('POST valid PM02 order returns 201', async () => {
    const res = await request(app).post(BASE).send({
      AUART: 'PM02',
      AUTXT: 'Manutenção preventiva programada',
      EQUNR: 'EQ-TEST-001',
      TPLNR: 'FL-TEST-001',
      IWERK: '1000',
      PRIOK: '2',
      GSTRP: '20260320',
      GLTRP: '20260325',
    });
    expect(res.status).toBe(201);
    expect(res.body.d.AUART).toBe('PM02');
    expect(res.body.d.AUFNR).toMatch(/^ORD-\d{8}-\d{4}$/);
    createdAUFNR_PM02 = res.body.d.AUFNR;
  });

  // ── 3. POST invalid AUART → 400 ───────────────────────────────────
  test('POST with invalid AUART returns 400', async () => {
    const res = await request(app).post(BASE).send({
      AUART: 'XX',
      AUTXT: 'Ordem inválida',
      EQUNR: 'EQ-TEST-001',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 4. POST invalid EQUNR (not found) → 400 ──────────────────────
  test('POST with non-existent EQUNR returns 400', async () => {
    const res = await request(app).post(BASE).send({
      AUART: 'PM01',
      AUTXT: 'Equipamento inexistente',
      EQUNR: 'EQ-NONEXISTENT',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 5. POST with QMNUM → QMEL status updated to INEX ─────────────
  test('POST with QMNUM updates QMEL status to INEX', async () => {
    const res = await request(app).post(BASE).send({
      AUART: 'PM01',
      AUTXT: 'Ordem gerada a partir de nota',
      EQUNR: 'EQ-TEST-001',
      TPLNR: 'FL-TEST-001',
      IWERK: '1000',
      PRIOK: '1',
      QMNUM: testQMNUM,
      GSTRP: '20260311',
      GLTRP: '20260318',
    });
    expect(res.status).toBe(201);
    expect(res.body.d.QMNUM).toBe(testQMNUM);
    expect(res.body.d.QMTXT).toBe('Vazamento na bomba centrífuga');

    // Verify QMEL status was updated
    const qmel = db.prepare('SELECT QMST FROM QMEL WHERE QMNUM = ?').get(testQMNUM);
    expect(qmel.QMST).toBe('INEX');
  });

  // ── 6. POST invalid date range → 400 ──────────────────────────────
  test('POST with GSTRP after GLTRP returns 400', async () => {
    const res = await request(app).post(BASE).send({
      AUART: 'PM01',
      AUTXT: 'Datas inválidas',
      EQUNR: 'EQ-TEST-001',
      GSTRP: '20260320',
      GLTRP: '20260310',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 7. GET list → d.results ────────────────────────────────────────
  test('GET list returns 200 with d.results array', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(Array.isArray(res.body.d.results)).toBe(true);
    expect(res.body.d.results.length).toBeGreaterThanOrEqual(2);
    // Verify joined data is present
    expect(res.body.d.results[0].EQTXT).toBeDefined();
  });

  // ── 8. GET with $filter AUFST ──────────────────────────────────────
  test('GET with $filter AUFST eq CRTD returns matching records', async () => {
    const res = await request(app).get(`${BASE}?$filter=AUFST eq 'CRTD'`);
    expect(res.status).toBe(200);
    expect(res.body.d.results.length).toBeGreaterThanOrEqual(1);
    res.body.d.results.forEach((r) => {
      expect(r.AUFST).toBe('CRTD');
    });
  });

  // ── 9. GET with $filter AUART ──────────────────────────────────────
  test('GET with $filter AUART eq PM01 returns matching records', async () => {
    const res = await request(app).get(`${BASE}?$filter=AUART eq 'PM01'`);
    expect(res.status).toBe(200);
    expect(res.body.d.results.length).toBeGreaterThanOrEqual(1);
    res.body.d.results.forEach((r) => {
      expect(r.AUART).toBe('PM01');
    });
  });

  // ── 10. GET single → d object + joined AFKO ───────────────────────
  test('GET single order returns 200 with d object and joined AFKO data', async () => {
    const res = await request(app).get(`${BASE}('${createdAUFNR_PM01}')`);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.AUFNR).toBe(createdAUFNR_PM01);
    expect(res.body.d.EQTXT).toBe('Bomba Centrífuga Teste');
    expect(res.body.d.PLTXT).toBe('Linha de Produção Teste');
    // AFKO fields are inline
    expect(res.body.d).toHaveProperty('GMNGA');
  });

  // ── 11. GET non-existent → 404 ────────────────────────────────────
  test('GET non-existent order returns 404', async () => {
    const res = await request(app).get(`${BASE}('ORD-00000000-9999')`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ── 12. PATCH CRTD→REL → 200 ──────────────────────────────────────
  test('PATCH status transition CRTD→REL returns 200', async () => {
    const res = await request(app)
      .patch(`${BASE}('${createdAUFNR_PM01}')`)
      .send({ AUFST: 'REL' });
    expect(res.status).toBe(200);
    expect(res.body.d.AUFST).toBe('REL');
  });

  // ── 13. PATCH invalid transition → 400 ────────────────────────────
  test('PATCH invalid status transition REL→CRTD returns 400', async () => {
    const res = await request(app)
      .patch(`${BASE}('${createdAUFNR_PM01}')`)
      .send({ AUFST: 'CRTD' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 14. DELETE → 204 (AUFK + AFKO deleted) ────────────────────────
  test('DELETE order returns 204 and removes both AUFK and AFKO', async () => {
    const res = await request(app).delete(`${BASE}('${createdAUFNR_PM02}')`);
    expect(res.status).toBe(204);

    // Verify both AUFK and AFKO are deleted
    const aufk = db.prepare('SELECT * FROM AUFK WHERE AUFNR = ?').get(createdAUFNR_PM02);
    const afko = db.prepare('SELECT * FROM AFKO WHERE AUFNR = ?').get(createdAUFNR_PM02);
    expect(aufk).toBeUndefined();
    expect(afko).toBeUndefined();
  });
});
