/**
 * SAP OData Response Wrapper Middleware
 *
 * Wraps all JSON responses in the SAP OData format:
 *   { d: { results: [...] } }           — for arrays
 *   { d: { ...object } }                — for single entities
 *   { d: { results: [], __count: n } }  — when count metadata is attached
 *
 * Attach `res.sapResult(data)` or `res.sapError(statusCode, message)` in controllers.
 */
function sapResponse(req, res, next) {
  /**
   * Send a successful SAP-formatted response.
   * @param {Object|Array} data — payload to wrap
   * @param {Object} [meta]    — optional metadata (e.g. __count)
   */
  res.sapResult = function (data, meta = {}) {
    if (Array.isArray(data)) {
      const envelope = { results: data, ...meta };
      return res.json({ d: envelope });
    }
    // Single entity
    return res.json({ d: data });
  };

  /**
   * Send an SAP-formatted error response.
   * @param {number} statusCode — HTTP status code
   * @param {string} message    — error description
   */
  res.sapError = function (statusCode, message) {
    return res.status(statusCode).json({
      error: {
        code: String(statusCode),
        message: {
          lang: 'en',
          value: message,
        },
      },
    });
  };

  next();
}

module.exports = sapResponse;
