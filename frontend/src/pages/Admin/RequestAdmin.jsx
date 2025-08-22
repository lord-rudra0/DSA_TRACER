import React, { useState } from 'react';
import axios from 'axios';

export default function RequestAdmin() {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const res = await axios.post('/admin/requests', { note });
      setStatus({ ok: true, msg: res.data?.message || 'Request submitted' });
      setNote('');
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
    </div>
  );
}
