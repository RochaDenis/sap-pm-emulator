/**
 * MMPT + PLPO (Plano de Manutenção + Roteiro) — Integration Tests
 * Jest + Supertest against the Express app
 *
 * Minimum 8 MMPT/PLPO tests covering CRUD + business rules.
 */
const request = require('supertest');
const app = require('../../server');
const { db } = require('../database');

const BASE = '/sap/opu/odata/sap/PM_MAINTPLAN_SRV/MMPTSet';
const PLPO_BASE = '/sap/opu/odata/sap/PM_MAINTPLAN_SRV/PLPOSet';

let createdWARPL = null;
let createdWARPL2 = null;

beforeAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare('DELETE FROM PLPO').run();
  db.prepare('DELETE FROM MMPT').run();
  db.prepare("DELETE FROM EQUI WHERE EQUNR = 'EQ-TEST-001'").run();
  db.prepare("DELETE FROM IFLOT WHERE TPLNR = 'FL-TEST-001'").run();
  db.pragma('foreign_keys = ON');

  // Insert prerequisite IFLOT
  db.prepare(`
    INSERT INTO IFLOT (TPLNR, PLTXT, IWERK, SWERK, BUKRS, ERDAT, FLTYP)
    VALUES ('FL-TEST-001', 'Linha de Produção Teste', '1000', '1000', '1000', '20260310', 'M')
  `).run();

  // Insert prerequisite EQUI
  db.prepare(`
    INSERT INTO EQUI (EQUNR, EQTXT, TPLNR, IWERK, BUKRS, ERDAT, EQART)
    VALUES ('EQ-TEST-001', 'Bomba Centrífuga Teste', 'FL-TEST-001', '1000', '1000', '20260310', 'BOMB')
  `).run();
});

afterAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare('DELETE FROM PLPO').run();
  db.prepare('DELETE FROM MMPT').run();
  db.prepare("DELETE FROM EQUI WHERE EQUNR = 'EQ-TEST-001'").run();
  db.prepare("DELETE FROM IFLOT WHERE TPLNR = 'FL-TEST-001'").run();
  db.pragma('foreign_keys = ON');
});

