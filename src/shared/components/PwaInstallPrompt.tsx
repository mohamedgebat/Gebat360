import React, { useState, useEffect } from 'react';
import { Download, X, CheckCircle2, Smartphone, Monitor, Globe, ShieldCheck, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is running in standalone mode (already installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
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
      // Show explicit guide modal if native prompt hasn't triggered yet or on non-localhost HTTP
      setShowModal(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {/* BOUTON DE TÉLÉCHARGEMENT/INSTALLATION PWA DANS LE HEADER */}
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md hover:shadow-lg transition transform active:scale-95 cursor-pointer shrink-0 border border-blue-400/30"
        title="Installer l'application GEBAT 360° sur votre PC ou Smartphone"
      >
        <Download size={14} className="animate-bounce" />
        <span className="hidden sm:inline">Installer l'App PWA</span>
        <span className="sm:hidden">App 📲</span>
      </button>

      {/* MODAL GUIDÉ D'INSTALLATION PWA SI NAVIGATEUR EN MODE RESTREINT */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 font-sans relative">
            <button
              onClick={() => setShowModal(false)}
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
                  Installer GEBAT 360° PWA <Sparkles size={16} className="text-amber-500" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Guide rapide d'installation pour votre appareil</p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p className="font-medium">
                Pour installer <strong>GEBAT 360°</strong> directement comme application de bureau ou mobile :
              </p>

              <div className="p-3.5 bg-blue-50/60 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 rounded-xl space-y-2">
                <div className="font-extrabold text-blue-900 dark:text-blue-400 flex items-center gap-2">
                  <Monitor size={16} />Sur Ordinateur (Chrome / Edge / Windows / Mac) :
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11.5px] font-medium text-slate-800 dark:text-slate-200">
                  <li>Cliquez sur l'icône <strong>"Installer"</strong> <span>(🖥️ ou ➕)</span> dans la barre d'adresse du navigateur en haut à droite.</li>
                  <li>Ou ouvrez le menu <strong>⋮ (3 points)</strong> &gt; <strong>"Enregistrer et partager"</strong> &gt; <strong>"Installer GEBAT 360"</strong>.</li>
                </ul>
              </div>

              <div className="p-3.5 bg-emerald-50/60 dark:bg-slate-800/60 border border-emerald-200 dark:border-slate-700 rounded-xl space-y-2">
                <div className="font-extrabold text-emerald-900 dark:text-emerald-400 flex items-center gap-2">
                  <Smartphone size={16} />Sur Smartphone / Tablette (Android / iOS / Safari) :
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11.5px] font-medium text-slate-800 dark:text-slate-200">
                  <li><strong>Android (Chrome)</strong> : Cliquez sur <strong>⋮ (Menu)</strong> &gt; <strong>"Ajouter à l'écran d'accueil"</strong> ou <strong>"Installer l'application"</strong>.</li>
                  <li><strong>iPhone (Safari)</strong> : Cliquez sur l'icône de partage <strong>"Partager" (⬆️)</strong> &gt; <strong>"Sur l'écran d'accueil"</strong>.</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] text-amber-900 dark:text-amber-300 font-semibold">
                ℹ️ <strong>Note réseau local</strong> : Si vous accédez au logiciel via une adresse IP locale (ex: <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">http://192.168...</code>), Chrome nécessite l'accès via <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">localhost</code> ou un certificat HTTPS pour activer le bouton natif de la barre d'adresse.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-sm transition"
              >
                J'ai compris !
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const PwaInstallPrompt = PwaInstallButton;
