/**
 * Analytics — Express Router
 * SAP OData-style read-only analytical endpoints
 *
 * Mounted at /sap/opu/odata/sap/PM_ANALYTICS_SRV
 */
const { Router } = require('express');
const ctrl = require('../controllers/analyticsController');

const router = Router();

// Middleware that extracts the key from /Endpoint('...')
function extractKey(req, res, next) {
  req.params.EQUNR = req.params[0];
  next();
}

// ─── Collection endpoints (no key) ──────────────────────────────────────────
router.get('/OpenNotifications', ctrl.getOpenNotifications);
router.get('/OrderBacklog', ctrl.getOrderBacklog);
router.get('/CriticalEquipment', ctrl.getCriticalEquipment);
router.get('/MaintenanceCostByEquipment', ctrl.getMaintenanceCostByEquipment);
router.get('/PreventiveCompliance', ctrl.getPreventiveCompliance);

// ─── Single-key endpoints — regex to match /Endpoint('value') ───────────────
const HISTORY_RE = /^\/EquipmentHistory\('([^']+)'\)$/;
const MTBF_RE = /^\/EquipmentMTBF\('([^']+)'\)$/;
const MTTR_RE = /^\/EquipmentMTTR\('([^']+)'\)$/;

router.get(HISTORY_RE, extractKey, ctrl.getEquipmentHistory);
router.get(MTBF_RE, extractKey, ctrl.getEquipmentMTBF);
router.get(MTTR_RE, extractKey, ctrl.getEquipmentMTTR);

module.exports = router;
