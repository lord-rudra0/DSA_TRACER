import React from 'react';
import { Flame } from 'lucide-react';

// Props: challenge = { title, difficulty, link? }
export default function DailyChallenge({ challenge }) {
  if (!challenge) return null;
  const diffColor =
    challenge.difficulty === 'Easy'
      ? 'text-success-600'
      : challenge.difficulty === 'Medium'
      ? 'text-warning-600'
      : 'text-error-600';
  const externalHref = challenge.link || (challenge.titleSlug ? `https://leetcode.com/problems/${challenge.titleSlug}/` : undefined);

  return (
    <div className="card p-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-warning-100 dark:bg-warning-900/40 flex items-center justify-center">
          <Flame className="w-5 h-5 text-warning-600" />
        </div>
        <div>
          <p className="font-semibold">Daily Challenge</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {challenge.title || 'Unnamed Challenge'}
            {challenge.difficulty ? (
              <span className={`ml-2 font-medium ${diffColor}`}>[{challenge.difficulty}]</span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {challenge.solved ? (
          <span className="px-3 py-1 rounded-full text-sm bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300 font-medium">Solved</span>
        ) : (
          externalHref && (
            <a
              className="btn btn-primary px-3 py-2"
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in LeetCode
            </a>
          )
        )}
      </div>
    </div>
  );
}
