import React from 'react';

export default function BadgeCard({ badge, locked = false, onClick, progress }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition ${locked ? 'opacity-60 bg-gray-50 dark:bg-gray-900/40 border-dashed' : 'bg-white dark:bg-gray-800 shadow-sm'}`}
    >
      <div className="w-16 h-16 rounded-full bg-yellow-50 dark:bg-yellow-900/10 flex items-center justify-center text-2xl">
        {badge.icon || '🏅'}
      </div>
      <div className="text-sm font-medium text-center">{badge.name || badge.title}</div>
      {badge.description && <div className="text-xs text-gray-500 text-center">{badge.description}</div>}
      {typeof progress === 'number' && (
        <div className="w-full mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
            <div className="h-2 bg-indigo-500" style={{ width: `${Math.min(100, Math.round(progress))}%` }} />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">{Math.round(progress)}%</div>
        </div>
      )}
    </button>
  );
}
