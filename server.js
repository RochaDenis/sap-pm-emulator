require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./src/config/swagger');
const swaggerSpecV4 = require('./src/v4/config/swagger');
const sapResponse = require('./src/middleware/sapResponse');
const { createLogger, getLogs } = require('./src/middleware/logger');
const v4Router = require('./src/v4/routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Global Middleware ────────────────────────────────────────────────
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(createLogger());
app.use(sapResponse);

// ─── Static Files ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Swagger Documentation ────────────────────────────────────────────
// Combine ECC and S/4HANA tags and paths
const combinedSwaggerSpec = {
  ...swaggerSpec,
  tags: [...swaggerSpec.tags, ...swaggerSpecV4.tags],
  paths: { ...swaggerSpec.paths, ...swaggerSpecV4.paths }
};

app.get('/api-docs.json', (req, res) => res.json(combinedSwaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(combinedSwaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SAP PM Emulator — API Docs',
}));

// ─── API Routes (ECC) ──────────────────────────────────────────────────
app.use('/sap/opu/odata/sap/PM_EQUIPMENT_SRV', require('./src/routes/equi'));
app.use('/sap/opu/odata/sap/PM_FUNCLOC_SRV', require('./src/routes/iflot'));
app.use('/sap/opu/odata/sap/PM_NOTIFICATION_SRV', require('./src/routes/qmel'));
app.use('/sap/opu/odata/sap/PM_ORDER_SRV', require('./src/routes/aufk'));
app.use('/sap/opu/odata/sap/PM_MAINTPLAN_SRV', require('./src/routes/mmpt'));
app.use('/sap/opu/odata/sap/PM_MEASPOINT_SRV', require('./src/routes/imptt'));
app.use('/sap/opu/odata/sap/PM_MATERIAL_SRV', require('./src/routes/mara'));
app.use('/sap/opu/odata/sap/PM_MATERIAL_SRV', require('./src/routes/resb'));
app.use('/sap/opu/odata/sap/PM_MATERIAL_SRV', require('./src/routes/mseg'));
app.use('/sap/opu/odata/sap/PM_ANALYTICS_SRV', require('./src/routes/analytics'));

// ─── API Routes (S/4HANA) ──────────────────────────────────────────────
const analyticsRoutes = require('./src/v4/routes/analytics');
app.use('/sap/opu/odata/sap/PM_S4_ANALYTICS_SRV', require('./src/v4/middleware/sapV4Response'), analyticsRoutes);

app.use('/sap/opu/odata/sap', v4Router);

// ─── Health Check ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.sapResult({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── Logs Endpoint ────────────────────────────────────────────────────
app.get('/api/logs', (req, res) => res.json(getLogs()));

// ─── 404 Handler ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.sapError(404, `Resource not found: ${req.method} ${req.originalUrl}`);
});

// ─── Global Error Handler ─────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[SAP-PM] Unhandled error:', err.message);
  res.sapError(500, err.message || 'Internal server error');
});

// ─── Start Server ─────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🔧 SAP PM Emulator running on http://localhost:${PORT}`);
    console.log(`📄 API Docs available at http://localhost:${PORT}/api-docs\n`);
  });
}

module.exports = app;
