const crypto = require('crypto');

// In-memory store for CSRF tokens to simulate session/token validation
// Key: token, Value: timestamp
const csrfTokens = new Map();
const MAX_TOKENS = 1000;

/**
 * Cleanup old tokens to prevent memory leaks if we exceed MAX_TOKENS
 */
const cleanupTokens = () => {
  if (csrfTokens.size > MAX_TOKENS) {
    // Convert to array and sort by oldest
    const sorted = [...csrfTokens.entries()].sort((a, b) => a[1] - b[1]);
    // Remove the oldest half
    const toRemove = sorted.slice(0, Math.floor(MAX_TOKENS / 2));
    for (const [key] of toRemove) {
      csrfTokens.delete(key);
    }
  }
};

/**
 * Middleware to handle SAP S/4HANA CSRF Token flows
 */
const csrfMiddleware = (req, res, next) => {
  const tokenHeader = req.headers['x-csrf-token'];

  // 1. Handling token fetch request
  // Only valid on GET/HEAD operations
  if (['GET', 'HEAD'].includes(req.method) && tokenHeader === 'fetch') {
    // Generate an arbitrary secure token (similar to SAP format)
    const newToken = crypto.randomBytes(32).toString('hex');
    
    // Store token with current timestamp
    csrfTokens.set(newToken, Date.now());
    cleanupTokens();

    res.setHeader('x-csrf-token', newToken);
    return next();
  }

  // 2. Handling mutating requests (POST, PUT, PATCH, DELETE)
  // These require a valid token
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (!tokenHeader || !csrfTokens.has(tokenHeader)) {
      // If token is invalid or missing, respond exactly with the standard SAP error
      return res.status(403).json({
        error: {
          code: 'CSRF_TOKEN_VALIDATION_FAILED',
          message: {
            lang: 'en',
            value: 'CSRF token validation failed'
          }
        }
      });
    }

    // SAP usually doesn't consume the token immediately (it lasts a session), 
    // but in a strict emulator we could optionally rotate it. We'll leave it valid
    // to match standard stateless fetch-then-post behavior.
  }

  // 3. Normal GET requests without "fetch" or valid POST/PUT/PATCH/DELETE
  next();
};

module.exports = csrfMiddleware;
