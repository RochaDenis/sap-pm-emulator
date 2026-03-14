/**
 * MSEG (Movimentações de Material) — Integration Tests
 * Jest + Supertest against the Express app
 *
 * Minimum 5 MSEG tests covering CRUD + business rules.
 */
const request = require('supertest');
const app = require('../../server');
const { db } = require('../database');

const BASE = '/sap/opu/odata/sap/PM_MATERIAL_SRV/MSEGSet';

let createdMBLNR = null;
let createdMBLNR2 = null;
let testAUFNR = null;
let testMATNR = null;
let testRSNUM = null;

beforeAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare("DELETE FROM MSEG WHERE AUFNR LIKE 'AUFNR-MSEG-%'").run();
  db.prepare("DELETE FROM RESB WHERE RSNUM LIKE 'RES-MSEG-%'").run();
  db.prepare("DELETE FROM AFKO WHERE AUFNR LIKE 'AUFNR-MSEG-%'").run();
  db.prepare("DELETE FROM AUFK WHERE AUFNR LIKE 'AUFNR-MSEG-%'").run();
  db.prepare("DELETE FROM MARA WHERE MATNR LIKE 'MAT-MSEG-%'").run();
  db.prepare("DELETE FROM EQUI WHERE EQUNR = 'EQ-MSEG-001'").run();
  db.prepare("DELETE FROM IFLOT WHERE TPLNR = 'FL-MSEG-001'").run();
  db.pragma('foreign_keys = ON');

  // Insert prerequisite IFLOT
  db.prepare(`
    INSERT INTO IFLOT (TPLNR, PLTXT, IWERK, SWERK, BUKRS, ERDAT, FLTYP)
    VALUES ('FL-MSEG-001', 'Linha Movimentação Teste', '1000', '1000', '1000', '20260311', 'M')
  `).run();

  // Insert prerequisite EQUI
  db.prepare(`
    INSERT INTO EQUI (EQUNR, EQTXT, TPLNR, IWERK, BUKRS, ERDAT, EQART)
    VALUES ('EQ-MSEG-001', 'Motor Teste Movimentação', 'FL-MSEG-001', '1000', '1000', '20260311', 'MOTR')
  `).run();

  // Insert prerequisite AUFK + AFKO
  db.prepare(`
    INSERT INTO AUFK (AUFNR, AUART, AUTXT, EQUNR, IWERK, ERDAT, AUFST)
    VALUES ('AUFNR-MSEG-001', 'PM01', 'Ordem Teste Movimentação', 'EQ-MSEG-001', '1000', '20260311', 'CRTD')
  `).run();
  db.prepare(`
    INSERT INTO AFKO (AUFNR, IWERK)
    VALUES ('AUFNR-MSEG-001', '1000')
  `).run();
  testAUFNR = 'AUFNR-MSEG-001';

  // Insert prerequisite MARA
  db.prepare(`
    INSERT INTO MARA (MATNR, MAKTX, MATL_TYPE, MEINS, MATKL)
    VALUES ('MAT-MSEG-001', 'Filtro de Óleo Teste', 'ERSA', 'EA', 'FILTROS')
  `).run();
  testMATNR = 'MAT-MSEG-001';

  // Insert prerequisite RESB (to test ENMNG update)
  db.prepare(`
    INSERT INTO RESB (RSNUM, AUFNR, MATNR, BDMNG, ENMNG, MEINS, LGORT)
    VALUES ('RES-MSEG-TEST-0001', 'AUFNR-MSEG-001', 'MAT-MSEG-001', 10, 0, 'EA', '0001')
  `).run();
  testRSNUM = 'RES-MSEG-TEST-0001';
});

afterAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare("DELETE FROM MSEG WHERE AUFNR LIKE 'AUFNR-MSEG-%'").run();
  db.prepare("DELETE FROM RESB WHERE RSNUM LIKE 'RES-MSEG-%'").run();
  db.prepare("DELETE FROM AFKO WHERE AUFNR LIKE 'AUFNR-MSEG-%'").run();
  db.prepare("DELETE FROM AUFK WHERE AUFNR LIKE 'AUFNR-MSEG-%'").run();
  db.prepare("DELETE FROM MARA WHERE MATNR LIKE 'MAT-MSEG-%'").run();
  db.prepare("DELETE FROM EQUI WHERE EQUNR = 'EQ-MSEG-001'").run();
  db.prepare("DELETE FROM IFLOT WHERE TPLNR = 'FL-MSEG-001'").run();
  db.pragma('foreign_keys = ON');
});

describe('MSEGSet CRUD', () => {
  // ── 1. POST MSEG BWART 261 → RESB.ENMNG updated ──────────────────
  test('POST goods issue (BWART 261) returns 201 and updates RESB.ENMNG', async () => {
    const res = await request(app).post(BASE).send({
      AUFNR: testAUFNR,
      MATNR: testMATNR,
      MENGE: 3,
      MEINS: 'EA',
      BWART: '261',
      LGORT: '0001',
      WERKS: '1000',
    });
    expect(res.status).toBe(201);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.MBLNR).toMatch(/^MOV-\d{8}-\d{4}$/);
    expect(res.body.d.BWART).toBe('261');
    expect(res.body.d.MAKTX).toBe('Filtro de Óleo Teste');
    expect(res.body.d.AUTXT).toBe('Ordem Teste Movimentação');
    expect(res.body.d.BUDAT).toMatch(/^\d{8}$/);
    createdMBLNR = res.body.d.MBLNR;

    // Verify RESB.ENMNG was updated
    const resb = db.prepare('SELECT ENMNG FROM RESB WHERE RSNUM = ?').get(testRSNUM);
    expect(resb.ENMNG).toBe(3);
  });

  // ── 2. POST MSEG invalid BWART → 400 ──────────────────────────────
  test('POST with invalid BWART returns 400', async () => {
    const res = await request(app).post(BASE).send({
      AUFNR: testAUFNR,
      MATNR: testMATNR,
      MENGE: 1,
      BWART: '999',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 3. POST MSEG invalid AUFNR → 400 ──────────────────────────────
  test('POST with non-existent AUFNR returns 400', async () => {
    const res = await request(app).post(BASE).send({
      AUFNR: 'AUFNR-NONEXISTENT',
      MATNR: testMATNR,
      MENGE: 1,
      BWART: '261',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 4. GET MSEGSet filter by BWART ────────────────────────────────
  test('GET with $filter BWART eq 261 returns matching records', async () => {
    const res = await request(app).get(`${BASE}?$filter=BWART eq '261'`);
    expect(res.status).toBe(200);
    expect(res.body.d.results.length).toBeGreaterThanOrEqual(1);
    res.body.d.results.forEach((r) => {
      expect(r.BWART).toBe('261');
      expect(r.MAKTX).toBeDefined();
    });
  });

  // ── 5. POST second movement for delete test ───────────────────────
  test('POST second movement for delete test', async () => {
    const res = await request(app).post(BASE).send({
      AUFNR: testAUFNR,
      MATNR: testMATNR,
      MENGE: 2,
      MEINS: 'EA',
      BWART: '262',
      LGORT: '0001',
      WERKS: '1000',
    });
    expect(res.status).toBe(201);
    createdMBLNR2 = res.body.d.MBLNR;
  });

  // ── 6. DELETE MSEG → 204 ──────────────────────────────────────────
  test('DELETE movement document returns 204', async () => {
    const res = await request(app).delete(`${BASE}('${createdMBLNR2}')`);
    expect(res.status).toBe(204);

    // Verify deleted
    const row = db.prepare('SELECT * FROM MSEG WHERE MBLNR = ?').get(createdMBLNR2);
    expect(row).toBeUndefined();
  });
});
