const express = require('express');
const maintOrderController = require('../controllers/maintOrderController');
const csrfMiddleware = require('../middleware/csrfMiddleware');

const router = express.Router();

// Helper function to extract key from route param that might look like "('123')"
router.param('key', (req, res, next, val) => {
  const match = val.match(/^\('?([^']+)'?\)$/);
  if (match) {
    req.params.MaintenanceOrder = match[1];
  } else {
    req.params.MaintenanceOrder = val;
  }
  next();
});

// CRUD Endpoints
router.get('/MaintenanceOrderCollection', maintOrderController.getCollection);
router.post('/MaintenanceOrderCollection', csrfMiddleware, maintOrderController.create);

router.get('/MaintenanceOrderCollection:key', maintOrderController.getSingle);

module.exports = router;
