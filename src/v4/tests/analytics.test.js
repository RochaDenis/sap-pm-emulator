const request = require('supertest');
const app = require('../../../server');
const db = require('../database');

const BASE = '/sap/opu/odata/sap/PM_S4_ANALYTICS_SRV';

beforeAll(() => {
  db.pragma('foreign_keys = OFF');

  db.exec(`
    DELETE FROM S4_MAINTPLAN_ITEM;
    DELETE FROM S4_MAINTPLAN;
    DELETE FROM S4_MAINTENANCEORDER_OPERATION;
    DELETE FROM S4_MAINTENANCEORDER;
    DELETE FROM S4_MAINTENANCENOTIFICATION;
    DELETE FROM S4_EQUIPMENT;
    DELETE FROM S4_FUNCTIONALLOCATION;
  `);

  db.prepare(`INSERT INTO S4_FUNCTIONALLOCATION VALUES ('FL-TEST-001','Utilities Area','FLOC','1000','AREA-A','SEC-1','WC-01',NULL,NULL,'CC-1000','1000','true')`).run();
  db.prepare(`INSERT INTO S4_FUNCTIONALLOCATION VALUES ('FL-TEST-002','Production Area','FLOC','2000','AREA-B','SEC-2','WC-02',NULL,NULL,'CC-2000','1000','true')`).run();

  // 5 equipment — 2 down
  const equips = [
    ['EQ-T0001','EQUI','Pump A','M','1000','FL-TEST-001','true','false'],
    ['EQ-T0002','EQUI','Motor B','E','1000','FL-TEST-001','true','false'],
    ['EQ-T0003','EQUI','Vessel C','V','2000','FL-TEST-002','false','true'],
    ['EQ-T0004','EQUI','Pump D','M','2000','FL-TEST-002','false','true'],
    ['EQ-T0005','EQUI','Fan E','M','1000','FL-TEST-001','true','false'],
  ];
  equips.forEach(([eq,tot,name,cat,plant,fl,avail,down]) => {
    db.prepare(`INSERT INTO S4_EQUIPMENT (Equipment,TechnicalObjectType,EquipmentName,EquipmentCategory,MaintenancePlant,FunctionalLocation,EquipmentIsAvailable,MaintenanceObjectIsDown) VALUES (?,?,?,?,?,?,?,?)`).run(eq,tot,name,cat,plant,fl,avail,down);
  });

  // 6 notifications — phases 1,1,2,2,3,4
  const today = new Date();
  const months = [0,1,2,3,4,5].map(i => { const d = new Date(today); d.setMonth(d.getMonth()-i); return d.toISOString().slice(0,10); });
  const notifs = [
    ['NF-T-0001','Falha bomba','M1','1','1','EQ-T0001',months[0]],
    ['NF-T-0002','Vibração','M1','2','1','EQ-T0002',months[1]],
    ['NF-T-0003','Inspeção','M2','1','2','EQ-T0003',months[2]],
    ['NF-T-0004','Troca filtro','M2','2','2','EQ-T0004',months[3]],
    ['NF-T-0005','Concluída','M3','3','3','EQ-T0005',months[4]],
    ['NF-T-0006','Adiada','M1','4','4','EQ-T0001',months[5]],
  ];
  notifs.forEach(([id,txt,type,pri,phase,equip,date]) => {
    db.prepare(`INSERT INTO S4_MAINTENANCENOTIFICATION (MaintenanceNotification,NotificationText,NotificationType,MaintPriority,NotifProcessingPhase,TechnicalObject,TechObjIsEquipOrFuncnLoc,CreationDate) VALUES (?,?,?,?,?,?,'EQUI',?)`).run(id,txt,type,pri,phase,equip,date);
  });

  // 4 orders — phases 1,2,4,5
  const orders = [
    ['OR-T-0001','Corretiva bomba','PM02','1','1000',500.00,'BRL',null],
    ['OR-T-0002','Preventiva motor','PM01','2','1000',1200.00,'BRL','NF-T-0001'],
    ['OR-T-0003','Inspeção','PM03','4','2000',800.00,'USD',null],
    ['OR-T-0004','Concluída','PM01','5','2000',2000.00,'EUR',null],
  ];
  orders.forEach(([id,desc,type,phase,plant,cost,curr,notif]) => {
    db.prepare(`INSERT INTO S4_MAINTENANCEORDER (MaintenanceOrder,MaintenanceOrderDesc,MaintenanceOrderType,MaintOrdProcessingPhase,MaintenancePlant,TotalActualCosts,Currency,MaintenanceNotification) VALUES (?,?,?,?,?,?,?,?)`).run(id,desc,type,phase,plant,cost,curr,notif);
  });

  // 2 plans
  const future = new Date(); future.setMonth(future.getMonth()+1);
  const past = new Date(); past.setMonth(past.getMonth()-1);
  db.prepare(`INSERT INTO S4_MAINTPLAN (MaintenancePlan,MaintPlanDesc,MaintenancePlanCategory,MaintenancePlant,CycleLength,CycleUnit,MaintPlanIsActive,NextPlannedDate) VALUES (?,?,?,?,?,?,?,?)`).run('MP-T-0001','Plano Mensal','PM01','1000',30,'D','true',future.toISOString().slice(0,10));
  db.prepare(`INSERT INTO S4_MAINTPLAN (MaintenancePlan,MaintPlanDesc,MaintenancePlanCategory,MaintenancePlant,CycleLength,CycleUnit,MaintPlanIsActive,NextPlannedDate) VALUES (?,?,?,?,?,?,?,?)`).run('MP-T-0002','Plano Vencido','PM01','2000',30,'D','true',past.toISOString().slice(0,10));

  // 2 plan items
  db.prepare(`INSERT INTO S4_MAINTPLAN_ITEM (MaintenancePlan,MaintenancePlanItem,TechnicalObject,TechObjIsEquipOrFuncnLoc,MaintenanceItemDesc) VALUES (?,?,?,?,?)`).run('MP-T-0001','ITEM-0001','EQ-T0001','EQUI','Item bomba');
  db.prepare(`INSERT INTO S4_MAINTPLAN_ITEM (MaintenancePlan,MaintenancePlanItem,TechnicalObject,TechObjIsEquipOrFuncnLoc,MaintenanceItemDesc) VALUES (?,?,?,?,?)`).run('MP-T-0002','ITEM-0002','EQ-T0002','EQUI','Item motor');

  db.pragma('foreign_keys = ON');
});

