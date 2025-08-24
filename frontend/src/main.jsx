import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'
import { QueryClient, QueryClientProvider } from 'react-query'

// Configure global API base URL for all axios requests
const apiBase = import.meta.env?.VITE_API_BASE 
  || (typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app')
      ? 'https://dsa-tracer-backend.vercel.app/api'
      : '/api');
axios.defaults.baseURL = apiBase;
// Expose for quick debugging in console
if (typeof window !== 'undefined') {
  window.__API_BASE__ = apiBase;
  window.__AXIOS_BASE__ = axios.defaults.baseURL;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,            // 2 minutes considered fresh
      refetchOnWindowFocus: false,         // don't refetch just on focus
      refetchIntervalInBackground: false,  // don't run intervals when tab hidden
      retry: 2,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)