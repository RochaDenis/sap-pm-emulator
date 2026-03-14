/**
 * MSEG (Goods Movements) — Express Router
 * SAP OData-style paths: /MSEGSet and /MSEGSet('MBLNR')
 *
 * Mounted at the service root (e.g. /sap/opu/odata/sap/PM_MATERIAL_SRV).
 * Handles /MSEGSet and /MSEGSet('...') without a slash separator.
 */
const { Router } = require('express');
const ctrl = require('../controllers/msegController');

const router = Router();

// Middleware that extracts the key from /MSEGSet('...')
function extractKey(req, res, next) {
  req.params.MBLNR = req.params[0];
  next();
}

// List / Create
router.get('/MSEGSet', ctrl.getAll);
router.post('/MSEGSet', ctrl.create);

// Single entity by key — regex to match /MSEGSet('value')
const KEY_RE = /^\/MSEGSet\('([^']+)'\)$/;
router.get(KEY_RE, extractKey, ctrl.getById);
router.delete(KEY_RE, extractKey, ctrl.remove);

module.exports = router;
