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
const PORT = process.env.PORT || 3001;

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
  customSiteTitle: 'SAP PM Emulator — API Docs',
  customCss: `
    .swagger-ui .topbar { background: #0f1520 !important; position: relative; }
    .swagger-ui .topbar-wrapper img { display: none; }
    .swagger-ui .topbar-wrapper::before {
      content: 'AxiomGO · SAP PM API';
      color: #00d97e;
      font-family: monospace;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.1em;
    }
    .dashboard-link {
      position: fixed;
      top: 8px;
      right: 16px;
      z-index: 9999;
      padding: 6px 14px;
      background: transparent;
      border: 1px solid #00d97e;
      color: #00d97e !important;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      text-decoration: none;
      border-radius: 2px;
      letter-spacing: 0.08em;
    }
    .dashboard-link:hover { background: rgba(0, 217, 126, 0.1); }
  `,
  customJs: '/dashboard-link.js',
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
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[AxiomGO] Server running on port ${PORT}`);
    console.log(`[AxiomGO] Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`[AxiomGO] API Docs:  http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
