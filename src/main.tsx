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
}

// Enregistrement immédiat et résilient du Service Worker PWA GEBAT 360°
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('📱 [PWA] GEBAT 360° Service Worker enregistré avec succès:', registration.scope);
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
