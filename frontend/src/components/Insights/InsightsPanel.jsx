import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function InsightsPanel() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/analytics/me');
      setInsights(data);
    } catch (e) {
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  if (loading) return <div className="p-3 text-sm text-gray-500">Loading insights…</div>;
  if (!insights) return <div className="p-3 text-sm text-gray-500">No insights available.</div>;

  const totalSolved = Object.values(insights.difficulty || {}).reduce((s, x) => s + (x || 0), 0);

  return (
    <div className="p-4 bg-white dark:bg-gray-900 border rounded">
      <h3 className="text-sm font-medium">Personal Insights</h3>
      <div className="mt-3 text-xs text-gray-500">Rank: {insights.rank} / {insights.totalUsers}</div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="p-2 border rounded text-sm">
          <div className="text-xs text-gray-500">Solved</div>
          <div className="font-medium">{totalSolved}</div>
        </div>
        <div className="p-2 border rounded text-sm">
          <div className="text-xs text-gray-500">Current Streak</div>
          <div className="font-medium">{insights.streak.current}</div>
        </div>
        <div className="p-2 border rounded text-sm">
          <div className="text-xs text-gray-500">Best Streak</div>
          <div className="font-medium">{insights.streak.best}</div>
        </div>
        <div className="p-2 border rounded text-sm">
          <div className="text-xs text-gray-500">Top Tag</div>
          <div className="font-medium">{insights.topTags?.[0]?.tag || '—'}</div>
        </div>
      </div>

      <div className="mt-3 text-sm">
        <div className="text-xs text-gray-500">XP last 30 days</div>
        <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
          {insights.xpTimeline && insights.xpTimeline.length ? (
            insights.xpTimeline.map(d => `${d.date}: +${d.xp}`).join(' • ')
          ) : 'No recent activity.'}
        </div>
      </div>
    </div>
  );
}
