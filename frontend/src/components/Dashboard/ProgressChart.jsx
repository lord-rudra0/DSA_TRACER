import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

// Recharts AreaChart for monthly accepted counts.
// Props: data (array of { _id:{year, month}, count })
export default function ProgressChart({ data = [] }) {
  const chartData = useMemo(() => {
    return (data || []).map((d) => ({
      label: `${d._id.year}-${String(d._id.month).padStart(2, '0')}`,
      accepted: d.count,
    }));
  }, [data]);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="accepted" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAccepted)" name="Accepted" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
