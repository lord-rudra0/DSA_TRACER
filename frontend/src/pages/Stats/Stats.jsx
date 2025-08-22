import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ActivityHeatmap from '../../components/Dashboard/ActivityHeatmap';
import ProgressChart from '../../components/Dashboard/ProgressChart';

export default function Stats() {
  const navigate = useNavigate();
  const [range, setRange] = useState(365); // 30 | 90 | 365
  const { data, isLoading, isError } = useQuery(
    ['user-stats', range],
    () => axios.get('/stats/user', { params: { range } }).then((r) => r.data),
    { staleTime: 5 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Stats</h1>
        <p className="text-error-600 dark:text-error-400 mt-2">Failed to load stats. Please try again.</p>
      </div>
    );
  }

  const user = data?.user || {};
  const submissions = data?.submissions || { total: 0, byStatus: [], byLanguage: [] };
  const progress = data?.progress || { monthly: [], daily: [], difficultyProgression: [] };
  const topics = data?.topics || [];

  const easy = user.easySolved || 0;
  const med = user.mediumSolved || 0;
  const hard = user.hardSolved || 0;
  const totalSolved = (user.totalProblems || (easy + med + hard)) || 0;

  const acceptedCount = submissions.byStatus?.find((s) => s._id === 'Accepted')?.count || 0;
  const totalSubs = submissions.total || submissions.byStatus?.reduce((a, s) => a + (s.count || 0), 0) || 0;
  const acceptanceRate = totalSubs ? ((acceptedCount / totalSubs) * 100).toFixed(1) : 0;

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stats</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Deep dive into your performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">Range</label>
          <select
            className="select"
            value={range}
            onChange={(e) => setRange(parseInt(e.target.value))}
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Problems Solved</p>
          <p className="text-3xl font-semibold mt-1">{totalSolved}</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-success-600">Easy</span><span>{easy}</span></div>
            <div className="flex items-center justify-between"><span className="text-warning-600">Medium</span><span>{med}</span></div>
            <div className="flex items-center justify-between"><span className="text-error-600">Hard</span><span>{hard}</span></div>
          </div>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Submissions</p>
          <p className="text-3xl font-semibold mt-1">{totalSubs}</p>
          <div className="mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2">
              <div className="bg-primary-500 h-2 rounded" style={{ width: `${acceptanceRate}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span>Accepted</span>
              <span>{acceptedCount} ({acceptanceRate}%)</span>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Contest Rating</p>
          <p className="text-3xl font-semibold mt-1">{user.contestRating || 0}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Level</p>
              <p className="font-medium">{user.level || 1}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Current Streak</p>
              <p className="font-medium">{user.currentStreak || 0}d</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts: Activity + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Activity Heatmap</h2>
          {/* Transform daily activity into {date, count} */}
          <ActivityHeatmap 
            data={(progress.daily || []).map((d) => ({
              date: `${d._id.year}-${String(d._id.month).padStart(2,'0')}-${String(d._id.day).padStart(2,'0')}`,
              count: d.count
            }))}
          />
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Progress Over Time</h2>
          <ProgressChart data={progress.monthly} />
        </div>
      </div>

      {/* Topic-wise distribution and Language usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Topic-wise Distribution</h2>
          <div className="space-y-3">
            {(topics || []).slice(0, 12).map((t) => (
              <button
                key={t._id}
                onClick={() => navigate(`/problems?tags=${encodeURIComponent(t._id)}`)}
                className="flex items-center gap-3 w-full text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t._id}</span>
                    <span className="font-medium">{t.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2 mt-1">
                    <div className="bg-primary-500 h-2 rounded" style={{ width: `${Math.min(100, (t.count / (topics[0]?.count || 1)) * 100)}%` }} />
                  </div>
                </div>
              </button>
            ))}
            {(!topics || topics.length === 0) && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No topic data yet.</p>
            )}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Language Usage</h2>
          <div className="space-y-3">
            {(submissions.byLanguage || []).map((l) => (
              <button
                key={l._id || 'Unknown'}
                onClick={() => navigate(`/problems?status=solved&language=${encodeURIComponent(l._id || '')}`)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between text-sm">
                  <span>{l._id || 'Unknown'}</span>
                  <span className="font-medium">{l.count}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2 mt-1">
                  <div className="bg-success-500 h-2 rounded" style={{ width: `${Math.min(100, (l.count / ((submissions.byLanguage?.[0]?.count) || l.count || 1)) * 100)}%` }} />
                </div>
              </button>
            ))}
            {(!submissions.byLanguage || submissions.byLanguage.length === 0) && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No language data yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'N/A'}</div>
    </div>
  );
}
