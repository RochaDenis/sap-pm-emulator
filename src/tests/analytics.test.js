/**
 * Analytics — Integration Tests
 * Jest + Supertest against the Express app
 * Tests all 8 read-only analytical endpoints
 */
const request = require('supertest');
const app = require('../../server');
const { db } = require('../database');

const BASE = '/sap/opu/odata/sap/PM_ANALYTICS_SRV';

// ─── Test Data ──────────────────────────────────────────────────────────────
const testIFLOT = {
  TPLNR: 'AN-TST-001', PLTXT: 'Loc Funcional Teste Analytics', IWERK: '1000',
  SWERK: '1000', KOSTL: '9999', BUKRS: '1000', ERDAT: '20230101',
  AEDAT: '20250101', STOCKTYPE: '', FLTYP: 'T',
};

const testEQUI = {
  EQUNR: 'EQ-AN-001', EQTXT: 'Bomba Teste Analytics', TPLNR: 'AN-TST-001',
  IWERK: '1000', KOSTL: '9999', BUKRS: '1000', ERDAT: '20230101',
  AEDAT: '20250101', EQART: 'BOMB', SERGE: 'SN-AN-001', BAUJJ: '2023',
  ANSWT: 50000.00, WAERS: 'BRL',
};

const testEQUI2 = {
  EQUNR: 'EQ-AN-002', EQTXT: 'Motor Teste Analytics', TPLNR: 'AN-TST-001',
  IWERK: '1000', KOSTL: '9999', BUKRS: '1000', ERDAT: '20230201',
  AEDAT: '20250101', EQART: 'MOTO', SERGE: 'SN-AN-002', BAUJJ: '2023',
  ANSWT: 30000.00, WAERS: 'BRL',
};

// Notifications — mix of statuses and types
const testQMELs = [
  { QMNUM: 'QM-AN-001', QMART: 'M1', QMTXT: 'Falha bomba vibração', EQUNR: 'EQ-AN-001',
    TPLNR: 'AN-TST-001', IWERK: '1000', PRIOK: '1', QMCOD: 'PM-01',
    ERDAT: '20240115', ERNAM: 'TESTE', LTRMN: '20240125', ARBPL: 'MEC-01',
    KOSTL: '9999', QMST: 'CONC' },
  { QMNUM: 'QM-AN-002', QMART: 'M1', QMTXT: 'Falha bomba selo', EQUNR: 'EQ-AN-001',
    TPLNR: 'AN-TST-001', IWERK: '1000', PRIOK: '1', QMCOD: 'PM-02',
    ERDAT: '20240301', ERNAM: 'TESTE', LTRMN: '20240310', ARBPL: 'MEC-01',
    KOSTL: '9999', QMST: 'ABER' },
  { QMNUM: 'QM-AN-003', QMART: 'M2', QMTXT: 'Inspeção programada', EQUNR: 'EQ-AN-001',
    TPLNR: 'AN-TST-001', IWERK: '1000', PRIOK: '2', QMCOD: 'PM-03',
    ERDAT: '20240501', ERNAM: 'TESTE', LTRMN: '20240601', ARBPL: 'MEC-01',
    KOSTL: '9999', QMST: 'ABER' },
  { QMNUM: 'QM-AN-004', QMART: 'M1', QMTXT: 'Falha motor superaquecimento', EQUNR: 'EQ-AN-002',
    TPLNR: 'AN-TST-001', IWERK: '1000', PRIOK: '2', QMCOD: 'PM-04',
    ERDAT: '20240601', ERNAM: 'TESTE', LTRMN: '20240620', ARBPL: 'ELE-01',
    KOSTL: '9999', QMST: 'ABER' },
  { QMNUM: 'QM-AN-005', QMART: 'M1', QMTXT: 'Falha bomba rolamento', EQUNR: 'EQ-AN-001',
    TPLNR: 'AN-TST-001', IWERK: '1000', PRIOK: '1', QMCOD: 'PM-05',
    ERDAT: '20240801', ERNAM: 'TESTE', LTRMN: '20240815', ARBPL: 'MEC-01',
    KOSTL: '9999', QMST: 'CONC' },
];

