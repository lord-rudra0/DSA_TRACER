import React, { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search, Filter, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

// Difficulty UI helpers
const DIFF_COLORS = {
  Easy: 'text-success-600 bg-success-50 border-success-200',
  Medium: 'text-warning-600 bg-warning-50 border-warning-200',
  Hard: 'text-error-600 bg-error-50 border-error-200',
};

const LIMIT = 20;

export default function Problems() {
  // Filters & state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState(''); // '', 'Easy', 'Medium', 'Hard'
  const [status, setStatus] = useState(''); // '', 'solved', 'unsolved'
  const [selectedTags, setSelectedTags] = useState([]); // array of tag names
  const [sort, setSort] = useState('relevance'); // 'relevance' | 'difficulty' | 'acceptance'

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', LIMIT);
    if (search) params.set('search', search);
    if (difficulty) params.set('difficulty', difficulty);
    if (status) params.set('status', status);
    if (selectedTags.length) params.set('tags', selectedTags.join(','));
    if (sort && sort !== 'relevance') params.set('sort', sort);
    return params.toString();
  }, [page, search, difficulty, status, selectedTags, sort]);

  // Fetch problems
  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    ['problems', queryParams],
    async () => {
      const res = await axios.get(`/problems?${queryParams}`);
      return res.data; // { problems, pagination: { current, total, hasNext, hasPrev }, total }
    },
    { keepPreviousData: true, staleTime: 60 * 1000 }
  );

  // Fetch tags meta
  const { data: tagsData } = useQuery(
    'problem-tags',
    async () => (await axios.get('/problems/meta/tags')).data,
    { staleTime: 10 * 60 * 1000 }
  );

  const items = data?.problems || [];
  const totalPages = data?.pagination?.total || 1;
  const totalCount = data?.total || items.length || 0;

  const toggleTag = (tag) => {
    setPage(1);
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const resetFilters = () => {
    setPage(1);
    setSearch('');
    setDifficulty('');
    setStatus('');
    setSelectedTags([]);
    setSort('relevance');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Problems</h1>
          <p className="text-gray-600 dark:text-gray-400">Browse and filter problems. Track your progress in real time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refetch()} className="btn btn-outline flex items-center gap-2">
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            Refresh
          </button>
          <button onClick={resetFilters} className="btn btn-secondary">Reset</button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-1 space-y-6">
          {/* Search */}
          <div className="card p-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search</label>
            <div className="mt-2 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                placeholder="Search by title or tag..."
                className="input pl-9 w-full"
              />
            </div>
          </div>

          {/* Difficulty */}
          <div className="card p-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {['', 'Easy', 'Medium', 'Hard'].map((d) => (
                <button
                  key={d || 'All'}
                  onClick={() => { setPage(1); setDifficulty(d); }}
                  className={`px-3 py-2 rounded-md text-sm border transition ${
                    difficulty === d
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-border hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {d || 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="card p-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { k: '', label: 'All' },
                { k: 'solved', label: 'Solved' },
                { k: 'unsolved', label: 'Unsolved' },
              ].map(({ k, label }) => (
                <button
                  key={k || 'all'}
                  onClick={() => { setPage(1); setStatus(k); }}
                  className={`px-3 py-2 rounded-md text-sm border transition ${
                    status === k
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-border hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
              <button
                className="text-xs text-primary-600 hover:underline"
                onClick={() => setSelectedTags([])}
              >
                Clear
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 max-h-56 overflow-auto pr-1">
              {(tagsData || []).map((t) => (
                <button
                  key={t.name}
                  onClick={() => { setPage(1); toggleTag(t.name); }}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    selectedTags.includes(t.name)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-border hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Results */}
        <section className="lg:col-span-3 space-y-4">
          {/* Top bar: sort + summary */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium">{items.length}</span> of{' '}
              <span className="font-medium">{totalCount}</span> problems
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Sort:</label>
              <select
                className="select"
                value={sort}
                onChange={(e) => { setPage(1); setSort(e.target.value); }}
              >
                <option value="relevance">Relevance</option>
                <option value="difficulty">Difficulty</option>
                <option value="acceptance">Acceptance</option>
              </select>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="mt-3 h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="card p-6 border-error-300 bg-error-50 text-error-700">
              Failed to load problems. Please try again.
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && items.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-gray-700 dark:text-gray-300">No problems found. Adjust filters or try a different search.</p>
            </div>
          )}

          {/* Problems list */}
          <div className="space-y-3">
            {items.map((p) => {
              const diffClass = DIFF_COLORS[p.difficulty] || 'text-gray-700 bg-gray-100 border-gray-200';
              const acceptance = p?.stats?.acRate ?? p?.acRate; // backend may send either
              return (
                <div key={p._id || p.titleSlug} className="card p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    {/* Left: title & meta */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/problems/${p.titleSlug}`}
                          className="font-semibold text-gray-900 dark:text-white hover:underline"
                        >
                          {p.title}
                        </Link>
                        <span className={`text-xs px-2 py-1 rounded border ${diffClass}`}>
                          {p.difficulty}
                        </span>
                        {p.solved ? (
                          <span className="inline-flex items-center text-xs text-success-700 bg-success-50 border border-success-200 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Solved
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Unsolved
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Acceptance: {acceptance != null ? `${acceptance}%` : '—'}
                      </div>
                      {/* Tags */}
                      {p.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {p.tags.slice(0, 8).map((tag) => (
                            <span key={tag} className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2">
                      <a
                        href={p.link || (p.titleSlug ? `https://leetcode.com/problems/${p.titleSlug}/` : '#')}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline"
                      >
                        Solve on LeetCode
                      </a>
                      <Link to={`/problems/${p.titleSlug}`} className="btn btn-primary">
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                className="btn btn-outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page <span className="font-medium">{page}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </div>
              <button
                className="btn btn-outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
