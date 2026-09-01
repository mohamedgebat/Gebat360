import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Sparkles, Share, PlusSquare, ExternalLink, ShieldCheck } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gebat_pwa_prompt_dismissed') === 'true';
    }
    return false;
  });
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gebat_pwa_prompt_dismissed', 'true');
    }
  };

  useEffect(() => {
    // Détecter si l'appareil est sous iOS (Safari)
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Vérifier si l'application s'exécute déjà en mode Standalone (PWA installée)
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
      localStorage.setItem('gebat_pwa_prompt_dismissed', 'true');
      console.log('✅ GEBAT 360° PWA installée avec succès !');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const targetPrompt = deferredPrompt || (typeof window !== 'undefined' ? (window as any).deferredPwaPrompt : null);

    if (targetPrompt) {
      try {
        await targetPrompt.prompt();
        const choiceResult = await targetPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('gebat_pwa_prompt_dismissed', 'true');
          }
        }
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          (window as any).deferredPwaPrompt = null;
        }
      } catch (err) {
        console.warn('⚠️ Erreur déclenchement prompt PWA:', err);
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  if (isInstalled || isDismissed) return null;

  return (
    <>
      {/* BANNIÈRE FLOTTANTE STICKY D'INSTALLATION PWA UNIVERSELLE (MOBILE & DESKTOP) */}
      <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-5 z-50 sm:max-w-sm bg-slate-950/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl border border-blue-500/40 shadow-2xl space-y-3 font-sans animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shrink-0 p-1 shadow-md">
              <img src="/pwa-192x192.png" alt="GEBAT PWA" className="w-full h-full object-contain bg-slate-900 rounded-lg" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                Application GEBAT 360° <Sparkles size={14} className="text-amber-400" />
              </h4>
              <p className="text-[11px] text-slate-300 leading-tight">Installez l'application sur votre téléphone (Android / iOS) ou PC.</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            onTouchEnd={e => { e.preventDefault(); handleDismiss(); }}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Fermer définitivement"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={handleInstallClick}
            onTouchEnd={e => { e.preventDefault(); handleInstallClick(e); }}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95 cursor-pointer border border-blue-400/30"
          >
            <Download size={16} className="animate-bounce" />
            <span>📲 Installer GEBAT 360° sur Téléphone</span>
          </button>
        </div>
      </div>

      {/* MODAL GUIDÉ D'INSTALLATION PWA PAS À PAS (OPTIMISÉ ANDROID ET IOS) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-lg w-full rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-5 font-sans relative my-auto">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center p-1 shadow-md shrink-0">
                <img src="/pwa-192x192.png" alt="GEBAT 360" className="w-full h-full object-contain bg-slate-900 rounded-xl" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  Télécharger GEBAT 360° <Sparkles size={16} className="text-amber-500" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Guide d'installation mobile & ordinateur</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {/* GUIDE IPHONE / IOS */}
              {isIos ? (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700/60 rounded-2xl space-y-2">
                  <div className="font-extrabold text-blue-950 dark:text-blue-200 flex items-center gap-2 text-xs">
                    <Share size={18} className="shrink-0 text-blue-600" />
                    <span>Sur iPhone & iPad (Safari iOS) :</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-[12px] text-blue-950 dark:text-blue-100 font-medium">
                    <li>Appuyez sur le bouton <strong>Partager</strong> <Share size={14} className="inline mx-1 text-blue-600" /> situé au bas de l'écran Safari.</li>
                    <li>Faites défiler le menu vers le bas et appuyez sur <strong>"Sur l'écran d'accueil"</strong> <PlusSquare size={14} className="inline mx-1 text-slate-700" />.</li>
                    <li>Appuyez en haut à droite sur <strong>"Ajouter"</strong>. L'icône GEBAT 360° apparaîtra sur votre écran d'accueil !</li>
                  </ol>
                </div>
              ) : (
                /* GUIDE ANDROID CHROME */
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl space-y-2">
                  <div className="font-extrabold text-emerald-950 dark:text-emerald-200 flex items-center gap-2 text-xs">
                    <Smartphone size={18} className="shrink-0 text-emerald-600" />
                    <span>Sur Smartphone Android (Google Chrome) :</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-[12px] text-emerald-950 dark:text-emerald-100 font-medium">
                    <li>Appuyez sur le menu <strong>⋮ (3 points verticalement en haut à droite)</strong>.</li>
                    <li>Sélectionnez <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong>.</li>
                    <li>Confirmez en appuyant sur <strong>"Installer"</strong>. L'application native GEBAT 360° s'installera instantanément !</li>
                  </ol>
                </div>
              )}

              {/* GUIDE ORDINATEUR (DESKTOP) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Monitor size={16} className="text-blue-500" />Sur Ordinateur (Chrome / Edge / Windows / Mac) :
                </div>
                <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11.5px] font-medium text-slate-800 dark:text-slate-200">
                  <li>Cliquez sur l'icône <strong>"Installer GEBAT 360"</strong> <span>(🖥️ ou ➕)</span> située à droite dans la barre d'adresse.</li>
                  <li>Ou ouvrez le menu <strong>⋮ (3 points)</strong> &gt; <strong>"Enregistrer et partager"</strong> &gt; <strong>"Installer GEBAT 360°..."</strong>.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md transition"
              >
                Compris, Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const PwaInstallButton = PwaInstallPrompt;
