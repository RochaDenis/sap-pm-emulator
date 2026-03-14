/**
 * RESB (Reservas de Material) — Integration Tests
 * Jest + Supertest against the Express app
 *
 * Minimum 5 RESB tests covering CRUD + business rules.
 */
const request = require('supertest');
const app = require('../../server');
const { db } = require('../database');

const BASE = '/sap/opu/odata/sap/PM_MATERIAL_SRV/RESBSet';

let createdRSNUM = null;
let testMATNR = null;
let testAUFNR = null;

beforeAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare("DELETE FROM RESB WHERE AUFNR LIKE 'AUFNR-RESB-%'").run();
  db.prepare("DELETE FROM MSEG WHERE AUFNR LIKE 'AUFNR-RESB-%'").run();
  db.prepare("DELETE FROM AFKO WHERE AUFNR LIKE 'AUFNR-RESB-%'").run();
  db.prepare("DELETE FROM AUFK WHERE AUFNR LIKE 'AUFNR-RESB-%'").run();
  db.prepare("DELETE FROM MARA WHERE MATNR LIKE 'MAT-RESB-%'").run();
  db.prepare("DELETE FROM EQUI WHERE EQUNR = 'EQ-RESB-001'").run();
  db.prepare("DELETE FROM IFLOT WHERE TPLNR = 'FL-RESB-001'").run();
  db.pragma('foreign_keys = ON');

  // Insert prerequisite IFLOT
  db.prepare(`
    INSERT INTO IFLOT (TPLNR, PLTXT, IWERK, SWERK, BUKRS, ERDAT, FLTYP)
    VALUES ('FL-RESB-001', 'Linha Reserva Teste', '1000', '1000', '1000', '20260311', 'M')
  `).run();

  // Insert prerequisite EQUI
  db.prepare(`
    INSERT INTO EQUI (EQUNR, EQTXT, TPLNR, IWERK, BUKRS, ERDAT, EQART)
    VALUES ('EQ-RESB-001', 'Motor Teste Reserva', 'FL-RESB-001', '1000', '1000', '20260311', 'MOTR')
  `).run();

  // Insert prerequisite AUFK + AFKO
  db.prepare(`
    INSERT INTO AUFK (AUFNR, AUART, AUTXT, EQUNR, IWERK, ERDAT, AUFST)
    VALUES ('AUFNR-RESB-001', 'PM01', 'Ordem Teste Reserva', 'EQ-RESB-001', '1000', '20260311', 'CRTD')
  `).run();
  db.prepare(`
    INSERT INTO AFKO (AUFNR, IWERK)
    VALUES ('AUFNR-RESB-001', '1000')
  `).run();
  testAUFNR = 'AUFNR-RESB-001';

  // Insert prerequisite MARA
  db.prepare(`
    INSERT INTO MARA (MATNR, MAKTX, MATL_TYPE, MEINS, MATKL)
    VALUES ('MAT-RESB-001', 'Rolamento SKF 6205 Teste', 'ERSA', 'EA', 'ROLAMENTOS')
  `).run();
  testMATNR = 'MAT-RESB-001';
});

afterAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare("DELETE FROM RESB WHERE AUFNR LIKE 'AUFNR-RESB-%'").run();
  db.prepare("DELETE FROM MSEG WHERE AUFNR LIKE 'AUFNR-RESB-%'").run();
  db.prepare("DELETE FROM AFKO WHERE AUFNR LIKE 'AUFNR-RESB-%'").run();
  db.prepare("DELETE FROM AUFK WHERE AUFNR LIKE 'AUFNR-RESB-%'").run();
  db.prepare("DELETE FROM MARA WHERE MATNR LIKE 'MAT-RESB-%'").run();
  db.prepare("DELETE FROM EQUI WHERE EQUNR = 'EQ-RESB-001'").run();
  db.prepare("DELETE FROM IFLOT WHERE TPLNR = 'FL-RESB-001'").run();
  db.pragma('foreign_keys = ON');
});

describe('RESBSet CRUD', () => {
  // ── 1. POST RESB valid + auto RSNUM ────────────────────────────────
  test('POST valid reservation returns 201 with auto-generated RSNUM', async () => {
    const res = await request(app).post(BASE).send({
      AUFNR: testAUFNR,
      MATNR: testMATNR,
      BDMNG: 10,
      MEINS: 'EA',
      BDTER: '20260315',
      LGORT: '0001',
    });
    expect(res.status).toBe(201);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.RSNUM).toMatch(/^RES-\d{8}-\d{4}$/);
    expect(res.body.d.MAKTX).toBe('Rolamento SKF 6205 Teste');
    expect(res.body.d.AUTXT).toBe('Ordem Teste Reserva');
    expect(res.body.d.ENMNG).toBe(0);
    createdRSNUM = res.body.d.RSNUM;
  });

  // ── 2. POST RESB invalid AUFNR → 400 ──────────────────────────────
  test('POST with non-existent AUFNR returns 400', async () => {
    const res = await request(app).post(BASE).send({
      AUFNR: 'AUFNR-NONEXISTENT',
      MATNR: testMATNR,
      BDMNG: 5,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 3. POST RESB BDMNG = 0 → 400 ─────────────────────────────────
  test('POST with BDMNG = 0 returns 400', async () => {
    const res = await request(app).post(BASE).send({
      AUFNR: testAUFNR,
      MATNR: testMATNR,
      BDMNG: 0,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 4. GET RESBSet filter by AUFNR ────────────────────────────────
  test('GET with $filter AUFNR returns matching records', async () => {
    const res = await request(app).get(`${BASE}?$filter=AUFNR eq '${testAUFNR}'`);
    expect(res.status).toBe(200);
    expect(res.body.d.results.length).toBeGreaterThanOrEqual(1);
    res.body.d.results.forEach((r) => {
      expect(r.AUFNR).toBe(testAUFNR);
      expect(r.MAKTX).toBeDefined();
    });
  });

  // ── 5. PATCH RESB quantities update ───────────────────────────────
  test('PATCH reservation quantities returns 200', async () => {
    const res = await request(app)
      .patch(`${BASE}('${createdRSNUM}')`)
      .send({ BDMNG: 15, ENMNG: 5 });
    expect(res.status).toBe(200);
    expect(res.body.d.BDMNG).toBe(15);
    expect(res.body.d.ENMNG).toBe(5);
  });
});
