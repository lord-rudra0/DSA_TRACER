import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function CompetitionsList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Competitions</h1>
        {isAdmin && (
          <Link className="btn btn-primary" to="/competitions/create">Create</Link>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="card p-6 text-gray-500">No competitions list yet. Create one to get started.</div>
      </div>
    </div>
  );
}
