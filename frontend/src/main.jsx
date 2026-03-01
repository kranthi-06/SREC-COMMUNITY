import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
const isSecure = window.location.protocol === 'https:';
const isLocalIP = /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // DO NOT allow registration from local IP unless HTTPS
    if (isLocalIP && !isSecure) {
      console.warn('Service Worker registration blocked: App must run on localhost or HTTPS to support Service Workers. Local IPs are not secure contexts.');
      return;
    }

    if (!isLocalhost && !isSecure) {
      console.warn('Service Worker registration blocked: App must run on HTTPS.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
