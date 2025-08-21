import React from 'react';

// Props: submissions = array of { title?, problemTitle?, status, time? }
export default function RecentSubmissions({ submissions = [] }) {
  const items = submissions.slice(0, 10);
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Submissions</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No recent submissions.</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((s, idx) => (
            <li key={idx} className="py-2 flex items-center justify-between">
              <span className="truncate mr-3">{s.title || s.problemTitle || `Problem ${idx + 1}`}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                s.status === 'Accepted'
                  ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
                  : 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200'
              }`}>{s.status || 'Unknown'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
