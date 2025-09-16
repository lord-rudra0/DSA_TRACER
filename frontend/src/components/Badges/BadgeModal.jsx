import React from 'react';

export default function BadgeModal({ badge, onClose }) {
  if (!badge) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 z-10">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-yellow-50 flex items-center justify-center text-4xl">{badge.icon || '🏅'}</div>
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
