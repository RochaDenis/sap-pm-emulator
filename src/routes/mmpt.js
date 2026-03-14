/**
 * MMPT + PLPO (Maintenance Plan + Task List) — Express Router
 * SAP OData-style paths: /MMPTSet, /MMPTSet('WARPL'), /PLPOSet, /PLPOSet('PLNNR')
 *
 * Mounted at the service root (e.g. /sap/opu/odata/sap/PM_MAINTPLAN_SRV).
 */
const { Router } = require('express');
const ctrl = require('../controllers/mmptController');

const router = Router();

// ─── MMPTSet ──────────────────────────────────────────────────────────────────

function extractWarpl(req, res, next) {
  req.params.WARPL = req.params[0];
  next();
}

router.get('/MMPTSet', ctrl.getAll);
router.post('/MMPTSet', ctrl.create);

const MMPT_KEY_RE = /^\/MMPTSet\('([^']+)'\)$/;
router.get(MMPT_KEY_RE, extractWarpl, ctrl.getById);
router.put(MMPT_KEY_RE, extractWarpl, ctrl.update);
router.patch(MMPT_KEY_RE, extractWarpl, ctrl.patch);
router.delete(MMPT_KEY_RE, extractWarpl, ctrl.remove);

// ─── PLPOSet ──────────────────────────────────────────────────────────────────

function extractPlnnr(req, res, next) {
  req.params.PLNNR = req.params[0];
  next();
}

router.get('/PLPOSet', ctrl.getPlpoByPlan);
router.post('/PLPOSet', ctrl.createPlpo);

const PLPO_KEY_RE = /^\/PLPOSet\('([^']+)'\)$/;
router.delete(PLPO_KEY_RE, extractPlnnr, ctrl.removePlpo);

module.exports = router;
