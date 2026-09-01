import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { UserProfileModal } from './UserProfileModal';
import { Bell, ShieldCheck, Search, AlertTriangle, ArrowRight, CheckCircle2, X, LogOut, Sun, Moon, Menu } from 'lucide-react';

interface HeaderProps {
  currentViewTitle: string;
  onNavigate?: (view: string) => void;
  onToggleMobileMenu?: () => void;
}

const NetworkStatusBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsSyncing(true);
      setTimeout(() => {
        setIsOnline(true);
        setIsSyncing(false);
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-xl text-[11px] font-extrabold shadow-2xs animate-pulse">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
        <span>Synchronisation...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-xl text-[11px] font-extrabold shadow-2xs" title="Mode hors ligne actif. Les données saisies sont conservées localement.">
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        <span>Hors ligne</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-xl text-[11px] font-extrabold shadow-2xs" title="Application connectée au réseau">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      <span>En ligne</span>
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({ currentViewTitle, onNavigate, onToggleMobileMenu }) => {
  const { currentUser, alerts, purchaseRequests, theme, toggleTheme } = useAppState();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pendingValidationsCount = purchaseRequests.filter(da => da.status === 'EN_ATTENTE_VALIDATION' || da.status === 'En attente validation').length;
  
  const isGlobalRole = (role: string) => {
    const norm = role.toUpperCase().replace(/\s+/g, '_');
    return ['SUPER_ADMIN', 'SUPER_ADMINISTRATEUR', 'ADMIN', 'DIRECTION', 'DIRECTION_GENERALE', 'DAF', 'COMPTABLE', 'ACHATS', 'ACHETEUR'].includes(norm);
  };

  // Alertes actives réelles
  const activeAlerts = alerts.filter(a => a.status === 'Actif');
  const activeAlertsCount = activeAlerts.length;

  // Fermeture du dropdown lors d'un clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenAlertsCenter = () => {
    setNotificationsOpen(false);
    if (onNavigate) {
      onNavigate('dashboard-alerts');
    }
  };

  const handleValidationClick = () => {
    if (onNavigate) {
      onNavigate('procurement-validation');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      
      {/* 1. TITRE ET CONTEXTE NATIONALE GEBAT SA */}
      <div className="flex items-center gap-2 sm:gap-4">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer border border-slate-200 shadow-2xs"
            title="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>
        )}
        <img
          src="/logo_gebat_official.png"
          alt="GEBAT SA"
          className="h-9 w-auto object-contain rounded-lg border border-slate-200 p-0.5 bg-white hidden sm:block shadow-2xs"
        />
        <div>
          <h1 className="text-sm sm:text-xl font-black text-slate-900 tracking-tight leading-tight truncate max-w-[160px] sm:max-w-none">{currentViewTitle}</h1>
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            GEBAT SA — Côte d’Ivoire
          </span>
        </div>
      </div>

      {/* 2. BARRE D'ACTIONS ET NOTIFICATIONS DROITE */}
      <div className="flex items-center gap-3 sm:gap-4">

        {/* BARRE DE RECHERCHE RAPIDE */}
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl w-44 lg:w-56 focus:outline-none focus:border-blue-600 focus:bg-white transition shadow-2xs"
          />
        </div>

        {/* INDICATEUR D'ÉTAT DU RÉSEAU (SECTION 20 DES DIRECTIVES PWA GEBAT) */}
        <NetworkStatusBadge />

        {/* BADGE COMPTEUR VALIDATIONS */}
        {pendingValidationsCount > 0 && (
          <button
            onClick={handleValidationClick}
            className="flex items-center gap-1.5 bg-amber-50 text-amber-800 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-amber-200 hover:bg-amber-100 transition shadow-2xs cursor-pointer"
            title={`${pendingValidationsCount} demandes en attente de validation`}
          >
            <ShieldCheck size={16} className="text-amber-600 shrink-0" />
            <span>{pendingValidationsCount} Validations</span>
          </button>
        )}


        {/* BOUTON DE CHANGEMENT DE THEME (MODE SOMBRE / MODE CLAIR) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
        >
          {theme === 'dark' ? (
            <Sun size={20} className="text-amber-400" />
          ) : (
            <Moon size={20} />
          )}
        </button>

        {/* BOUTON CLOCHE NOTIFICATIONS CLIQUEABLE ET DYNAMIQUE */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={`relative p-2 rounded-full transition cursor-pointer ${
              notificationsOpen ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-500/30' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Notifications & Centre d'Alertes"
          >
            <Bell size={20} className={activeAlertsCount > 0 ? 'text-red-600 animate-bounce' : ''} />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* MENU DÉROULANT DES NOTIFICATIONS ET ALERTES */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden font-sans animate-scale-up">
              
              {/* EN-TÊTE DU MENU NOTIFICATIONS */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-amber-400" />
                  <span className="font-extrabold text-xs uppercase tracking-wider">Centre d'Alertes ({activeAlertsCount} Actives)</span>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* LISTE DES ALERTES APERÇU RAPIDE */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {activeAlerts.length > 0 ? (
                  activeAlerts.slice(0, 5).map(a => (
                    <div
                      key={a.id}
                      onClick={handleOpenAlertsCenter}
                      className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-start gap-2.5"
                    >
                      <div className={`p-1.5 rounded-lg text-white mt-0.5 shrink-0 ${
                        a.severity === 'Critique' ? 'bg-red-600' : 'bg-amber-500'
                      }`}>
                        <AlertTriangle size={14} />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[10px] text-slate-400">{a.id}</span>
                          <span className="text-[10px] font-bold text-red-600">{a.severity}</span>
                        </div>
                        <span className="font-bold text-slate-900 block leading-tight">{a.title}</span>
                        <span className="text-[11px] text-slate-500 font-medium block">{a.impact}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-500 font-semibold text-xs">
                    <Bell size={24} className="mx-auto text-slate-300 mb-2" />
                    <p>Aucune alerte active</p>
                  </div>
                )}
              </div>

              {/* PIED DE PAGE : REDIRECTION PARFAITE VERS LE CENTRE D'ALERTES */}
              <div className="p-3 bg-slate-50 border-t border-slate-200">
                <button
                  onClick={handleOpenAlertsCenter}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                >
                  <span>Ouvrir le Centre d'Alertes Métier</span>
                  <ArrowRight size={14} />
                </button>
              </div>

            </div>
          )}
        </div>

        {/* FICHE UTILISATEUR CONNECTÉ ET BOUTON DÉCONNEXION */}
        <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-slate-200">
          {/* FICHE & BOUTON PROFIL UTILISATEUR CONNECTÉ (OUVRE LE PROFIL PERSONNEL) */}
          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-2 hover:bg-slate-100/80 p-1 rounded-xl transition cursor-pointer group text-left"
            title="Consulter mon profil et modifier mon mot de passe"
          >
            {currentUser?.photoUrl ? (
              <img
                src={currentUser.photoUrl}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover border-2 border-blue-500 shadow-2xs group-hover:border-blue-600 transition"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-2xs border border-blue-400/40 group-hover:scale-105 transition">
                {currentUser?.avatar || (currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'YM')}
              </div>
            )}

            <div className="hidden lg:block text-left">
              <span className="block text-xs font-black text-slate-900 leading-tight group-hover:text-blue-600 transition">{currentUser?.name || 'Yacouba Mohamed'}</span>
              <span className="block text-[11px] font-extrabold text-blue-600">{currentUser?.role || 'Super Admin'}</span>
            </div>
          </button>

          {/* BOUTON DÉCONNEXION OFFICIEL */}
          <button
            onClick={() => {
              localStorage.removeItem('gebat_jwt_token');
              localStorage.removeItem('gebat_current_user');
              window.location.reload();
            }}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold px-3 py-1.5 rounded-xl border border-rose-200 text-xs transition shadow-2xs cursor-pointer"
            title="Se déconnecter de la session GEBAT 360°"
          >
            <LogOut size={16} className="text-rose-600 shrink-0" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>

      </div>

      {/* MODAL DU PROFIL PERSONNELEMENT DE L'UTILISATEUR CONNECTÉ */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

    </header>
  );
};

export default Header;
