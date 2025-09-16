import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from './contexts/AuthContext';
import { BadgeProvider } from './contexts/BadgeContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AdminRoute from './components/Auth/AdminRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Problems from './pages/Problems/Problems';
import ProblemDetail from './pages/Problems/ProblemDetail';
import Leaderboard from './pages/Leaderboard/Leaderboard';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';
import Contest from './pages/Contest/Contest';
import Stats from './pages/Stats/Stats';
import Friends from './pages/Friends/Friends';
import NotFound from './pages/NotFound';
import CompetitionsList from './pages/Competitions/CompetitionsList';
import CreateCompetition from './pages/Competitions/CreateCompetition';
import CompetitionDetail from './pages/Competitions/CompetitionDetail';
import Admin from './pages/Admin/Admin';
import TopInterview from './pages/Problems/TopInterview';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BadgeProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected routes */}
                <Route path="/" element={<Layout />}>
                  <Route path="dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="problems" element={
                    <ProtectedRoute>
                      <Problems />
                    </ProtectedRoute>
                  } />
                  <Route path="problems/top-interview-150" element={
                    <ProtectedRoute>
                      <TopInterview />
                    </ProtectedRoute>
                  } />
                  <Route path="problems/:slug" element={
                    <ProtectedRoute>
                      <ProblemDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="leaderboard" element={
                    <ProtectedRoute>
                      <Leaderboard />
                    </ProtectedRoute>
                  } />
                  <Route path="profile/:leetcodeUsername?" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="settings" element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="contest" element={
                    <ProtectedRoute>
                      <Contest />
                    </ProtectedRoute>
                  } />
                  <Route path="stats" element={
                    <ProtectedRoute>
                      <Stats />
                    </ProtectedRoute>
                  } />
                  <Route path="friends" element={
                    <ProtectedRoute>
                      <Friends />
                    </ProtectedRoute>
                  } />
                  <Route path="competitions" element={
                    <ProtectedRoute>
                      <CompetitionsList />
                    </ProtectedRoute>
                  } />
                  <Route path="competitions/create" element={
                    <AdminRoute>
                      <CreateCompetition />
                    </AdminRoute>
                  } />
                  <Route path="competitions/:id/edit" element={
                    <AdminRoute>
                      <CreateCompetition />
                    </AdminRoute>
                  } />
                  <Route path="competitions/:id" element={
                    <ProtectedRoute>
                      <CompetitionDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="admin" element={
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  } />
                  {/* Contact Admin page removed */}
                </Route>
                
                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </Router>
          </BadgeProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;