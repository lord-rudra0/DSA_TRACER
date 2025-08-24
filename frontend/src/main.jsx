import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

// Configure global API base URL for all axios requests
const apiBase = import.meta.env.VITE_API_BASE
if (apiBase) {
  axios.defaults.baseURL = apiBase
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)