import React from 'react';
import { useParams } from 'react-router-dom';

export default function ProblemDetail() {
  const { slug } = useParams();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Problem Detail</h1>
      <p className="text-gray-600 dark:text-gray-300 mt-2">Viewing problem: <span className="font-mono">{slug}</span></p>
    </div>
  );
}
