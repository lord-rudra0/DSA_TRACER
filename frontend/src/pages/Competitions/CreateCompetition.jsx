import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from 'react-query';

export default function CreateCompetition() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [problemSlugs, setProblemSlugs] = useState(''); // comma separated
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [scoring, setScoring] = useState({ easy: 1, medium: 2, hard: 3 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const isEdit = Boolean(id);

  // Picker modal state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState('browse'); // browse | link | bulk | bundles

  // Browse filters
  const [q, setQ] = useState('');
  const [qdifficulty, setQDifficulty] = useState(''); // '', 'Easy', 'Medium', 'Hard'
  const [qTags, setQTags] = useState([]); // array of tag names

  // Bundles/suggestions
  const [bundleTags, setBundleTags] = useState([]);
  const [bundleCounts, setBundleCounts] = useState({ easy: 5, medium: 3, hard: 2 });

  // Add by link/slug
  const [slugInput, setSlugInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');

  const LIMIT = 20;

  useEffect(() => {
    if (!isEdit) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/competitions/${id}`);
        const comp = res.data?.competition;
        if (!comp) return;
        if (!mounted) return;
        setName(comp.name || '');
        setDescription(comp.description || '');
        setProblemSlugs((comp.problems || []).join(', '));
        // Convert ISO to datetime-local value
        const fmt = (d) => new Date(d).toISOString().slice(0,16);
        setStartAt(comp.startAt ? fmt(comp.startAt) : '');
        setEndAt(comp.endAt ? fmt(comp.endAt) : '');
        setVisibility(comp.visibility || 'public');
        setScoring({
          easy: comp.scoring?.easy ?? 1,
          medium: comp.scoring?.medium ?? 2,
          hard: comp.scoring?.hard ?? 3,
        });
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load competition');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, isEdit]);

  // Helpers to manage slugs list (string with commas) --------------------------------
  const normalizeSlug = (s) => {
    if (!s) return '';
    // Extract slug from full LeetCode link or keep slug
    const trimmed = s.trim();
    const m = trimmed.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
    const slug = m ? m[1] : trimmed;
    return slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  };

  const currentSlugList = useMemo(() => problemSlugs.split(',').map(s => s.trim()).filter(Boolean), [problemSlugs]);

  const addSlug = (slug) => {
    const s = normalizeSlug(slug);
    if (!s) return;
    if (currentSlugList.includes(s)) return;
    const next = [...currentSlugList, s].join(', ');
    setProblemSlugs(next);
  };

  const addSlugs = (slugs) => {
    const unique = new Set(currentSlugList);
    slugs.map(normalizeSlug).filter(Boolean).forEach(s => unique.add(s));
    setProblemSlugs(Array.from(unique).join(', '));
  };

  // Tags meta for filters/bundles -----------------------------------------------------
  const { data: tagsData } = useQuery(
    'picker-problem-tags',
    async () => (await axios.get('/problems/meta/tags')).data,
    { staleTime: 10 * 60 * 1000 }
  );

  // Browse list with infinite pagination ---------------------------------------------
  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('limit', LIMIT);
    if (q) p.set('search', q);
    if (qdifficulty) p.set('difficulty', qdifficulty);
    if (qTags.length) p.set('tags', qTags.join(','));
    return p.toString();
  }, [q, qdifficulty, qTags]);

  const {
    data: browseData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: browseLoading,
    isError: browseError,
    refetch: refetchBrowse,
  } = useInfiniteQuery(
    ['picker-problems', baseParams],
    async ({ pageParam = 1 }) => {
      const qp = baseParams ? `${baseParams}&page=${pageParam}` : `page=${pageParam}`;
      const res = await axios.get(`/problems?${qp}`);
      return res.data;
    },
    {
      enabled: pickerOpen && tab === 'browse',
      getNextPageParam: (lastPage) => lastPage?.pagination?.hasNext ? (lastPage?.pagination?.current || 1) + 1 : undefined,
      keepPreviousData: true,
      staleTime: 60 * 1000,
    }
  );

  const browseItems = (browseData?.pages || []).flatMap(p => p?.problems || []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      // Basic client-side validation
      const errs = {};
      if (!name.trim()) errs.name = 'Name is required';
      const problems = problemSlugs.split(',').map(s => s.trim()).filter(Boolean);
      if (problems.length === 0) errs.problems = 'At least one problem slug is required';
      if (!startAt) errs.startAt = 'Start time is required';
      if (!endAt) errs.endAt = 'End time is required';
      const startISO = startAt ? new Date(startAt).toISOString() : '';
      const endISO = endAt ? new Date(endAt).toISOString() : '';
      if (startISO && endISO && new Date(endISO) <= new Date(startISO)) {
        errs.endAt = 'End time must be after start time';
      }
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        setLoading(false);
        return;
      }

      const payload = { name: name.trim(), description, problems, startAt: startISO, endAt: endISO, visibility, scoring };
      if (isEdit) {
        const res = await axios.put(`/competitions/${id}`, payload);
        const newId = res.data?.competition?._id || id;
        navigate(`/competitions/${newId}`);
      } else {
        const res = await axios.post('/competitions', payload);
        const newId = res.data?.competition?._id;
        if (newId) navigate(`/competitions/${newId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create competition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">{isEdit ? 'Edit Competition' : 'Create Competition'}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Define details, time window, visibility and scoring for your competition.</p>
      </div>
      {error && <div className="mb-3 p-3 rounded bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>}
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Basics */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="text-lg font-medium">Basics</h2>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input className="input w-full" value={name} onChange={e=>setName(e.target.value)} aria-invalid={!!fieldErrors.name} />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400">(optional)</span></label>
              <textarea className="input w-full" value={description} onChange={e=>setDescription(e.target.value)} rows={4} placeholder="Tell participants what this competition is about…" />
            </div>
          </div>
        </section>

        {/* Problems */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="text-lg font-medium">Problems</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Enter LeetCode problem slugs separated by commas, or use the picker.</p>
          <div className="mt-3">
            <input className="input w-full" placeholder="two-sum, valid-parentheses" value={problemSlugs} onChange={e=>setProblemSlugs(e.target.value)} aria-invalid={!!fieldErrors.problems} />
            {fieldErrors.problems && <p className="mt-1 text-xs text-red-600">{fieldErrors.problems}</p>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline" onClick={() => { setPickerOpen(true); setTab('browse'); }}>Browse Problems</button>
            <button type="button" className="btn btn-outline" onClick={() => { setPickerOpen(true); setTab('link'); }}>Add by Link/Slug</button>
            <button type="button" className="btn btn-outline" onClick={() => { setPickerOpen(true); setTab('bulk'); }}>Bulk paste</button>
            <button type="button" className="btn btn-outline" onClick={() => { setPickerOpen(true); setTab('bundles'); }}>Tag-based bundles</button>
          </div>
          {/* Chips preview */}
          <div className="mt-3 flex flex-wrap gap-2">
            {problemSlugs.split(',').map(s=>s.trim()).filter(Boolean).slice(0,20).map((slug, idx) => (
              <span key={`${slug}-${idx}`} className="px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs border border-indigo-200 dark:border-indigo-800">{slug}</span>
            ))}
          </div>
        </section>

        {/* Schedule */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="text-lg font-medium">Schedule</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Times use your local timezone.</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start</label>
              <input type="datetime-local" className="input w-full" value={startAt} onChange={e=>setStartAt(e.target.value)} aria-invalid={!!fieldErrors.startAt} />
              {fieldErrors.startAt && <p className="mt-1 text-xs text-red-600">{fieldErrors.startAt}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End</label>
              <input type="datetime-local" className="input w-full" value={endAt} onChange={e=>setEndAt(e.target.value)} aria-invalid={!!fieldErrors.endAt} />
              {fieldErrors.endAt && <p className="mt-1 text-xs text-red-600">{fieldErrors.endAt}</p>}
            </div>
          </div>
        </section>

        {/* Settings */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <h2 className="text-lg font-medium">Settings</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Visibility</label>
              <select className="input w-full" value={visibility} onChange={e=>setVisibility(e.target.value)}>
                <option value="public">Public — anyone can join</option>
                <option value="friends">Friends — only your friends</option>
                <option value="private">Private — invite only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Scoring</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Easy</span>
                  <input type="number" min={0} className="input w-20" value={scoring.easy} onChange={e=>setScoring(s=>({ ...s, easy: Number(e.target.value) }))} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Medium</span>
                  <input type="number" min={0} className="input w-20" value={scoring.medium} onChange={e=>setScoring(s=>({ ...s, medium: Number(e.target.value) }))} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Hard</span>
                  <input type="number" min={0} className="input w-20" value={scoring.hard} onChange={e=>setScoring(s=>({ ...s, hard: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="pt-2 flex items-center gap-2">
          <button className="btn btn-primary" disabled={loading}>{loading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create')}</button>
          <button type="button" className="btn" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>

      {/* Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPickerOpen(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 text-sm">
                <button className={`px-3 py-1.5 rounded ${tab==='browse'?'bg-primary-600 text-white':'bg-gray-100 dark:bg-gray-800'}`} onClick={()=>setTab('browse')}>Browse</button>
                <button className={`px-3 py-1.5 rounded ${tab==='link'?'bg-primary-600 text-white':'bg-gray-100 dark:bg-gray-800'}`} onClick={()=>setTab('link')}>Link/Slug</button>
                <button className={`px-3 py-1.5 rounded ${tab==='bulk'?'bg-primary-600 text-white':'bg-gray-100 dark:bg-gray-800'}`} onClick={()=>setTab('bulk')}>Bulk</button>
                <button className={`px-3 py-1.5 rounded ${tab==='bundles'?'bg-primary-600 text-white':'bg-gray-100 dark:bg-gray-800'}`} onClick={()=>setTab('bundles')}>Bundles</button>
              </div>
              <button className="btn" onClick={() => setPickerOpen(false)}>Close</button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-auto" style={{ maxHeight: '75vh' }}>
              {tab === 'browse' && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input className="input w-full md:col-span-2" placeholder="Search by title or tag..." value={q} onChange={(e)=>{ /* reset pages via key change */ setQ(e.target.value); }} />
                    <select className="input" value={qdifficulty} onChange={(e)=>setQDifficulty(e.target.value)}>
                      <option value="">All difficulties</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                    <div className="flex flex-wrap gap-2 md:col-span-1">
                      {(tagsData || []).slice(0, 20).map(t => (
                        <button key={t.name} type="button" className={`px-2 py-1 rounded-full text-xs border ${qTags.includes(t.name)?'bg-primary-600 text-white border-primary-600':'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-border'}`} onClick={()=>setQTags(prev=> prev.includes(t.name)? prev.filter(x=>x!==t.name): [...prev, t.name])}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Results */}
                  <div className="space-y-2">
                    {browseLoading && <div className="text-sm text-gray-500">Loading…</div>}
                    {browseError && <div className="text-sm text-red-600">Failed to load problems</div>}
                    {browseItems.map((p) => {
                      const present = currentSlugList.includes(p.titleSlug);
                      return (
                        <div key={p._id || p.titleSlug} className="card p-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium">{p.title}</div>
                            <div className="text-xs text-gray-500">{p.difficulty} • {p.titleSlug}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a className="btn btn-outline" href={`https://leetcode.com/problems/${p.titleSlug}/`} target="_blank" rel="noreferrer">LeetCode</a>
                            <button
                              type="button"
                              className={`btn ${present ? 'btn-disabled' : 'btn-primary'}`}
                              onClick={()=> !present && addSlug(p.titleSlug)}
                              disabled={present}
                            >
                              {present ? 'Added' : 'Add'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-center pt-2">
                      {hasNextPage && (
                        <button className="btn btn-outline" onClick={()=>fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage? 'Loading…' : 'Load more'}</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'link' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Paste a LeetCode problem link or slug.</p>
                  <div className="flex items-center gap-2">
                    <input className="input w-full" placeholder="https://leetcode.com/problems/two-sum/ or two-sum" value={slugInput} onChange={(e)=>setSlugInput(e.target.value)} />
                    <button type="button" className="btn btn-primary" onClick={() => { if (slugInput.trim()) { addSlug(slugInput); setSlugInput(''); } }}>Add</button>
                  </div>
                </div>
              )}

              {tab === 'bulk' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Paste multiple slugs or LeetCode links (separated by spaces, commas, or new lines).</p>
                  <textarea className="input w-full" rows={6} placeholder={`two-sum\nvalid-parentheses\nhttps://leetcode.com/problems/longest-substring-without-repeating-characters/`} value={bulkInput} onChange={(e)=>setBulkInput(e.target.value)} />
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-primary" onClick={() => {
                      const parts = bulkInput.split(/[^a-z0-9-]+/i).filter(Boolean);
                      // re-extract from links if present
                      const slugs = parts.map(s => {
                        const m = s.match(/^[a-z0-9-]+$/i) ? s : (s.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i)?.[1] || s);
                        return m;
                      });
                      addSlugs(slugs);
                      setBulkInput('');
                    }}>Add all</button>
                    <button type="button" className="btn" onClick={() => setBulkInput('')}>Clear</button>
                  </div>
                </div>
              )}

              {tab === 'bundles' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Generate a pack by tags and counts per difficulty.</p>
                  <div className="flex flex-wrap gap-2">
                    {(tagsData || []).slice(0, 30).map(t => (
                      <button key={t.name} type="button" className={`px-2 py-1 rounded-full text-xs border ${bundleTags.includes(t.name)?'bg-primary-600 text-white border-primary-600':'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-border'}`} onClick={()=>setBundleTags(prev=> prev.includes(t.name)? prev.filter(x=>x!==t.name): [...prev, t.name])}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <span>Easy</span>
                      <input type="number" min={0} className="input w-20" value={bundleCounts.easy} onChange={e=>setBundleCounts(s=>({ ...s, easy: Number(e.target.value) }))} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Medium</span>
                      <input type="number" min={0} className="input w-20" value={bundleCounts.medium} onChange={e=>setBundleCounts(s=>({ ...s, medium: Number(e.target.value) }))} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Hard</span>
                      <input type="number" min={0} className="input w-20" value={bundleCounts.hard} onChange={e=>setBundleCounts(s=>({ ...s, hard: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-primary" onClick={async () => {
                      // Smart suggestions default if no tags: use general list
                      const chosen = [];
                      const pick = async (difficulty, count) => {
                        if (!count) return;
                        const params = new URLSearchParams();
                        params.set('limit', String(count));
                        params.set('page', '1');
                        if (difficulty) params.set('difficulty', difficulty);
                        if (bundleTags.length) params.set('tags', bundleTags.join(','));
                        const res = await axios.get(`/problems?${params.toString()}`);
                        const items = res.data?.problems || [];
                        for (const it of items) { if (it?.titleSlug) chosen.push(it.titleSlug); }
                      };
                      await pick('Easy', bundleCounts.easy);
                      await pick('Medium', bundleCounts.medium);
                      await pick('Hard', bundleCounts.hard);
                      addSlugs(chosen);
                    }}>Generate pack</button>
                    <button type="button" className="btn" onClick={()=>{ setBundleTags([]); setBundleCounts({ easy: 5, medium: 3, hard: 2 }); }}>Reset</button>
                  </div>

                  {/* Quick smart suggestions */}
                  <div className="flex flex-wrap gap-2 text-sm">
                    <button type="button" className="btn btn-outline" onClick={()=>{ setBundleTags([]); setBundleCounts({ easy: 5, medium: 3, hard: 2 }); }}>5E+3M+2H</button>
                    <button type="button" className="btn btn-outline" onClick={()=>{ setBundleTags(['array','hash-table']); setBundleCounts({ easy: 3, medium: 4, hard: 1 }); }}>Arrays+Hash (3/4/1)</button>
                    <button type="button" className="btn btn-outline" onClick={()=>{ setBundleTags(['graph','bfs','dfs']); setBundleCounts({ easy: 2, medium: 5, hard: 2 }); }}>Graphs (2/5/2)</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
