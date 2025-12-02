// backend/src/routes/tickets.js
const express = require('express');
const Ticket = require('../models/Ticket');
const router = express.Router();
const { requireRole } = require('../middleware/jwtAuth');

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}


// List tickets
router.get('/', async (req, res) => {
  try {
    const requester = req.user ? req.user.sub : null;
    console.log('=== GET /api/tickets ===');
    console.log('req.user:', req.user);
    console.log('requester (sub):', requester);
    console.log('isAdmin:', isAdmin(req));
    
    if (isAdmin(req)) {
      const tickets = await Ticket.find().sort({createdAt: -1});
      console.log('✓ Admin view - found', tickets.length, 'tickets');
      console.log('Tickets:', tickets);
      return res.json(tickets);
    } else {
      console.log('🔍 Searching for tickets with reporter:', requester);
      const tickets = await Ticket.find({ reporter: requester }).sort({createdAt: -1});
      console.log('✓ User view - found', tickets.length, 'tickets');
      
      // Also log all tickets in the database
      const allTickets = await Ticket.find().sort({createdAt: -1});
      console.log('Total tickets in DB:', allTickets.length);
      allTickets.forEach(t => console.log('  Ticket:', t._id, 'reporter:', t.reporter, 'title:', t.title));
      
      return res.json(tickets);
    }
  } catch(err) {
    console.error('GET /api/tickets error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE ticket (with detailed logging)
router.post('/', async (req, res) => {
  try {
    console.log('--- POST /api/tickets called ---');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('req.user:', JSON.stringify(req.user, null, 2));

    const { title, description, priority } = req.body;
    if (!title) {
      console.warn('Validation failed: title missing');
      return res.status(400).json({ message: 'Title is required' });
    }

    const reporter = req.user ? (req.user.sub || req.user['sub']) : 'anonymous';
    const ticket = new Ticket({ title, description, priority, reporter });
    await ticket.save();
    console.log('Ticket saved, id=', ticket._id);
    res.status(201).json(ticket);
  } catch (err) {
    console.error('Error in POST /api/tickets:', err && err.stack ? err.stack : err);
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
  } catch(err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update ticket
router.put('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Not found' });

    if (!isAdmin(req) && ticket.reporter !== req.user.sub) {
      const { description } = req.body;
      if (description) {
        ticket.description = description;
        await ticket.save();
        return res.json(ticket);
      } else {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const { title, description, priority, status, assignee } = req.body;
    if (title) ticket.title = title;
    if (description) ticket.description = description;
    if (priority) ticket.priority = priority;
    if (status) ticket.status = status;
    if (assignee) ticket.assignee = assignee;
    await ticket.save();
    res.json(ticket);
  } catch(err) {
    res.status(500).json({ message: 'Server error' });
  }
});
// backend/src/routes/tickets.js

// Allowed transitions
const ALLOWED_TRANSITIONS = {
  Open: ['In-Progress'],
  'In-Progress': ['Resolved', 'Open'],
  Resolved: ['Closed', 'In-Progress'],
  Closed: [] // no transitions out of Closed by default
};

// Helper
function canTransition(current, next) {
  if (!ALLOWED_TRANSITIONS[current]) return false;
  return ALLOWED_TRANSITIONS[current].includes(next);
}

/**
 * PATCH /api/tickets/:id/status
 * body: { status: "In-Progress", assignee?: "<userId>" }
 * - validates allowed transition
 * - stores assignee if provided
 * - only allow status change if user is reporter, assignee or admin
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status: newStatus, assignee } = req.body;
    if (!newStatus) return res.status(400).json({ message: 'status is required' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // check authorization: admin or reporter or assignee can change status
    const user = req.user; // jwtAuth sets req.user
    const isAdmin = user && user.role === 'admin';
    const isReporter = user && user.sub === ticket.reporter;
    const isAssignee = user && user.sub === ticket.assignee;

    if (!isAdmin && !isReporter && !isAssignee) {
      return res.status(403).json({ message: 'Forbidden: only admin/reporter/assignee can change status' });
    }

    // check allowed transition
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
  await Ticket.findByIdAndDelete(req.params.id);
  res.json({ message: 'deleted' });
});

// PUT update (assignee or other fields) - requires auth; admin can update
router.put('/:id', async (req, res) => {
  const updates = req.body;
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Not found' });

  // permission: admin or reporter may change certain fields
  const user = req.user;
  if (!(user && (user.role === 'admin' || user.sub === ticket.reporter))) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  Object.assign(ticket, updates);
  await ticket.save();
  res.json(ticket);
});


// Add comment
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
  } catch(err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
