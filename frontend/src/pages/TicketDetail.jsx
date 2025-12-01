// frontend/src/pages/TicketDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth0 } from '@auth0/auth0-react';
import '../components/ticket-detail.css';   // <-- ADD THIS

export default function TicketDetail() {
  const { id } = useParams();
  const { getAccessTokenSilently } = useAuth0();
  const [ticket, setTicket] = useState(null);
  const [comment, setComment] = useState('');

  async function load() {
    const token = await getAccessTokenSilently();
    const res = await api.get(`/tickets/${id}`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    setTicket(res.data);
  }

  useEffect(() => { load(); }, [id]);

  async function postComment(e) {
    e.preventDefault();
    const token = await getAccessTokenSilently();
    const res = await api.post(
      `/tickets/${id}/comments`, 
      { text: comment },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setTicket(res.data);
    setComment('');
  }

  if (!ticket) return <div className="loading">Loading...</div>;

  return (
    <div className="detail-page">
      <div className="detail-card">

        <h2 className="detail-title">{ticket.title}</h2>

        <div className="detail-meta">
          <span className={`badge status-${ticket.status.replace(" ","").toLowerCase()}`}>
            {ticket.status}
          </span>

          <span className={`badge priority-${ticket.priority.toLowerCase()}`}>
            {ticket.priority}
          </span>
        </div>

        <p className="detail-description">{ticket.description}</p>

        <div className="comment-section">
          <h3>Comments</h3>

          {ticket.comments.length === 0 ? (
            <p className="no-comments">No comments yet.</p>
          ) : (
            <ul className="comment-list">
              {ticket.comments.map((c, i) => (
                <li key={i} className="comment-item">
                  <div className="comment-author">{c.author}</div>
                  <div className="comment-text">{c.text}</div>
                </li>
              ))}
            </ul>
          )}

          <form className="comment-form" onSubmit={postComment}>
            <textarea 
              className="comment-input"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a comment..."
              required
            />
            <button className="comment-btn" type="submit">Post Comment</button>
          </form>
        </div>

      </div>
    </div>
  );
}
