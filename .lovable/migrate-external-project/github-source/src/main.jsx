import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initBrandingFromCache } from '@/lib/tenantBranding'

// Apply cached tenant branding BEFORE React mounts so the correct theme
// is on the DOM for the first paint — prevents flash on page reload.
initBrandingFromCache();

// Apply saved Light/Dark/System theme mode before first paint (avoids flash).
(function applyInitialTheme() {
  const mode = localStorage.getItem("themeMode") || "system";
  const isDark = mode === "dark" || (mode === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", !!isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

// Fade out the static HTML splash once React has painted its first frame —
// the app's own loading screen takes over, so there is never a white flash.
requestAnimationFrame(() => requestAnimationFrame(() => window.__hideSplash?.()))
// Safety net: never leave the splash covering the app if the first paint stalls.
setTimeout(() => window.__hideSplash?.(), 5000)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}