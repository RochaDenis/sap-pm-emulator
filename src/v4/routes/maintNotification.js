const express = require('express');
const maintNotificationController = require('../controllers/maintNotificationController');
const csrfMiddleware = require('../middleware/csrfMiddleware');

const router = express.Router();

// Helper function to extract key from route param that might look like "('123')"
router.param('key', (req, res, next, val) => {
  const match = val.match(/^\('?([^']+)'?\)$/);
  if (match) {
    req.params.MaintenanceNotification = match[1];
  } else {
    req.params.MaintenanceNotification = val;
  }
  next();
});

// CRUD Endpoints
router.get('/MaintenanceNotificationCollection', maintNotificationController.getCollection);
router.post('/MaintenanceNotificationCollection', csrfMiddleware, maintNotificationController.create);

router.get('/MaintenanceNotificationCollection:key', maintNotificationController.getSingle);
router.patch('/MaintenanceNotificationCollection:key', csrfMiddleware, maintNotificationController.update);

// Navigation Property
router.get('/MaintenanceNotificationCollection:key/to_MaintenanceOrder', maintNotificationController.getOrders);

// Function Imports
router.post('/SetToInProcess', csrfMiddleware, maintNotificationController.setToInProcess);
router.post('/Complete', csrfMiddleware, maintNotificationController.complete);
router.post('/Postpone', csrfMiddleware, maintNotificationController.postpone);

module.exports = router;
