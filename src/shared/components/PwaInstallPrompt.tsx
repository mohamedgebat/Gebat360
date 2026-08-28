import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Sparkles, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is running in standalone mode (already installed PWA)
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
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuideModal(true);
    }
  };

  if (isInstalled || isDismissed) return null;

  return (
    <>
      {/* BANNIÈRE FLOTTANTE DE TÉLÉCHARGEMENT/INSTALLATION EN BAS À DROITE (STYLE ORIGINAL) */}
      <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-2xl border border-blue-500/40 shadow-2xl space-y-3 font-sans animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shrink-0 p-1 shadow-md">
              <img src="/logo_gebat.png" alt="GEBAT PWA" className="w-full h-full object-contain bg-white rounded-lg p-0.5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                Application GEBAT 360° <Sparkles size={14} className="text-amber-400" />
              </h4>
              <p className="text-[11px] text-slate-300">Téléchargez l'application sur votre appareil pour un accès rapide & hors-ligne.</p>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
            title="Masquer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleInstallClick}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95 cursor-pointer border border-blue-400/30"
          >
            <Download size={16} className="animate-bounce" />
            <span>[ 📲 Télécharger l'App GEBAT 360° ]</span>
          </button>
        </div>
      </div>

      {/* MODAL GUIDÉ EN CAS DE CLIN D'ŒIL NAVIGATEUR EN RESEAU LOCAL */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 font-sans relative">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center p-1 shadow-md">
                <img src="/logo_gebat.png" alt="GEBAT 360" className="w-full h-full object-contain bg-white rounded-lg p-0.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  Télécharger GEBAT 360° PWA <Sparkles size={16} className="text-amber-500" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Guide d'installation selon votre navigateur & appareil</p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p className="font-medium">
                Pour ajouter <strong>GEBAT 360°</strong> directement comme application autonome :
              </p>

              <div className="p-3.5 bg-blue-50/60 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 rounded-xl space-y-2">
                <div className="font-extrabold text-blue-900 dark:text-blue-400 flex items-center gap-2">
                  <Monitor size={16} />Sur Ordinateur (Chrome / Edge / Windows / Mac) :
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11.5px] font-medium text-slate-800 dark:text-slate-200">
                  <li>Cliquez sur l'icône <strong>"Installer"</strong> <span>(🖥️ ou ➕)</span> dans la barre d'adresse en haut à droite.</li>
                  <li>Ou ouvrez le menu <strong>⋮ (3 points)</strong> &gt; <strong>"Enregistrer et partager"</strong> &gt; <strong>"Installer GEBAT 360"</strong>.</li>
                </ul>
              </div>

              <div className="p-3.5 bg-emerald-50/60 dark:bg-slate-800/60 border border-emerald-200 dark:border-slate-700 rounded-xl space-y-2">
                <div className="font-extrabold text-emerald-900 dark:text-emerald-400 flex items-center gap-2">
                  <Smartphone size={16} />Sur Smartphone / Tablette (Android / iOS) :
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11.5px] font-medium text-slate-800 dark:text-slate-200">
                  <li><strong>Android (Chrome)</strong> : Cliquez sur <strong>⋮ (Menu)</strong> &gt; <strong>"Ajouter à l'écran d'accueil"</strong>.</li>
                  <li><strong>iPhone (Safari)</strong> : Cliquez sur <strong>"Partager" (⬆️)</strong> &gt; <strong>"Sur l'écran d'accueil"</strong>.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-sm transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const PwaInstallButton = PwaInstallPrompt;