describe('MMPTSet + PLPOSet CRUD', () => {
  // ── 1. GET MMPTSet list ────────────────────────────────────────────
  test('GET list returns 200 with d.results array', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(Array.isArray(res.body.d.results)).toBe(true);
  });

  // ── 2. POST MMPT valid + auto WARPL + PLPO tasks ──────────────────
  test('POST valid plan with PLPO tasks returns 201 with auto WARPL', async () => {
    const res = await request(app).post(BASE).send({
      WPTXT: 'Plano preventivo bomba centrífuga',
      IWERK: '1000',
      EQUNR: 'EQ-TEST-001',
      TPLNR: 'FL-TEST-001',
      ZYKL1: 30,
      ZEINH: 'D',
      STRAT: 'ZP1',
      LPLDA: '20260310',
      PLPO_TASKS: [
        {
          PLNTY: 'A',
          PLNNR: 'PLN-001',
          PLNKN: '0010',
          LTXA1: 'Verificar vibração do motor',
          ARBPL: 'MEC01',
          VORNR: '0010',
          STEUS: 'PM01',
        },
        {
          PLNTY: 'A',
          PLNNR: 'PLN-002',
          PLNKN: '0020',
          LTXA1: 'Lubrificar rolamentos',
          ARBPL: 'MEC01',
          VORNR: '0020',
          STEUS: 'PM01',
        },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.WARPL).toMatch(/^MP-\d{8}-\d{4}$/);
    expect(res.body.d.ZYKL1).toBe(30);
    expect(res.body.d.NPLDA).toBe('20260409'); // 20260310 + 30 days
    expect(res.body.d.EQTXT).toBe('Bomba Centrífuga Teste');
    expect(res.body.d.PLTXT).toBe('Linha de Produção Teste');
    expect(Array.isArray(res.body.d.PLPO_TASKS)).toBe(true);
    expect(res.body.d.PLPO_TASKS.length).toBe(2);
    createdWARPL = res.body.d.WARPL;
  });

  // ── 3. GET MMPTSet single with PLPO joined ─────────────────────────
  test('GET single plan returns 200 with PLPO tasks joined', async () => {
    const res = await request(app).get(`${BASE}('${createdWARPL}')`);
    expect(res.status).toBe(200);
    expect(res.body.d.WARPL).toBe(createdWARPL);
    expect(res.body.d.EQTXT).toBe('Bomba Centrífuga Teste');
    expect(res.body.d.PLTXT).toBe('Linha de Produção Teste');
    expect(Array.isArray(res.body.d.PLPO_TASKS)).toBe(true);
    expect(res.body.d.PLPO_TASKS.length).toBe(2);
  });

  // ── 4. GET MMPTSet filter by EQUNR ─────────────────────────────────
  test('GET with $filter EQUNR returns matching records', async () => {
    const res = await request(app).get(`${BASE}?$filter=EQUNR eq 'EQ-TEST-001'`);
    expect(res.status).toBe(200);
    expect(res.body.d.results.length).toBeGreaterThanOrEqual(1);
    res.body.d.results.forEach((r) => {
      expect(r.EQUNR).toBe('EQ-TEST-001');
    });
  });

  // ── 5. POST MMPT invalid ZYKL1 → 400 ──────────────────────────────
  test('POST with invalid ZYKL1 returns 400', async () => {
    const res = await request(app).post(BASE).send({
      WPTXT: 'Plano com ciclo inválido',
      EQUNR: 'EQ-TEST-001',
      TPLNR: 'FL-TEST-001',
      ZYKL1: 45,
      ZEINH: 'D',
      STRAT: 'ZP1',
      IWERK: '1000',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 6. POST MMPT invalid EQUNR → 400 ──────────────────────────────
  test('POST with non-existent EQUNR returns 400', async () => {
    const res = await request(app).post(BASE).send({
      WPTXT: 'Plano com equipamento inexistente',
      EQUNR: 'EQ-NONEXISTENT',
      TPLNR: 'FL-TEST-001',
      ZYKL1: 30,
      ZEINH: 'D',
      STRAT: 'ZP1',
      IWERK: '1000',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 7. PATCH MMPT NPLDA recalculated ──────────────────────────────
  test('PATCH with new LPLDA recalculates NPLDA', async () => {
    const res = await request(app)
      .patch(`${BASE}('${createdWARPL}')`)
      .send({ LPLDA: '20260401' });
    expect(res.status).toBe(200);
    expect(res.body.d.LPLDA).toBe('20260401');
    expect(res.body.d.NPLDA).toBe('20260501'); // 20260401 + 30 days
  });

  // ── 8. POST second plan for delete test ────────────────────────────
  test('POST second plan for cascade delete test', async () => {
    const res = await request(app).post(BASE).send({
      WPTXT: 'Plano para deletar',
      IWERK: '1000',
      EQUNR: 'EQ-TEST-001',
      TPLNR: 'FL-TEST-001',
      ZYKL1: 7,
      ZEINH: 'D',
      STRAT: 'ZP2',
      LPLDA: '20260310',
      PLPO_TASKS: [
        {
          PLNTY: 'A',
          PLNNR: 'PLN-DEL-001',
          PLNKN: '0010',
          LTXA1: 'Tarefa para deletar',
          ARBPL: 'MEC01',
          VORNR: '0010',
          STEUS: 'PM01',
        },
      ],
    });
    expect(res.status).toBe(201);
    createdWARPL2 = res.body.d.WARPL;
  });

  // ── 9. DELETE MMPT cascades to PLPO ────────────────────────────────
  test('DELETE plan returns 204 and cascades to PLPO tasks', async () => {
    const res = await request(app).delete(`${BASE}('${createdWARPL2}')`);
    expect(res.status).toBe(204);

    // Verify both MMPT and PLPO are deleted
    const mmpt = db.prepare('SELECT * FROM MMPT WHERE WARPL = ?').get(createdWARPL2);
    const plpo = db.prepare('SELECT * FROM PLPO WHERE WARPL = ?').all(createdWARPL2);
    expect(mmpt).toBeUndefined();
    expect(plpo.length).toBe(0);
  });
});
