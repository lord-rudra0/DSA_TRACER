import React, { useState } from 'react';
import axios from 'axios';
import { useQuery } from 'react-query';

export default function RequestAdmin() {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState(null);

  const { data, refetch, isFetching } = useQuery(['admin:myRequests'], async () => {
    const res = await axios.get('/admin/requests/mine');
    return res.data;
  });

  const submit = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const res = await axios.post('/admin/requests', { note });
      setStatus({ ok: true, msg: res.data?.message || 'Request submitted' });
      setNote('');
      refetch();
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.message || 'Failed to submit request' });
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-2">Contact Admin</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-4">Send a request to the principal admin. They can review and respond.</p>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Message (optional)</label>
          <textarea
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2"
            rows={4}
            placeholder="Write a short note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">Submit Request</button>
      </form>

      {status && (
        <div className={`mt-4 text-sm ${status.ok ? 'text-green-600' : 'text-red-600'}`}>
          {status.msg}
        </div>
      )}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Your recent requests</h2>
        <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y">
          {isFetching && (<div className="p-3 text-sm text-gray-500">Refreshing…</div>)}
          {(data?.requests?.length || 0) === 0 && (
            <div className="p-3 text-sm text-gray-500">No requests yet.</div>
          )}
          {data?.requests?.map((r) => (
            <div key={r._id} className="p-3 text-sm flex justify-between">
              <div>
                <div className="text-gray-800 dark:text-gray-100">{r.note || '(no message)'}</div>
                <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-xs">
                <span className={`px-2 py-1 rounded-full ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {r.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
