/**
 * RESB (Reservations) — Express Router
 * SAP OData-style paths: /RESBSet and /RESBSet('RSNUM')
 *
 * Mounted at the service root (e.g. /sap/opu/odata/sap/PM_MATERIAL_SRV).
 * Handles /RESBSet and /RESBSet('...') without a slash separator.
 */
const { Router } = require('express');
const ctrl = require('../controllers/resbController');

const router = Router();

// Middleware that extracts the key from /RESBSet('...')
function extractKey(req, res, next) {
  req.params.RSNUM = req.params[0];
  next();
}

// List / Create
router.get('/RESBSet', ctrl.getAll);
router.post('/RESBSet', ctrl.create);

// Single entity by key — regex to match /RESBSet('value')
const KEY_RE = /^\/RESBSet\('([^']+)'\)$/;
router.get(KEY_RE, extractKey, ctrl.getById);
router.patch(KEY_RE, extractKey, ctrl.patch);
router.delete(KEY_RE, extractKey, ctrl.remove);

module.exports = router;
