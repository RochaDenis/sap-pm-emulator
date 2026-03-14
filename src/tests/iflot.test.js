/**
 * IFLOT (Functional Locations) — Integration Tests
 * Jest + Supertest against the Express app
 */
const request = require('supertest');
const app = require('../../server');
const { db } = require('../database');

const BASE = '/sap/opu/odata/sap/PM_FUNCLOC_SRV/IFLOTSet';

beforeAll(() => {
  // Disable FK checks so we can clean dependent data freely
  db.pragma('foreign_keys = OFF');
  db.prepare('DELETE FROM IFLOT').run();
  db.pragma('foreign_keys = ON');
});

afterAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare('DELETE FROM IFLOT').run();
  db.pragma('foreign_keys = ON');
});

describe('IFLOTSet CRUD', () => {
  const sample = {
    TPLNR: 'FLTEST-001',
    PLTXT: 'Linha de Produção Teste',
    IWERK: '1000',
    SWERK: '1000',
    KOSTL: 'CC-PRD-TST',
    BUKRS: '1000',
    STOCKTYPE: 'A',
    FLTYP: 'P',
  };

  // ── POST valid → 201 ────────────────────────────────────────────────
  test('POST valid functional location returns 201 with d object', async () => {
    const res = await request(app).post(BASE).send(sample);
    expect(res.status).toBe(201);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.TPLNR).toBe(sample.TPLNR);
  });

  // ── POST invalid (missing TPLNR) → 400 ─────────────────────────────
  test('POST without TPLNR returns 400', async () => {
    const res = await request(app).post(BASE).send({ PLTXT: 'No PK' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── GET list → 200 + d.results array ───────────────────────────────
  test('GET list returns 200 with d.results array', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(Array.isArray(res.body.d.results)).toBe(true);
  });

  // ── GET single → 200 + d object ───────────────────────────────────
  test('GET single functional location returns 200 with d object', async () => {
    const res = await request(app).get(`${BASE}('${sample.TPLNR}')`);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.TPLNR).toBe(sample.TPLNR);
  });

  // ── GET non-existent → 404 ─────────────────────────────────────────
  test('GET non-existent functional location returns 404', async () => {
    const res = await request(app).get(`${BASE}('NONEXISTENT')`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ── PUT → 200 ──────────────────────────────────────────────────────
  test('PUT updates functional location and returns 200', async () => {
    const res = await request(app)
      .put(`${BASE}('${sample.TPLNR}')`)
      .send({ ...sample, PLTXT: 'Linha Atualizada' });
    expect(res.status).toBe(200);
    expect(res.body.d.PLTXT).toBe('Linha Atualizada');
  });

  // ── PATCH → 200 ────────────────────────────────────────────────────
  test('PATCH partially updates functional location and returns 200', async () => {
    const res = await request(app)
      .patch(`${BASE}('${sample.TPLNR}')`)
      .send({ PLTXT: 'Linha Parcial' });
    expect(res.status).toBe(200);
    expect(res.body.d.PLTXT).toBe('Linha Parcial');
  });

  // ── DELETE → 204 ───────────────────────────────────────────────────
  test('DELETE functional location returns 204', async () => {
    const res = await request(app).delete(`${BASE}('${sample.TPLNR}')`);
    expect(res.status).toBe(204);
  });
});
