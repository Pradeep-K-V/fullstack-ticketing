import React from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginButton(){
  const nav = useNavigate();
  return <button onClick={() => nav('/login')}>Log in</button>;
}

export function LogoutButton(){
  const nav = useNavigate();
  
  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    nav('/login');
  }
  
  return <button onClick={handleLogout}>Log out</button>;
}
