import React, { useState, useEffect } from 'react';
import { AppStateProvider, useAppState } from './core/database/AppStateContext';
import { ApiService } from './services/api';
import { Sidebar, isMenuItemAllowed, getDefaultViewForRole, BLOCKED_ITEM_IDS } from './shared/components/Sidebar';
import { hasPermission, hasProjectAccess } from './core/permissions';
import { ShieldAlert } from 'lucide-react';
import { Header } from './shared/components/Header';
import { DashboardGeneral } from './modules/dashboard/DashboardGeneral';
import { DashboardKpi } from './modules/dashboard/DashboardKpi';
import { ProjectsPortfolio } from './modules/projects/ProjectsPortfolio';
import { PortfolioDashboard } from './modules/projects/PortfolioDashboard';
import { CreateProjectWizard } from './modules/projects/CreateProjectWizard';
import { ProjectDetails360 } from './modules/projects/ProjectDetails360';
import { WbsModule } from './modules/wbs/WbsModule';
import { BudgetModule } from './modules/budgets/BudgetModule';
import { CostControlModule } from './modules/budgets/CostControlModule';
import { ProductionModule } from './modules/production/ProductionModule';
import { DocumentsModule } from './modules/documents/DocumentsModule';
import { RisksModule } from './modules/risks/RisksModule';
import { AlertsCenterModule } from './modules/alerts/AlertsCenterModule';
import { ProcurementDAModule } from './modules/procurement/ProcurementDAModule';
import { ProcurementValidationModule } from './modules/procurement/ProcurementValidationModule';
import { StockModule } from './modules/stock/StockModule';
import { MouvementWbsModule } from './modules/stock/MouvementWbsModule';
import { DailyReportModule } from './modules/production/DailyReportModule';
import { PlanningModule } from './modules/production/PlanningModule';
import { SettingsCostNaturesModule } from './modules/admin/SettingsCostNaturesModule';
import { AuditTrailModule } from './modules/admin/AuditTrailModule';
import { UsersRolesModule } from './modules/admin/UsersRolesModule';
import { WorkflowsEngineModule } from './modules/admin/WorkflowsEngineModule';
import { PerformanceAnalyticsModule } from './modules/analytics/PerformanceAnalyticsModule';
import { AlertsDriftsModule } from './modules/analytics/AlertsDriftsModule';
import { LoginPage } from './modules/auth/LoginPage';
import { CeoCommandCenter } from './modules/dashboard/CeoCommandCenter';
import { VueProjet360 } from './modules/projects/VueProjet360';
import { DebourseSecModule } from './modules/debourse/DebourseSecModule';
import { PwaInstallPrompt } from './shared/components/PwaInstallPrompt';

