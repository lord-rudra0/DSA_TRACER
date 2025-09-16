import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext.jsx';

const BadgeContext = createContext();

export const useBadges = () => {
  const ctx = useContext(BadgeContext);
  if (!ctx) throw new Error('useBadges must be used within BadgeProvider');
  return ctx;
};

export const BadgeProvider = ({ children }) => {
  const { user } = useAuth();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchBadges = async () => {
      if (!user) {
        // fallback to localStorage
        try {
          const raw = localStorage.getItem('top150_badges');
          if (raw && mounted) setBadges(JSON.parse(raw));
        } catch (e) {}
        return;
      }

      setLoading(true);
      try {
        const res = await axios.get('/users/badges');
        if (mounted) setBadges(res.data.badges || []);
      } catch (e) {
        // fallback to local file/localStorage
        try {
          const raw = localStorage.getItem('top150_badges');
          if (raw && mounted) setBadges(JSON.parse(raw));
        } catch (err) {}
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchBadges();
    return () => { mounted = false; };
  }, [user]);

  const addBadge = async (badge) => {
    if (user) {
      try {
        const res = await axios.post('/users/badges', badge);
        if (res?.data?.badge) {
          setBadges(prev => [res.data.badge, ...prev]);
          return res.data.badge;
        }
      } catch (e) {
        // ignore and fallback to local
      }
    }
    // fallback: persist locally
    const local = { id: `local-${Date.now()}`, ...badge };
    setBadges(prev => [local, ...prev]);
    try {
      localStorage.setItem('top150_badges', JSON.stringify([local, ...badges]));
    } catch (e) {}
    return local;
  };

  const value = { badges, loading, addBadge };
  return (
    <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>
  );
};
