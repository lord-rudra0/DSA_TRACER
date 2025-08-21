import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Trophy, 
  Users, 
  Target, 
  BarChart3, 
  Award, 
  Flame,
  Code
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

const Sidebar = ({ mobile = false, onNavigate }) => {
  const location = useLocation();
  const { user } = useAuth();

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: LayoutDashboard,
      description: 'Overview and stats'
    },
    { 
      name: 'Problems', 
      href: '/problems', 
      icon: BookOpen,
      description: 'Practice problems'
    },
    { 
      name: 'Leaderboard', 
      href: '/leaderboard', 
      icon: Trophy,
      description: 'Rankings and competition'
    },
    { 
      name: 'Contest', 
      href: '/contest', 
      icon: Award,
      description: 'Competitions and rankings'
    },
    { 
      name: 'Friends', 
      href: '/friends', 
      icon: Users,
      description: 'Connect with others'
    },
    { 
      name: 'Statistics', 
      href: '/stats', 
      icon: BarChart3,
      description: 'Detailed analytics'
    }
  ];

  const handleNavClick = () => {
    if (mobile && onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
            <Code className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              DSA Tracker
            </h1>
            <p className="text-xs text-gray-500">Level up your coding</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img
                className="w-12 h-12 rounded-full"
                src={user.avatar}
                alt={user.username}
              />
            ) : (
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {user.username?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.username}
              </p>
              <p className="text-xs text-gray-500">Level {user.level}</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary-600" />
                <span className="text-xs text-gray-600 dark:text-gray-300">XP</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {user.xp?.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-warning-600" />
                <span className="text-xs text-gray-600 dark:text-gray-300">Streak</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {user.currentStreak}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={handleNavClick}
              className={clsx(
                'group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Icon className={clsx(
                'mr-3 h-5 w-5 transition-colors',
                isActive 
                  ? 'text-white' 
                  : 'text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'
              )} />
              <div className="flex-1">
                <span className="block">{item.name}</span>
                <span className={clsx(
                  'text-xs',
                  isActive 
                    ? 'text-primary-100' 
                    : 'text-gray-500 dark:text-gray-400'
                )}>
                  {item.description}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Made with ❤️ for coders
          </p>
          <p className="text-xs text-gray-400 mt-1">
            v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;