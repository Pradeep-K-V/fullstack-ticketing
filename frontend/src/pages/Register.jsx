// frontend/src/pages/Register.jsx
import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import '../components/register.css';   // keep your styles

export default function Register(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const nav = useNavigate();

  async function submit(e){
    e.preventDefault();
    try {
      // Always register as "customer"
      await api.post('/auth/register', { 
        email, 
        password, 
        name,
        role: 'customer'   // 🔥 role forced here
      });

      alert('Registered successfully. Please login.');
      nav('/login');
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  }

  return (
    <div className="register-page">
      <form className="register-card" onSubmit={submit}>
        <h2 className="register-title">Create Account</h2>
        <p className="register-subtitle">Register to get started</p>

        <div className="input-group">
          <input 
            value={name}
            onChange={e=>setName(e.target.value)}
            required
            className="reg-input"
          />
          <label className="input-label">Full Name</label>
        </div>

        <div className="input-group">
          <input 
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
            className="reg-input"
          />
          <label className="input-label">Email</label>
        </div>

        <div className="input-group">
          <input 
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
            className="reg-input"
          />
          <label className="input-label">Password</label>
        </div>

        {/* Role removed completely */}

        <button type="submit" className="register-btn">Register</button>
      </form>
    </div>
  );
}
