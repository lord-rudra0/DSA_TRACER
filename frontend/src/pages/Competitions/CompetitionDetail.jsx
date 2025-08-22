import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

export default function CompetitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery(['competition', id], async () => {
    const res = await axios.get(`/competitions/${id}`);
    return res.data;
  }, { enabled: !!id });

  const comp = data?.competition;

  const { data: lbData, isLoading: lbLoading } = useQuery(['competition:lb', id], async () => {
    const res = await axios.get(`/competitions/${id}/leaderboard`);
    return res.data;
  }, { enabled: !!id });

  const joinMutation = useMutation(async () => {
    await axios.post(`/competitions/${id}/join`);
  }, {
    onSuccess: () => {
      qc.invalidateQueries(['competition', id]);
      qc.invalidateQueries(['competition:lb', id]);
    }
  });

  const syncMutation = useMutation(async () => {
    await axios.post(`/competitions/${id}/sync`);
  });

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (isError || !comp) return <div className="p-6 text-error-600">Competition not found.</div>;

  const isParticipant = (comp.participants || []).some(p => p.user?._id === data?.currentUserId || p.user === data?.currentUserId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{comp.name}</h1>
          {comp.description && <p className="text-gray-600 dark:text-gray-300 mt-1">{comp.description}</p>}
          <div className="text-sm text-gray-500 mt-2">
            {new Date(comp.startAt).toLocaleString()} → {new Date(comp.endAt).toLocaleString()} • {comp.visibility}
          </div>
          <div className="text-xs text-gray-400 mt-1">Problems: {comp.problems?.length || 0}</div>
        </div>
        <div className="flex items-center gap-2">
          {!isParticipant && (
            <button className="btn btn-primary" onClick={() => joinMutation.mutate()} disabled={joinMutation.isLoading}>
              {joinMutation.isLoading ? 'Joining…' : 'Join'}
            </button>
          )}
          <button className="btn" onClick={() => syncMutation.mutate()} disabled={syncMutation.isLoading}>
            {syncMutation.isLoading ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Problem Set</h2>
        <div className="flex flex-wrap gap-2">
          {(comp.problems || []).map(slug => (
            <a key={slug} href={`https://leetcode.com/problems/${slug}/`} target="_blank" rel="noreferrer" className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-sm hover:underline">
              {slug}
            </a>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Leaderboard</h2>
          <div className="text-sm text-gray-500">Scoring E/M/H: {lbData?.scoring?.easy ?? 1}/{lbData?.scoring?.medium ?? 2}/{lbData?.scoring?.hard ?? 3}</div>
        </div>
        {lbLoading ? (
          <div>Loading leaderboard…</div>
        ) : (
          <div className="divide-y">
            {(lbData?.leaderboard || []).length === 0 && (
              <div className="py-3 text-gray-500">No solves yet.</div>
            )}
            {(lbData?.leaderboard || []).map((row, idx) => (
              <div key={row.userId} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 text-sm text-gray-500">{idx + 1}</div>
                  <img src={row.avatar || 'https://api.dicebear.com/7.x/identicon/svg'} alt="avatar" className="w-8 h-8 rounded-full" />
                  <Link to={`/profile/${row.username}`} className="hover:underline">{row.username}</Link>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-gray-600">Solved: {row.solved}</div>
                  <div className="text-gray-600">Points: <span className="font-medium">{row.points}</span></div>
                  <div className="text-xs text-gray-400">E/M/H: {row.breakdown?.easy}/{row.breakdown?.medium}/{row.breakdown?.hard}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
