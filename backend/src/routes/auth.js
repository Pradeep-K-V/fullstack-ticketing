// backend/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h';
const RESET_SECRET = process.env.RESET_TOKEN_SECRET || JWT_SECRET;
const RESET_EXPIRES = process.env.RESET_TOKEN_EXPIRES || '1h';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Setup nodemailer transporter
let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// REGISTER
router.post('/register', async (req, res) => {
  try {
    console.log('[AUTH] POST /register - body:', req.body);
    let { email, password, name, role } = req.body;
    if (!email || !password) {
      console.warn('[AUTH] Missing email or password');
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Prevent public users from registering as admin
    if (role === 'admin') {
      const authHeader = req.get('authorization') || '';
      const m = authHeader.match(/^Bearer (.+)$/);
      if (!m) {
        role = 'customer';
      } else {
        try {
          const decoded = jwt.verify(m[1], JWT_SECRET);
          role = decoded.role === 'admin' ? 'admin' : 'customer';
        } catch (e) {
          role = 'customer';
        }
      }
    } else {
      role = 'customer';
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.warn('[AUTH] User already exists:', email);
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({ email, passwordHash, name, role });
    await newUser.save();
    console.log('[AUTH] User registered:', email, 'role:', role);

    return res.status(201).json({ id: newUser._id, email: newUser.email, role: newUser.role });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    console.log('[AUTH] POST /login - body:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      console.warn('[AUTH] Missing email or password');
      return res.status(400).json({ message: 'Email and password required' });
    }

    const foundUser = await User.findOne({ email });
    if (!foundUser) {
      console.warn('[AUTH] User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!valid) {
      console.warn('[AUTH] Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const payload = {
      sub: String(foundUser._id),
      email: foundUser.email,
      role: foundUser.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    console.log('[AUTH] Login successful for:', email);

    return res.json({
      token,
      user: {
        id: foundUser._id,
        email: foundUser.email,
        role: foundUser.role
      }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// REFRESH - FIX: must verify the token, not just decode it
router.post('/refresh', async (req, res) => {
  try {
    const auth = req.get('authorization') || '';
    const m = auth.match(/^Bearer (.+)$/);
    if (!m) {
      return res.status(401).json({ message: 'No token provided' });
    }

    let payload;
    try {
      // BUG FIX: use jwt.verify() instead of jwt.decode() so forged/tampered tokens are rejected.
      // We allow expired tokens here (ignoreExpiration: true) so the client can silently refresh
      // a recently-expired session, but the signature must still be valid.
      payload = jwt.verify(m[1], JWT_SECRET, { ignoreExpiration: true });
      if (!payload || !payload.sub) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    } catch (e) {
      console.error('Token verify error:', e.message);
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newPayload = {
      sub: String(user._id),
      email: user.email,
      role: user.role
    };

    const newToken = jwt.sign(newPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.json({ token: newToken });
  } catch (err) {
    console.error('refresh error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If that account exists, a password reset link has been sent.' });
    }

    const token = jwt.sign({ sub: String(user._id), purpose: 'reset' }, RESET_SECRET, { expiresIn: RESET_EXPIRES });
    const resetLink = `${APP_URL}/reset-password?token=${token}`;

    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: user.email,
        subject: 'Password reset',
        text: `Reset your password (valid ${RESET_EXPIRES}):\n\n${resetLink}`,
        html: `<p>Reset your password (valid ${RESET_EXPIRES}):</p><p><a href="${resetLink}">${resetLink}</a></p>`
      });
      console.log('Reset email sent to', user.email);
    } else {
      console.log('No SMTP configured — reset link (dev):', resetLink);
    }

    return res.json({ message: 'If that account exists, a password reset link has been sent.' });
  } catch (err) {
    console.error('forgot-password error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'token and newPassword required' });

    let payload;
    try {
      payload = jwt.verify(token, RESET_SECRET);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    if (payload.purpose !== 'reset' || !payload.sub) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('reset-password error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;