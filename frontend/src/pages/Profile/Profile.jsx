import React, { useEffect, useMemo, useState } from 'react';
import BadgeModal from '../../components/Badges/BadgeModal';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

export default function Profile() {
  const { leetcodeUsername } = useParams();
  const { user: me, updateProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  // Admin request state (self only)
  const [myRequests, setMyRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqMsg, setReqMsg] = useState('');
  // XP logs (self only)
  const [xpLogs, setXpLogs] = useState([]);
  const [xpLoading, setXpLoading] = useState(false);
  const [xpError, setXpError] = useState('');
  const [xpPage, setXpPage] = useState(1);
  const [xpHasNext, setXpHasNext] = useState(false);
  const xpLimit = 10;

  // Selected badge for modal view
  const [selectedBadge, setSelectedBadge] = useState(null);

  const isSelf = useMemo(() => !leetcodeUsername || leetcodeUsername === me?.leetcodeUsername, [leetcodeUsername, me?.leetcodeUsername]);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        if (isSelf) {
          const { data } = await axios.get('/users/dashboard');
          if (canceled) return;
          setProfile(data.user);
          setStats(data.stats);
        } else {
          const { data } = await axios.get(`/users/profile/${leetcodeUsername}`);
          if (canceled) return;
          setProfile(data.user);
          setStats(data.stats || {});
        }
      } catch (e) {
        if (!canceled) setError(e.response?.data?.message || 'Failed to load profile');
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, [isSelf, leetcodeUsername]);

  // Load XP logs when viewing self
  useEffect(() => {
    if (!isSelf) return;
    let canceled = false;
    (async () => {
      try {
        setXpLoading(true);
        setXpError('');
        const { data } = await axios.get(`/api/xp/logs`, { params: { page: xpPage, limit: xpLimit } });
        if (canceled) return;
        setXpLogs(data.items || data.logs || []);
        // Accept either {pagination} or hasNext
        const hasNext = data.pagination ? data.pagination.hasNext : !!data.hasNext;
        setXpHasNext(!!hasNext);
      } catch (e) {
        if (!canceled) setXpError(e.response?.data?.message || 'Failed to load XP history');
      } finally {
        if (!canceled) setXpLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, [isSelf, xpPage]);

  // Load my admin requests when viewing own profile
  useEffect(() => {
    let canceled = false;
    if (!isSelf) return;
    (async () => {
      try {
        setReqLoading(true);
        setReqError('');
        const { data } = await axios.get('/admin/requests/mine');
        if (canceled) return;
        setMyRequests(data.requests || []);
      } catch (e) {
        if (!canceled) setReqError(e.response?.data?.message || 'Failed to load your requests');
      } finally {
        if (!canceled) setReqLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, [isSelf]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-40 w-full bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <div className="mt-4 p-3 rounded bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>
      </div>
    );
  }

  if (!profile) return null;

  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.leetcodeUsername;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start gap-4">
          <img
            src={profile.avatar || `https://ui-avatars.com/api/?name=${profile.leetcodeUsername}`}
            alt="avatar"
            className="h-20 w-20 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold">{fullName}</h1>
                <span className="text-gray-500">@{profile.leetcodeUsername}</span>
              </div>
              {isSelf && (() => {
                const isAdmin = profile.role === 'admin';
                const latestReq = myRequests?.[0];
                const isPending = latestReq?.status === 'pending';
                const isApproved = latestReq?.status === 'approved';
                if (isAdmin) {
                  return (
                    <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium">Admin</span>
                  );
                }
                if (isPending) {
                  return (
                    <button
                      className="px-3 py-1.5 rounded bg-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-sm cursor-not-allowed"
                      disabled
                    >Request Pending</button>
                  );
                }
                if (isApproved) {
                  return (
                    <button
                      className="px-3 py-1.5 rounded bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-sm cursor-not-allowed"
                      disabled
                    >Approved • Awaiting Promotion</button>
                  );
                }
                return (
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-sm"
                      disabled={reqSubmitting}
                      onClick={async () => {
                        try {
                          setReqSubmitting(true);
                          setReqMsg('');
                          await axios.post('/admin/requests', {});
                          setReqMsg('Request sent');
                          const { data } = await axios.get('/admin/requests/mine');
                          setMyRequests(data.requests || []);
                        } catch (e) {
                          setReqMsg(e.response?.data?.message || 'Failed to send request');
                        } finally {
                          setReqSubmitting(false);
                        }
                      }}
                    >
                      {reqSubmitting ? 'Sending…' : 'Request Admin Access'}
                    </button>
                    {reqMsg && <span className="text-xs text-gray-600 dark:text-gray-300">{reqMsg}</span>}
                  </div>
                );
              })()}
            </div>
            {isSelf && (myRequests?.length > 0) && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                Latest request: <span className="capitalize">{myRequests[0]?.status}</span> • {formatDate(myRequests[0]?.createdAt)}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Level" value={profile.level} />
              <Stat label="XP" value={profile.xp} />
              <Stat label="Solved" value={profile.totalProblems} />
              <Stat label="Contest Rating" value={profile.contestRating} />
            </div>
          </div>
        </div>
      </div>

      {/* Details + Edit (self only) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details */}
        <section className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold">Profile Details</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Detail label="Email" value={profile.email || '—'} />
            <Detail label="LeetCode Username" value={profile.leetcodeUsername || '—'} />
            <Detail label="First Name" value={profile.firstName || '—'} />
            <Detail label="Last Name" value={profile.lastName || '—'} />
          </div>
        </section>

        {/* Edit Profile (self) */}
        {isSelf && (
          <section className="lg:col-span-2 rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold">Edit Profile</h2>
            <EditForm
              profile={profile}
              onSubmit={async (payload) => {
                try {
                  setSaving(true);
                  setSaveMsg('');
                  // Ensure leetcodeUsername is not updated (remove if present)
                  const { leetcodeUsername, username, ...rest } = payload || {};
                  const res = await updateProfile(rest);
                  if (res?.success) {
                    // Refresh data
                    const { data } = await axios.get('/users/dashboard');
                    setProfile(data.user);
                    setSaveMsg('Profile updated successfully');
                  } else {
                    setSaveMsg(res?.message || 'Failed to update profile');
                  }
                } finally {
                  setSaving(false);
                }
              }}
              saving={saving}
            />
            {saveMsg && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{saveMsg}</p>
            )}
          </section>
        )}
      </div>

      {/* Simplified: Admin button moved to header; removed lower Admin Access section */}

      {/* Content sections */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Submissions */}
        <section className="lg:col-span-2 rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold">Recent Accepted Submissions</h2>
          <div className="mt-3">
            {stats?.recentSubmissions?.length ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {stats.recentSubmissions.map((s) => (
                  <li key={s._id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.problem?.title || s.problemTitle}</div>
                      <div className="text-xs text-gray-500">{(s.problem?.difficulty || s.problemDifficulty) || 'Unknown'}</div>
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(s.createdAt || s.timestamp)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No recent accepted submissions.</p>
            )}
          </div>
        </section>

        {/* Language Stats */}
        <section className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold">Languages</h2>
          <div className="mt-3 space-y-2">
            {stats?.languageStats?.length ? (
              stats.languageStats.map((l) => (
                <LangBar key={l._id} label={l._id} count={l.count} max={maxCount(stats.languageStats)} />
              ))
            ) : (
              <p className="text-gray-500">No language data.</p>
            )}
          </div>
        </section>
      </div>

      {/* Badges, Friends, and XP History */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold">Badges</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {profile.badges?.length ? (
                profile.badges.map((b, idx) => (
                  <button key={idx} onClick={() => setSelectedBadge(b)} className="px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm flex items-center gap-2">
                    <span className="mr-2">{b.icon || '🏅'}</span>{b.name}
                  </button>
                ))
              ) : (
                <p className="text-gray-500">No badges yet.</p>
              )}
            </div>
        </section>

        <section className="lg:col-span-2 rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Friends</h2>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {profile.friends?.length ? (
              profile.friends
                .filter(f => f.status === 'accepted' || f.friendshipStatus === 'accepted')
                .slice(0, 6)
                .map((f, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded border border-gray-200 dark:border-gray-800">
                  <img src={f.user?.avatar || `https://ui-avatars.com/api/?name=${f.user?.leetcodeUsername || ''}`}
                       className="h-8 w-8 rounded-full" alt="friend" />
                  <div>
                    <div className="font-medium">{f.user?.leetcodeUsername || f.leetcodeUsername}</div>
                    <div className="text-xs text-gray-500">Level {f.user?.level ?? f.level}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No friends to show.</p>
            )}
          </div>
        </section>
      </div>

      {isSelf && (
        <div className="mt-6 grid grid-cols-1 gap-6">
          <section className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">XP History</h2>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 border rounded disabled:opacity-50"
                  disabled={xpPage === 1 || xpLoading}
                  onClick={() => setXpPage(p => Math.max(1, p - 1))}
                >Previous</button>
                <button
                  className="px-3 py-2 border rounded disabled:opacity-50"
                  disabled={!xpHasNext || xpLoading}
                  onClick={() => setXpPage(p => p + 1)}
                >Next</button>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              {xpLoading ? (
                <div className="py-6 text-sm">Loading…</div>
              ) : xpError ? (
                <div className="py-3 text-sm text-red-600">{xpError}</div>
              ) : xpLogs.length === 0 ? (
                <div className="py-3 text-sm text-gray-600">No XP activity yet.</div>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2">When</th>
                      <th className="px-4 py-2">Change</th>
                      <th className="px-4 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xpLogs.map((log) => (
                      <tr key={log._id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-4 py-2">{formatDate(log.createdAt)}</td>
                        <td className={`px-4 py-2 font-medium ${log.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>{log.delta > 0 ? `+${log.delta}` : log.delta}</td>
                        <td className="px-4 py-2">{formatReason(log.reason)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}
      <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 dark:text-gray-100 font-medium">{value}</span>
    </div>
  );
}

function EditForm({ profile, onSubmit, saving }) {
  const [form, setForm] = useState({
    email: profile.email || '',
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    avatar: profile.avatar || '',
    leetcodeUsername: profile.leetcodeUsername || ''
  });

  useEffect(() => {
    setForm({
      email: profile.email || '',
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      avatar: profile.avatar || '',
      leetcodeUsername: profile.leetcodeUsername || ''
    });
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit?.(form);
  };

  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabeledInput label="Email" type="email" name="email" value={form.email} onChange={handleChange} />
        <LabeledInput label="LeetCode Username" name="leetcodeUsername" value={form.leetcodeUsername} onChange={handleChange} disabled helper="Your public handle" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabeledInput label="First Name" name="firstName" value={form.firstName} onChange={handleChange} />
        <LabeledInput label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabeledInput label="Avatar URL" name="avatar" value={form.avatar} onChange={handleChange} placeholder="https://..." />
      </div>
      <div className="flex justify-end gap-3">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function LabeledInput({ label, helper, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{label}</label>
      <input
        {...props}
        className="mt-1 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring"
      />
      {helper && <p className="text-xs text-gray-500 mt-1">{helper}</p>}
    </div>
  );
}
function Stat({ label, value }) {
  return (
    <div>
      <div className="text-2xl font-semibold">{value ?? 0}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function LangBar({ label, count, max }) {
  const pct = max ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-gray-500">{count}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded bg-gray-200 dark:bg-gray-800">
        <div className="h-2 rounded bg-indigo-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function maxCount(list) {
  return list?.reduce((m, x) => Math.max(m, x.count || 0), 0) || 0;
}

function formatDate(ts) {
  try {
    const d = new Date(ts * 1000 || ts);
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

function formatReason(reason) {
  if (!reason) return '—';
  try {
    const pretty = String(reason).replace(/[_-]+/g, ' ').trim();
    return pretty.charAt(0).toUpperCase() + pretty.slice(1);
  } catch {
    return String(reason);
  }
}
