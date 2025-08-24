import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from 'react-query';

export default function Admin() {
  const qc = useQueryClient();
  const [grantRole, setGrantRole] = useState(() => {
    const saved = localStorage.getItem('admin:grantRole');
    return saved ? saved === 'true' : true; // default ON
  });

  const demoteByEmail = useMutation(async (email) => {
    const res = await axios.post('/admin/demote', { email });
    return res.data;
  }, {
    onSuccess: (data) => {
      setToast({ type: 'success', msg: data?.message || 'User demoted' });
      qc.invalidateQueries(['admin:admins']);
      qc.invalidateQueries(['admin:requests']);
    },
    onError: (error) => setToast({ type: 'error', msg: error?.response?.data?.message || 'Demote failed' })
  });
  const promoteByEmail = useMutation(async (email) => {
    const res = await axios.post('/admin/promote', { email });
    return res.data;
  }, {
    onSuccess: (data) => {
      setToast({ type: 'success', msg: data?.message || 'User promoted' });
      qc.invalidateQueries(['admin:admins']);
      qc.invalidateQueries(['admin:requests']);
    },
    onError: (error) => setToast({ type: 'error', msg: error?.response?.data?.message || 'Promote failed' })
  });
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg: string }
  const [statusFilter, setStatusFilter] = useState('pending'); // 'all' | 'pending' | 'approved' | 'rejected'

  useEffect(() => {
    localStorage.setItem('admin:grantRole', String(grantRole));
  }, [grantRole]);

function AdminRow({ u, setToast, onChanged }) {
  const demote = useMutation(async () => {
    const res = await axios.post('/admin/demote', { email: u.email });
    return res.data;
  }, {
    onSuccess: (data) => { setToast({ type: 'success', msg: data?.message || 'User demoted' }); onChanged?.(); },
    onError: (err) => setToast({ type: 'error', msg: err?.response?.data?.message || 'Demote failed' })
  });

  return (
    <div className="py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src={u.avatar || 'https://api.dicebear.com/7.x/identicon/svg'} alt="avatar" className="w-8 h-8 rounded-full" />
        <div>
          <div className="font-medium">{u.leetcodeUsername || u.email}</div>
          <div className="text-sm text-gray-500">{u.email} {u.isPrincipal && <span className="ml-2 px-2 py-0.5 text-xs rounded bg-indigo-600 text-white">Principal</span>}</div>
        </div>
      </div>
      <div>
        <button className="btn btn-error" disabled={u.isPrincipal || demote.isLoading} onClick={() => demote.mutate()}>
          {demote.isLoading ? 'Demoting…' : 'Demote'}
        </button>
      </div>
    </div>
  );
}
  const [email, setEmail] = useState('');

  const { data, isLoading, isError } = useQuery(['admin:requests'], async () => {
    const res = await axios.get('/admin/requests');
    return res.data;
  });

  const { data: adminsData, isLoading: adminsLoading, refetch: refetchAdmins } = useQuery(['admin:admins'], async () => {
    const res = await axios.get('/admin/admins');
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
  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };
  const filtered = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter);

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
          <PromoteButtons email={email} setToast={setToast} onChanged={refetchAdmins} />
        </div>
      </div>

      <div className="p-4 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
        <div className="font-semibold">Current Admins</div>
        {adminsLoading ? (
          <div>Loading admins…</div>
        ) : (
          <div className="divide-y">
            {(adminsData?.admins || []).length === 0 && (
              <div className="py-2 text-gray-500">No admins.</div>
            )}
            {(adminsData?.admins || []).map((u) => (
              <AdminRow key={u.id} u={u} setToast={setToast} onChanged={refetchAdmins} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
          ].map(t => (
            <button
              key={t.key}
              className={`px-3 py-1.5 rounded text-sm border ${statusFilter === t.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'}`}
              onClick={() => setStatusFilter(t.key)}
            >{t.label} <span className="ml-1 opacity-80">({counts[t.key]})</span></button>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="p-4 text-gray-500">No {statusFilter} requests.</div>
        )}
        <div className="divide-y">
        {filtered.map((r) => (
          <div key={r._id} className="p-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-medium">{r.user?.leetcodeUsername || r.user?.email}</div>
              <div className="text-sm text-gray-500">{r.user?.email}</div>
              {r.note && <div className="mt-1 text-sm">“{r.note}”</div>}
              <div className="text-xs text-gray-400 mt-1">Status: {r.status} • {new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              {r.status === 'pending' && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      if (!window.confirm('Approve this admin request?')) return;
                      actMutation.mutate({ id: r._id, action: 'approve' });
                    }}
                    disabled={actMutation.isLoading}
                  >Approve</button>
                  <button
                    className="btn btn-error"
                    onClick={() => {
                      if (!window.confirm('Reject this admin request?')) return;
                      actMutation.mutate({ id: r._id, action: 'reject' });
                    }}
                    disabled={actMutation.isLoading}
                  >Reject</button>
                </>
              )}
              {r.status === 'approved' && r.user?.role === 'admin' && (
                <button
                  className="btn btn-error"
                  onClick={() => {
                    if (!window.confirm('Demote this admin back to user?')) return;
                    demoteByEmail.mutate(r.user.email);
                  }}
                  disabled={demoteByEmail.isLoading}
                >Demote</button>
              )}
              {r.status === 'approved' && r.user?.role !== 'admin' && (
                <>
                  <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium">Approved</span>
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      if (!window.confirm('Grant admin to this approved requester now?')) return;
                      promoteByEmail.mutate(r.user.email);
                    }}
                    disabled={promoteByEmail.isLoading}
                  >Promote Now</button>
                </>
              )}
              {r.status === 'rejected' && (
                <span className="px-2 py-1 rounded bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs font-medium">Rejected</span>
              )}
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}

function PromoteButtons({ email, setToast, onChanged }) {
  const promote = useMutation(async () => {
    const res = await axios.post('/admin/promote', { email });
    return res.data;
  }, {
    onSuccess: (data) => { setToast({ type: 'success', msg: data?.message || 'User promoted' }); onChanged?.(); },
    onError: (err) => setToast({ type: 'error', msg: err?.response?.data?.message || 'Promote failed' })
  });

  const demote = useMutation(async () => {
    const res = await axios.post('/admin/demote', { email });
    return res.data;
  }, {
    onSuccess: (data) => { setToast({ type: 'success', msg: data?.message || 'User demoted' }); onChanged?.(); },
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
