/**
 * QMEL (Maintenance Notification / Nota de Manutenção) — Integration Tests
 * Jest + Supertest against the Express app
 *
 * Minimum 12 tests covering all CRUD + business rules.
 */
const request = require('supertest');
const app = require('../../server');
const { db } = require('../database');

const BASE = '/sap/opu/odata/sap/PM_NOTIFICATION_SRV/QMELSet';

// Track created QMNUM for later tests
let createdQMNUM_M1 = null;
let createdQMNUM_M2 = null;

beforeAll(() => {
  // Clean slate — disable FK checks to clear dependent tables safely
  db.pragma('foreign_keys = OFF');
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
});

afterAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare('DELETE FROM QMEL').run();
  db.prepare('DELETE FROM EQUI').run();
  db.prepare('DELETE FROM IFLOT').run();
  db.pragma('foreign_keys = ON');
});

describe('QMELSet CRUD', () => {
  // ── 1. POST valid M1 → 201 + auto QMNUM ────────────────────────────
  test('POST valid M1 notification returns 201 with auto-generated QMNUM', async () => {
    const res = await request(app).post(BASE).send({
      QMART: 'M1',
      QMTXT: 'Vazamento na bomba centrífuga',
      EQUNR: 'EQ-TEST-001',
      TPLNR: 'FL-TEST-001',
      IWERK: '1000',
      PRIOK: '1',
      ERNAM: 'TESTUSER',
    });
    expect(res.status).toBe(201);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.QMNUM).toMatch(/^QM-\d{8}-\d{4}$/);
    expect(res.body.d.QMART).toBe('M1');
    expect(res.body.d.QMST).toBe('ABER');
    expect(res.body.d.EQTXT).toBe('Bomba Centrífuga Teste');
    expect(res.body.d.PLTXT).toBe('Linha de Produção Teste');
    createdQMNUM_M1 = res.body.d.QMNUM;
  });

  // ── 2. POST valid M2 → 201 ─────────────────────────────────────────
  test('POST valid M2 notification returns 201', async () => {
    const res = await request(app).post(BASE).send({
      QMART: 'M2',
      QMTXT: 'Manutenção preventiva programada',
      EQUNR: 'EQ-TEST-001',
      TPLNR: 'FL-TEST-001',
      IWERK: '1000',
      PRIOK: '2',
    });
    expect(res.status).toBe(201);
    expect(res.body.d.QMART).toBe('M2');
    expect(res.body.d.QMNUM).toMatch(/^QM-\d{8}-\d{4}$/);
    createdQMNUM_M2 = res.body.d.QMNUM;
  });

  // ── 3. POST invalid QMART → 400 ────────────────────────────────────
  test('POST with invalid QMART returns 400', async () => {
    const res = await request(app).post(BASE).send({
      QMART: 'XX',
      QMTXT: 'Nota inválida',
      EQUNR: 'EQ-TEST-001',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 4. POST invalid EQUNR (not found) → 400 ────────────────────────
  test('POST with non-existent EQUNR returns 400', async () => {
    const res = await request(app).post(BASE).send({
      QMART: 'M1',
      QMTXT: 'Equipamento inexistente',
      EQUNR: 'EQ-NONEXISTENT',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 5. GET list → d.results ─────────────────────────────────────────
  test('GET list returns 200 with d.results array', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(Array.isArray(res.body.d.results)).toBe(true);
    expect(res.body.d.results.length).toBeGreaterThanOrEqual(2);
    // Verify joined data is present
    expect(res.body.d.results[0].EQTXT).toBeDefined();
  });

  // ── 6. GET with $filter QMST ───────────────────────────────────────
  test('GET with $filter QMST eq ABER returns matching records', async () => {
    const res = await request(app).get(`${BASE}?$filter=QMST eq 'ABER'`);
    expect(res.status).toBe(200);
    expect(res.body.d.results.length).toBeGreaterThanOrEqual(1);
    res.body.d.results.forEach((r) => {
      expect(r.QMST).toBe('ABER');
    });
  });

  // ── 7. GET with $filter EQUNR ──────────────────────────────────────
  test('GET with $filter EQUNR eq EQ-TEST-001 returns matching records', async () => {
    const res = await request(app).get(`${BASE}?$filter=EQUNR eq 'EQ-TEST-001'`);
    expect(res.status).toBe(200);
    expect(res.body.d.results.length).toBeGreaterThanOrEqual(1);
    res.body.d.results.forEach((r) => {
      expect(r.EQUNR).toBe('EQ-TEST-001');
    });
  });

  // ── 8. GET single → d object ───────────────────────────────────────
  test('GET single notification returns 200 with d object and joined data', async () => {
    const res = await request(app).get(`${BASE}('${createdQMNUM_M1}')`);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.QMNUM).toBe(createdQMNUM_M1);
    expect(res.body.d.EQTXT).toBe('Bomba Centrífuga Teste');
    expect(res.body.d.PLTXT).toBe('Linha de Produção Teste');
  });

  // ── 9. GET non-existent → 404 ──────────────────────────────────────
  test('GET non-existent notification returns 404', async () => {
    const res = await request(app).get(`${BASE}('QM-00000000-9999')`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ── 10. PATCH status ABER→INEX → 200 ───────────────────────────────
  test('PATCH status transition ABER→INEX returns 200', async () => {
    const res = await request(app)
      .patch(`${BASE}('${createdQMNUM_M1}')`)
      .send({ QMST: 'INEX' });
    expect(res.status).toBe(200);
    expect(res.body.d.QMST).toBe('INEX');
  });

  // ── 11. PATCH invalid status transition → 400 ──────────────────────
  test('PATCH invalid status transition INEX→ABER returns 400', async () => {
    const res = await request(app)
      .patch(`${BASE}('${createdQMNUM_M1}')`)
      .send({ QMST: 'ABER' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 12. DELETE → 204 ───────────────────────────────────────────────
  test('DELETE notification returns 204', async () => {
    const res = await request(app).delete(`${BASE}('${createdQMNUM_M2}')`);
    expect(res.status).toBe(204);
  });
});
