import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">403 — Admins only</h1>
        <p className="text-gray-600 dark:text-gray-300">You don't have permission to access this page.</p>
      </div>
    );
  }
  return children;
}
