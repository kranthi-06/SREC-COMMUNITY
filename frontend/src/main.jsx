import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ─── Service Worker Registration (Production Grade) ────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // Service Workers require: localhost OR https://
    const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
    const isSecure = window.location.protocol === 'https:';

    if (!isLocalhost && !isSecure) {
      console.warn('[SW] Registration skipped: requires HTTPS or localhost');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[SW] Registered:', registration.scope);
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
