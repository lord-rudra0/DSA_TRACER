import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

export default function CompetitionsList() {
  const { user, refreshUser } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [reqLoading, setReqLoading] = useState(false);
  const [latestReq, setLatestReq] = useState(null);

  const onCreateClick = () => {
    if (isAdmin) {
      navigate('/competitions/create');
    } else {
      setMsg('');
      setModalOpen(true);
    }
  };

  const sendAdminRequest = async () => {
    try {
      setSubmitting(true);
      setMsg('');
      await axios.post('/admin/requests', {});
      setMsg('Request sent to admins. You will be notified when approved.');
      // Refresh latest request
      try {
        const { data } = await axios.get('/admin/requests/mine');
        setLatestReq((data.requests || [])[0] || null);
      } catch {}
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  // Load latest admin request when modal opens and refresh auth user
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      if (!modalOpen) return;
      setReqLoading(true);
      setMsg('');
      try {
        // refresh user role in case it changed
        try { await refreshUser(); } catch {}
        const { data } = await axios.get('/admin/requests/mine');
        if (!canceled) setLatestReq((data.requests || [])[0] || null);
      } catch (e) {
        if (!canceled) setLatestReq(null);
      } finally {
        if (!canceled) setReqLoading(false);
      }
    };
    load();
    return () => { canceled = true; };
  }, [modalOpen]);

  // If user becomes admin while modal is open, auto-close and navigate
  useEffect(() => {
    if (modalOpen && user?.role === 'admin') {
      setModalOpen(false);
      navigate('/competitions/create');
    }
  }, [modalOpen, user?.role]);

  return (
    <div className="p-6 space-y-4 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Competitions</h1>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-md transition-transform transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          style={{ background: 'linear-gradient(90deg,#6366f1,#06b6d4)' }}
          aria-label="Create a new competition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create</span>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="card p-6 text-gray-500">No competitions list yet. Create one to get started.</div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 h-12 w-12 rounded-xl bg-red-100 text-red-700 flex items-center justify-center dark:bg-red-900/30 dark:text-red-300 text-xl">!
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">You are not an admin</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Only admins can create competitions.
                  </p>

                  {/* Status line */}
                  <div className="mt-3">
                    {reqLoading ? (
                      <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    ) : latestReq ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${latestReq.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' : latestReq.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'}`}>
                        {`Latest request: ${latestReq.status}`}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">No previous admin requests.</span>
                    )}
                  </div>

                  {msg && <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{msg}</p>}

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={sendAdminRequest}
                      disabled={submitting || latestReq?.status === 'pending' || latestReq?.status === 'approved'}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-md transition-transform transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
                      style={{ background: 'linear-gradient(90deg,#6366f1,#06b6d4)' }}
                      aria-label="Send admin request"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>
                        {latestReq?.status === 'pending'
                          ? 'Request Pending'
                          : latestReq?.status === 'approved'
                          ? 'Already Approved'
                          : (submitting ? 'Sending…' : 'Send Admin Request')}
                      </span>
                    </button>
                    <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Tip: You can also send a request from your Profile page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
