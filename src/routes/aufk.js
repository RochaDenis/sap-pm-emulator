/**
 * AUFK (Maintenance Order) — Express Router
 * SAP OData-style paths: /AUFKSet and /AUFKSet('AUFNR')
 *
 * Mounted at the service root (e.g. /sap/opu/odata/sap/PM_ORDER_SRV).
 * Handles /AUFKSet and /AUFKSet('...') without a slash separator.
 */
const { Router } = require('express');
const ctrl = require('../controllers/aufkController');

const router = Router();

// Middleware that extracts the key from /AUFKSet('...')
function extractKey(req, res, next) {
  req.params.AUFNR = req.params[0];
  next();
}

// List / Create
router.get('/AUFKSet', ctrl.getAll);
router.post('/AUFKSet', ctrl.create);

// Single entity by key — regex to match /AUFKSet('value')
const KEY_RE = /^\/AUFKSet\('([^']+)'\)$/;
router.get(KEY_RE, extractKey, ctrl.getById);
router.put(KEY_RE, extractKey, ctrl.update);
router.patch(KEY_RE, extractKey, ctrl.patch);
router.delete(KEY_RE, extractKey, ctrl.remove);

module.exports = router;
