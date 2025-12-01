// frontend/src/pages/TicketsList.jsx
import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import '../components/ticket-list.css'; // adjust path if your css is elsewhere

// Allowed transitions (same logic as backend; keep in sync)
const ALLOWED_TRANSITIONS = {
  Open: ['In-Progress'],
  'In-Progress': ['Resolved', 'Open'],
  Resolved: ['Closed', 'In-Progress'],
  Closed: []
};

function useDebounced(value, delay = 300){
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function TicketsList() {
  const { getAccessTokenSilently, user: auth0User } = useAuth0();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 300);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [expanded, setExpanded] = useState({});

  // admin detection: check localStorage (app user) OR Auth0 role claims
  function isAdminLocal() {
    try {
      const localUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (localUser && localUser.role === 'admin') return true;
    } catch (e) { /* ignore */ }

    if (auth0User) {
      // check common places where role may appear
      if (auth0User.role === 'admin') return true;
      const rolesClaim = auth0User['https://myapp.example.com/roles'] || auth0User['roles'];
      if (Array.isArray(rolesClaim) && rolesClaim.includes('admin')) return true;
    }
    return false;
  }

  const isAdmin = isAdminLocal();

  // load tickets
  async function load() {
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await api.get('/tickets', { headers: { Authorization: `Bearer ${token}` }});
      setTickets(res.data || []);
    } catch (err) {
      console.error('Failed to load tickets', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // derived filtered list
  const filtered = useMemo(() => {
    const ql = (debouncedQ || '').trim().toLowerCase();
    return tickets.filter(t => {
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      if (!ql) return true;
      const inTitle = (t.title || '').toLowerCase().includes(ql);
      const inDesc = (t.description || '').toLowerCase().includes(ql);
      return inTitle || inDesc;
    });
  }, [tickets, debouncedQ, statusFilter, priorityFilter]);

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Admin Actions ----------------------------------------------------------------

  async function deleteTicket(id) {
    if (!confirm('Delete ticket permanently?')) return;
    try {
      const token = await getAccessTokenSilently();
      await api.delete(`/tickets/${id}`, { headers: { Authorization: `Bearer ${token}` }});
      setTickets(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete ticket');
    }
  }

  async function changeStatus(ticket, newStatus) {
    if (!newStatus) return;
    try {
      const token = await getAccessTokenSilently();
      // use status endpoint which validates transitions (backend)
      const res = await api.patch(`/tickets/${ticket._id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // update local state
      setTickets(prev => prev.map(t => t._id === ticket._id ? res.data : t));
    } catch (err) {
      console.error('Status change failed', err);
      alert(err?.response?.data?.message || 'Failed to change status');
    }
  }

  async function assignTicket(ticket) {
  const raw = prompt('Enter assignee user id or email:', ticket.assignee || '');
  if (raw === null) return; // cancelled
  const assignee = raw.trim();
  if (!assignee) return alert('No assignee provided');

  try {
    const token = await getAccessTokenSilently();
    // we send assignee (can be email or id). backend will resolve email->id if needed
    const res = await api.put(`/tickets/${ticket._id}`, { assignee }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setTickets(prev => prev.map(t => t._id === ticket._id ? res.data : t));
    alert('Assigned successfully');
  } catch (err) {
    console.error('Assign failed', err);
    alert(err?.response?.data?.message || 'Failed to assign ticket');
  }
}


  // compute allowed transitions for a given status (client-side helper)
  function allowedFor(status) {
    return ALLOWED_TRANSITIONS[status] || [];
  }

  // ------------------------------------------------------------------------------

  return (
    <div className="tickets-container">
      <div className="tickets-header-row">
        <h2 className="tickets-title">Tickets</h2>

        <div className="tickets-actions">
          <input
            className="search-input"
            placeholder="Search title or description..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search tickets"
          />

          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="All">All statuses</option>
            <option value="Open">Open</option>
            <option value="InProgress">In-Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select className="filter-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} aria-label="Filter by priority">
            <option value="All">All priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="tickets-empty">Loading tickets…</div>
      ) : filtered.length === 0 ? (
        <div className="tickets-empty">No tickets found.</div>
      ) : (
        <ul className="tickets-grid" role="list">
          {filtered.map(t => {
            const isExpanded = !!expanded[t._id];
            const short = (t.description || '').slice(0, 140);
            return (
              <li key={t._id} className="ticket-card">
                <div className="ticket-card-inner">
                  <div className="ticket-left">
                    <Link to={`/tickets/${t._id}`} className="ticket-title-link">{t.title || 'Untitled ticket'}</Link>

                    <div className="ticket-sub">
                      <span className={`badge status-${(t.status||'Open').replace(' ', '').toLowerCase()}`}>{t.status}</span>
                      <span className={`badge priority-${(t.priority||'Low').toLowerCase()}`}>{t.priority}</span>
                      <span className="reporter">Reporter: {t.reporter || '—'}</span>
                    </div>

                    <div className="ticket-desc">
                      {isExpanded ? (
                        <>
                          <p className="desc-full">{t.description || <em>No description</em>}</p>
                          { (t.description || '').length > 140 && <button className="link-btn" onClick={() => toggleExpand(t._id)}>Show less</button> }
                        </>
                      ) : (
                        <>
                          <p className="desc-short">{short}{(t.description||'').length > 140 ? '…' : ''}</p>
                          { (t.description || '').length > 140 && <button className="link-btn" onClick={() => toggleExpand(t._id)}>Read more</button> }
                        </>
                      )}
                    </div>
                  </div>

                  <div className="ticket-right">
                    <div className="timestamps">
                      <div className="ts-row"><small>Created</small><strong>{new Date(t.createdAt).toLocaleString()}</strong></div>
                      <div className="ts-row"><small>Updated</small><strong>{new Date(t.updatedAt).toLocaleString()}</strong></div>
                    </div>

                    {/* ADMIN ACTIONS */}
                    {isAdmin && (
                      <div className="admin-actions">
                        <button className="admin-btn" onClick={() => assignTicket(t)}>Assign</button>

                        <div className="status-dropdown">
                          <select
                            onChange={(e) => {
                              const next = e.target.value;
                              if (next) changeStatus(t, next);
                              e.target.value = ''; // reset
                            }}
                            defaultValue=""
                          >
                            <option value="">Change status</option>
                            {allowedFor(t.status).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>

                        <button className="admin-btn danger" onClick={() => deleteTicket(t._id)}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
