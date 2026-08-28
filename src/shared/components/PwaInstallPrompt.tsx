import React, { useState, useEffect } from 'react';
import { Download, X, CheckCircle2, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('✅ GEBAT 360° PWA installée avec succès !');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Pour installer GEBAT 360° sur votre appareil :\n\n• Sur Ordinateur (Chrome/Edge) : Cliquez sur l'icône d'installation dans la barre d'adresse (en haut à droite).\n• Sur Mobile (Android/iOS) : Ouvrez le menu de votre navigateur et choisissez 'Ajouter à l'écran d'accueil'.");
      return;
    }

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted PWA install prompt');
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || isDismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-2xl border border-blue-500/40 shadow-2xl space-y-3 font-sans animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shrink-0 p-1">
            <img src="/logo_gebat.png" alt="GEBAT PWA" className="w-full h-full object-contain bg-white rounded-lg p-0.5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-white">Application GEBAT 360°</h4>
            <p className="text-[11px] text-slate-300">Installez l'application sur votre appareil pour un accès rapide & hors-ligne.</p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          title="Fermer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleInstallClick}
          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
        >
          <Download size={15} />
          <span>[ 📲 Installer l'application PWA ]</span>
        </button>
      </div>
    </div>
  );
};
