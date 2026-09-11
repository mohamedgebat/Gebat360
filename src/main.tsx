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

// Désactivation et purge systématique des anciens Service Workers PWA pour garantir le chargement en direct du code v567
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
