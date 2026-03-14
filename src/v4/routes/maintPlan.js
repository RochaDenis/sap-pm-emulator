const express = require('express');
const router = express.Router();
const controller = require('../controllers/maintPlanController');

// ─── MaintenancePlanCollection ──────────────────────────────────────────────

// GET /MaintenancePlanCollection
router.get('/MaintenancePlanCollection', controller.getCollection);

// GET /MaintenancePlanCollection(':MaintenancePlan')
router.get('/MaintenancePlanCollection\\(\':MaintenancePlan\'\\)', controller.getSingle);

// POST /MaintenancePlanCollection
router.post('/MaintenancePlanCollection', controller.create);

// PATCH /MaintenancePlanCollection(':MaintenancePlan')
router.patch('/MaintenancePlanCollection\\(\':MaintenancePlan\'\\)', controller.update);

// ─── Function Imports ──────────────────────────────────────────────────────

// POST /StartMaintPlnSchedule
router.post('/StartMaintPlnSchedule', controller.startSchedule);

// POST /RestartMaintPlnSchedule
router.post('/RestartMaintPlnSchedule', controller.restartSchedule);

// ─── Navigation Properties ─────────────────────────────────────────────────

// GET /MaintenancePlanCollection(':MaintenancePlan')/to_MaintenancePlanItem
router.get('/MaintenancePlanCollection\\(\':MaintenancePlan\'\\)/to_MaintenancePlanItem', controller.getItems);

// POST /MaintenancePlanCollection(':MaintenancePlan')/to_MaintenancePlanItem
router.post('/MaintenancePlanCollection\\(\':MaintenancePlan\'\\)/to_MaintenancePlanItem', controller.createItem);

module.exports = router;
