import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

export default function FeedList({ autoRefresh = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [openComments, setOpenComments] = useState({});
  const [commentText, setCommentText] = useState({});

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

  const toggleLike = async (post) => {
    // optimistic update
    const hadLiked = post.likes?.some(l => l.toString() === user?.id);
    const newItems = items.map(it => it._id === post._id ? {
      ...it,
      likes: hadLiked ? (it.likes || []).filter(l => l.toString() !== user?.id) : [...(it.likes||[]), user?.id]
    } : it);
    setItems(newItems);
    try {
      await axios.post(`/feed/${post._id}/like`);
    } catch (e) {
      // revert on error
      setItems(items);
      console.error('Like failed', e?.response?.data || e.message);
    }
  };

  const toggleCommentsOpen = (postId) => {
    setOpenComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const submitComment = async (postId) => {
    const text = (commentText[postId] || '').trim();
    if (!text) return;
    // optimistic append
    const tempComment = { _id: `tmp-${Date.now()}`, text, user: { leetcodeUsername: user?.leetcodeUsername, avatar: user?.avatar }, createdAt: new Date().toISOString() };
    const prevItems = items;
    setItems(items.map(it => it._id === postId ? { ...it, comments: [...(it.comments||[]), tempComment] } : it));
    setCommentText(prev => ({ ...prev, [postId]: '' }));
    try {
      const { data } = await axios.post(`/feed/${postId}/comment`, { text });
      // replace temp comment with server comment if provided
      setItems(curr => curr.map(it => it._id === postId ? { ...it, comments: data.comments || it.comments } : it));
    } catch (e) {
      // revert
      setItems(prevItems);
      console.error('Comment failed', e?.response?.data || e.message);
    }
  };

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
              <div className="mt-3 flex items-center gap-3 text-sm">
                <button onClick={() => toggleLike(it)} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span className={`font-semibold ${it.likes?.some(l => l.toString() === user?.id) ? 'text-blue-600' : 'text-gray-600'}`}>Like</span>
                  <span className="text-xs text-gray-500">{(it.likes || []).length}</span>
                </button>
                <button onClick={() => toggleCommentsOpen(it._id)} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span className="font-semibold text-gray-600">Comment</span>
                  <span className="text-xs text-gray-500">{(it.comments || []).length}</span>
                </button>
              </div>

              {openComments[it._id] && (
                <div className="mt-3">
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {(it.comments || []).map(c => (
                      <div key={c._id} className="text-sm border-t pt-2">
                        <div className="text-xs text-gray-500">{c.user?.leetcodeUsername} • {new Date(c.createdAt).toLocaleString()}</div>
                        <div className="mt-1">{c.text}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input value={commentText[it._id] || ''} onChange={(e) => setCommentText(prev => ({ ...prev, [it._id]: e.target.value }))} placeholder="Write a comment..." className="flex-1 rounded px-3 py-2 border" />
                    <button onClick={() => submitComment(it._id)} className="px-3 py-2 bg-blue-600 text-white rounded">Send</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
