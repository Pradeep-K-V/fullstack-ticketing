import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const nav = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Reset token missing. Please use the link from your email.');
    }
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!password || password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);
    try {
      const res = await api.post('/auth/reset-password', { token, newPassword: password });
      setMessage(res.data?.message || 'Password updated. You can now log in.');
      // optional: redirect to login after short delay
      setTimeout(() => nav('/login'), 1800);
    } catch (err) {
      console.error('reset-password error', err);
      setError(err?.response?.data?.message || err?.message || 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Invalid reset link</h3>
        <p>No token provided. Please use the link sent to your email.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '32px auto', padding: 20, border: '1px solid #eee', borderRadius: 8 }}>
      <h2>Reset password</h2>

      {message ? <div style={{ padding: 12, background: '#e6ffed', border: '1px solid #b7f2c9' }}>{message}</div> : null}
      {error ? <div style={{ padding: 12, background: '#ffecec', border: '1px solid #f5b2b2' }}>{error}</div> : null}

      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          New password
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 6 }} />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          Confirm password
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 6 }} />
        </label>

        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={busy} style={{ padding: '8px 14px' }}>
            {busy ? 'Saving…' : 'Set new password'}
          </button>
        </div>
      </form>
    </div>
  );
}
