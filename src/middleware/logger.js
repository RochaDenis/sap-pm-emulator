const morgan = require('morgan');

/**
 * Custom SAP-style request logger.
 *
 * Logs: METHOD  /endpoint  STATUS  response-time  timestamp
 * Example: GET  /api/orders  200  12.345 ms  2026-03-10T22:00:00.000Z
 */

// In-memory array to store the last 20 requests
const logs = [];
const MAX_LOGS = 20;

function addLog(method, url, status) {
  logs.unshift({ timestamp: new Date().toISOString(), method, url, status });
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
}

// Define a custom morgan token for ISO timestamp
morgan.token('iso-timestamp', () => new Date().toISOString());

// Custom log format
const logFormat =
  ':method\t:url\t:status\t:response-time ms\t:iso-timestamp';

/**
 * Returns a morgan middleware instance configured with the custom format.
 */
function createLogger() {
  const morganMiddleware = morgan(logFormat);
  return (req, res, next) => {
    res.on('finish', () => {
      // Log API and SAP endpoints, but exclude /api/logs itself to prevent self-loop noise
      if ((req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/sap')) && req.originalUrl !== '/api/logs') {
        addLog(req.method, req.originalUrl, res.statusCode);
      }
    });
    morganMiddleware(req, res, next);
  };
}

function getLogs() {
  return logs;
}

module.exports = { createLogger, getLogs };
