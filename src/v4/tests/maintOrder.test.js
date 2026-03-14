const request = require('supertest');
const app = require('../../../server');
const db = require('../database');

describe('S/4HANA API_MAINTENANCEORDER Endpoints', () => {
  const BASE_URL = '/sap/opu/odata/sap/API_MAINTENANCEORDER';
  let csrfToken = '';
  let csrfCookie = '';
  
  // Test Data
  const existingOrderId = 'ORD-TEST-002';
  const existingNotificationId = 'NF-TEST-0002';
  const existingEquipmentId = 'EQ-88888';
  let createdOrderId = '';

  beforeAll(() => {
    db.pragma('foreign_keys = OFF');

    // Clean up before starting to ensure clean state
    db.prepare('DELETE FROM S4_MAINTENANCEORDER_OPERATION').run();
    db.prepare('DELETE FROM S4_MAINTENANCEORDER').run();
    db.prepare('DELETE FROM S4_MAINTENANCENOTIFICATION').run();
    db.prepare('DELETE FROM S4_EQUIPMENT').run();
    db.prepare('DELETE FROM S4_FUNCTIONALLOCATION').run();

    // Insert Functional Location to satisfy FK constraint for Equipment
    db.prepare(`
      INSERT INTO S4_FUNCTIONALLOCATION 
      (FunctionalLocation, FunctionalLocationName) 
      VALUES ('FL-TEST-02', 'Test FL 2')
    `).run();

    // Insert Equipment to satisfy FK constraint
    db.prepare(`
      INSERT INTO S4_EQUIPMENT 
      (Equipment, EquipmentName, EquipmentCategory, MaintenancePlant, FunctionalLocation) 
      VALUES (?, 'Test Equipment FK', 'M', '1000', 'FL-TEST-02')
    `).run(existingEquipmentId);

    // Insert notification to satisfy FK constraint for Order
    db.prepare(`
        INSERT INTO S4_MAINTENANCENOTIFICATION 
        (MaintenanceNotification, NotificationText, NotificationType, TechnicalObject, NotifProcessingPhase, CreationDate) 
        VALUES (?, 'Existing Notif', 'M1', ?, '1', '2023-01-01T12:00:00Z')
    `).run(existingNotificationId, existingEquipmentId);

    // Insert dummy order for GET / Patch testing
    db.prepare(`
      INSERT INTO S4_MAINTENANCEORDER 
      (MaintenanceOrder, MaintenanceOrderType, MaintenanceOrderDesc, MaintOrdBasicStartDate, MaintenanceNotification, MaintenancePlant) 
      VALUES (?, 'PM01', 'Test Order 1', '2023-05-01T10:00:00Z', ?, '1000')
    `).run(existingOrderId, existingNotificationId);

    db.pragma('foreign_keys = ON');
  });

  afterAll(() => {
    db.pragma('foreign_keys = OFF');
    // Cleanup in reverse FK order
    db.prepare('DELETE FROM S4_MAINTENANCEORDER_OPERATION').run();
    db.prepare('DELETE FROM S4_MAINTENANCEORDER').run();
    db.prepare('DELETE FROM S4_MAINTENANCENOTIFICATION').run();
    db.prepare('DELETE FROM S4_EQUIPMENT').run();
    db.prepare('DELETE FROM S4_FUNCTIONALLOCATION').run();
    db.pragma('foreign_keys = ON');
  });

  describe('CSRF Token Fetch', () => {
    it('should fetch a CSRF token', async () => {
      const res = await request(app)
        .get(`${BASE_URL}/MaintenanceOrderCollection`)
        .set('x-csrf-token', 'fetch')
        .expect(200);

      csrfToken = res.headers['x-csrf-token'];
      csrfCookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0] : '';
      
      expect(csrfToken).toBeDefined();
    });
  });

  describe('GET /MaintenanceOrderCollection', () => {
    it('should return a list of orders', async () => {
      const res = await request(app)
        .get(`${BASE_URL}/MaintenanceOrderCollection`)
        .expect(200);
      
      expect(res.body.d.results).toBeInstanceOf(Array);
      expect(res.body.d['__count']).toBeDefined();
    });

    it('should filter orders by MaintenanceOrderType', async () => {
      const res = await request(app)
        .get(`${BASE_URL}/MaintenanceOrderCollection?$filter=MaintenanceOrderType eq 'PM01'`)
        .expect(200);
      
      expect(res.body.d.results.length).toBeGreaterThan(0);
      res.body.d.results.forEach(o => {
          expect(o.MaintenanceOrderType).toBe('PM01');
      });
    });
  });

  describe('GET /MaintenanceOrderCollection(\'{id}\')', () => {
    it('should return a single order', async () => {
      const res = await request(app)
        .get(`${BASE_URL}/MaintenanceOrderCollection('${existingOrderId}')`)
        .expect(200);
      
      expect(res.body.d.MaintenanceOrder).toBe(existingOrderId);
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .get(`${BASE_URL}/MaintenanceOrderCollection('ORD-INVALID')`)
        .expect(404);
      
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('POST /MaintenanceOrderCollection', () => {
    it('should fail with missing required fields', async () => {
      const res = await request(app)
        .post(`${BASE_URL}/MaintenanceOrderCollection`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', csrfCookie)
        .send({ MaintenanceOrderDesc: 'Missing fields' })
        .expect(400);
      
      expect(res.body.error.message.value).toContain('Missing required fields');
    });

    it('should create an order with valid payload', async () => {
      const res = await request(app)
        .post(`${BASE_URL}/MaintenanceOrderCollection`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', csrfCookie)
        .send({ 
            MaintenanceOrderDesc: 'New Pump Fix', 
            MaintenanceOrderType: 'PM02', 
            MaintenancePlant: '1000' 
        })
        .expect(201);

      expect(res.body.d.MaintenanceOrder).toMatch(/^OR-\d{8}-\d{4}$/);
      expect(res.body.d.OrderIsCreated).toBe('true');
      expect(res.body.d.MaintOrdProcessingPhase).toBe('01');
      expect(res.body.d.MaintOrdProcessingPhaseDesc).toBe('Created');

      createdOrderId = res.body.d.MaintenanceOrder;
    });
  });
});
