const express = require('express');
const functionalLocationController = require('../controllers/functionalLocationController');
const csrfMiddleware = require('../middleware/csrfMiddleware');

const router = express.Router();

router.param('key', (req, res, next, val) => {
  const match = val.match(/^\('?([^']+)'?\)$/); 
  if (match) {
    req.params.FunctionalLocation = match[1];
  } else {
    req.params.FunctionalLocation = val;
  }
  next();
});

router.get('/FunctionalLocationCollection', functionalLocationController.getFunctionalLocationCollection);
router.post('/FunctionalLocationCollection', csrfMiddleware, functionalLocationController.createFunctionalLocation);

router.get('/FunctionalLocationCollection:key', functionalLocationController.getFunctionalLocation);
router.patch('/FunctionalLocationCollection:key', csrfMiddleware, functionalLocationController.updateFunctionalLocation);
router.delete('/FunctionalLocationCollection:key', csrfMiddleware, functionalLocationController.deleteFunctionalLocation);

module.exports = router;