afterAll(() => {
  if (app.close) app.close();
});

describe('PM_S4_ANALYTICS_SRV', () => {
  test('GET /EquipmentAvailability', async () => {
    const res = await request(app).get(`${BASE}/EquipmentAvailability`);
    expect(res.status).toBe(200);
    expect(res.body.d).toBeDefined();
    expect(res.body.d.total).toBeGreaterThanOrEqual(5);
    expect(res.body.d.availabilityRate).toMatch(/%$/);
  });

  test('GET /NotificationsByPhase', async () => {
    const res = await request(app).get(`${BASE}/NotificationsByPhase`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.d.results)).toBe(true);
    expect(res.body.d.results[0]).toHaveProperty('phase');
    expect(res.body.d.results[0]).toHaveProperty('phaseDesc');
    expect(res.body.d.results[0]).toHaveProperty('count');
  });

  test('GET /OrdersByPhase', async () => {
    const res = await request(app).get(`${BASE}/OrdersByPhase`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.d.results)).toBe(true);
    expect(res.body.d.results[0]).toHaveProperty('phase');
  });

  test('GET /MaintenancePlanCompliance', async () => {
    const res = await request(app).get(`${BASE}/MaintenancePlanCompliance`);
    expect(res.status).toBe(200);
    expect(res.body.d.total).toBeGreaterThanOrEqual(2);
    expect(res.body.d.complianceRate).toMatch(/%$/);
  });

  test('GET /CriticalEquipment', async () => {
    const res = await request(app).get(`${BASE}/CriticalEquipment`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.d.results)).toBe(true);
  });

  test('GET /NotificationTrend', async () => {
    const res = await request(app).get(`${BASE}/NotificationTrend`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.d.results)).toBe(true);
    if (res.body.d.results.length > 0) {
      expect(res.body.d.results[0]).toHaveProperty('month');
      expect(res.body.d.results[0].month).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  test('GET /OrderCostSummary', async () => {
    const res = await request(app).get(`${BASE}/OrderCostSummary`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.d.results)).toBe(true);
    expect(res.body.d.results[0]).toHaveProperty('type');
    expect(res.body.d.results[0]).toHaveProperty('totalCost');
  });

  test('GET /PlantMaintenanceSummary', async () => {
    const res = await request(app).get(`${BASE}/PlantMaintenanceSummary`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.d.results)).toBe(true);
    expect(res.body.d.results[0]).toHaveProperty('plant');
    expect(res.body.d.results[0]).toHaveProperty('equipmentCount');
  });
});
