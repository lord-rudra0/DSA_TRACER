import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';

function TopInterview() {
  const [enabled, setEnabled] = React.useState(false);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(
    ['topInterview150'],
    async () => {
      const res = await axios.get('/api/leetcode/top-interview-150');
      return res.data;
    },
    { enabled }
  );

  const problems = data?.problems || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Top Interview 150</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (enabled ? refetch() : setEnabled(true))}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
            disabled={isLoading || isFetching}
          >
            {enabled ? (isFetching ? 'Refreshing...' : 'Refresh') : 'Fetch Problems'}
          </button>
        </div>
      </div>

      {isError && (
        <div className="p-4 rounded-lg bg-error-50 text-error-700 dark:bg-error-900/30 dark:text-error-300">
          Failed to load: {error?.message || 'Unknown error'}
        </div>
      )}

      {enabled && (isLoading || isFetching) && (
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      )}

      {enabled && !isLoading && !isFetching && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {problems.map((p) => (
            <a
              key={p.titleSlug}
              href={`https://leetcode.com/problems/${p.titleSlug}`}
              target="_blank"
              rel="noreferrer"
              className="block p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition bg-white dark:bg-gray-800"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2">
                  {p.title}
                </h3>
                <span
                  className={
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' +
                    (p.difficulty === 'Easy'
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : p.difficulty === 'Medium'
                      ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300')
                  }
                >
                  {p.difficulty}
                </span>
              </div>
              {Array.isArray(p.tags) && p.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.tags.slice(0, 5).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default TopInterview;


