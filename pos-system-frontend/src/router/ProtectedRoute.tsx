// src/router/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('authToken');
  
  // If there's no token, redirect to the login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // If there is a token, render the child components (the protected part of the app)
  return children;
};

export default ProtectedRoute;