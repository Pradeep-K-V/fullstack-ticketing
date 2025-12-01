import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function RequireAuth({ children }){
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) {
    loginWithRedirect();
    return <div>Redirecting to login...</div>;
  }
  return children;
}
