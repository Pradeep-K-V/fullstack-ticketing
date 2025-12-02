// backend/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';
const JWT_EXPIRES = '8h';

// REGISTER
// backend/src/routes/auth.js  (REGISTER handler part)
router.post('/register', async (req, res) => {
  try {
    let { email, password, name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Prevent public users from registering as admin:
    if (role === 'admin') {
      // must present a valid admin token to create an admin
      const authHeader = req.get('authorization') || '';
      const m = authHeader.match(/^Bearer (.+)$/);
      if (!m) {
        // Do not allow creating admin without token
        role = 'customer';
      } else {
        try {
          const decoded = jwt.verify(m[1], JWT_SECRET);
          if (decoded.role !== 'admin') {
            // token exists but not admin -> disallow
            role = 'customer';
          } else {
            // ok: admin is creating an admin
            role = 'admin';
          }
        } catch (e) {
          // invalid token -> force customer
          role = 'customer';
        }
      }
    } else {
      // default role if not provided
      role = 'customer';
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({ email, passwordHash, name, role });
    await newUser.save();

    return res.status(201).json({ id: newUser._id, email: newUser.email, role: newUser.role });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});



// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const foundUser = await User.findOne({ email });
    if (!foundUser) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 🔥 THIS was your error line — FIXED
    const payload = {
      sub: String(foundUser._id),
      email: foundUser.email,
      role: foundUser.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

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
// backend/src/routes/auth.js (add near login/register exports)
const nodemailer = require('nodemailer');

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

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal that user doesn't exist
      return res.json({ message: 'If that account exists, a password reset link has been sent.' });
    }

    // create reset token (short lived)
    const token = jwt.sign({ sub: String(user._id), purpose: 'reset' }, RESET_SECRET, { expiresIn: RESET_EXPIRES });

    const resetLink = `${APP_URL}/reset-password?token=${token}`;

    // send email (if transporter configured) otherwise log link
    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: user.email,
        subject: 'Password reset',
        text: `You can reset your password using the following link (valid ${RESET_EXPIRES}):\n\n${resetLink}`,
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

// POST /auth/reset-password
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

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('reset-password error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /auth/refresh - refresh access token
router.post('/refresh', async (req, res) => {
  try {
    // Get the token from Authorization header
    const auth = req.get('authorization') || '';
    const m = auth.match(/^Bearer (.+)$/);
    
    if (!m) {
      return res.status(401).json({ message: 'No token provided' });
    }

    let payload;
    try {
      // Decode the token (don't verify expiration, just decode)
      payload = jwt.decode(m[1], { complete: false });
      if (!payload || !payload.sub) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    } catch (e) {
      console.error('Token decode error:', e.message);
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Get fresh user data from DB
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Issue a new token
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

module.exports = router;

