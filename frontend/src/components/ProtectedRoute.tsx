import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('candidate' | 'panel' | 'admin')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const userStr = localStorage.getItem('user');
  const role = localStorage.getItem('role');

  if (!userStr || !role) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (!user || !user.role) {
      return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
      if (user.role === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (user.role === 'panel') {
        return <Navigate to="/panel/dashboard" replace />;
      } else if (user.role === 'candidate') {
        return <Navigate to="/candidate/dashboard" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  } catch (error) {
    console.error('Error parsing user in ProtectedRoute:', error);
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

interface PublicRouteProps {
  children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const userStr = localStorage.getItem('user');
  const role = localStorage.getItem('role');

  if (userStr && role) {
    if (role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (role === 'panel') {
      return <Navigate to="/panel/dashboard" replace />;
    } else if (role === 'candidate') {
      return <Navigate to="/candidate/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
