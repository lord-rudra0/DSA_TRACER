import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)