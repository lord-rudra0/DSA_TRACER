import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

export default function Friends() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }
    let canceled = false;
    (async () => {
      try {
        setSearching(true);
        const { data } = await axios.get('/users/search', { params: { q: debouncedQuery, limit: 20 } });
        if (!canceled) setResults(data.users || []);
      } catch (e) {
        if (!canceled) setResults([]);
      } finally {
        if (!canceled) setSearching(false);
      }
    })();
    return () => { canceled = true; };
  }, [debouncedQuery]);

  const refreshAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [friendsRes, reqRes] = await Promise.all([
        axios.get('/users/friends'),
        axios.get('/users/friends/requests'),
      ]);
      setFriends(friendsRes.data || []);
      setRequests(reqRes.data || { incoming: [], outgoing: [] });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const act = async (action, targetId) => {
    try {
      await axios.post(`/users/friends/${action}/${targetId}`);
      // Refresh lists and search statuses
      await refreshAll();
      if (debouncedQuery) {
        const { data } = await axios.get('/users/search', { params: { q: debouncedQuery, limit: 20 } });
        setResults(data.users || []);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Action failed');
      setTimeout(() => setError(''), 2500);
    }
  };

  const isFriend = useMemo(() => new Set(friends.map(f => f._id)), [friends]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Friends</h1>
      <p className="text-gray-600 dark:text-gray-300 mt-2">Find and manage your friends.</p>

      {error && (
        <div className="mt-4 p-3 rounded bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Search users</label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or name"
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring focus:border-indigo-500"
        />
      </div>

      {/* Search results */}
      {debouncedQuery && (
        <div className="mt-4">
          <h2 className="text-lg font-medium">Results</h2>
          {searching ? (
            <p className="text-gray-500 mt-2">Searching...</p>
          ) : results.length === 0 ? (
            <p className="text-gray-500 mt-2">No users found.</p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800 rounded border border-gray-200 dark:border-gray-800">
              {results.map(u => (
                <li key={u._id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}`} alt="avatar" className="h-8 w-8 rounded-full" />
                    <div>
                      <div className="font-medium">{u.username}</div>
                      <div className="text-xs text-gray-500">Level {u.level} • {u.totalProblems} solved</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderActionButton(u, isFriend, act)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Requests */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <section>
          <h2 className="text-lg font-medium">Pending Requests</h2>
          <div className="mt-2">
            {(requests.incoming?.length || 0) + (requests.outgoing?.length || 0) === 0 ? (
              <p className="text-gray-500">No pending requests.</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded border border-gray-200 dark:border-gray-800">
                {uniqueById([...(requests.incoming || []), ...(requests.outgoing || [])]).map(({ user: u }) => (
                  <li key={u._id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}`} alt="avatar" className="h-8 w-8 rounded-full" />
                      <div>
                        <div className="font-medium">{u.username}</div>
                        <div className="text-xs text-gray-500">Level {u.level}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => act('accept', u._id)} className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">Accept</button>
                      <button onClick={() => act('reject', u._id)} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Reject</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Friends list */}
        <section>
          <h2 className="text-lg font-medium">Your Friends</h2>
          <div className="mt-2">
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : friends.length === 0 ? (
              <p className="text-gray-500">You haven't added any friends yet.</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded border border-gray-200 dark:border-gray-800">
                {friends
                  .filter(f => f.friendshipStatus === 'accepted')
                  .map(f => (
                  <li key={f._id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <img src={f.avatar || `https://ui-avatars.com/api/?name=${f.username}`} alt="avatar" className="h-8 w-8 rounded-full" />
                      <div>
                        <div className="font-medium">{f.username}</div>
                        <div className="text-xs text-gray-500">Level {f.level} • {f.totalProblems} solved</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => act('remove', f._id)} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function renderActionButton(u, isFriendSet, act) {
  const status = u.friendshipStatus || 'none';
  if (status === 'accepted' || isFriendSet.has(u._id)) {
    return (
      <button onClick={() => act('remove', u._id)} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">Remove</button>
    );
  }
  if (status === 'pending') {
    return (
      <span className="px-3 py-1 text-sm rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">Pending</span>
    );
  }
  return (
    <button onClick={() => act('add', u._id)} className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">Add</button>
  );
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

function uniqueById(arr) {
  const map = new Map();
  for (const item of arr) {
    const id = (item.user?._id) || item._id;
    if (!map.has(id)) map.set(id, item);
  }
  return Array.from(map.values());
}
