/**
 * MARA (Materials) — Express Router
 * SAP OData-style paths: /MARASet and /MARASet('MATNR')
 *
 * Mounted at the service root (e.g. /sap/opu/odata/sap/PM_MATERIAL_SRV).
 * Handles /MARASet and /MARASet('...') without a slash separator.
 */
const { Router } = require('express');
const ctrl = require('../controllers/maraController');

const router = Router();

// Middleware that extracts the key from /MARASet('...')
function extractKey(req, res, next) {
  req.params.MATNR = req.params[0];
  next();
}

// List / Create
router.get('/MARASet', ctrl.getAll);
router.post('/MARASet', ctrl.create);

// Single entity by key — regex to match /MARASet('value')
const KEY_RE = /^\/MARASet\('([^']+)'\)$/;
router.get(KEY_RE, extractKey, ctrl.getById);
router.put(KEY_RE, extractKey, ctrl.update);
router.patch(KEY_RE, extractKey, ctrl.patch);
router.delete(KEY_RE, extractKey, ctrl.remove);

module.exports = router;
