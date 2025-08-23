import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { 
  TrendingUp, 
  Target, 
  Flame, 
  Award, 
  Calendar,
  Clock,
  Code,
  Trophy,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import StatsCard from '../../components/Dashboard/StatsCard';
import ActivityHeatmap from '../../components/Dashboard/ActivityHeatmap';
import ProgressChart from '../../components/Dashboard/ProgressChart';
import RecentSubmissions from '../../components/Dashboard/RecentSubmissions';
import DailyChallenge from '../../components/Dashboard/DailyChallenge';

const Dashboard = () => {
  const { user, syncLeetCode, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const autoSyncedRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const { data: dashboardData, isLoading } = useQuery(
    'dashboard',
    () => axios.get('/users/dashboard').then(res => res.data),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  const { data: dailyChallenge } = useQuery(
    'daily-challenge',
    () => axios.get('/problems/daily/challenge').then(res => res.data),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Auto-sync LeetCode if daily shows solved but stats appear stale
  useEffect(() => {
    if (autoSyncedRef.current) return;
    const hasHandle = !!user?.leetcodeUsername;
    const solved = !!dailyChallenge?.solved;
    const statsStale = !user?.lastLeetCodeSync || (user?.totalProblems ?? 0) === 0;
    if (hasHandle && solved && statsStale) {
      autoSyncedRef.current = true;
      (async () => {
        try {
          const resp = await syncLeetCode(user.leetcodeUsername);
          if (resp?.success) {
            await refreshUser();
            queryClient.invalidateQueries('dashboard');
            queryClient.invalidateQueries('daily-challenge');
          }
        } catch (e) {
          // ignore auto sync errors silently
        }
      })();
    }
  }, [user, dailyChallenge, syncLeetCode, refreshUser, queryClient]);

  // Manual sync handler (button)
  const handleManualSync = async () => {
    if (!user?.leetcodeUsername || isSyncing) return;
    setIsSyncing(true);
    try {
      const resp = await syncLeetCode(user.leetcodeUsername);
      if (resp?.success) {
        setLastSyncedAt(new Date());
        await refreshUser();
        queryClient.invalidateQueries('dashboard');
        queryClient.invalidateQueries('daily-challenge');
      }
    } catch (e) {
      // no-op
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto sync every 5 minutes
  useEffect(() => {
    if (!user?.leetcodeUsername) return;
    const interval = setInterval(async () => {
      try {
        const resp = await syncLeetCode(user.leetcodeUsername);
        if (resp?.success) {
          setLastSyncedAt(new Date());
          await refreshUser();
          queryClient.invalidateQueries('dashboard');
          queryClient.invalidateQueries('daily-challenge');
        }
      } catch (e) {
        // ignore background sync errors
      }
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [user?.leetcodeUsername, syncLeetCode, refreshUser, queryClient]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total XP',
      value: user?.xp?.toLocaleString() || '0',
      change: dashboardData?.user?.xpGained || 0,
      icon: Target,
      color: 'primary',
      description: `Level ${user?.level || 1}`
    },
    {
      title: 'Current Streak',
      value: user?.currentStreak || 0,
      change: user?.currentStreak > 0 ? '+1' : '0',
      icon: Flame,
      color: 'warning',
      description: `Max: ${user?.maxStreak || 0} days`
    },
    {
      title: 'Problems Solved',
      value: user?.totalProblems || 0,
      change: dashboardData?.stats?.recentSubmissions?.filter(s => s.status === 'Accepted').length || 0,
      icon: BookOpen,
      color: 'success',
      description: 'This week'
    },
    {
      title: 'Badges Earned',
      value: user?.badges?.length || 0,
      change: dashboardData?.newBadges?.length || 0,
      icon: Award,
      color: 'error',
      description: 'Achievements unlocked'
    }
  ];

  const difficultyStats = {
    easy: user?.easySolved || 0,
    medium: user?.mediumSolved || 0,
    hard: user?.hardSolved || 0
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Welcome back, {user?.leetcodeUsername}! 👋
            </h1>
            <p className="text-primary-100 mb-4">
              Ready to tackle some challenges today? Let's keep that streak going!
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Last active: {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              {lastSyncedAt && (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  <span>Synced: {lastSyncedAt.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !user?.leetcodeUsername}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-60 disabled:cursor-not-allowed`}
              title="Sync your latest LeetCode data"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing…' : 'Sync Now'}
            </button>
            <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Code className="w-7 h-7" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Daily Challenge */}
      {dailyChallenge && (
        <DailyChallenge challenge={dailyChallenge} />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity & Progress */}
        <div className="lg:col-span-2 space-y-8">
          {/* Activity Heatmap */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Activity Overview
              </h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last 365 days
              </div>
            </div>
            <ActivityHeatmap data={dashboardData?.stats?.dailyActivity || []} />
          </div>

          {/* Progress Chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Progress Tracking
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <TrendingUp className="w-4 h-4" />
                Monthly view
              </div>
            </div>
            <ProgressChart 
              data={dashboardData?.stats?.monthlyProgress || []}
              difficultyData={difficultyStats}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Submissions */}
          <RecentSubmissions submissions={dashboardData?.stats?.recentSubmissions || []} />

          {/* Difficulty Breakdown */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Difficulty Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-success-600 dark:text-success-400 font-medium">Easy</span>
                <span className="font-bold">{difficultyStats.easy}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-success-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${difficultyStats.easy / Math.max(user?.totalProblems || 1, 1) * 100}%` 
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-warning-600 dark:text-warning-400 font-medium">Medium</span>
                <span className="font-bold">{difficultyStats.medium}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-warning-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${difficultyStats.medium / Math.max(user?.totalProblems || 1, 1) * 100}%` 
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-error-600 dark:text-error-400 font-medium">Hard</span>
                <span className="font-bold">{difficultyStats.hard}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-error-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${difficultyStats.hard / Math.max(user?.totalProblems || 1, 1) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* Latest Badges */}
          {user?.badges?.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Recent Badges
              </h3>
              <div className="space-y-3">
                {user.badges.slice(-3).map((badge, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-2xl">{badge.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{badge.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Quick Stats
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Contest Rating</span>
                <span className="font-medium">{user?.contestRating || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Contests Attended</span>
                <span className="font-medium">{user?.contestsAttended || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Last LeetCode Sync</span>
                <span className="font-medium">
                  {user?.lastLeetCodeSync 
                    ? new Date(user.lastLeetCodeSync).toLocaleDateString()
                    : 'Never'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Badges Notification */}
      {dashboardData?.newBadges?.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="card p-4 shadow-lg border-l-4 border-l-warning-500 animate-slideIn">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-warning-600" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  New Badge{dashboardData.newBadges.length > 1 ? 's' : ''} Unlocked!
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {dashboardData.newBadges.map(b => b.name).join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;