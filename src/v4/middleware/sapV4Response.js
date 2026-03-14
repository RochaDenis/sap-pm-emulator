/**
 * Middleware that attaches S/4HANA compatible formatting methods to the Response object.
 * SAP S/4HANA OData v2 usually wraps responses in `{ "d": { ... } }` and errors have a specific format.
 */
const sapV4Response = (req, res, next) => {
  /**
   * Send a formatted success response for an entity collection (list)
   * { "d": { "results": [ ... ] } }
   * 
   * @param {Array} results Array of JS objects
   * @param {number} status HTTP status code (default: 200)
   */
  res.s4Result = (results, status = 200, extraData = {}) => {
    res.status(status).json({
      d: {
        results: Array.isArray(results) ? results : [results],
        ...extraData
      }
    });
  };

  /**
   * Send a formatted success response for a single entity
   * { "d": { ...entity } }
   * 
   * @param {Object} entity Single JS object
   * @param {number} status HTTP status code (default: 200)
   */
  res.s4Single = (entity, status = 200) => {
    res.status(status).json({
      d: entity
    });
  };

  /**
   * Send a formatted SAP S/4HANA error response
   * 
   * @param {number} status HTTP status code 
   * @param {string} message Error message
   * @param {string} code SAP Error Code (default 'INTERNAL_ERROR')
   * @param {Array} details Inner error details
   */
  res.s4Error = (status, message, code = 'INTERNAL_ERROR', details = []) => {
    res.status(status).json({
      error: {
        code,
        message: {
          lang: 'en',
          value: message
        },
        innererror: {
          errordetails: details
        }
      }
    });
  };

  next();
};

module.exports = sapV4Response;
