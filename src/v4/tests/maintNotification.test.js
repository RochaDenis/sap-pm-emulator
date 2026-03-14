const request = require('supertest');
const app = require('../../../server');
const db = require('../database');

describe('S/4HANA API_MAINTNOTIFICATION Endpoints', () => {
  const BASE_URL = '/sap/opu/odata/sap/API_MAINTNOTIFICATION';
  let csrfToken = '';
  let csrfCookie = '';
  
  // Test Data
  const existingEquipmentId = 'EQ-99999';
  const newNotificationId = 'NF-TEST-0001';
  let createdNotificationId = '';

  beforeAll(() => {
    db.pragma('foreign_keys = OFF');

    // Insert Functional Location to satisfy FK constraint for Equipment
    db.prepare(`
      INSERT OR IGNORE INTO S4_FUNCTIONALLOCATION 
      (FunctionalLocation, FunctionalLocationName) 
      VALUES ('FL-TEST-01', 'Test FL')
    `).run();

    // Insert dummy Equipment to satisfy FK constraint
    db.prepare(`
      INSERT OR IGNORE INTO S4_EQUIPMENT 
      (Equipment, EquipmentName, EquipmentCategory, MaintenancePlant, FunctionalLocation) 
      VALUES (?, 'Test Equipment FK', 'M', '1000', 'FL-TEST-01')
    `).run(existingEquipmentId);

    // Insert dummy notification for standalone testing
    db.prepare(`
        INSERT OR IGNORE INTO S4_MAINTENANCENOTIFICATION 
        (MaintenanceNotification, NotificationText, NotificationType, TechnicalObject, NotifProcessingPhase, CreationDate) 
        VALUES (?, 'Existing Notif', 'M1', ?, '1', '2023-01-01T12:00:00Z')
    `).run(newNotificationId, existingEquipmentId);

    // Insert dummy order to test navigation
    db.prepare(`
      INSERT OR IGNORE INTO S4_MAINTENANCEORDER 
      (MaintenanceOrder, MaintenanceNotification) 
      VALUES ('ORD-TEST-001', ?)
    `).run(newNotificationId);

    db.pragma('foreign_keys = ON');
  });

  afterAll(() => {
    db.pragma('foreign_keys = OFF');
    // Cleanup
    db.prepare('DELETE FROM S4_MAINTENANCEORDER WHERE MaintenanceOrder = ?').run('ORD-TEST-001');
    db.prepare('DELETE FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').run(newNotificationId);
    if (createdNotificationId) {
        db.prepare('DELETE FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').run(createdNotificationId);
    }
    db.prepare('DELETE FROM S4_EQUIPMENT WHERE Equipment = ?').run(existingEquipmentId);
    db.prepare('DELETE FROM S4_FUNCTIONALLOCATION WHERE FunctionalLocation = ?').run('FL-TEST-01');
    db.pragma('foreign_keys = ON');
  });

  describe('CSRF Token Fetch', () => {
    it('should fetch a CSRF token', async () => {
      const res = await request(app)
        .get(`${BASE_URL}/MaintenanceNotificationCollection`)
        .set('x-csrf-token', 'fetch')
        .expect(200);

      csrfToken = res.headers['x-csrf-token'];
      csrfCookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0] : '';
      
      expect(csrfToken).toBeDefined();
    });
  });

  describe('GET /MaintenanceNotificationCollection', () => {
    it('should return a list of notifications', async () => {
      const res = await request(app)
        .get(`${BASE_URL}/MaintenanceNotificationCollection`)
        .expect(200);
      
      expect(res.body.d.results).toBeInstanceOf(Array);
      expect(res.body.d['__count']).toBeDefined();
    });

    it('should filter notifications by NotificationType', async () => {
      const res = await request(app)
        .get(`${BASE_URL}/MaintenanceNotificationCollection?$filter=NotificationType eq 'M1'`)
        .expect(200);
      
      expect(res.body.d.results.length).toBeGreaterThan(0);
      res.body.d.results.forEach(n => {
          expect(n.NotificationType).toBe('M1');
      });
    });
  });

  describe('GET /MaintenanceNotificationCollection(\'{id}\')', () => {
    it('should return a single notification', async () => {
      const res = await request(app)
        .get(`${BASE_URL}/MaintenanceNotificationCollection('${newNotificationId}')`)
        .expect(200);
      
      expect(res.body.d.MaintenanceNotification).toBe(newNotificationId);
    });

    it('should return 404 for non-existent notification', async () => {
      const res = await request(app)
        .get(`${BASE_URL}/MaintenanceNotificationCollection('NF-INVALID')`)
        .expect(404);
      
      expect(res.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });
  });

  describe('POST /MaintenanceNotificationCollection', () => {
    it('should fail with missing required fields', async () => {
      const res = await request(app)
        .post(`${BASE_URL}/MaintenanceNotificationCollection`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', csrfCookie)
        .send({ NotificationText: 'Missing fields' })
        .expect(400);
      
      expect(res.body.error.message.value).toContain('Missing required fields');
    });

    it('should fail with invalid equipment FK', async () => {
      const res = await request(app)
        .post(`${BASE_URL}/MaintenanceNotificationCollection`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', csrfCookie)
        .send({ 
            NotificationText: 'Invalid FK', 
            NotificationType: 'M2', 
            TechnicalObject: 'EQ-INVALID' 
        })
        .expect(400);

      expect(res.body.error.code).toBe('EQUIPMENT_NOT_FOUND');
    });

    it('should create a notification with valid payload', async () => {
      const res = await request(app)
        .post(`${BASE_URL}/MaintenanceNotificationCollection`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', csrfCookie)
        .send({ 
            NotificationText: 'Motor failing', 
            NotificationType: 'M1', 
            TechnicalObject: existingEquipmentId 
        })
        .expect(201);

      expect(res.body.d.MaintenanceNotification).toMatch(/^NF-\d{8}-\d{4}$/);
      expect(res.body.d.NotifProcessingPhase).toBe('1');
      expect(res.body.d.CreationDate).toBeDefined();

      createdNotificationId = res.body.d.MaintenanceNotification;
    });
  });

  describe('PATCH /MaintenanceNotificationCollection(\'{id}\')', () => {
    it('should update a notification', async () => {
      const res = await request(app)
        .patch(`${BASE_URL}/MaintenanceNotificationCollection('${createdNotificationId}')`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', csrfCookie)
        .send({ NotificationText: 'Motor failing badly' })
        .expect(200);

      expect(res.body.d.NotificationText).toBe('Motor failing badly');
    });
  });

  describe('Function Imports (State Transitions)', () => {
    it('should set an outstanding notification to In Process', async () => {
      const res = await request(app)
        .post(`${BASE_URL}/SetToInProcess`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', csrfCookie)
        .send({ MaintenanceNotification: createdNotificationId })
        .expect(200);

      expect(res.body.d.NotifProcessingPhase).toBe('2');
    });

    it('should fail to set an in-process notification to In Process again', async () => {
      const res = await request(app)
        .post(`${BASE_URL}/SetToInProcess`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', csrfCookie)
        .send({ MaintenanceNotification: createdNotificationId })
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should fail to complete an outstanding notification', async () => {
       // newNotificationId is still phase 1
       const res = await request(app)
        .post(`${BASE_URL}/Complete`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', csrfCookie)
        .send({ MaintenanceNotification: newNotificationId })
        .expect(400);

       expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should complete an in-process notification', async () => {
      const res = await request(app)
        .post(`${BASE_URL}/Complete`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', csrfCookie)
        .send({ MaintenanceNotification: createdNotificationId })
        .expect(200);

      expect(res.body.d.NotifProcessingPhase).toBe('3');
      expect(res.body.d.MalfunctionEndDate).toBeDefined();
    });

    it('should postpone an outstanding notification', async () => {
       const res = await request(app)
        .post(`${BASE_URL}/Postpone`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', csrfCookie)
        .send({ MaintenanceNotification: newNotificationId })
        .expect(200);

       expect(res.body.d.NotifProcessingPhase).toBe('4');
    });

     it('should fail to postpone a completed notification', async () => {
       const res = await request(app)
        .post(`${BASE_URL}/Postpone`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', csrfCookie)
        .send({ MaintenanceNotification: createdNotificationId })
        .expect(400);

       expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('Navigation: to_MaintenanceOrder', () => {
    it('should return orders linked to notification', async () => {
      const res = await request(app)
        .get(`${BASE_URL}/MaintenanceNotificationCollection('${newNotificationId}')/to_MaintenanceOrder`)
        .expect(200);

      expect(res.body.d.results).toBeInstanceOf(Array);
      expect(res.body.d.results.length).toBeGreaterThan(0);
      expect(res.body.d.results[0].MaintenanceOrder).toBe('ORD-TEST-001');
    });
  });
});
