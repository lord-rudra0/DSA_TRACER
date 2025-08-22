import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Expects prop: data = array of { date: string, count: number }
export default function ActivityHeatmap({ data = [] }) {
  const chartData = useMemo(() => {
    // Keep chronological order; limit to last 90 points for readability
    const sorted = [...(data || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const limited = sorted.slice(-90);
    return limited.map((d) => ({ date: (d.date || '').slice(5), count: d.count || 0 })); // show MM-DD
  }, [data]);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={chartData.length > 30 ? Math.floor(chartData.length / 12) : 0} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#22c55e" name="Accepted" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
