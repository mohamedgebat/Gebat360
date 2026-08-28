import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Sparkles, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';

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
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
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
      {/* BANNIÈRE FLOTTANTE D'INSTALLATION EN BAS À DROITE */}
      <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-950 text-white p-4 rounded-2xl border border-blue-500/40 shadow-2xl space-y-3 font-sans animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shrink-0 p-1 shadow-md">
              <img src="/pwa-192x192.png" alt="GEBAT PWA" className="w-full h-full object-contain bg-slate-900 rounded-lg" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                Application GEBAT 360° <Sparkles size={14} className="text-amber-400" />
              </h4>
              <p className="text-[11px] text-slate-300">Installez GEBAT 360° sur votre ordinateur ou mobile pour un accès rapide & autonome.</p>
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

      {/* MODAL GUIDÉ D'INSTALLATION PWA */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-lg w-full rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 font-sans relative">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center p-1 shadow-md shrink-0">
                <img src="/pwa-192x192.png" alt="GEBAT 360" className="w-full h-full object-contain bg-slate-900 rounded-xl" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  Installer GEBAT 360° PWA <Sparkles size={16} className="text-amber-500" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Procédures d'installation selon votre navigateur</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">

              {/* ASTUCE LOCALHOST POUR BOUTON BLEU BARRE D'ADRESSE */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl space-y-2">
                <div className="font-extrabold text-amber-900 dark:text-amber-400 flex items-center gap-2 text-xs">
                  <ShieldCheck size={16} className="shrink-0 text-amber-600" />
                  <span>Activer le bouton bleu Chrome dans la barre d'adresse :</span>
                </div>
                <p className="text-[11.5px] text-amber-950 dark:text-amber-200">
                  Google Chrome exige d'ouvrir l'application via <strong>http://localhost:5173</strong> pour afficher le bouton bleu officiel <strong>[ 🖥️↓ Installer ]</strong> dans la barre d'adresse.
                </p>
                {window.location.hostname !== 'localhost' && (
                  <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs shadow-xs transition mt-1"
                  >
                    <ExternalLink size={13} />
                    <span>Ouvrir sur http://localhost:5173</span>
                  </a>
                )}
              </div>

              {/* GUIDE ORDINATEUR */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Monitor size={16} className="text-blue-500" />Sur Ordinateur (Chrome / Edge / Windows / Mac) :
                </div>
                <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11.5px] font-medium text-slate-800 dark:text-slate-200">
                  <li>Cliquez sur l'icône <strong>"Installer GEBAT 360"</strong> <span>(🖥️ ou ➕)</span> située tout à droite dans la barre d'adresse Chrome.</li>
                  <li>Ou ouvrez le menu <strong>⋮ (3 points en haut à droite)</strong> &gt; <strong>"Enregistrer et partager"</strong> &gt; <strong>"Installer GEBAT 360°..."</strong>.</li>
                </ul>
              </div>

              {/* GUIDE MOBILE */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone size={16} className="text-emerald-500" />Sur Smartphone & Tablette (Android / iOS) :
                </div>
                <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11.5px] font-medium text-slate-800 dark:text-slate-200">
                  <li><strong>Android (Chrome)</strong> : Appuyez sur <strong>⋮ (Menu)</strong> &gt; <strong>"Ajouter à l'écran d'accueil"</strong> ou <strong>"Installer l'application"</strong>.</li>
                  <li><strong>iPhone / iPad (Safari)</strong> : Appuyez sur <strong>"Partager" (⬆️)</strong> &gt; <strong>"Sur l'écran d'accueil"</strong>.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-sm transition"
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
