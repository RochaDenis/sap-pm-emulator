/**
 * IMPTT (Pontos de Medição) — Integration Tests
 * Jest + Supertest against the Express app
 *
 * Minimum 6 IMPTT tests covering CRUD + business rules.
 */
const request = require('supertest');
const app = require('../../server');
const { db } = require('../database');

const BASE = '/sap/opu/odata/sap/PM_MEASPOINT_SRV/IMPTTSet';

let createdPOINT = null;
let createdPOINT2 = null;

beforeAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare('DELETE FROM IMPTT').run();
  db.prepare("DELETE FROM EQUI WHERE EQUNR = 'EQ-IMPTT-001'").run();
  db.prepare("DELETE FROM IFLOT WHERE TPLNR = 'FL-IMPTT-001'").run();
  db.pragma('foreign_keys = ON');

  // Insert prerequisite IFLOT
  db.prepare(`
    INSERT INTO IFLOT (TPLNR, PLTXT, IWERK, SWERK, BUKRS, ERDAT, FLTYP)
    VALUES ('FL-IMPTT-001', 'Linha Medição Teste', '1000', '1000', '1000', '20260310', 'M')
  `).run();

  // Insert prerequisite EQUI
  db.prepare(`
    INSERT INTO EQUI (EQUNR, EQTXT, TPLNR, IWERK, BUKRS, ERDAT, EQART)
    VALUES ('EQ-IMPTT-001', 'Motor Elétrico Teste', 'FL-IMPTT-001', '1000', '1000', '20260310', 'MOTR')
  `).run();
});

afterAll(() => {
  db.pragma('foreign_keys = OFF');
  db.prepare('DELETE FROM IMPTT').run();
  db.prepare("DELETE FROM EQUI WHERE EQUNR = 'EQ-IMPTT-001'").run();
  db.prepare("DELETE FROM IFLOT WHERE TPLNR = 'FL-IMPTT-001'").run();
  db.pragma('foreign_keys = ON');
});

describe('IMPTTSet CRUD', () => {
  // ── 1. GET IMPTTSet list ───────────────────────────────────────────
  test('GET list returns 200 with d.results array', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(Array.isArray(res.body.d.results)).toBe(true);
  });

  // ── 2. POST IMPTT valid + auto POINT ──────────────────────────────
  test('POST valid measurement point returns 201 with auto POINT', async () => {
    const res = await request(app).post(BASE).send({
      EQUNR: 'EQ-IMPTT-001',
      PTTXT: 'Ponto de vibração do motor principal',
      MSGRP: 'VIBR',
      PTYP: 'M',
      IWERK: '1000',
      QPUNT: 'MM/S',
      NKOUN: 2,
      ENMNG: 10.5,
      MEINS: 'MM/S',
    });
    expect(res.status).toBe(201);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.POINT).toMatch(/^MP-POINT-\d{4}$/);
    expect(res.body.d.MSGRP).toBe('VIBR');
    expect(res.body.d.EQTXT).toBe('Motor Elétrico Teste');
    createdPOINT = res.body.d.POINT;
  });

  // ── 3. POST IMPTT invalid MSGRP → 400 ────────────────────────────
  test('POST with invalid MSGRP returns 400', async () => {
    const res = await request(app).post(BASE).send({
      EQUNR: 'EQ-IMPTT-001',
      PTTXT: 'Ponto com grupo inválido',
      MSGRP: 'INVALID',
      PTYP: 'M',
      IWERK: '1000',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── 4. GET IMPTTSet filter by MSGRP ───────────────────────────────
  test('GET with $filter MSGRP eq VIBR returns matching records', async () => {
    const res = await request(app).get(`${BASE}?$filter=MSGRP eq 'VIBR'`);
    expect(res.status).toBe(200);
    expect(res.body.d.results.length).toBeGreaterThanOrEqual(1);
    res.body.d.results.forEach((r) => {
      expect(r.MSGRP).toBe('VIBR');
    });
  });

  // ── 5. PATCH IMPTT reading update + LDATE ─────────────────────────
  test('PATCH reading update sets LDATE automatically', async () => {
    const res = await request(app)
      .patch(`${BASE}('${createdPOINT}')`)
      .send({ NKOUN: 3, ENMNG: 12.8 });
    expect(res.status).toBe(200);
    expect(res.body.d.NKOUN).toBe(3);
    expect(res.body.d.ENMNG).toBe(12.8);
    expect(res.body.d.LDATE).toBeDefined();
    // LDATE should be today in YYYYMMDD
    expect(res.body.d.LDATE).toMatch(/^\d{8}$/);
  });

  // ── 6. POST second point for delete test ──────────────────────────
  test('POST second measurement point for delete test', async () => {
    const res = await request(app).post(BASE).send({
      EQUNR: 'EQ-IMPTT-001',
      PTTXT: 'Ponto de temperatura para deletar',
      MSGRP: 'TEMP',
      PTYP: 'M',
      IWERK: '1000',
      QPUNT: '°C',
      MEINS: '°C',
    });
    expect(res.status).toBe(201);
    createdPOINT2 = res.body.d.POINT;
  });

  // ── 7. DELETE IMPTT → 204 ─────────────────────────────────────────
  test('DELETE measurement point returns 204', async () => {
    const res = await request(app).delete(`${BASE}('${createdPOINT2}')`);
    expect(res.status).toBe(204);

    // Verify IMPTT is deleted
    const imptt = db.prepare('SELECT * FROM IMPTT WHERE POINT = ?').get(createdPOINT2);
    expect(imptt).toBeUndefined();
  });
});
