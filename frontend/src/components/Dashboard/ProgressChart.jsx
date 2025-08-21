import React from 'react';

// Placeholder component for a progress chart.
// Props: data (array), difficultyData ({easy, medium, hard})
export default function ProgressChart({ data = [], difficultyData = { easy: 0, medium: 0, hard: 0 } }) {
  const total = (difficultyData.easy || 0) + (difficultyData.medium || 0) + (difficultyData.hard || 0);
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-3">
        <span>Monthly Progress (placeholder)</span>
        <span className="text-xs text-gray-500">points: {data.length}</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-success-600 dark:text-success-400">Easy</span>
          <span>{difficultyData.easy}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2">
          <div className="bg-success-500 h-2 rounded" style={{ width: `${total ? (difficultyData.easy / total) * 100 : 0}%` }} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-warning-600 dark:text-warning-400">Medium</span>
          <span>{difficultyData.medium}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2">
          <div className="bg-warning-500 h-2 rounded" style={{ width: `${total ? (difficultyData.medium / total) * 100 : 0}%` }} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-error-600 dark:text-error-400">Hard</span>
          <span>{difficultyData.hard}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2">
          <div className="bg-error-500 h-2 rounded" style={{ width: `${total ? (difficultyData.hard / total) * 100 : 0}%` }} />
        </div>
      </div>
    </div>
  );
}
