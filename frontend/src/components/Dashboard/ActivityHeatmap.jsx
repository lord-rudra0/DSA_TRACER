import React from 'react';

// Expects prop: data = array of { date: string, count: number }
export default function ActivityHeatmap({ data = [] }) {
  // Very simple placeholder: render last 14 days as boxes
  const days = 14;
  const today = new Date();
  const series = Array.from({ length: days }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    const entry = data.find((x) => (x.date || '').slice(0, 10) === key);
    const count = entry?.count || 0;
    const intensity = count === 0 ? 'bg-gray-200 dark:bg-gray-700' : count < 3 ? 'bg-success-200 dark:bg-success-800' : count < 6 ? 'bg-success-400' : 'bg-success-600';
    return { key, count, intensity };
  });

  return (
    <div>
      <div className="grid grid-cols-14 gap-1">
        {series.map((d) => (
          <div key={d.key} className={`w-4 h-4 rounded ${d.intensity}`} title={`${d.key}: ${d.count}`} />
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Activity over last {days} days</p>
    </div>
  );
}
