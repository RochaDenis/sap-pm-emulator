/**
 * EQUI (Equipment) — Integration Tests
 * Jest + Supertest against the Express app
 */
const request = require('supertest');
const app = require('../../server');
const { db } = require('../database');

const BASE = '/sap/opu/odata/sap/PM_EQUIPMENT_SRV/EQUISet';

beforeAll(() => {
  // Disable FK checks so we can clean dependent data freely
  db.pragma('foreign_keys = OFF');
  db.prepare('DELETE FROM EQUI').run();
  db.pragma('foreign_keys = ON');
});

afterAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare('DELETE FROM EQUI').run();
  db.pragma('foreign_keys = ON');
});

describe('EQUISet CRUD', () => {
  const sample = {
    EQUNR: 'EQTEST001',
    EQTXT: 'Bomba Centrífuga Teste',
    IWERK: '1000',
    KOSTL: 'CC-MNT-TST',
    BUKRS: '1000',
    EQART: 'BOMB',
    SERGE: 'SN-TEST-001',
    BAUJJ: '2024',
    ANSWT: 15000.00,
    WAERS: 'BRL',
  };

  // ── POST valid → 201 ────────────────────────────────────────────────
  test('POST valid equipment returns 201 with d object', async () => {
    const res = await request(app).post(BASE).send(sample);
    expect(res.status).toBe(201);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.EQUNR).toBe(sample.EQUNR);
  });

  // ── POST invalid (missing EQUNR) → 400 ─────────────────────────────
  test('POST without EQUNR returns 400', async () => {
    const res = await request(app).post(BASE).send({ EQTXT: 'No PK' });
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
  test('GET single equipment returns 200 with d object', async () => {
    const res = await request(app).get(`${BASE}('${sample.EQUNR}')`);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.EQUNR).toBe(sample.EQUNR);
  });

  // ── GET non-existent → 404 ─────────────────────────────────────────
  test('GET non-existent equipment returns 404', async () => {
    const res = await request(app).get(`${BASE}('NONEXISTENT')`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ── PUT → 200 ──────────────────────────────────────────────────────
  test('PUT updates equipment and returns 200', async () => {
    const res = await request(app)
      .put(`${BASE}('${sample.EQUNR}')`)
      .send({ ...sample, EQTXT: 'Bomba Atualizada' });
    expect(res.status).toBe(200);
    expect(res.body.d.EQTXT).toBe('Bomba Atualizada');
  });

  // ── PATCH → 200 ────────────────────────────────────────────────────
  test('PATCH partially updates equipment and returns 200', async () => {
    const res = await request(app)
      .patch(`${BASE}('${sample.EQUNR}')`)
      .send({ EQTXT: 'Bomba Parcial' });
    expect(res.status).toBe(200);
    expect(res.body.d.EQTXT).toBe('Bomba Parcial');
  });

  // ── DELETE → 204 ───────────────────────────────────────────────────
  test('DELETE equipment returns 204', async () => {
    const res = await request(app).delete(`${BASE}('${sample.EQUNR}')`);
    expect(res.status).toBe(204);
  });
});
