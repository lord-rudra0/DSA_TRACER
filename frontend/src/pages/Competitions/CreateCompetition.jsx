import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

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
          <p className="text-sm text-gray-600 dark:text-gray-300">Enter LeetCode problem slugs separated by commas.</p>
          <div className="mt-3">
            <input className="input w-full" placeholder="two-sum, valid-parentheses" value={problemSlugs} onChange={e=>setProblemSlugs(e.target.value)} aria-invalid={!!fieldErrors.problems} />
            {fieldErrors.problems && <p className="mt-1 text-xs text-red-600">{fieldErrors.problems}</p>}
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
    </div>
  );
}
