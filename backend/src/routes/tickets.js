// backend/src/routes/tickets.js
const express = require('express');
const Ticket = require('../models/Ticket');
const router = express.Router();
const { requireRole } = require('../middleware/jwtAuth');

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

// Allowed transitions (keep in sync with frontend)
const ALLOWED_TRANSITIONS = {
  Open: ['In-Progress'],
  'In-Progress': ['Resolved', 'Open'],
  Resolved: ['Closed', 'In-Progress'],
  Closed: []
};

function canTransition(current, next) {
  if (!ALLOWED_TRANSITIONS[current]) return false;
  return ALLOWED_TRANSITIONS[current].includes(next);
}

// LIST tickets
router.get('/', async (req, res) => {
  try {
    const requester = req.user ? req.user.sub : null;
    console.log('=== GET /api/tickets ===');
    console.log('req.user:', req.user);
    console.log('isAdmin:', isAdmin(req));

    if (isAdmin(req)) {
      const tickets = await Ticket.find().sort({ createdAt: -1 });
      console.log('Admin view - found', tickets.length, 'tickets');
      return res.json(tickets);
    } else {
      const tickets = await Ticket.find({ reporter: requester }).sort({ createdAt: -1 });
      console.log('User view - found', tickets.length, 'tickets for reporter:', requester);
      return res.json(tickets);
    }
  } catch (err) {
    console.error('GET /api/tickets error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE ticket
router.post('/', async (req, res) => {
  try {
    console.log('--- POST /api/tickets called ---');
    console.log('req.user:', JSON.stringify(req.user, null, 2));

    const { title, description, priority } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const reporter = req.user ? req.user.sub : 'anonymous';
    const ticket = new Ticket({ title, description, priority, reporter });
    await ticket.save();
    console.log('Ticket saved, id=', ticket._id);
    res.status(201).json(ticket);
  } catch (err) {
    console.error('Error in POST /api/tickets:', err?.stack || err);
    res.status(500).json({ message: 'Server error', detail: err?.message });
  }
});

// GET one ticket
router.get('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Not found' });

    if (!isAdmin(req) && ticket.reporter !== req.user.sub) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE ticket (BUG FIX: removed duplicate route; whitelist allowed fields)
router.put('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Not found' });

    const user = req.user;
    const admin = user && user.role === 'admin';
    const reporter = user && user.sub === ticket.reporter;

    if (!admin && !reporter) {
      // Non-owner customers can only update description
      const { description } = req.body;
      if (description) {
        ticket.description = description;
        await ticket.save();
        return res.json(ticket);
      }
      return res.status(403).json({ message: 'Forbidden' });
    }

    // BUG FIX: whitelist updatable fields instead of Object.assign(ticket, updates)
    // which would allow overwriting reporter, _id, comments, etc.
    const { title, description, priority, status, assignee } = req.body;
    if (title !== undefined) ticket.title = title;
    if (description !== undefined) ticket.description = description;
    if (priority !== undefined) ticket.priority = priority;
    if (admin) {
      // only admin can change status and assignee via PUT
      if (status !== undefined) ticket.status = status;
      if (assignee !== undefined) ticket.assignee = assignee;
    }

    await ticket.save();
    res.json(ticket);
  } catch (err) {
    console.error('PUT /api/tickets/:id error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status: newStatus, assignee } = req.body;
    if (!newStatus) return res.status(400).json({ message: 'status is required' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const user = req.user;
    const admin = user && user.role === 'admin';
    const isReporter = user && user.sub === ticket.reporter;
    const isAssignee = user && user.sub === ticket.assignee;

    if (!admin && !isReporter && !isAssignee) {
      return res.status(403).json({ message: 'Forbidden: only admin/reporter/assignee can change status' });
    }

    if (!canTransition(ticket.status, newStatus)) {
      return res.status(400).json({ message: `Invalid transition from ${ticket.status} to ${newStatus}` });
    }

    ticket.status = newStatus;
    if (assignee) ticket.assignee = assignee;
    await ticket.save();

    return res.json(ticket);
  } catch (err) {
    console.error('PATCH /api/tickets/:id/status error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ message: 'deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD comment
router.post('/:id/comments', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Not found' });

    const author = req.user ? (req.user.name || req.user.sub) : 'anonymous';
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment text required' });

    ticket.comments.push({ author, text });
    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;