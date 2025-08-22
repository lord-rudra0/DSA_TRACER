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
    setLoading(true);
    try {
      const problems = problemSlugs.split(',').map(s => s.trim()).filter(Boolean);
      const payload = { name, description, problems, startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), visibility, scoring };
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
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">{isEdit ? 'Edit Competition' : 'Create Competition'}</h1>
      {error && <div className="mb-3 text-error-600">{error}</div>}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input className="input w-full" value={name} onChange={e=>setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea className="input w-full" value={description} onChange={e=>setDescription(e.target.value)} rows={3} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">LeetCode Problem Slugs (comma separated)</label>
          <input className="input w-full" placeholder="two-sum, valid-parentheses" value={problemSlugs} onChange={e=>setProblemSlugs(e.target.value)} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start</label>
            <input type="datetime-local" className="input w-full" value={startAt} onChange={e=>setStartAt(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End</label>
            <input type="datetime-local" className="input w-full" value={endAt} onChange={e=>setEndAt(e.target.value)} required />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Visibility</label>
            <select className="input w-full" value={visibility} onChange={e=>setVisibility(e.target.value)}>
              <option value="public">Public</option>
              <option value="friends">Friends</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scoring (E/M/H)</label>
            <div className="flex gap-2">
              <input type="number" min={0} className="input w-20" value={scoring.easy} onChange={e=>setScoring(s=>({ ...s, easy: Number(e.target.value) }))} />
              <input type="number" min={0} className="input w-20" value={scoring.medium} onChange={e=>setScoring(s=>({ ...s, medium: Number(e.target.value) }))} />
              <input type="number" min={0} className="input w-20" value={scoring.hard} onChange={e=>setScoring(s=>({ ...s, hard: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
        <div className="pt-2 flex items-center gap-2">
          <button className="btn btn-primary" disabled={loading}>{loading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create')}</button>
          {isEdit && (
            <button type="button" className="btn" onClick={() => navigate(-1)}>Cancel</button>
          )}
        </div>
      </form>
    </div>
  );
}
