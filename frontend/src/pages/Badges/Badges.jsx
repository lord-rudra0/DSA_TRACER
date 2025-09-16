import React, { useState } from 'react';
import { useBadges } from '../../contexts/BadgeContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Award } from 'lucide-react';

function BadgeModal({ badge, onClose }) {
  if (!badge) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 z-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center text-3xl">{badge.icon || '🏅'}</div>
          <div>
            <h3 className="text-lg font-semibold">{badge.name || badge.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{badge.description}</p>
            {badge.unlockedAt && (
              <p className="text-xs text-gray-400 mt-2">Unlocked: {new Date(badge.unlockedAt).toLocaleString()}</p>
            )}
          </div>
        </div>

        <div className="mt-6 text-right">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700">Close</button>
        </div>
      </div>
    </div>
  );
}

const Badges = () => {
  const { badges, loading } = useBadges();
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Badges & Achievements</h1>
        <div className="text-sm text-gray-500">{user?.leetcodeUsername ? `Viewing for ${user.leetcodeUsername}` : 'Local badges'}</div>
      </div>

      <div className="card p-6">
        <div className="mb-4 text-sm text-gray-600">Your earned badges are shown below. Click a badge for details.</div>

        {loading && <div className="text-sm text-gray-500">Loading badges…</div>}

        {!loading && badges.length === 0 && (
          <div className="text-sm text-gray-500">No badges earned yet — keep solving!</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {badges.map((b, i) => (
            <button
              key={b.id || `${b.name}-${i}`}
              onClick={() => setSelected(b)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border hover:shadow-md"
            >
              <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center text-2xl">{b.icon || '🏅'}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white text-center">{b.name || b.title}</div>
              {b.unlockedAt && <div className="text-xs text-gray-400">{new Date(b.unlockedAt).toLocaleDateString()}</div>}
            </button>
          ))}
        </div>
      </div>

      <BadgeModal badge={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default Badges;