const MainApp: React.FC = () => {
  const { isBackendConnected, backendError, retryBackendConnection, setCurrentUser, currentUser, projects = [] } = useAppState();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true);
  const [currentView, setCurrentView] = useState<string>('dashboard-portfolio');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Vue exclusive selon le profil connecté si pas encore définie
  useEffect(() => {
    if (currentUser?.role) {
      const defaultPage = getDefaultViewForRole(currentUser.role);
      const isAllowed = isMenuItemAllowed(currentUser, currentView);
      if (!isAllowed) {
        setCurrentView(defaultPage);
      }
    }
  }, [currentUser?.role]);

  // Protection & Habilitation RBAC Stricte : Orientations automatiques vers la page dédiée du profil
  React.useEffect(() => {
    if (!currentUser) return;
    const dedicatedView = getDefaultViewForRole(currentUser.role);

    if (BLOCKED_ITEM_IDS.includes(currentView)) {
      console.warn(`🔒 Redirection : La vue '${currentView}' est temporairement bloquée.`);
      setCurrentView(dedicatedView);
      return;
    }
    if (!isMenuItemAllowed(currentUser.role, currentView)) {
      console.warn(`🔒 Redirection RBAC : Vue '${currentView}' non habilitée pour le profil [${currentUser.role}]. Redirection vers la page dédiée '${dedicatedView}'.`);
      setCurrentView(dedicatedView);
    }
  }, [currentView, currentUser]);

  React.useEffect(() => {
    async function checkExistingAuth() {
      const savedToken = localStorage.getItem('gebat_jwt_token');
      if (!savedToken) {
        setIsAuthenticated(false);
        setIsVerifyingAuth(false);
        return;
      }
      try {
        const response = await ApiService.getMe();
        if (!response?.user) throw new Error('Session non valide');
        setCurrentUser(response.user);
        localStorage.setItem('gebat_current_user', JSON.stringify(response.user));
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('gebat_jwt_token');
        localStorage.removeItem('gebat_current_user');
        setIsAuthenticated(false);
      }
      setIsVerifyingAuth(false);
    }

    checkExistingAuth();
  }, []);

  // Connexion automatique et fluide au serveur API Backend & MySQL
  if (isVerifyingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center font-sans">
        <div className="w-16 h-16 relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono font-black text-xs text-blue-400">360°</span>
        </div>
        <h2 className="text-xl font-black tracking-tight uppercase text-white">GEBAT 360° ERP System</h2>
        <p className="text-slate-400 text-xs mt-2 font-medium">
          Chargement du Cockpit de Gestion BTP GEBAT 360°...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => {
      setIsAuthenticated(true);
      if (currentUser?.role) {
        setCurrentView(getDefaultViewForRole(currentUser.role));
      }
    }} />;
  }

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard-general': return 'Tableau de Bord Général';
      case 'dashboard-portfolio': return 'Portefeuille des Projets';
      case 'dashboard-alerts': return 'Gestion des Risques Projet';
      case 'projects-list': return 'Gestion des Projets';
      case 'projects-new': return 'Création Nouveau Projet (Assistant WBS/Budget)';
      case 'vue-projet-360': return 'Vue Projet 360° — Tableau de Bord Consolidé';
      case 'projects-360': return 'Fiche Projet 360°';
      case 'btp-wbs': return 'Structure WBS (Work Breakdown Structure)';
      case 'btp-debourse': return 'Déboursé Sec (DS) — Construction & Analyse des Coûts Théoriques';
      case 'btp-budget': return 'Budget Initial V0 & Déboursé Révisé';
      case 'btp-production': return 'Rapport Journalier & Suivi de Production';
      case 'btp-cost-control': return 'Cost Control & Prévisionnel EAC';
      case 'btp-eac': return 'Calculs EAC & Marges Prévisionnelles';
      case 'procurement-da': return 'Demandes d’Achat & Contrôle Budgétaire';
      case 'procurement-validation': return 'Centre de Validation des DA & Budgets';
      case 'procurement-receptions': return 'Réception Marchandise & Mise à jour Stock';
      case 'stock-list': return 'Gestion des Stocks Magasins';
      case 'stock-movements': return 'Consommation Stock vers WBS Chantier';
      case 'analytics-performance': return 'Performance Economique & Technique';
      case 'analytics-alerts': return 'Alertes Métier & Dépassements';
      case 'ceo-command-center': return 'CEO Command Center — Vue Exécutive Consolidée';
      case 'admin-users': return 'Gestion des Utilisateurs & Permissions Rôle';
      case 'admin-workflows': return 'Paramétrage des Circuit de Validation';
      case 'admin-audit': return 'Audit Trail & Historique Inaltérable';
      default: return 'GEBAT 360° Construction Operating System';
    }
  };

  const renderContent = () => {
    // Écran de protection RBAC si l'accès au module est refusé
    if (currentUser && !isMenuItemAllowed(currentUser, currentView)) {
      const defaultPage = getDefaultViewForRole(currentUser.role);
      return (
        <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-xl max-w-2xl mx-auto my-12 text-center space-y-5">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full uppercase tracking-wider">
              Accès Refusé — Habilitation Insuffisante (RBAC)
            </span>
            <h2 className="text-xl font-black text-slate-900">
              Module '{getTitle()}' non autorisé pour votre profil
            </h2>
            <p className="text-xs text-slate-600 font-medium max-w-md mx-auto">
              Votre compte <strong className="text-slate-900">{currentUser.name}</strong> (Profil: <strong className="text-blue-700">{currentUser.role}</strong>, Société: <strong className="text-slate-900">{currentUser.company || 'GEBAT SA'}</strong>) ne dispose pas des privilèges nécessaires pour accéder à ce module.
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs font-mono space-y-1">
            <div className="text-slate-500 font-sans font-bold mb-1">Règles de sécurité appliquées :</div>
            <div>• Périmètre Société : <strong>{currentUser.company || 'GEBAT SA'}</strong></div>
            <div>• Projets autorisés : <strong>{currentUser.projectIds?.join(', ') || 'Tous les projets du périmètre'}</strong></div>
            <div>• Action requise : <strong>VOIR ({currentView})</strong></div>
          </div>
          <button
            onClick={() => setCurrentView(defaultPage)}
            className="px-6 py-3 bg-[#11192e] text-white font-extrabold rounded-2xl text-xs hover:bg-slate-800 transition shadow-lg inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Retour à ma page dédiée ({defaultPage})</span>
          </button>
        </div>
      );
    }

    if (selectedProjectId && (currentView === 'vue-projet-360' || currentView === 'projects-360')) {
      return (
        <ProjectDetails360
          projectId={selectedProjectId}
          onBack={() => setSelectedProjectId(null)}
          onSelectProject={id => setSelectedProjectId(id)}
        />
      );
    }

    switch (currentView) {
      case 'dashboard-general':
        return (
          <DashboardGeneral
            onNavigate={view => setCurrentView(view)}
            onSelectProject={id => {
              setSelectedProjectId(id);
              setCurrentView('vue-projet-360');
            }}
          />
        );

      case 'dashboard-alerts':
        return (
          <AlertsCenterModule
            onBackToProject={() => setSelectedProjectId('CIV-2026-ASS-001')}
          />
        );

      case 'btp-risks':
        return (
          <RisksModule
            onBackToProject={() => setSelectedProjectId('CIV-2026-ASS-001')}
          />
        );

      case 'analytics-performance':
        return (
          <PerformanceAnalyticsModule
            onBackToProject={() => setSelectedProjectId('CIV-2026-ASS-001')}
          />
        );

      case 'analytics-alerts':
        return <AlertsDriftsModule />;

      case 'ceo-command-center':
        return <CeoCommandCenter />;

      case 'dashboard-portfolio':
        return (
          <DashboardGeneral
            onNavigate={view => setCurrentView(view)}
            onSelectProject={id => {
              setSelectedProjectId(id);
              setCurrentView('vue-projet-360');
            }}
          />
        );

      case 'projects-list':
        return (
          <ProjectsPortfolio
            onSelectProject={id => {
              setSelectedProjectId(id);
              setCurrentView('vue-projet-360');
            }}
            onNewProjectClick={() => setCurrentView('projects-new')}
          />
        );

      case 'projects-new':
        return (
          <CreateProjectWizard
            onCancel={() => setCurrentView('dashboard-portfolio')}
            onSuccess={() => setCurrentView('dashboard-portfolio')}
          />
        );

      case 'vue-projet-360':
        return (
          <ProjectDetails360
            projectId={selectedProjectId || projects[0]?.id || ''}
            onBack={() => setCurrentView('dashboard-portfolio')}
            onSelectProject={id => setSelectedProjectId(id)}
            onNavigateView={viewKey => setCurrentView(viewKey)}
          />
        );

      case 'procurement-da':
      case 'procurement-receptions':
        return (
          <ProcurementDAModule
            onNavigateView={view => setCurrentView(view)}
            onBackToProject={() => setCurrentView('project-detail')}
            initialProjectId={selectedProjectId || activeProject?.id || activeProject?.code}
          />
        );

      case 'procurement-validation':
        return <ProcurementValidationModule />;

      case 'admin-workflows':
        return <WorkflowsEngineModule />;

      case 'admin-users':
        return <UsersRolesModule />;

      case 'admin-settings':
        return <SettingsCostNaturesModule />;

      case 'stock-list':
        return <StockModule />;

      case 'stock-movements':
        return <MouvementWbsModule />;

      case 'btp-planning':
        return (
          <PlanningModule
            onBackToProject={() => {
              if (selectedProjectId || projects[0]?.id) {
                if (!selectedProjectId && projects[0]?.id) setSelectedProjectId(projects[0].id);
              }
              setCurrentView('vue-projet-360');
            }}
            initialProjectId={selectedProjectId}
          />
        );

      case 'btp-production':
        return (
          <ProductionModule
            onBackToProject={() => {
              if (selectedProjectId || projects[0]?.id) {
                if (!selectedProjectId && projects[0]?.id) setSelectedProjectId(projects[0].id);
              }
              setCurrentView('vue-projet-360');
            }}
            initialProjectId={selectedProjectId}
          />
        );

      case 'projects-360':
      case 'btp-documents':
        return (
          <DocumentsModule
            onBackToProject={() => {
              if (projects[0]?.id) setSelectedProjectId(projects[0].id);
              setCurrentView('vue-projet-360');
            }}
          />
        );

      case 'admin-audit':
        return <AuditTrailModule />;

      case 'btp-wbs':
        return (
          <WbsModule
            onBackToProject={() => {
              if (projects[0]?.id) setSelectedProjectId(projects[0].id);
              setCurrentView('vue-projet-360');
            }}
          />
        );

      case 'btp-debourse':
        return (
          <DebourseSecModule
            onBackToProject={() => {
              if (selectedProjectId || projects[0]?.id) {
                if (!selectedProjectId && projects[0]?.id) setSelectedProjectId(projects[0].id);
              }
              setCurrentView('vue-projet-360');
            }}
            initialProjectId={selectedProjectId}
          />
        );

      case 'btp-budget':
        return (
          <BudgetModule
            onBackToProject={() => {
              if (selectedProjectId || projects[0]?.id) {
                if (!selectedProjectId && projects[0]?.id) setSelectedProjectId(projects[0].id);
              }
              setCurrentView('vue-projet-360');
            }}
            initialProjectId={selectedProjectId}
          />
        );

      case 'btp-cost-control':
      case 'btp-eac':
        return <CostControlModule />;

      case 'analytics-performance':
        return <PerformanceAnalyticsModule />;

      case 'analytics-alerts':
        return <AlertsDriftsModule />;

      default:
        return <DashboardGeneral />;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gebat_jwt_token');
    localStorage.removeItem('gebat_current_user');
    sessionStorage.clear();
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.href = window.location.origin + window.location.pathname;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans antialiased text-slate-900">
      <Sidebar
        currentView={currentView}
        setCurrentView={v => {
          setSelectedProjectId(null);
          setCurrentView(v);
        }}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />
      <div className={`flex flex-col min-h-screen min-w-0 transition-[margin] duration-300 ${collapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        <Header 
          currentViewTitle={getTitle()} 
          onNavigate={setCurrentView}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onLogout={handleLogout}
        />
        <main className="px-2.5 sm:px-4 py-4 sm:py-6 flex-1 w-full max-w-full overflow-x-hidden">
          {renderContent()}
        </main>
      </div>
      <PwaInstallPrompt />
    </div>
  );
};

export default function App() {
  return (
    <AppStateProvider>
      <MainApp />
    </AppStateProvider>
  );
}
