const express = require('express');
const csrfMiddleware = require('../middleware/csrfMiddleware');
const sapV4Response = require('../middleware/sapV4Response');

const router = express.Router();

// Apply S/4HANA specific global headers
router.use((req, res, next) => {
  res.set('sap-system', 'S4HANA-EMULATOR');
  res.set('dataserviceversion', '2.0');
  next();
});

// Apply S/4HANA Response Formatter
router.use(sapV4Response);

// Apply CSRF validation
router.use(csrfMiddleware);

// ─── S/4HANA API Services ─────────────────────────────────────────────
// The services follow the naming convention API_[SERVICE_NAME]
router.use('/API_EQUIPMENT', require('./equipment'));
router.use('/API_FUNCTIONALLOCATION', require('./functionalLocation'));
router.use('/API_MAINTNOTIFICATION', require('./maintNotification'));
router.use('/API_MAINTENANCEORDER', require('./maintOrder'));
router.use('/API_MAINTPLAN', require('./maintPlan'));

module.exports = router;
