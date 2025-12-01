// backend/src/middleware/auth.js
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

function getAuthMiddleware(domain, audience) {
  if (!domain || !audience) {
    throw new Error('AUTH0_DOMAIN and AUTH0_AUDIENCE must be set');
  }

  return jwt({
    // signing keys
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${domain}/.well-known/jwks.json`
    }),
    audience: audience,
    issuer: `https://${domain}/`,
    algorithms: ['RS256'],
    // <--- add this line so decoded token is available at req.user
    requestProperty: 'user'
  });
}

module.exports = { getAuthMiddleware };