// Orders — mix of statuses
const testAUFKs = [
  { AUFNR: 'ORD-AN-001', AUART: 'PM01', AUTXT: 'Reparo bomba vibração', EQUNR: 'EQ-AN-001',
    TPLNR: 'AN-TST-001', IWERK: '1000', PRIOK: '1', KOSTL: '9999',
    ERDAT: '20240115', ERNAM: 'TESTE', GSTRP: '20240116', GLTRP: '20240120',
    ARBPL: 'MEC-01', AUFST: 'CLSD' },
  { AUFNR: 'ORD-AN-002', AUART: 'PM02', AUTXT: 'Preventiva bomba', EQUNR: 'EQ-AN-001',
    TPLNR: 'AN-TST-001', IWERK: '1000', PRIOK: '2', KOSTL: '9999',
    ERDAT: '20240301', ERNAM: 'TESTE', GSTRP: '20240302', GLTRP: '20240305',
    ARBPL: 'MEC-01', AUFST: 'REL' },
  { AUFNR: 'ORD-AN-003', AUART: 'PM01', AUTXT: 'Reparo motor', EQUNR: 'EQ-AN-002',
    TPLNR: 'AN-TST-001', IWERK: '1000', PRIOK: '1', KOSTL: '9999',
    ERDAT: '20240601', ERNAM: 'TESTE', GSTRP: '20240602', GLTRP: '20240610',
    ARBPL: 'ELE-01', AUFST: 'CRTD' },
  { AUFNR: 'ORD-AN-004', AUART: 'PM03', AUTXT: 'Preditiva bomba', EQUNR: 'EQ-AN-001',
    TPLNR: 'AN-TST-001', IWERK: '1000', PRIOK: '3', KOSTL: '9999',
    ERDAT: '20240801', ERNAM: 'TESTE', GSTRP: '20240802', GLTRP: '20240810',
    ARBPL: 'MEC-01', AUFST: 'REL' },
];

// AFKO — link orders to notifications
const testAFKOs = [
  { AUFNR: 'ORD-AN-001', QMNUM: 'QM-AN-001', ARBPL: 'MEC-01', IWERK: '1000',
    GSTRP: '20240116', GLTRP: '20240120', GMNGA: 1, WEMNG: 1, RMNGA: 0 },
  { AUFNR: 'ORD-AN-002', QMNUM: 'QM-AN-002', ARBPL: 'MEC-01', IWERK: '1000',
    GSTRP: '20240302', GLTRP: '20240305', GMNGA: 1, WEMNG: 0, RMNGA: 1 },
  { AUFNR: 'ORD-AN-003', QMNUM: 'QM-AN-004', ARBPL: 'ELE-01', IWERK: '1000',
    GSTRP: '20240602', GLTRP: '20240610', GMNGA: 1, WEMNG: 0, RMNGA: 1 },
  { AUFNR: 'ORD-AN-004', QMNUM: 'QM-AN-005', ARBPL: 'MEC-01', IWERK: '1000',
    GSTRP: '20240802', GLTRP: '20240810', GMNGA: 1, WEMNG: 0, RMNGA: 1 },
];

// Materials
const testMARA = {
  MATNR: 'MAT-AN-001', MAKTX: 'Rolamento teste analytics', MATL_TYPE: 'ERSA',
  MEINS: 'EA', MATKL: 'MECA', MTPOS_MARA: 'NORM', BRGEW: 2.5, NTGEW: 2.0, GEWEI: 'KG',
};

