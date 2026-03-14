/**
 * EQUI (Equipment) — Express Router
 * SAP OData-style paths: /EQUISet and /EQUISet('EQUNR')
 *
 * Mounted at the service root (e.g. /sap/opu/odata/sap/PM_EQUIPMENT_SRV).
 * Handles /EQUISet and /EQUISet('...') without a slash separator.
 */
const { Router } = require('express');
const ctrl = require('../controllers/equiController');

const router = Router();

// Middleware that extracts the key from /EQUISet('...')
function extractKey(req, res, next) {
  req.params.EQUNR = req.params[0];
  next();
}

// List / Create
router.get('/EQUISet', ctrl.getAll);
router.post('/EQUISet', ctrl.create);

// Single entity by key — regex to match /EQUISet('value')
const KEY_RE = /^\/EQUISet\('([^']+)'\)$/;
router.get(KEY_RE, extractKey, ctrl.getById);
router.put(KEY_RE, extractKey, ctrl.update);
router.patch(KEY_RE, extractKey, ctrl.patch);
router.delete(KEY_RE, extractKey, ctrl.remove);

module.exports = router;
