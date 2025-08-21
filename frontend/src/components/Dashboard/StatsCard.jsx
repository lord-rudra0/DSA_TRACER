import React from 'react';

export default function StatsCard({ title, value, change, icon: Icon, color = 'primary', description }) {
  const colorMap = {
    primary: 'text-primary-600 bg-primary-50',
    success: 'text-success-600 bg-success-50',
    warning: 'text-warning-600 bg-warning-50',
    error: 'text-error-600 bg-error-50',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorMap[color] || colorMap.primary}`}>
          {Icon ? <Icon className="w-6 h-6" /> : null}
        </div>
      </div>
      {description ? (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</div>
      ) : null}
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">Change: {change}</div>
    </div>
  );
}
