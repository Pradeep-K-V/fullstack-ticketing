// frontend/src/components/Nav.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Nav(){
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const nav = useNavigate();

  function logout(){
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    nav('/login');
  }

  return (
    <nav style={{ padding: 12, borderBottom: '1px solid #ddd' }}>
      <Link to="/">Tickets</Link> {' | '}
      <Link to="/tickets/create">Create Ticket</Link>
      <span style={{ float: 'right' }}>
        {user ? (
          <>
            <span style={{ marginRight: 10 }}>{user.email} ({user.role})</span>
            <button onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link> {' | '}
            <Link to="/register">Register</Link>
          </>
        )}
      </span>
    </nav>
  );
}
