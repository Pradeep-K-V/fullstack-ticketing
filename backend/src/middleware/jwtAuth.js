// backend/src/middleware/jwtAuth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';

function jwtAuth(req, res, next) {
  const auth = req.get('authorization') || '';
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(m[1], JWT_SECRET);
    req.user = { sub: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (Array.isArray(role)) {
      if (!role.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    } else {
      if (req.user.role !== role) return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { jwtAuth, requireRole };
