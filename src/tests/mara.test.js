/**
 * MARA (Materiais) — Integration Tests
 * Jest + Supertest against the Express app
 *
 * Minimum 5 MARA tests covering CRUD + business rules.
 */
const request = require('supertest');
const app = require('../../server');
const { db } = require('../database');

const BASE = '/sap/opu/odata/sap/PM_MATERIAL_SRV/MARASet';

let createdMATNR = null;
let cleanMatnr = 'TEST-MAT-CLEAN';
let inUseMatnr = 'TEST-MAT-INUSE';

beforeAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare("DELETE FROM MARA WHERE MATNR GLOB 'MAT-[0-9][0-9][0-9][0-9]'").run();
  
  // Clean up any previous test executions
  db.prepare("DELETE FROM RESB WHERE MATNR LIKE 'TEST-MAT-%'").run();
  db.prepare("DELETE FROM MSEG WHERE MATNR LIKE 'TEST-MAT-%'").run();
  db.prepare("DELETE FROM MARA WHERE MATNR LIKE 'TEST-MAT-%'").run();

  // Create clean MATNR
  db.prepare(`INSERT INTO MARA (MATNR, MAKTX, MATL_TYPE, MEINS, MATKL) VALUES (?, 'Clean Material', 'ERSA', 'EA', 'TEST')`).run(cleanMatnr);

  // Create in-use MATNR
  db.prepare(`INSERT INTO MARA (MATNR, MAKTX, MATL_TYPE, MEINS, MATKL) VALUES (?, 'In Use Material', 'ERSA', 'EA', 'TEST')`).run(inUseMatnr);
  
  // Add reference in RESB for in-use MATNR
  db.prepare(`INSERT INTO RESB (RSNUM, MATNR, BDMNG, MEINS) VALUES ('RS-TEST', ?, 1, 'EA')`).run(inUseMatnr);

  db.pragma('foreign_keys = ON');
});

afterAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare("DELETE FROM MARA WHERE MATNR GLOB 'MAT-[0-9][0-9][0-9][0-9]'").run();
  db.prepare("DELETE FROM MARA WHERE MATNR GLOB 'MAT-[0NaN]'").run();

  db.prepare("DELETE FROM RESB WHERE MATNR LIKE 'TEST-MAT-%'").run();
  db.prepare("DELETE FROM MSEG WHERE MATNR LIKE 'TEST-MAT-%'").run();
  db.prepare("DELETE FROM MARA WHERE MATNR LIKE 'TEST-MAT-%'").run();

  db.pragma('foreign_keys = ON');
});

describe('MARASet CRUD', () => {
  // ── 1. GET MARASet list ─────────────────────────────────────────────
  test('GET list returns 200 with d.results array', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(Array.isArray(res.body.d.results)).toBe(true);
  });

  // ── 2. POST MARA valid + auto MATNR ────────────────────────────────
  test('POST valid material returns 201 with auto-generated MATNR', async () => {
    const res = await request(app).post(BASE).send({
      MAKTX: 'Rolamento SKF 6205',
      MATL_TYPE: 'ERSA',
      MEINS: 'EA',
      MATKL: 'ROLAMENTOS',
      BRGEW: 0.12,
      NTGEW: 0.10,
      GEWEI: 'KG',
    });
    expect(res.status).toBe(201);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.MATNR).toMatch(/^MAT-\d{4}$/);
    expect(res.body.d.MATL_TYPE).toBe('ERSA');
    expect(res.body.d.MEINS).toBe('EA');
    createdMATNR = res.body.d.MATNR;
  });

  // ── 3. GET MARASet single ───────────────────────────────────────────
  test('GET single material returns 200 with d object', async () => {
    const res = await request(app).get(`${BASE}('${createdMATNR}')`);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.MATNR).toBe(createdMATNR);
    expect(res.body.d.MAKTX).toBe('Rolamento SKF 6205');
  });

  // ── 4. POST MARA invalid MEINS → 400 ──────────────────────────────
  test('POST with invalid MEINS returns 400', async () => {
    const res = await request(app).post(BASE).send({
      MAKTX: 'Material com unidade inválida',
      MATL_TYPE: 'ERSA',
      MEINS: 'INVALID',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 5. DELETE clean MATNR → 204 ────────────────────────────────────
  test('DELETE clean material returns 204', async () => {
    const res = await request(app).delete(`${BASE}('${cleanMatnr}')`);
    expect(res.status).toBe(204);

    // Verify deleted
    const row = db.prepare('SELECT * FROM MARA WHERE MATNR = ?').get(cleanMatnr);
    expect(row).toBeUndefined();
  });

  // ── 6. DELETE MATNR with FK references → 400 ────────────────────────
  test('DELETE material with references returns 400', async () => {
    const res = await request(app).delete(`${BASE}('${inUseMatnr}')`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('DEPENDENCY_EXISTS');
    expect(res.body.error.message.value).toBe('Material possui reservas ou movimentações vinculadas');
    
    // Verify it was NOT deleted
    const row = db.prepare('SELECT * FROM MARA WHERE MATNR = ?').get(inUseMatnr);
    expect(row).toBeDefined();
  });
});
