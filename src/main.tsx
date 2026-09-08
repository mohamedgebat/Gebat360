import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Capture immédiate du prompt d'installation PWA au niveau window
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredPwaPrompt = e;
    console.log('📱 [PWA] Evénement beforeinstallprompt capturé au niveau global window');
  });

  const handleScriptError = (reason: string) => {
    const now = Date.now();
    const lastPurge = Number(sessionStorage.getItem('gebat_main_purge') || 0);
    if (now - lastPurge < 4000) return;
    sessionStorage.setItem('gebat_main_purge', String(now));

    console.warn('⚡ [GEBAT 360°] Auto-purge SW & cache client suite à un script obsolète:', reason);
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
    }
    setTimeout(() => {
      window.location.replace(window.location.origin + window.location.pathname + '?_refresh=' + Date.now());
    }, 200);
  };

  window.addEventListener('vite:preload-error', () => {
    handleScriptError('vite:preload-error');
  });

  window.addEventListener('error', (e: any) => {
    const msg = String(e?.message || e?.filename || '');
    if (msg.includes('Failed to load module script') || msg.includes('MIME type of "text/html"')) {
      handleScriptError(msg);
    }
  });

  window.addEventListener('unhandledrejection', (e: any) => {
    const reason = String(e?.reason || '');
    if (reason.includes('Failed to fetch dynamically imported module') || reason.includes('text/html')) {
      handleScriptError(reason);
    }
  });
}

// Enregistrement immédiat et résilient du Service Worker PWA GEBAT 360°
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('📱 [PWA] GEBAT 360° Service Worker enregistré avec succès:', registration.scope);
        // Vérifier les mises à jour immédiatement
        registration.update();
      })
      .catch((error) => {
        console.error('⚠️ [PWA] Échec enregistrement Service Worker:', error);
      });
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
