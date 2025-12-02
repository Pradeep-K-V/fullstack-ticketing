// frontend/src/pages/CreateTicket.jsx
import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
//import { useAuth0 } from '@auth0/auth0-react';
import '../components/create-ticket.css';   // <-- ADD THIS LINE

export default function CreateTicket() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  //const { getAccessTokenSilently } = useAuth0();
  const nav = useNavigate();

  async function submit(e) {
  e.preventDefault();
  try {
    // Use the token that your backend returns on login (saved in localStorage)
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Not authenticated. Please login.');
      return;
    }
    // Use the api axios instance (it already attaches token from localStorage via interceptor)
    // If you'd like to explicitly pass headers, you may, but prefer using the api instance.
    const res = await api.post('/tickets', { title, description, priority });
    // success: navigate or show message
    nav('/');
  } catch (err) {
    const serverMsg = err?.response?.data?.message || err.message;
    alert('Create failed: ' + serverMsg);
  }
}


  return (
    <div className="create-page">
      <form className="create-card" onSubmit={submit}>
        <h2 className="create-title">Create New Ticket</h2>
        <p className="create-subtitle">Tell us what issue you're facing</p>

        {/* Title input */}
        <div className="input-group">
          <input 
            type="text"
            value={title}
            onChange={e=>setTitle(e.target.value)}
            required
            className="styled-input"
          />
          <label className="input-label">Title</label>
        </div>

        {/* Description textarea */}
        <div className="input-group textarea-group">
          <textarea
            value={description}
            onChange={e=>setDescription(e.target.value)}
            className="styled-textarea"
            rows={5}
            required
          />
          <label className="input-label">Description</label>
        </div>

        {/* Priority */}
        <div className="select-group">
          <label>Priority</label>
          <select 
            value={priority}
            onChange={e=>setPriority(e.target.value)}
            className="styled-select"
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>

        <button className="create-btn" type="submit">
          Create Ticket
        </button>
      </form>
    </div>
  );
}
