const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// All endpoints are GET only as per requirements
router.get('/EquipmentAvailability', analyticsController.getEquipmentAvailability);
router.get('/NotificationsByPhase', analyticsController.getNotificationsByPhase);
router.get('/OrdersByPhase', analyticsController.getOrdersByPhase);
router.get('/MaintenancePlanCompliance', analyticsController.getMaintenancePlanCompliance);
router.get('/CriticalEquipment', analyticsController.getCriticalEquipment);
router.get('/NotificationTrend', analyticsController.getNotificationTrend);
router.get('/OrderCostSummary', analyticsController.getOrderCostSummary);
router.get('/PlantMaintenanceSummary', analyticsController.getPlantMaintenanceSummary);

module.exports = router;
