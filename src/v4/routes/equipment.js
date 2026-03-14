const express = require('express');
const equipmentController = require('../controllers/equipmentController');
const csrfMiddleware = require('../middleware/csrfMiddleware'); // CSRF specific to POST/PATCH/DELETE

const router = express.Router();

// Extract single key safely, simple middleware or inline regex in routes:
// OData v4 URL format: /EquipmentCollection('EQ-00001')

// Helper function to extract key from route param that might look like "('EQ-00001')"
router.param('key', (req, res, next, val) => {
  const match = val.match(/^\('?([^']+)'?\)$/); // Match ('123') or ('123')
  if (match) {
    req.params.Equipment = match[1];
  } else {
    // If it's just a raw ID without parenthesis
    req.params.Equipment = val;
  }
  next();
});

router.get('/EquipmentCollection', equipmentController.getEquipmentCollection);
router.post('/EquipmentCollection', csrfMiddleware, equipmentController.createEquipment);

router.get('/EquipmentCollection:key', equipmentController.getEquipment);
router.patch('/EquipmentCollection:key', csrfMiddleware, equipmentController.updateEquipment);
router.delete('/EquipmentCollection:key', csrfMiddleware, equipmentController.deleteEquipment);

router.get('/EquipmentCollection:key/to_MeasuringPoint', equipmentController.getEquipmentMeasuringPoints);

module.exports = router;