// MSEG — material movements
const testMSEGs = [
  { MBLNR: 'MD-AN-001', ZEILE: '0001', AUFNR: 'ORD-AN-001', MATNR: 'MAT-AN-001',
    MENGE: 5, MEINS: 'EA', LGORT: '0001', WERKS: '1000', BWART: '261', BUDAT: '20240117' },
  { MBLNR: 'MD-AN-002', ZEILE: '0001', AUFNR: 'ORD-AN-002', MATNR: 'MAT-AN-001',
    MENGE: 3, MEINS: 'EA', LGORT: '0001', WERKS: '1000', BWART: '261', BUDAT: '20240303' },
  { MBLNR: 'MD-AN-003', ZEILE: '0001', AUFNR: 'ORD-AN-003', MATNR: 'MAT-AN-001',
    MENGE: 7, MEINS: 'EA', LGORT: '0001', WERKS: '1000', BWART: '261', BUDAT: '20240603' },
];

// IMPTT — readings
const testIMPTTs = [
  { POINT: 'MP-AN-001', EQUNR: 'EQ-AN-001', PTTXT: 'Vibração mancal LA', MSGRP: 'VIBR',
    PTYP: 'M', IWERK: '1000', QPUNT: 'mm/s', NKOUN: 2, ENMNG: 4.5, MEINS: 'mm/s', LDATE: '20250101' },
  { POINT: 'MP-AN-002', EQUNR: 'EQ-AN-001', PTTXT: 'Temperatura mancal LA', MSGRP: 'TEMP',
    PTYP: 'M', IWERK: '1000', QPUNT: '°C', NKOUN: 1, ENMNG: 75, MEINS: '°C', LDATE: '20250101' },
];

// MMPT — Maintenance Plans (one overdue, one on time)
const testMMPTs = [
  { WARPL: 'MP-AN-001', WPTXT: 'Plano lubrificação bomba', IWERK: '1000',
    EQUNR: 'EQ-AN-001', TPLNR: 'AN-TST-001', ZYKL1: 30, ZEINH: 'D',
    STRAT: 'ZP1', NPLDA: '20240101', LPLDA: '20231201', WAPOS: 'IP-AN01' },
  { WARPL: 'MP-AN-002', WPTXT: 'Plano inspeção motor', IWERK: '1000',
    EQUNR: 'EQ-AN-002', TPLNR: 'AN-TST-001', ZYKL1: 90, ZEINH: 'D',
    STRAT: 'ZP2', NPLDA: '20291231', LPLDA: '20290901', WAPOS: 'IP-AN02' },
];

// ─── Setup / Teardown ───────────────────────────────────────────────────────
function insertRow(table, obj) {
  const cols = Object.keys(obj);
  const placeholders = cols.map(() => '?').join(', ');
  db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).run(
    ...cols.map(c => obj[c])
  );
}

beforeAll(() => {
  db.pragma('foreign_keys = OFF');
  // Clean analytics test data
  for (const t of ['MSEG', 'IMPTT', 'MMPT', 'AFKO', 'AUFK', 'QMEL', 'EQUI', 'IFLOT', 'MARA']) {
    db.prepare(`DELETE FROM ${t} WHERE ROWID IN (SELECT ROWID FROM ${t})`).run();
  }
  db.pragma('foreign_keys = ON');

  // Insert test data in FK order
  insertRow('IFLOT', testIFLOT);
  insertRow('MARA', testMARA);
  insertRow('EQUI', testEQUI);
  insertRow('EQUI', testEQUI2);
  for (const q of testQMELs) insertRow('QMEL', q);
  for (const a of testAUFKs) insertRow('AUFK', a);
  for (const af of testAFKOs) insertRow('AFKO', af);
  for (const m of testMSEGs) insertRow('MSEG', m);
  for (const i of testIMPTTs) insertRow('IMPTT', i);
  for (const mp of testMMPTs) insertRow('MMPT', mp);
});

