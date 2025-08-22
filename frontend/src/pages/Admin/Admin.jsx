import React, { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from 'react-query';

export default function Admin() {
  const qc = useQueryClient();
  const [grantRole, setGrantRole] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg: string }
  const [email, setEmail] = useState('');

  const { data, isLoading, isError } = useQuery(['admin:requests'], async () => {
    const res = await axios.get('/admin/requests');
    return res.data;
  });

  const actMutation = useMutation(async ({ id, action }) => {
    const query = grantRole && action === 'approve' ? '?grantRole=true' : '';
    const res = await axios.post(`/admin/requests/${id}/${action}${query}`);
    return res.data;
  }, {
    onSuccess: (data, variables) => {
      setToast({ type: 'success', msg: data?.message || `Request ${variables.action}d` });
      qc.invalidateQueries(['admin:requests']);
      qc.invalidateQueries(['admin:pendingCount']);
      qc.invalidateQueries(['sidebar:adminPending']);
    },
    onError: (error) => {
      setToast({ type: 'error', msg: error?.response?.data?.message || 'Action failed' });
    }
  });

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (isError) return <div className="p-6 text-red-600">Failed to load admin requests.</div>;

  const requests = data?.requests || [];

  return (
    <div className="p-6 space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
             onAnimationEnd={() => {}}>
          <div className="flex items-center gap-3">
            <span className="font-medium">{toast.type === 'success' ? 'Success' : 'Error'}</span>
            <span className="opacity-90">•</span>
            <span>{toast.msg}</span>
            <button className="ml-3 text-white/80 hover:text-white" onClick={() => setToast(null)}>Dismiss</button>
          </div>
        </div>
      )}
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-300">Manage admin requests and roles.</p>

      <div className="flex items-center gap-2 p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <input id="grantRole" type="checkbox" className="accent-primary-600" checked={grantRole} onChange={(e) => setGrantRole(e.target.checked)} />
        <label htmlFor="grantRole" className="text-sm text-gray-700 dark:text-gray-300">
          On approve, also grant admin to the requester
        </label>
      </div>

      <div className="p-4 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
        <div className="font-semibold">Promote/Demote Admin</div>
        <div className="text-sm text-gray-600 dark:text-gray-300">Principal admin can promote or demote any user by email.</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input flex-1"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PromoteButtons email={email} setToast={setToast} />
        </div>
      </div>

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

function PromoteButtons({ email, setToast }) {
  const promote = useMutation(async () => {
    const res = await axios.post('/admin/promote', { email });
    return res.data;
  }, {
    onSuccess: (data) => setToast({ type: 'success', msg: data?.message || 'User promoted' }),
    onError: (err) => setToast({ type: 'error', msg: err?.response?.data?.message || 'Promote failed' })
  });

  const demote = useMutation(async () => {
    const res = await axios.post('/admin/demote', { email });
    return res.data;
  }, {
    onSuccess: (data) => setToast({ type: 'success', msg: data?.message || 'User demoted' }),
    onError: (err) => setToast({ type: 'error', msg: err?.response?.data?.message || 'Demote failed' })
  });

  const disabled = !email || promote.isLoading || demote.isLoading;

  return (
    <div className="flex items-center gap-2">
      <button className="btn btn-success" disabled={disabled} onClick={() => promote.mutate()}>
        {promote.isLoading ? 'Promoting…' : 'Promote to Admin'}
      </button>
      <button className="btn btn-error" disabled={disabled} onClick={() => demote.mutate()}>
        {demote.isLoading ? 'Demoting…' : 'Demote to User'}
      </button>
    </div>
  );
}
