import React, { useState } from 'react';
import api from '../api/axios'; // assumes you already have frontend/src/api/axios.js

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      // backend returns a neutral message to avoid user enumeration
      setMessage(res.data?.message || 'If that account exists, a reset link was sent.');
    } catch (err) {
      console.error('forgot-password error', err);
      // show either server-provided message or fallback
      const serverMsg = err?.response?.data?.message || err?.message || 'Request failed';
      setError(serverMsg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '32px auto', padding: 20, border: '1px solid #eee', borderRadius: 8 }}>
      <h2>Forgot password</h2>
      <p>Enter the email address for your account and we'll send a link to reset your password.</p>

      {message ? (
        <div style={{ padding: 12, background: '#e6ffed', border: '1px solid #b7f2c9', marginBottom: 12 }}>
          {message}
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: 12, background: '#ffecec', border: '1px solid #f5b2b2', marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 6, boxSizing: 'border-box' }}
            placeholder="you@example.com"
          />
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="submit" disabled={busy} style={{ padding: '8px 14px' }}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <button type="button" onClick={() => { setEmail(''); setMessage(null); setError(null); }} style={{ padding: '8px 14px' }}>
            Clear
          </button>
        </div>
      </form>

      <small style={{ display: 'block', marginTop: 14, color: '#666' }}>
        If you don't receive an email check your spam folder or ask an admin to reset your password.
      </small>
    </div>
  );
}
