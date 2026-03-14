/**
 * IFLOT (Functional Locations) — Express Router
 * SAP OData-style paths: /IFLOTSet and /IFLOTSet('TPLNR')
 *
 * Mounted at the service root (e.g. /sap/opu/odata/sap/PM_FUNCLOC_SRV).
 * Handles /IFLOTSet and /IFLOTSet('...') without a slash separator.
 */
const { Router } = require('express');
const ctrl = require('../controllers/iflotController');

const router = Router();

// Middleware that extracts the key from /IFLOTSet('...')
function extractKey(req, res, next) {
  req.params.TPLNR = req.params[0];
  next();
}

// List / Create
router.get('/IFLOTSet', ctrl.getAll);
router.post('/IFLOTSet', ctrl.create);

// Single entity by key — regex to match /IFLOTSet('value')
const KEY_RE = /^\/IFLOTSet\('([^']+)'\)$/;
router.get(KEY_RE, extractKey, ctrl.getById);
router.put(KEY_RE, extractKey, ctrl.update);
router.patch(KEY_RE, extractKey, ctrl.patch);
router.delete(KEY_RE, extractKey, ctrl.remove);

module.exports = router;
