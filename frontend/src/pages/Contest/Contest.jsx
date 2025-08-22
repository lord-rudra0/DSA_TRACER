import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-gray-900">
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
    </div>
  );
}

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function Contest() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contests, setContests] = useState([]);
  const [stats, setStats] = useState(null);
  const { user } = useAuth();
  const [history, setHistory] = useState({ list: [], loading: false, error: '' });
  const [overview, setOverview] = useState(null); // from /:leetcodeUsername/contest (rankingInfo + totals)
  const [discuss, setDiscuss] = useState({ topics: [], loading: false, error: '' });
  const [topicDrawer, setTopicDrawer] = useState({ open: false, topic: null, comments: [], loading: false, error: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [cRes, sRes] = await Promise.all([
          fetch('/api/contest'),
          fetch('/api/contest/stats/global')
        ]);
        if (!cRes.ok) throw new Error(`Contests error ${cRes.status}`);
        if (!sRes.ok) throw new Error(`Stats error ${sRes.status}`);
        const cJson = await cRes.json();
        const sJson = await sRes.json();
        if (cancelled) return;
        setContests(Array.isArray(cJson.contests) ? cJson.contests : []);
        setStats(sJson);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load contests');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const now = useMemo(() => new Date(), []);
  const upcoming = useMemo(() => contests.filter(c => c.startTime && new Date(c.startTime) > now), [contests, now]);
  const past = useMemo(() => contests.filter(c => c.startTime && new Date(c.startTime) <= now), [contests, now]);

  // Load trending discuss topics (compact panel)
  useEffect(() => {
    let cancelled = false;
    async function loadDiscuss() {
      setDiscuss(d => ({ ...d, loading: true, error: '' }));
      try {
        const res = await fetch('/api/contest/trendingDiscuss?first=20');
        if (!res.ok) throw new Error(`Discuss error ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        const topics = Array.isArray(json.topics) ? json.topics : (Array.isArray(json) ? json : []);
        setDiscuss({ topics, loading: false, error: '' });
      } catch (e) {
        if (!cancelled) setDiscuss({ topics: [], loading: false, error: e.message || 'Failed to load discussions' });
      }
    }
    loadDiscuss();
    return () => { cancelled = true; };
  }, []);

  async function openTopic(topic) {
    setTopicDrawer({ open: true, topic, comments: [], loading: true, error: '' });
    try {
      const id = topic?.id || topic?.topicId || topic?.topic?.id;
      if (!id) throw new Error('Invalid topic');
      const [tRes, cRes] = await Promise.all([
        fetch(`/api/contest/discussTopic/${encodeURIComponent(id)}`),
        fetch(`/api/contest/discussComments/${encodeURIComponent(id)}`)
      ]);
      if (!tRes.ok) throw new Error(`Topic error ${tRes.status}`);
      if (!cRes.ok) throw new Error(`Comments error ${cRes.status}`);
      const tJson = await tRes.json();
      const cJson = await cRes.json();
      setTopicDrawer(d => ({ ...d, topic: tJson.topic || d.topic, comments: cJson.comments || [], loading: false }));
    } catch (e) {
      setTopicDrawer(d => ({ ...d, loading: false, error: e.message || 'Failed to load topic' }));
    }
  }

  // Load user's contest overview/history if linked
  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!user?.leetcodeUsername) return;
      setHistory(h => ({ ...h, loading: true, error: '' }));
      try {
        // Try combined overview first
        let res = await fetch(`/api/contest/${encodeURIComponent(user.leetcodeUsername)}/contest`);
        if (res.status === 404) {
          // Fallback to history-only endpoint
          res = await fetch(`/api/contest/history/${encodeURIComponent(user.leetcodeUsername)}`);
        }
        if (res.status === 404) {
          if (!cancelled) {
            setOverview(null);
            setHistory({ list: [], loading: false, error: '' });
          }
          return;
        }
        if (!res.ok) throw new Error(`History error ${res.status}`);
        const json = await res.json();
        if (cancelled) return;

        // Normalize from either endpoint shape
        const list = Array.isArray(json.recentHistory)
          ? json.recentHistory
          : (Array.isArray(json.contestHistory) ? json.contestHistory : []);

        // Accept overview objects that include leetcodeUsername (primary) or legacy username (fallback)
        const hasOverviewUser = !!(json.leetcodeUsername || json.username || (json.user && json.user.leetcodeUsername));
        setOverview(hasOverviewUser ? json : null);
        setHistory({ list, loading: false, error: '' });
      } catch (e) {
        if (!cancelled) setHistory({ list: [], loading: false, error: e.message || 'Failed to load history' });
      }
    }
    loadHistory();
    return () => { cancelled = true; };
  }, [user?.leetcodeUsername]);

  // Performance summary derived from history
  const performance = useMemo(() => {
    if (!history.list.length) return { total: 0, avgRank: 0, totalPoints: 0 };
    const ranks = history.list.map(h => Number(h.rank ?? h.ranking)).filter(n => Number.isFinite(n));
    const points = history.list.map(h => Number(h.score ?? h.ratingPoints ?? h.scoreDelta)).filter(n => Number.isFinite(n));
    const avgRank = ranks.length ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length) : 0;
    const totalPoints = points.length ? Math.round(points.reduce((a, b) => a + b, 0)) : 0;
    return { total: history.list.length, avgRank, totalPoints };
  }, [history.list]);

  // Trend chart data
  const trendData = useMemo(() => {
    const items = (history.list || []).slice().reverse();
    const labels = items.map(h => h.contest?.title || h.title || h.contestName || format(new Date(h?.startTime || h?.timestamp || Date.now()), 'PP'));
    const data = items.map(h => Number(h.rank ?? h.ranking)).map(v => (Number.isFinite(v) ? v : null));
    return {
      labels,
      datasets: [
        {
          label: 'Rank (lower is better)',
          data,
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          tension: 0.25,
          spanGaps: true,
        }
      ]
    };
  }, [history.list]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contests</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Upcoming and past programming contests</p>
      </div>

      {/* Global stats and performance summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total participants" value={stats?.overview?.totalParticipants ?? 0} sub={`Max rating: ${Math.round(stats?.overview?.maxRating ?? 0)}`} />
        <Stat label="Avg rating" value={Math.round(stats?.overview?.avgRating ?? 0)} sub={`Avg contests: ${Math.round(stats?.overview?.avgContests ?? 0)}`} />
        <Stat label="Total contests" value={stats?.overview?.totalContests ?? 0} />
        <Stat label="Last updated" value={stats?.lastUpdated ? format(new Date(stats.lastUpdated), 'PP p') : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border rounded-lg p-4 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Rank trend</h2>
            {!user?.leetcodeUsername && <div className="text-xs text-gray-500">Link your LeetCode to see your trend</div>}
          </div>
          {history.loading ? (
            <div className="text-gray-600">Loading chart...</div>
          ) : history.error ? (
            <div className="text-red-600">{history.error}</div>
          ) : history.list.length === 0 ? (
            <div className="text-gray-600">No contest history.</div>
          ) : (
            <Line
              data={trendData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: { intersect: false, mode: 'index' }
                },
                scales: {
                  y: { reverse: true, title: { display: true, text: 'Rank' } },
                }
              }}
            />
          )}
        </div>
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold mb-2">Performance summary</h2>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex justify-between"><span>Total contests</span><span className="font-semibold">{performance.total}</span></div>
            <div className="flex justify-between"><span>Average rank</span><span className="font-semibold">{performance.avgRank || '—'}</span></div>
            <div className="flex justify-between"><span>Total points</span><span className="font-semibold">{performance.totalPoints}</span></div>
            <div className="flex justify-between"><span>Rating</span><span className="font-semibold">{overview?.rankingInfo?.rating != null ? Math.round(overview.rankingInfo.rating) : (overview?.totals?.rating != null ? Math.round(overview.totals.rating) : '—')}</span></div>
            <div className="flex justify-between"><span>Global rank</span><span className="font-semibold">{overview?.rankingInfo?.ranking ?? overview?.totals?.ranking ?? '—'}</span></div>
          </div>
        </div>
      </div>

      {/* Trending Discuss (Compact Panel) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Trending Discuss</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">{discuss.topics.length} topics</div>
        </div>
        <div className="border rounded-lg bg-white dark:bg-gray-900">
          {discuss.loading ? (
            <div className="p-4">Loading trending topics...</div>
          ) : discuss.error ? (
            <div className="p-4 text-red-600">{discuss.error}</div>
          ) : discuss.topics.length === 0 ? (
            <div className="p-4">No trending discussions.</div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {discuss.topics.slice(0, 6).map((t, i) => {
                const id = t?.id || t?.topicId || t?.topic?.id || i;
                const title = t?.title || t?.topic?.title || 'Discussion';
                const up = t?.upvoteCount ?? t?.voteCount ?? t?.likes ?? 0;
                const comments = t?.commentCount ?? t?.numComments ?? 0;
                return (
                  <li key={id} className="p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{title}</div>
                      <div className="text-xs text-gray-500 mt-1">{up} upvotes • {comments} comments</div>
                    </div>
                    <button onClick={() => openTopic(t)} className="ml-4 px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700">View</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Topic Drawer / Modal */}
      {topicDrawer.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setTopicDrawer({ open: false, topic: null, comments: [], loading: false, error: '' })} />
          <div className="relative z-10 w-full sm:max-w-2xl bg-white dark:bg-gray-900 rounded-t-lg sm:rounded-lg shadow-lg max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="font-semibold truncate">{topicDrawer.topic?.title || topicDrawer.topic?.topic?.title || 'Discussion'}</div>
              <button className="text-sm text-gray-500 hover:text-gray-800" onClick={() => setTopicDrawer({ open: false, topic: null, comments: [], loading: false, error: '' })}>Close</button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {topicDrawer.loading ? (
                <div>Loading...</div>
              ) : topicDrawer.error ? (
                <div className="text-red-600">{topicDrawer.error}</div>
              ) : (
                <>
                  <div className="prose dark:prose-invert max-w-none text-sm">
                    {topicDrawer.topic?.content ? (
                      <div dangerouslySetInnerHTML={{ __html: topicDrawer.topic.content }} />
                    ) : (
                      <div className="text-gray-600">No content.</div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="font-medium mb-2">Comments</div>
                    {Array.isArray(topicDrawer.comments) && topicDrawer.comments.length > 0 ? (
                      <ul className="space-y-3">
                        {topicDrawer.comments.slice(0, 20).map((c, idx) => (
                          <li key={idx} className="text-sm">
                            <div className="text-gray-800 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: c?.content || '' }} />
                            <div className="text-xs text-gray-500 mt-1">by {c?.author?.leetcodeUsername || c?.author?.username || 'Anonymous'}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-600">No comments.</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming (Table) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upcoming Contests</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">{upcoming.length} listed</div>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3">Contest Name</th>
                  <th className="px-4 py-3">Start Time</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Link</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-4 py-6" colSpan="4">Loading...</td></tr>
                ) : error ? (
                  <tr><td className="px-4 py-6 text-red-600" colSpan="4">{error}</td></tr>
                ) : upcoming.length === 0 ? (
                  <tr><td className="px-4 py-6" colSpan="4">No upcoming contests.</td></tr>
                ) : (
                  upcoming.map((c, i) => {
                    const start = c.startTime ? new Date(c.startTime) : null;
                    const durationMins = c.duration ? Math.round(c.duration / 60) : null;
                    return (
                      <tr key={(c.titleSlug || c.title || 'c') + i} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-4 py-3">{c.title || c.titleSlug || '—'}</td>
                        <td className="px-4 py-3">{start ? format(start, 'yyyy-MM-dd HH:mm') : '—'}</td>
                        <td className="px-4 py-3">{durationMins != null ? `${durationMins} min` : '—'}</td>
                        <td className="px-4 py-3">
                          {c.link ? <a className="text-indigo-600 hover:underline" href={c.link} target="_blank" rel="noreferrer">LeetCode Link</a> : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Past (User History Table) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Past Contests</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">{history.list.length} records</div>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3">Contest Name</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Solved</th>
                  <th className="px-4 py-3">Link</th>
                </tr>
              </thead>
              <tbody>
                {history.loading ? (
                  <tr><td className="px-4 py-6" colSpan="6">Loading...</td></tr>
                ) : history.error ? (
                  <tr><td className="px-4 py-6 text-red-600" colSpan="6">{history.error}</td></tr>
                ) : !user?.leetcodeUsername ? (
                  <tr><td className="px-4 py-6" colSpan="6">Link your LeetCode account to see past contests.</td></tr>
                ) : history.list.length === 0 ? (
                  <tr><td className="px-4 py-6" colSpan="6">No past contests found.</td></tr>
                ) : (
                  history.list.map((h, i) => {
                    const date = h?.startTime || h?.timestamp || h?.date;
                    const solved = h?.problemsSolved ?? h?.questionsSolved ?? h?.totalProblemsSolved;
                    const link = h?.contest?.link || h?.link || (h?.titleSlug ? `https://leetcode.com/contest/${h.titleSlug}/` : null);
                    const title = h?.contest?.title || h?.title || h?.contestName || 'Contest';
                    const rank = h?.rank ?? h?.ranking ?? '—';
                    const score = h?.score ?? h?.ratingPoints ?? h?.scoreDelta ?? '—';
                    return (
                      <tr key={(h.titleSlug || title) + i} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-4 py-3">{title}</td>
                        <td className="px-4 py-3">{date ? format(new Date(date), 'yyyy-MM-dd') : '—'}</td>
                        <td className="px-4 py-3">{rank}</td>
                        <td className="px-4 py-3">{score}</td>
                        <td className="px-4 py-3">{Number.isFinite(Number(solved)) ? solved : '—'}</td>
                        <td className="px-4 py-3">{link ? <a className="text-indigo-600 hover:underline" href={link} target="_blank" rel="noreferrer">LeetCode Link</a> : '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
