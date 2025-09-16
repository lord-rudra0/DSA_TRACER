import React, { useState, useMemo } from 'react';
import { useBadges } from '../../contexts/BadgeContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import BadgeCard from '../../components/Badges/BadgeCard';
import BadgeModal from '../../components/Badges/BadgeModal';

// Canonical badge definitions (server also has logic, but frontend shows locked badges too)
const BADGE_DEFINITIONS = [
  { name: 'First Steps', description: 'Solved your first problem', icon: '🎯', slug: 'first-steps', criteria: (s) => s.totalProblems >= 1 },
  { name: 'Getting Warmed Up', description: 'Solved 10 problems', icon: '🔥', slug: 'solved-10', criteria: (s) => s.totalProblems >= 10 },
  { name: 'Problem Solver', description: 'Solved 50 problems', icon: '💪', slug: 'solved-50', criteria: (s) => s.totalProblems >= 50 },
  { name: 'Code Master', description: 'Solved 100 problems', icon: '👑', slug: 'solved-100', criteria: (s) => s.totalProblems >= 100 },
  { name: 'Streak Master', description: 'Maintained a 7-day streak', icon: '⚡', slug: 'streak-7', criteria: (s) => s.maxStreak >= 7 },
  { name: 'Dedication', description: 'Maintained a 30-day streak', icon: '🏆', slug: 'streak-30', criteria: (s) => s.maxStreak >= 30 },
  { name: 'Contest Warrior', description: 'Participated in 5 contests', icon: '⚔️', slug: 'contest-5', criteria: (s) => s.contestsAttended >= 5 },
  { name: 'Polyglot', description: 'Solved problems in 5 different languages', icon: '🌍', slug: 'polyglot-5', criteria: (s) => s.languageCount >= 5 }
];

const Badges = () => {
  const { badges = [], loading } = useBadges();
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);

  const statsSnapshot = useMemo(() => ({
    totalProblems: user?.totalProblems || 0,
    maxStreak: user?.maxStreak || 0,
    contestsAttended: user?.contestsAttended || 0,
    languageCount: (user?.preferredLanguages || []).length
  }), [user]);

  // Compute which definitions are unlocked locally (for preview)
  const unlockedNames = new Set((badges || []).map(b => b.name));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Badges & Achievements</h1>
        <div className="text-sm text-gray-500">{user?.leetcodeUsername ? `Viewing for ${user.leetcodeUsername}` : 'Local badges'}</div>
      </div>

      <div className="card p-6 mb-6">
        <div className="mb-3 text-sm text-gray-600">Earned badges</div>
        {loading && <div className="text-sm text-gray-500">Loading badges…</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(badges || []).map((b, i) => (
            <BadgeCard key={b.id || `${b.name}-${i}`} badge={b} onClick={() => setSelected(b)} />
          ))}
          {(badges || []).length === 0 && !loading && (
            <div className="text-sm text-gray-500">No badges earned yet — keep solving!</div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-3 text-sm text-gray-600">Available badges</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {BADGE_DEFINITIONS.map((def) => {
            const unlocked = unlockedNames.has(def.name) || def.criteria(statsSnapshot);
            // For simple progress, compute a rough percent for problem count-based badges
            let progress = undefined;
            if (def.slug.startsWith('solved-')) {
              const target = Number(def.slug.split('-')[1]) || 0;
              progress = Math.min(100, (statsSnapshot.totalProblems / target) * 100);
            }
            return (
              <BadgeCard key={def.slug} badge={def} locked={!unlocked} onClick={() => setSelected(def)} progress={!unlocked ? progress : undefined} />
            );
          })}
        </div>
      </div>

      <BadgeModal badge={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default Badges;
