import React, { useState } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { hasPermission } from '../../core/permissions';
import { User } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  FolderKanban,
  HardHat,
  ShoppingBag,
  BarChart3,
  UserCheck,
  Package,
  Layers,
  DollarSign,
  TrendingUp,
  Truck,
  ArrowRightLeft,
  Activity,
  Sliders,
  History,
  AlertTriangle,
  Bell,
  Building2,
  ShieldCheck,
  Tag,
  Calendar,
  Lock,
  PieChart,
  Crown,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

// MODULES ET FONCTIONNALITÉS BLOQUÉS TEMPORAIREMENT (RÈGLES SYSTÈME)
export const IS_PROCUREMENT_BLOCKED = false;
export const IS_STOCK_BLOCKED = false;
export const IS_KPI_BLOCKED = false;

export const BLOCKED_SECTION_TITLES: string[] = [
  ...(IS_PROCUREMENT_BLOCKED ? ['ACHATS & APPROVISIONNEMENT'] : []),
  ...(IS_STOCK_BLOCKED ? ['STOCK & LOGISTIQUE'] : []),
  ...(IS_KPI_BLOCKED ? ['DASHBOARDS & KPI'] : []),
];

export const BLOCKED_ITEM_IDS: string[] = [
  ...(IS_PROCUREMENT_BLOCKED ? ['procurement-da', 'procurement-validation'] : []),
  ...(IS_STOCK_BLOCKED ? ['stock-list', 'stock-movements'] : []),
  ...(IS_KPI_BLOCKED ? ['btp-cost-control', 'ceo-command-center'] : []),
];

// Helper RBAC : Page dédiée et exclusive par défaut selon le profil connecté
export function getDefaultViewForRole(role: string | undefined): string {
  if (!role) return 'dashboard-portfolio';
  const r = role.toUpperCase().replace(/\s+/g, '_');

  if (r.includes('CHEF_CHANTIER')) return 'btp-production';
  if (r.includes('CONDUCTEUR')) return 'btp-production';
  if (r.includes('MAGASINIER')) return 'stock-list';
  if (r.includes('ACHAT') || r.includes('ACHETEUR')) return 'procurement-da';
  if (r.includes('COST') || r.includes('CONTROLEUR')) return 'btp-cost-control';
  if (r.includes('DAF') || r.includes('COMPTABL')) return 'btp-debourse';
  if (r.includes('DIRECTEUR_TECHNIQUE') || r === 'DT') return 'btp-planning';
  if (r.includes('DIRECTEUR_PROJET') || r === 'DP') return 'vue-projet-360';

  return 'dashboard-portfolio';
}

