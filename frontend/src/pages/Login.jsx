// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import '../components/login.css';   // ⬅️ ADD THIS LINE

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      nav('/');
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Login to continue</p>

        <div className="input-group">
          <input 
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
            className="login-input"
          />
          <label className="input-label">Email</label>
        </div>

        <div className="input-group">
          <input 
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
            className="login-input"
          />
          <label className="input-label">Password</label>
        </div>

        <div className="login-extra">
          <a href="/forgot-password" className="forgot-link">Forgot password?</a>
        </div>

        <button type="submit" className="login-btn">Login</button>
      </form>
    </div>
  );
}
