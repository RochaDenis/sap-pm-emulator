const request = require('supertest');
const app = require('../../../server');
const db = require('../database');

describe('API_MAINTPLAN Endpoints (S/4HANA)', () => {
  let csrfToken;
  let cookies;
  let testPlanId;
  let testEquipId;

  beforeAll(async () => {
    // 1. Clean DB for test environment
    db.prepare('DELETE FROM S4_MAINTPLAN_ITEM').run();
    db.prepare('DELETE FROM S4_MAINTPLAN').run();
    db.prepare('DELETE FROM S4_EQUIPMENT').run();

    // 2. Insert test Equipment
    testEquipId = 'EQ-TEST-01';
    db.prepare(`
      INSERT INTO S4_EQUIPMENT (Equipment, EquipmentName) 
      VALUES (?, ?)
    `).run(testEquipId, 'Test Equipment');

    // 3. Get CSRF Token
    const res = await request(app)
      .get('/sap/opu/odata/sap/API_MAINTPLAN/MaintenancePlanCollection')
      .set('x-csrf-token', 'fetch');
    
    csrfToken = res.headers['x-csrf-token'];
    cookies = res.headers['set-cookie'] || [];
  });

  describe('CRUD Maintenance Plan', () => {
    it('should create a Maintenance Plan', async () => {
      const payload = {
        MaintPlanDesc: "Test S/4 Plan",
        MaintenancePlant: "1000",
        CycleLength: 30,
        CycleUnit: "DAY"
      };

      const res = await request(app)
        .post('/sap/opu/odata/sap/API_MAINTPLAN/MaintenancePlanCollection')
        .set('x-csrf-token', csrfToken)
        .set('Cookie', cookies)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.d.MaintenancePlan).toMatch(/^MP-S4-\d{4}$/);
      expect(res.body.d.MaintPlanDesc).toBe("Test S/4 Plan");
      expect(res.body.d.MaintPlanIsActive).toBe("true");
      expect(res.body.d.NextPlannedDate).toBeDefined();
      
      testPlanId = res.body.d.MaintenancePlan;
    });

    it('should get collection of Maintenance Plans', async () => {
      const res = await request(app)
        .get('/sap/opu/odata/sap/API_MAINTPLAN/MaintenancePlanCollection')
        .set('Cookie', cookies);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.d.results)).toBe(true);
      expect(res.body.d.results.length).toBeGreaterThan(0);
    });

    it('should get a single Maintenance Plan', async () => {
      const res = await request(app)
        .get(`/sap/opu/odata/sap/API_MAINTPLAN/MaintenancePlanCollection('${testPlanId}')`)
        .set('Cookie', cookies);
      
      expect(res.status).toBe(200);
      expect(res.body.d.MaintenancePlan).toBe(testPlanId);
    });

    it('should patch a Maintenance Plan', async () => {
      const res = await request(app)
        .patch(`/sap/opu/odata/sap/API_MAINTPLAN/MaintenancePlanCollection('${testPlanId}')`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', cookies)
        .send({ MaintPlanDesc: "Updated Desc" });
      
      expect(res.status).toBe(200);
      expect(res.body.d.MaintPlanDesc).toBe("Updated Desc");
    });
  });

  describe('Function Imports', () => {
    it('should start a maintenance plan schedule', async () => {
      const res = await request(app)
        .post('/sap/opu/odata/sap/API_MAINTPLAN/StartMaintPlnSchedule')
        .set('x-csrf-token', csrfToken)
        .set('Cookie', cookies)
        .send({ MaintenancePlan: testPlanId });
      
      expect(res.status).toBe(200);
      expect(res.body.d.LastCallDate).toBeDefined();
    });

    it('should restart a maintenance plan schedule', async () => {
      const res = await request(app)
        .post('/sap/opu/odata/sap/API_MAINTPLAN/RestartMaintPlnSchedule')
        .set('x-csrf-token', csrfToken)
        .set('Cookie', cookies)
        .send({ MaintenancePlan: testPlanId });
      
      expect(res.status).toBe(200);
      expect(res.body.d.MaintPlanIsActive).toBe("true");
    });
  });

  describe('Navigation Properties', () => {
    it('should create a Maintenance Plan Item', async () => {
      const res = await request(app)
        .post(`/sap/opu/odata/sap/API_MAINTPLAN/MaintenancePlanCollection('${testPlanId}')/to_MaintenancePlanItem`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', cookies)
        .send({
          TechnicalObject: testEquipId,
          MaintenanceItemDesc: "Item 1 Desc"
        });
      
      expect(res.status).toBe(201);
      expect(res.body.d.MaintenancePlanItem).toMatch(/^ITEM-\d{4}$/);
      expect(res.body.d.TechnicalObject).toBe(testEquipId);
      expect(res.body.d.TechObjIsEquipOrFuncnLoc).toBe("EQUI");
    });

    it('should get Maintenance Plan Items', async () => {
      const res = await request(app)
        .get(`/sap/opu/odata/sap/API_MAINTPLAN/MaintenancePlanCollection('${testPlanId}')/to_MaintenancePlanItem`)
        .set('Cookie', cookies);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.d.results)).toBe(true);
      expect(res.body.d.results.length).toBe(1);
    });
  });
});