// Helper RBAC : Habilitation stricte des pages et menus selon le rôle
export function isMenuItemAllowed(role: string | undefined | User, itemId: string): boolean {
  if (!role) return true;
  const userObj: User = typeof role === 'object' ? role : ({ id: 'temp', name: 'User', email: '', role: role as any, avatar: 'U' } as User);
  const r = (userObj.role || '').toUpperCase().replace(/\s+/g, '_');

  const isAdmin = ['SUPER_ADMIN', 'SUPER_ADMINISTRATEUR', 'ADMIN', 'ADMINISTRATION'].includes(r);

  // RÈGLE STRICTE : La section ADMINISTRATION et ses sous-menus sont STRICTEMENT RÉSERVÉS au profil Admin
  if (['admin-users', 'admin-settings', 'admin-audit', 'analytics-performance', 'analytics-alerts'].includes(itemId) || itemId.startsWith('admin-')) {
    return isAdmin;
  }

  // Super Admin / Administrateur : Accès complet à tous les modules
  if (isAdmin) {
    return true;
  }

  // Dashboard général et alertes accessibles à tous
  if (['dashboard-portfolio', 'dashboard-alerts', 'projects-list'].includes(itemId)) {
    return true;
  }

  return hasPermission(userObj, itemId, 'VOIR');
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, collapsed, setCollapsed }) => {
  const { alerts, purchaseRequests = [], dailyReports = [], currentUser } = useAppState();

  const activeAlertsCount = alerts.filter(a => a.status === 'Actif').length;
  const pendingDACount = purchaseRequests.filter(da => da.status === 'EN_ATTENTE_VALIDATION' || da.status === 'En attente validation' || da.status === 'En attente').length;
  const pendingReportsCount = dailyReports.filter(r => {
    const s = (r.status || '').toUpperCase();
    return s.includes('SOUMIS') || s.includes('ATTENTE') || s.includes('PENDING');
  }).length;
  const totalValidationBadge = pendingDACount + pendingReportsCount;

  // Mode Accordéon : Lorsqu'un grand titre est ouvert, toutes les autres sections se ferment automatiquement
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setOpenSections(prev => {
      const isCurrentlyOpen = prev[title];
      if (isCurrentlyOpen) {
        return {};
      }
      return { [title]: true };
    });
  };

  const rawMenuSections = [
    {
      title: 'TABLEAU DE BORD',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      items: [
        { id: 'dashboard-portfolio', label: 'Tableau de Bord Général', icon: FolderKanban },
        { id: 'dashboard-alerts', label: 'Alertes', icon: Bell, badge: activeAlertsCount },
      ],
    },
    {
      title: 'GESTION DES PROJETS',
      label: 'Gestion des Projets',
      icon: Building2,
      items: [
        { id: 'projects-list', label: 'Liste des projets', icon: FolderKanban },
        { id: 'projects-new', label: 'Nouveau projet', icon: Building2 },
        { id: 'vue-projet-360', label: 'Vue Projet 360°', icon: Layers },
      ],
    },
    {
      title: 'GESTION GLOBALE BTP',
      label: 'Gestion Globale BTP',
      icon: HardHat,
      items: [
        { id: 'btp-wbs', label: 'WBS & Activités', icon: Layers },
        { id: 'btp-debourse', label: 'Déboursé Sec (DS)', icon: DollarSign },
        { id: 'btp-planning', label: 'Planning Gantt', icon: Calendar },
        { id: 'btp-production', label: 'Production', icon: HardHat, badge: pendingReportsCount },
      ],
    },
    {
      title: 'ACHATS & APPROVISIONNEMENT',
      label: 'Achats & Approvisionnement',
      icon: ShoppingBag,
      items: [
        { id: 'procurement-da', label: "Demandes d'achat", icon: ShoppingBag, badge: pendingDACount },
        { id: 'procurement-validation', label: 'Centre de validation', icon: ShieldCheck, badge: totalValidationBadge },
      ],
    },
    {
      title: 'STOCK & LOGISTIQUE',
      label: 'Stock & Logistique',
      icon: Package,
      items: [
        { id: 'stock-list', label: 'Stock Magasin', icon: Package },
        { id: 'stock-movements', label: 'Mouvements & WBS', icon: ArrowRightLeft },
      ],
    },
    {
      title: 'DASHBOARDS & KPI',
      label: 'Dashboards & KPI',
      icon: BarChart3,
      items: [
        { id: 'btp-cost-control', label: 'Cost Control', icon: TrendingUp },
        { id: 'ceo-command-center', label: 'CEO Command Center', icon: Activity },
      ],
    },
    {
      title: 'ADMINISTRATION',
      label: 'Administration',
      icon: Sliders,
      items: [
        { id: 'admin-users', label: 'Utilisateurs & Rôles', icon: UserCheck },
        { id: 'admin-settings', label: 'Natures de coûts', icon: Tag },
        { id: 'admin-audit', label: 'Audit Trail', icon: History },
        { id: 'analytics-performance', label: 'Performance', icon: BarChart3 },
        { id: 'analytics-alerts', label: 'Alertes & Dérives', icon: AlertTriangle },
      ],
    },
  ];

  // Filtrage RBAC strict des sections et sous-menus selon le rôle de l'utilisateur connecté
  const userRole = currentUser?.role;
  const menuSections = rawMenuSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => isMenuItemAllowed(userRole, item.id)),
    }))
    .filter(section => section.items.length > 0);

  // Synchronisation dynamique : Ouvre automatiquement la section de la vue active et ferme les autres
  React.useEffect(() => {
    const activeSection = menuSections.find(section =>
      section.items.some(item => item.id === currentView)
    );
    if (activeSection) {
      setOpenSections({ [activeSection.title]: true });
    }
  }, [currentView]);

  return (
    <aside
      className={`sticky top-0 h-screen bg-slate-900 text-white flex flex-col transition-all duration-300 z-30 shadow-xl shrink-0 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Header Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <img
              src="/logo_gebat.png"
              alt="GEBAT SA Logo"
              className="h-9 w-auto object-contain rounded bg-white p-0.5"
            />
            <div>
              <span className="font-extrabold text-lg text-white tracking-wider block leading-tight">GEBAT 360°</span>
              <span className="block text-[9px] text-blue-400 font-semibold tracking-tighter uppercase">
                CONSTRUCTION OPERATING SYSTEM
              </span>
            </div>
          </div>
        ) : (
          <img
            src="/logo_gebat.png"
            alt="GEBAT Logo"
            className="h-8 w-auto object-contain mx-auto bg-white p-0.5 rounded"
          />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          title={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation List avec COULEUR EXACTE #E8CE27 POUR LES GRANDS TITRES ET LE SURVOL */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-4rem)] py-3 space-y-3 px-2 custom-scrollbar">
        {menuSections.map((section, idx) => {
          const SectionIcon = section.icon;
          const isOpen = !!openSections[section.title];
          const isSectionBlocked = BLOCKED_SECTION_TITLES.includes(section.title);
          const hasActiveChild = section.items.some(item => item.id === currentView);

          return (
            <div key={idx} className="space-y-1">
              {/* GRAND TITRE (En-tête de section principale en Majuscule avec la COULEUR BRANDING GEBAT #E8CE27) */}
              {!collapsed ? (
                <button
                  onClick={() => toggleSection(section.title)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer text-left ${
                    hasActiveChild
                      ? 'bg-[#E8CE27]/10 border-l-4 border-[#E8CE27] font-black text-white'
                      : 'bg-slate-800/40 hover:bg-[#E8CE27]/15 font-extrabold text-[#E8CE27]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="p-1 bg-[#E8CE27]/20 text-[#E8CE27] rounded-md shrink-0">
                      <SectionIcon size={14} />
                    </div>
                    <span className="tracking-wider uppercase text-[10.5px] font-black text-[#E8CE27] truncate">
                      {section.title}
                    </span>
                  </div>
                  <ChevronDown
                    size={13}
                    className={`text-[#E8CE27] transition-transform duration-200 shrink-0 ${
                      isOpen ? 'transform rotate-0' : 'transform -rotate-90'
                    }`}
                  />
                </button>
              ) : (
                <div className="px-2 py-1 text-center" title={section.title}>
                  <div className="p-1.5 bg-[#E8CE27]/20 text-[#E8CE27] rounded-md inline-block">
                    <SectionIcon size={16} />
                  </div>
                </div>
              )}

              {/* SOUS-TITRES (Sous-menus indentés sous le Grand Titre avec ligne de guidage #E8CE27 et effet survol #E8CE27) */}
              {(isOpen || collapsed) && (
                <div className={`space-y-0.5 ${!collapsed ? 'pl-3 ml-2 border-l-2 border-[#E8CE27]/25' : ''}`}>
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    const isItemBlocked = BLOCKED_ITEM_IDS.includes(item.id);

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (isItemBlocked) return;
                          setCurrentView(item.id);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                          isActive
                            ? 'bg-[#E8CE27] text-slate-950 font-black shadow-md shadow-[#E8CE27]/20 border border-[#E8CE27]/40'
                            : 'text-slate-300 font-medium hover:bg-[#E8CE27]/15 hover:text-[#E8CE27]'
                        }`}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon size={15} className={`shrink-0 ${isActive ? 'text-slate-950 font-bold' : 'text-slate-400 group-hover:text-[#E8CE27]'}`} />
                        {!collapsed && <span className="truncate flex-1 text-left text-[11.5px]">{item.label}</span>}
                        {!collapsed && item.badge !== undefined && item.badge > 0 && (
                          <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 shadow-xs">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info avec indication du rôle actif */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          <span className="text-blue-400 font-bold block">{currentUser?.name || 'Session Réelle'}</span>
          <span className="text-[10px] text-slate-500 font-medium">{currentUser?.role || 'Acheteur / Chef de lot'}</span>
        </div>
      )}
    </aside>
  );
};
