const express = require('express');
const router = express.Router();
const { jwtAuth } = require('../middleware/jwtAuth');
const Ticket = require('../models/Ticket');

router.get('/', (req, res) => res.json({ ok: true }));

// Debug endpoint - check CORS and request info (no auth required)
router.get('/test-cors', (req, res) => {
  return res.json({
    message: 'CORS is working!',
    origin: req.get('origin'),
    method: req.method,
    headers: {
      'content-type': req.get('content-type'),
      'authorization': req.get('authorization') ? 'present' : 'missing'
    }
  });
});

// Debug endpoint - check current user and all tickets
router.get('/debug', jwtAuth, async (req, res) => {
  try {
    const allTickets = await Ticket.find().sort({createdAt: -1});
    return res.json({
      currentUser: req.user,
      totalTickets: allTickets.length,
      tickets: allTickets.map(t => ({
        id: t._id,
        title: t.title,
        reporter: t.reporter,
        status: t.status
      }))
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
