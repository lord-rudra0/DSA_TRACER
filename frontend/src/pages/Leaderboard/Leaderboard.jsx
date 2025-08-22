import React, { useEffect, useMemo, useState } from 'react';

export default function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, total: 1, hasNext: false, hasPrev: false });
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [sortBy, setSortBy] = useState('xp');
  const [timeframe, setTimeframe] = useState('all');
  const [stats, setStats] = useState(null);

  const params = useMemo(() => new URLSearchParams({ page, limit, sortBy, timeframe }), [page, limit, sortBy, timeframe]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [lbRes, statsRes] = await Promise.all([
          fetch(`/api/leaderboard?${params.toString()}`),
          fetch('/api/leaderboard/stats')
        ]);

        if (!lbRes.ok) throw new Error(`Leaderboard error ${lbRes.status}`);
        if (!statsRes.ok) throw new Error(`Stats error ${statsRes.status}`);

        const lbJson = await lbRes.json();
        const statsJson = await statsRes.json();
        if (cancelled) return;
        setRows(lbJson.leaderboard || []);
        setPagination(lbJson.pagination || { current: 1, total: 1, hasNext: false, hasPrev: false });
        setStats(statsJson);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load leaderboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params]);

  const topPerformers = stats?.topPerformers || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leaderboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Top performers and global rankings</p>
        </div>
        <div className="flex gap-3">
          <select
            value={sortBy}
            onChange={(e) => { setPage(1); setSortBy(e.target.value); }}
            className="border rounded px-3 py-2 bg-white dark:bg-gray-800"
          >
            <option value="xp">Sort by XP</option>
            <option value="totalProblems">Sort by Problems Solved</option>
            <option value="currentStreak">Sort by Current Streak</option>
            <option value="contestRating">Sort by Contest Rating</option>
          </select>
          <select
            value={timeframe}
            onChange={(e) => { setPage(1); setTimeframe(e.target.value); }}
            className="border rounded px-3 py-2 bg-white dark:bg-gray-800"
          >
            <option value="all">All time</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
        </div>
      </div>

      {/* Top performers */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Top performers</h2>
        {topPerformers.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">No data yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topPerformers.map((u, idx) => (
              <div key={u._id || u.username} className="border rounded-lg p-4 flex items-center gap-4 bg-white dark:bg-gray-900">
                <div className="text-2xl font-bold w-10 text-center">#{idx + 1}</div>
                <img src={u.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${encodeURIComponent(u.username)}`}
                     alt={u.username}
                     className="w-12 h-12 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="font-medium">{u.username}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">XP: {u.xp ?? 0} • Solved: {u.totalProblems ?? 0}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard table */}
      <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">XP</th>
                <th className="px-4 py-3">Solved</th>
                <th className="px-4 py-3">Streak</th>
                <th className="px-4 py-3">Contest Rating</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6" colSpan="6">Loading...</td></tr>
              ) : error ? (
                <tr><td className="px-4 py-6 text-red-600" colSpan="6">{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan="6">No users yet.</td></tr>
              ) : (
                rows.map((u) => (
                  <tr key={u._id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3">{u.rank}</td>
                    <td className="px-4 py-3 flex items-center gap-3">
                      <img src={u.avatar || `https://api.dicebear.com/8.x/identicon/svg?seed=${encodeURIComponent(u.username)}`}
                           alt={u.username}
                           className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="font-medium">{u.fullName || u.username}</div>
                        <div className="text-xs text-gray-500">@{u.username}</div>
                      </div>
                      {u.isCurrentUser && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">You</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{u.xp ?? 0}</td>
                    <td className="px-4 py-3">{u.totalProblems ?? 0}</td>
                    <td className="px-4 py-3">{u.currentStreak ?? 0}</td>
                    <td className="px-4 py-3">{u.contestRating ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {pagination.current} of {pagination.total}
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 border rounded disabled:opacity-50"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >Previous</button>
            <button
              className="px-3 py-2 border rounded disabled:opacity-50"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