afterAll(() => {
  db.pragma('foreign_keys = OFF');
  for (const t of ['MSEG', 'IMPTT', 'MMPT', 'AFKO', 'AUFK', 'QMEL', 'EQUI', 'IFLOT', 'MARA']) {
    db.prepare(`DELETE FROM ${t}`).run();
  }
  db.pragma('foreign_keys = ON');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PM_ANALYTICS_SRV', () => {

  // ── 1. EquipmentHistory returns 200 + history object ────────────────────
  test('GET EquipmentHistory returns 200 with full history object', async () => {
    const res = await request(app).get(`${BASE}/EquipmentHistory('EQ-AN-001')`);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.EQUNR).toBe('EQ-AN-001');
    expect(res.body.d.notifications.results).toBeDefined();
    expect(Array.isArray(res.body.d.notifications.results)).toBe(true);
    expect(res.body.d.orders.results).toBeDefined();
    expect(res.body.d.movements.results).toBeDefined();
    expect(res.body.d.readings.results).toBeDefined();
    expect(typeof res.body.d.total_cost).toBe('number');
  });

  // ── 2. EquipmentHistory non-existent returns 404 ───────────────────────
  test('GET EquipmentHistory non-existent returns 404', async () => {
    const res = await request(app).get(`${BASE}/EquipmentHistory('NONEXISTENT')`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ── 3. OpenNotifications grouped by PRIOK ──────────────────────────────
  test('GET OpenNotifications returns grouped by PRIOK', async () => {
    const res = await request(app).get(`${BASE}/OpenNotifications`);
    expect(res.status).toBe(200);
    expect(res.body.d.results).toBeDefined();
    expect(Array.isArray(res.body.d.results)).toBe(true);

    // Each group should have PRIOK and notifications array
    for (const group of res.body.d.results) {
      expect(group.PRIOK).toBeDefined();
      expect(Array.isArray(group.notifications)).toBe(true);
      expect(group.count).toBeGreaterThan(0);
      // Should include joined EQTXT and PLTXT
      for (const notif of group.notifications) {
        expect(notif.EQTXT).toBeDefined();
        expect(notif.PLTXT).toBeDefined();
      }
    }

    // Total open should be 3 (QM-AN-002, QM-AN-003, QM-AN-004)
    expect(res.body.d.total_open).toBe(3);
  });

  // ── 4. OrderBacklog sorted by PRIOK, ERDAT ────────────────────────────
  test('GET OrderBacklog returns sorted list', async () => {
    const res = await request(app).get(`${BASE}/OrderBacklog`);
    expect(res.status).toBe(200);
    expect(res.body.d.results).toBeDefined();
    expect(Array.isArray(res.body.d.results)).toBe(true);

    const results = res.body.d.results;
    // All should be CRTD or REL
    for (const row of results) {
      expect(['CRTD', 'REL']).toContain(row.AUFST);
    }

    // Sorted by PRIOK ASC, then ERDAT ASC
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      if (prev.PRIOK === curr.PRIOK) {
        expect(prev.ERDAT <= curr.ERDAT).toBe(true);
      } else {
        expect(prev.PRIOK <= curr.PRIOK).toBe(true);
      }
    }
  });

  // ── 5. EquipmentMTBF returns MTBF_days ────────────────────────────────
  test('GET EquipmentMTBF returns 200 with MTBF_days', async () => {
    const res = await request(app).get(`${BASE}/EquipmentMTBF('EQ-AN-001')`);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.EQUNR).toBe('EQ-AN-001');
    expect(typeof res.body.d.MTBF_days).toBe('number');
    expect(typeof res.body.d.total_failures).toBe('number');
    // EQ-AN-001 has 3 M1 failures: QM-AN-001, QM-AN-002, QM-AN-005
    expect(res.body.d.total_failures).toBe(3);
    expect(res.body.d.first_failure).toBeDefined();
    expect(res.body.d.last_failure).toBeDefined();
    expect(res.body.d.MTBF_days).toBeGreaterThan(0);
  });

  // ── 6. EquipmentMTTR returns MTTR_days ────────────────────────────────
  test('GET EquipmentMTTR returns 200 with MTTR_days', async () => {
    const res = await request(app).get(`${BASE}/EquipmentMTTR('EQ-AN-001')`);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.EQUNR).toBe('EQ-AN-001');
    expect(typeof res.body.d.MTTR_days).toBe('number');
    expect(typeof res.body.d.total_repairs).toBe('number');
    // EQ-AN-001 has 2 CONC notifications (QM-AN-001, QM-AN-005)
    expect(res.body.d.total_repairs).toBe(2);
    expect(res.body.d.MTTR_days).toBeGreaterThan(0);
  });

  // ── 7. CriticalEquipment returns top 10 ───────────────────────────────
  test('GET CriticalEquipment returns top 10 array', async () => {
    const res = await request(app).get(`${BASE}/CriticalEquipment`);
    expect(res.status).toBe(200);
    expect(res.body.d.results).toBeDefined();
    expect(Array.isArray(res.body.d.results)).toBe(true);
    expect(res.body.d.results.length).toBeLessThanOrEqual(10);

    // Each entry has the required metrics
    for (const item of res.body.d.results) {
      expect(item.EQUNR).toBeDefined();
      expect(item.EQTXT).toBeDefined();
      expect(typeof item.total_failures).toBe('number');
      expect(typeof item.open_orders).toBe('number');
      expect(typeof item.total_cost).toBe('number');
      expect(typeof item.rank).toBe('number');
    }
  });

  // ── 8. MaintenanceCostByEquipment returns cost summary ────────────────
  test('GET MaintenanceCostByEquipment returns cost summary', async () => {
    const res = await request(app).get(`${BASE}/MaintenanceCostByEquipment`);
    expect(res.status).toBe(200);
    expect(res.body.d.results).toBeDefined();
    expect(Array.isArray(res.body.d.results)).toBe(true);

    // Find EQ-AN-001 in results
    const eq1 = res.body.d.results.find(r => r.EQUNR === 'EQ-AN-001');
    expect(eq1).toBeDefined();
    expect(typeof eq1.total_cost).toBe('number');
    expect(eq1.total_cost).toBeGreaterThan(0);
    expect(typeof eq1.orders_PM01).toBe('number');
    expect(typeof eq1.orders_PM02).toBe('number');
    expect(typeof eq1.orders_PM03).toBe('number');
    expect(eq1.last_maintenance_date).toBeDefined();
  });

  // ── 9. PreventiveCompliance returns plans with status ─────────────────
  test('GET PreventiveCompliance returns plans with status', async () => {
    const res = await request(app).get(`${BASE}/PreventiveCompliance`);
    expect(res.status).toBe(200);
    expect(res.body.d.results).toBeDefined();
    expect(Array.isArray(res.body.d.results)).toBe(true);

    for (const plan of res.body.d.results) {
      expect(plan.WARPL).toBeDefined();
      expect(plan.WPTXT).toBeDefined();
      expect(plan.EQUNR).toBeDefined();
      expect(plan.NPLDA).toBeDefined();
      expect(['ON_TIME', 'OVERDUE', 'CRITICAL']).toContain(plan.status);
      expect(typeof plan.days_overdue).toBe('number');
    }
  });

  // ── 10. PreventiveCompliance OVERDUE items have days_overdue > 0 ──────
  test('GET PreventiveCompliance OVERDUE items have days_overdue > 0', async () => {
    const res = await request(app).get(`${BASE}/PreventiveCompliance`);
    expect(res.status).toBe(200);

    const overdueItems = res.body.d.results.filter(
      r => r.status === 'OVERDUE' || r.status === 'CRITICAL'
    );

    // MP-AN-001 with NPLDA='20240101' should be overdue
    expect(overdueItems.length).toBeGreaterThan(0);

    for (const item of overdueItems) {
      expect(item.days_overdue).toBeGreaterThan(0);
    }
  });

  // ── 11. EquipmentMTBF non-existent equipment returns 404 ──────────────
  test('GET EquipmentMTBF non-existent returns 404', async () => {
    const res = await request(app).get(`${BASE}/EquipmentMTBF('NONEXISTENT')`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  // ── 12. EquipmentMTTR non-existent equipment returns 404 ──────────────
  test('GET EquipmentMTTR non-existent returns 404', async () => {
    const res = await request(app).get(`${BASE}/EquipmentMTTR('NONEXISTENT')`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
