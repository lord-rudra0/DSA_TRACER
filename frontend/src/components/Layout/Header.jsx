import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Monitor,
  Settings,
  LogOut,
  User,
  ExternalLink
} from 'lucide-react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useBadges } from '../../contexts/BadgeContext.jsx';
import { Link } from 'react-router-dom';
import Sidebar from './Sidebar';

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { badges } = useBadges();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5" />;
      case 'dark':
        return <Moon className="h-5 w-5" />;
      case 'system':
        return <Monitor className="h-5 w-5" />;
      default:
        return <Sun className="h-5 w-5" />;
    }
  };

  const mockNotifications = [
    {
      id: 1,
      title: 'New Daily Challenge Available',
      message: 'Today\'s challenge is a Medium difficulty problem',
      time: '2 hours ago',
      read: false
    },
    {
      id: 2,
      title: 'Friend Activity',
      message: 'John solved 3 new problems',
      time: '5 hours ago',
      read: false
    },
    {
      id: 3,
      title: 'Streak Milestone',
      message: 'Congratulations! You\'ve reached a 7-day streak',
      time: '1 day ago',
      read: true
    }
  ];

  // Admin pending requests count
  const { data: pendingData } = useQuery(
    ['admin:pendingCount'],
    async () => {
      const res = await axios.get('/admin/requests/pending/count');
      return res.data;
    },
    {
      enabled: user?.role === 'admin',
      refetchInterval: 20000,
    }
  );

  // Daily challenge link (dynamic)
  const { data: dailyData, isLoading: dailyLoading } = useQuery(
    ['problems:dailyChallenge'],
    async () => {
      const res = await axios.get('/problems/daily/challenge');
      return res.data;
    },
    { staleTime: 1000 * 60 * 30, retry: 1 }
  );
  const dailyUrl = dailyData?.link || (dailyData?.titleSlug ? `https://leetcode.com/problems/${dailyData.titleSlug}/` : 'https://leetcode.com/problemset/all/');

  const pendingCount = user?.role === 'admin' ? (pendingData?.count || 0) : 0;

  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:border-none">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            {/* Mobile menu button */}
            <div className="flex items-center lg:hidden">
              <button
                type="button"
                className="btn btn-secondary p-2"
                onClick={() => setShowMobileMenu(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="flex-1 flex justify-center px-2 lg:ml-6 lg:justify-start">
              <div className="max-w-lg w-full lg:max-w-xs">
                <label htmlFor="search" className="sr-only">
                  Search problems
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="search"
                    name="search"
                    className="input pl-10 pr-3 py-2 w-full"
                    placeholder="Search problems..."
                    type="search"
                  />
                </div>
              </div>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-2">
              {/* Daily Challenge external link */}
              <a
                href={dailyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary hidden sm:inline-flex items-center gap-2 disabled:opacity-60"
                title={dailyLoading ? 'Loading daily challenge…' : 'Open Daily Challenge on LeetCode'}
                aria-disabled={dailyLoading}
              >
                <ExternalLink className="h-4 w-4" />
                <span>{dailyLoading ? 'Daily…' : 'Daily Challenge'}</span>
              </a>
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="btn btn-secondary p-2"
                title={`Theme: ${theme}`}
              >
                {getThemeIcon()}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  className="btn btn-secondary p-2 relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-5 w-5" />
                  {(mockNotifications.some(n => !n.read) || pendingCount > 0) && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-error-500 rounded-full"></span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 card z-50 shadow-lg">
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-3">Notifications</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {user?.role === 'admin' && (
                          <div className={`p-3 rounded-lg border ${pendingCount > 0 ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' : 'bg-gray-50 dark:bg-gray-700'}`}>
                            <h4 className="font-medium text-sm">Admin Requests</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {pendingCount} pending request{pendingCount === 1 ? '' : 's'}
                            </p>
                            <div className="mt-2">
                              <Link to="/admin" className="text-xs text-primary-600 hover:text-primary-700">Go to Admin</Link>
                            </div>
                          </div>
                        )}
                        {mockNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 rounded-lg border ${
                              notification.read 
                                ? 'bg-gray-50 dark:bg-gray-700' 
                                : 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                            }`}
                          >
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <button className="text-sm text-primary-600 hover:text-primary-700">
                          Mark all as read
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                {/* Badges preview (show up to 3) */}
                {badges && badges.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2 mr-3">
                    {badges.slice(0,3).map((b, i) => (
                      <div key={i} title={b.name || b.title} className="w-7 h-7 rounded-full bg-yellow-50 flex items-center justify-center text-sm">
                        {b.icon || (b.name ? b.name.charAt(0) : '🏅')}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  {user?.avatar ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.avatar}
                      alt={user.leetcodeUsername}
                    />
                  ) : (
                    <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user?.leetcodeUsername?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.leetcodeUsername}
                    </p>
                    <p className="text-xs text-gray-500">Level {user?.level}</p>
                  </div>
                </button>

                {/* User dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 card z-50 shadow-lg">
                    <div className="py-1">
                      <Link
                        to={`/profile/${user?.leetcodeUsername}`}
                        className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Your Profile
                      </Link>
                      <Link
                        to="/badges"
                        className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Award className="h-4 w-4 mr-2" />
                        Badges
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Link>
                      <hr className="my-1 border-gray-200 dark:border-gray-600" />
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-error-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowMobileMenu(false)} />
          <div className="relative flex flex-col w-full max-w-xs bg-white dark:bg-gray-800 shadow-xl">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setShowMobileMenu(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <Sidebar mobile onNavigate={() => setShowMobileMenu(false)} />
          </div>
        </div>
      )}

      {/* Click outside handler for dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }} 
        />
      )}
    </>
  );
};

export default Header;