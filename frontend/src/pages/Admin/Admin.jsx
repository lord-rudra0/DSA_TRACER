import React from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from 'react-query';

export default function Admin() {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery(['admin:requests'], async () => {
    const res = await axios.get('/admin/requests');
    return res.data;
  });

  const actMutation = useMutation(async ({ id, action }) => {
    const res = await axios.post(`/admin/requests/${id}/${action}`);
    return res.data;
  }, {
    onSuccess: () => qc.invalidateQueries(['admin:requests'])
  });

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (isError) return <div className="p-6 text-red-600">Failed to load admin requests.</div>;

  const requests = data?.requests || [];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-300">Manage user requests to contact the principal admin.</p>

      <div className="divide-y rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {requests.length === 0 && (
          <div className="p-4 text-gray-500">No requests.</div>
        )}
        {requests.map((r) => (
          <div key={r._id} className="p-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-medium">{r.user?.leetcodeUsername || r.user?.email}</div>
              <div className="text-sm text-gray-500">{r.user?.email}</div>
              {r.note && <div className="mt-1 text-sm">“{r.note}”</div>}
              <div className="text-xs text-gray-400 mt-1">Status: {r.status} • {new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-success"
                onClick={() => actMutation.mutate({ id: r._id, action: 'approve' })}
                disabled={actMutation.isLoading || r.status !== 'pending'}
              >Approve</button>
              <button
                className="btn btn-error"
                onClick={() => actMutation.mutate({ id: r._id, action: 'reject' })}
                disabled={actMutation.isLoading || r.status !== 'pending'}
              >Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
