import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Code, 
  Trophy, 
  Users, 
  BarChart3, 
  ArrowRight, 
  CheckCircle,
  Target,
  Award,
  Flame
} from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: Code,
      title: 'Problem Tracking',
      description: 'Track your progress across LeetCode, HackerRank, and more platforms',
      color: 'text-primary-600'
    },
    {
      icon: Trophy,
      title: 'Competitive Leaderboards',
      description: 'Compete with friends and climb the global rankings',
      color: 'text-warning-600'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Detailed insights into your coding patterns and improvement areas',
      color: 'text-success-600'
    },
    {
      icon: Users,
      title: 'Social Features',
      description: 'Connect with fellow coders and share your achievements',
      color: 'text-error-600'
    }
  ];

  const stats = [
    { label: 'Active Users', value: '10,000+', icon: Users },
    { label: 'Problems Tracked', value: '2,500+', icon: Target },
    { label: 'Solutions Shared', value: '50,000+', icon: CheckCircle },
    { label: 'Contests Held', value: '100+', icon: Award }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            {/* Navigation */}
            <nav className="relative flex items-center justify-between sm:h-10 lg:justify-start px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center flex-grow flex-shrink-0 lg:flex-grow-0">
                <div className="flex items-center justify-between w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
                      <Code className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      DSA Tracker
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden md:block md:ml-10 md:pr-4 md:space-x-8">
                <Link to="/login" className="font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary px-6 py-2">
                  Get Started
                </Link>
              </div>
            </nav>

            {/* Hero Content */}
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Track your</span>{' '}
                  <span className="block text-primary-600 xl:inline">coding journey</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 dark:text-gray-400 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Master Data Structures and Algorithms with comprehensive progress tracking, 
                  interactive challenges, and a competitive community of developers.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link
                      to="/register"
                      className="btn btn-primary w-full flex items-center justify-center px-8 py-3 text-base font-medium md:py-4 md:text-lg md:px-10"
                    >
                      Start Learning
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link
                      to="/login"
                      className="btn btn-outline w-full flex items-center justify-center px-8 py-3 text-base font-medium md:py-4 md:text-lg md:px-10"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        
        {/* Hero Image/Illustration */}
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-gradient-to-r from-primary-400 to-primary-600 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Code className="w-16 h-16" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-warning-500 rounded-full flex items-center justify-center animate-bounce">
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">Code. Track. Improve.</h3>
              <p className="text-lg opacity-90">Join thousands of developers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <Icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">
              Features
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need to excel
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-400 lg:mx-auto">
              Comprehensive tools to track, analyze, and improve your coding skills with gamification and social features.
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="card card-hover p-6 text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <Icon className={`w-6 h-6 ${feature.color}`} />
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to level up?</span>
            <span className="block text-primary-200">Start your journey today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                to="/register"
                className="btn bg-white text-primary-600 hover:bg-gray-50 inline-flex items-center justify-center px-8 py-3 text-base font-medium"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Code className="h-6 w-6 text-primary-600" />
              <span className="text-white font-bold">DSA Tracker</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 DSA Tracker. Made with ❤️ for developers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;