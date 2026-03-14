/**
 * IMPTT (Measurement Points) — Express Router
 * SAP OData-style paths: /IMPTTSet and /IMPTTSet('POINT')
 *
 * Mounted at the service root (e.g. /sap/opu/odata/sap/PM_MEASPOINT_SRV).
 */
const { Router } = require('express');
const ctrl = require('../controllers/impttController');

const router = Router();

function extractPoint(req, res, next) {
  req.params.POINT = req.params[0];
  next();
}

// List / Create
router.get('/IMPTTSet', ctrl.getAll);
router.post('/IMPTTSet', ctrl.create);

// Single entity by key
const KEY_RE = /^\/IMPTTSet\('([^']+)'\)$/;
router.get(KEY_RE, extractPoint, ctrl.getById);
router.patch(KEY_RE, extractPoint, ctrl.patch);
router.delete(KEY_RE, extractPoint, ctrl.remove);

module.exports = router;
