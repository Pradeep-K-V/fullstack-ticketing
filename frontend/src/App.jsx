import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TicketsList from './pages/TicketsList';
import TicketDetail from './pages/TicketDetail';
import CreateTicket from './pages/CreateTicket';
import Nav from './components/Nav';
import Login from './pages/Login';
import Register from './pages/Register';
// import
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function RequireAuth({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
}

export default function App(){
  return (
    <div>
      <Nav />
      <main style={{ padding: 20 }}>
        <Routes>
          <Route path="/" element={<RequireAuth><TicketsList /></RequireAuth>} />
          <Route path="/tickets/create" element={<RequireAuth><CreateTicket /></RequireAuth>} />
          <Route path="/tickets/:id" element={<RequireAuth><TicketDetail /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </main>
    </div>
  );
}
