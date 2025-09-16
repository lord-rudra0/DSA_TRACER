import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function FeedList({ autoRefresh = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/feed');
      setItems(data.items || []);
    } catch (e) {
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);
  useEffect(() => { if (autoRefresh) { const id = setInterval(fetch, 30000); return () => clearInterval(id); } }, [autoRefresh]);

  if (loading) return <div className="p-3 text-sm text-gray-500">Loading feed…</div>;
  if (!items.length) return <div className="p-3 text-sm text-gray-500">No posts yet.</div>;

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it._id} className="p-3 border rounded bg-white dark:bg-gray-900">
          <div className="flex items-start gap-3">
            <img src={it.user?.avatar || `https://ui-avatars.com/api/?name=${it.user?.leetcodeUsername || ''}`} className="h-8 w-8 rounded-full" alt="avatar" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="font-medium">{it.user?.leetcodeUsername}</div>
                <div className="text-xs text-gray-500">{new Date(it.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-2 text-sm">{it.text}</div>
              {it.meta?.title && (
                <div className="mt-2 text-xs text-gray-500">Shared: <a href={`https://leetcode.com/problems/${it.meta.titleSlug}/`} target="_blank" rel="noreferrer" className="text-blue-600">{it.meta.title}</a></div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
