/**
 * QMEL (Maintenance Notification) — Express Router
 * SAP OData-style paths: /QMELSet and /QMELSet('QMNUM')
 *
 * Mounted at the service root (e.g. /sap/opu/odata/sap/PM_NOTIFICATION_SRV).
 * Handles /QMELSet and /QMELSet('...') without a slash separator.
 */
const { Router } = require('express');
const ctrl = require('../controllers/qmelController');

const router = Router();

// Middleware that extracts the key from /QMELSet('...')
function extractKey(req, res, next) {
  req.params.QMNUM = req.params[0];
  next();
}

// List / Create
router.get('/QMELSet', ctrl.getAll);
router.post('/QMELSet', ctrl.create);

// Single entity by key — regex to match /QMELSet('value')
const KEY_RE = /^\/QMELSet\('([^']+)'\)$/;
router.get(KEY_RE, extractKey, ctrl.getById);
router.put(KEY_RE, extractKey, ctrl.update);
router.patch(KEY_RE, extractKey, ctrl.patch);
router.delete(KEY_RE, extractKey, ctrl.remove);

module.exports = router;
