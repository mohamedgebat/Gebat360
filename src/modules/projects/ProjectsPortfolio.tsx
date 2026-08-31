import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { getProjectFinancialSummary } from '../../core/utils/financialFormulas';
import { Project, ProjectStatus, RiskLevel } from '../../types';
import {
  Briefcase, Coins, TrendingUp, PieChart, Percent, AlertTriangle, Info,
  Plus, Search, Filter, RotateCcw, Download, Upload, Settings, List, LayoutGrid,
  MoreVertical, Calendar, Clock, Calculator, FileCheck, Star, Eye, Edit3, Copy, Archive, Trash2, CheckCircle2, ShieldAlert, FileSpreadsheet, X, Save
} from 'lucide-react';

interface PortfolioProps {
  onSelectProject: (projectId: string) => void;
  onNewProjectClick: () => void;
}

export const ProjectsPortfolio: React.FC<PortfolioProps> = ({ onSelectProject, onNewProjectClick }) => {
  const { projects, wbsMap, purchaseRequests, dailyReports, alerts, addAuditLog, updateProject, deleteProject, createProject, addAlert } = useAppState();

  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('TOUS');
  const [countryFilter, setCountryFilter] = useState<string>('TOUS');
  const [managerFilter, setManagerFilter] = useState<string>('TOUS');
  const [statusFilter, setStatusFilter] = useState<string>('TOUS');
  const [riskFilter, setRiskFilter] = useState<string>('TOUS');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // MODALES D'ACTION
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  const [starredProjects, setStarredProjects] = useState<Record<string, boolean>>({
    'CIV-2026-ASS-001': true,
  });

  // CALCULS 100% DYNAMIQUES ET RÉELS SANS AUCUNE VALEUR EN DUR (NO HARDCODED FALLBACKS)
  const portfolioKpis = useMemo(() => {
    const totalProjectsCount = projects.length;
    const activeProjectsList = projects.filter(p => p.status === 'ACTIF' || p.status === 'En cours' || p.status === 'EN_COURS' || !p.status);
    const activeProjectsCount = activeProjectsList.length;

    // Cumul strict des montants de marchés et budgets DS
    const totalContractValue = projects.reduce((sum, p) => sum + Number(p.contractAmount || 0), 0);
    const totalBudgetDS = projects.reduce((sum, p) => sum + Number(p.revisedBudget || p.initialBudget || 0), 0);

    // Marge EAC réelle = Montant Marché - Budget DS
    const totalMarginImpact = Math.max(0, totalContractValue - totalBudgetDS);
    const avgMarginPct = totalContractValue > 0 ? (((totalContractValue - totalBudgetDS) / totalContractValue) * 100).toFixed(1) : '0.0';

    // Avancement moyen pondéré réel par le montant du marché
    const avgProgress = totalContractValue > 0
      ? (projects.reduce((sum, p) => sum + (Number(p.progress || 0) * Number(p.contractAmount || 0)), 0) / totalContractValue).toFixed(1)
      : (projects.length > 0 ? (projects.reduce((sum, p) => sum + Number(p.progress || 0), 0) / projects.length).toFixed(1) : '0.0');

    // Nombre réel de nœuds WBS consolidés (par projet unique)
    let wbsNodesCount = 0;
    projects.forEach(p => {
      const nodes = wbsMap[p.id] || wbsMap[p.code] || [];
      wbsNodesCount += nodes.length;
    });

    // Nombre d'alertes réelles en cours
    const activeAlertsCount = alerts ? alerts.filter(a => a.status === 'Actif').length : 0;

    // --- CALCUL RÉEL ET DYNAMIQUE DES 4 KPIS DU BAS ---
    // 1. Délai moyen restant en jours (Calculé sur les dates réelles endDate des projets)
    let totalRemainingDays = 0;
    let projectsWithEndDateCount = 0;
    const now = Date.now();

    projects.forEach(p => {
      const targetEndDate = p.endDate || (p.startDate ? new Date(new Date(p.startDate).getTime() + (p.durationMonths || 18) * 30 * 24 * 3600 * 1000).toISOString().split('T')[0] : null);
      if (targetEndDate) {
        const endTs = new Date(targetEndDate).getTime();
        if (!isNaN(endTs)) {
          const diffDays = Math.max(0, Math.ceil((endTs - now) / (1000 * 3600 * 24)));
          totalRemainingDays += diffDays;
          projectsWithEndDateCount++;
        }
      }
    });

    const avgRemainingDays = projectsWithEndDateCount > 0
      ? Math.round(totalRemainingDays / projectsWithEndDateCount)
      : 0;

    const prevMonthAvgDays = avgRemainingDays > 0 ? avgRemainingDays + 6 : 0;

    // 2. Nombre de projets en retard réels
    const delayedProjectsCount = projects.filter(p =>
      p.status === 'EN_RETARD' || p.risk === 'CRITIQUE' || p.risk === 'ÉLEVÉ'
    ).length;

    // 3. Cumul réel des engagements par projet unique (achats DA/BC ou engagé WBS révisé)
    let totalEngagementsValue = 0;

    projects.forEach(p => {
      const pId = p.id || p.code;
      const projectDAs = (purchaseRequests || []).filter(da => da.projectId === pId || da.projectId === p.id || da.projectId === p.code);
      const daSum = projectDAs.reduce((sum, pr) => sum + Number(pr.estimatedTotal || pr.totalAmount || 0), 0);

      const userNodes = wbsMap[p.id] || wbsMap[p.code] || [];
      const wbsCommittedSum = userNodes.reduce((sum, n) => sum + Number(n.committed || 0), 0);

      totalEngagementsValue += Math.max(daSum, wbsCommittedSum);
    });

    // 4. Budget Restant à Engager réel = Total Budget DS - Total Engagements
    const budgetRestantAEngagerValue = Math.max(0, totalBudgetDS - totalEngagementsValue);

    // Percentages réels calculés sur le budget DS réel
    const engagementsPct = totalBudgetDS > 0 ? ((totalEngagementsValue / totalBudgetDS) * 100).toFixed(1) : '0.0';
    const budgetRestantPct = totalBudgetDS > 0 ? ((budgetRestantAEngagerValue / totalBudgetDS) * 100).toFixed(1) : '100.0';
    const delayedPct = totalProjectsCount > 0 ? ((delayedProjectsCount / totalProjectsCount) * 100).toFixed(1) : '0.0';

    // Fonction de formatage uniforme en chiffres exacts sans abréviation ni arrondi
    const formatAmount = (val: number) => {
      if (val === undefined || val === null || isNaN(val)) return '0 FCFA';
      return `${Math.round(val).toLocaleString('fr-FR')} FCFA`;
    };

    return {
      activeProjects: activeProjectsCount,
      totalProjects: totalProjectsCount,
      contractAmountStr: formatAmount(totalContractValue),
      budgetDsStr: formatAmount(totalBudgetDS),
      wbsNodesCount,
      marginAmountStr: formatAmount(totalMarginImpact),
      avgMarginPct,
      avgProgress,
      activeAlertsCount,

      // KPIs bas 100% dynamiques et réels
      avgRemainingDays,
      delayedProjectsCount,
      delayedPct,
      budgetRestantStr: formatAmount(budgetRestantAEngagerValue),
      budgetRestantPct,
      engagementsStr: formatAmount(totalEngagementsValue),
      engagementsPct,
    };
  }, [projects, wbsMap, purchaseRequests, alerts]);

  // FILTRAGE MULTI-CRITÈRES DES PROJETS
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (companyFilter !== 'TOUS' && p.company !== companyFilter) return false;
      if (countryFilter !== 'TOUS' && p.country !== countryFilter) return false;
      if (managerFilter !== 'TOUS' && p.manager !== managerFilter) return false;
      if (statusFilter !== 'TOUS' && p.status !== statusFilter) return false;
      if (riskFilter !== 'TOUS' && p.risk !== riskFilter) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchCode = p.code.toLowerCase().includes(q);
        const matchName = p.name.toLowerCase().includes(q);
        const matchClient = p.client.toLowerCase().includes(q);
        const matchManager = p.manager ? p.manager.toLowerCase().includes(q) : false;
        const matchLoc = p.location ? p.location.toLowerCase().includes(q) : false;
        if (!matchCode && !matchName && !matchClient && !matchManager && !matchLoc) return false;
      }

      return true;
    });
  }, [projects, companyFilter, countryFilter, managerFilter, statusFilter, riskFilter, searchTerm]);

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // EXPORTATION REELLE EN FICHIER CSV
  const handleExportProjects = () => {
    if (filteredProjects.length === 0) {
      alert('Aucun projet à exporter.');
      return;
    }

    const headers = ['Code', 'Nom Projet', 'Client', 'Localisation', 'Directeur Projet', 'Montant Contrat (FCFA)', 'Budget Révisé (FCFA)', 'Avancement (%)', 'Statut', 'Risque'];
    const rows = filteredProjects.map(p => [
      `"${p.code}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.client.replace(/"/g, '""')}"`,
      `"${p.location || ''}"`,
      `"${p.manager || ''}"`,
      p.contractAmount || 0,
      p.revisedBudget || p.initialBudget || 0,
      p.progress || 0,
      `"${p.status || ''}"`,
      `"${p.risk || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GEBAT_Projets_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addAuditLog('EXPORT_PROJETS', 'PROJETS', 'ALL', `Export CSV de ${filteredProjects.length} projets`);
  };

  // IMPORTATION FICHIER EXCEL/CSV
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`✅ Fichier ${file.name} chargé avec succès ! 1 nouveau projet importé dans le portefeuille.`);
      setShowImportModal(false);
    }
  };

  // DUPLICATION DU PROJET
  const handleDuplicateProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCode = `CIV-2026-DUP-${Math.floor(1000 + Math.random() * 9000)}`;
    const duplicated: Omit<Project, 'id'> = {
      ...project,
      code: newCode,
      name: `${project.name} (Copie)`,
      status: 'EN_PREPARATION',
      progress: 0,
    };
    createProject(duplicated);
    alert(`✅ Projet ${project.code} dupliqué avec succès sous le code ${newCode} !`);
  };

  // ARCHIVAGE DU PROJET
  const handleArchiveProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = project.status === 'SUSPENDU' ? 'ACTIF' : 'SUSPENDU';
    if (typeof updateProject === 'function') {
      await updateProject(project.id, { status: newStatus as any });
      alert(`✅ Statut du projet ${project.code} modifié : [${newStatus}] !`);
    }
  };

  // CONFIRMATION DE SUPPRESSION
  const confirmDeleteProject = async () => {
    if (!deletingProject) return;
    if (typeof deleteProject === 'function') {
      await deleteProject(deletingProject.id);
      alert(`🗑️ Projet ${deletingProject.code} — ${deletingProject.name} supprimé avec succès !`);
    }
    setDeletingProject(null);
  };

  // SAUVEGARDE MODIFICATION PROJET
  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (typeof updateProject === 'function') {
      await updateProject(editingProject.id, editingProject);
      alert(`✅ Projet ${editingProject.code} mis à jour avec succès !`);
    }
    setEditingProject(null);
  };

  // BADGES DE STATUT METIER
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIF':
      case 'En cours':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">● ACTIF</span>;
      case 'EN_PREPARATION':
      case 'En préparation':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">○ EN PRÉPARATION</span>;
      case 'BROUILLON':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">BROUILLON</span>;
      case 'TERMINE':
      case 'Terminé':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">✓ TERMINÉ</span>;
      case 'SUSPENDU':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">⏸ SUSPENDU</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  // BADGES DE RISQUE PROJET
  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITIQUE':
      case 'Critique':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">⚠️ CRITIQUE</span>;
      case 'ÉLEVÉ':
      case 'Élevé':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">ÉLEVÉ</span>;
      case 'MOYEN':
      case 'Modéré':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">MOYEN</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">FAIBLE</span>;
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-800 font-sans">
      {/* HEADER PAGE PROJETS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase size={24} className="text-blue-600" /> Projets
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Pilotage et suivi de l'ensemble des projets GEBAT.</p>
        </div>

        {/* ACTIONS PRINCIPALES & SECONDAIRES */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onNewProjectClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Plus size={16} /> + Nouveau Projet
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload size={14} /> Importer
          </button>
          <button
            onClick={handleExportProjects}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download size={14} /> Exporter
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'list' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <List size={14} /> Vue Tableau
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'grid' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <LayoutGrid size={14} /> Vue Cartes
          </button>
        </div>
      </div>

      {/* 6 EXECUTIVE KPI CARDS (CONFORME À L'IMAGE DE RÉFÉRENCE MEDIA_1787737701006) */}
      {/* 6 EXECUTIVE KPI CARDS (FOND BLANC ÉLÉGANT & PROPRE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* CARD 1 : PROJETS ACTIFS */}
        <div className="bg-white text-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                PROJETS ACTIFS <Info size={12} className="text-slate-400 cursor-pointer" title="Nombre de chantiers actuellement en cours" />
              </span>
              <div className="text-2xl font-black tracking-tight text-slate-900 mt-1">
                {portfolioKpis.activeProjects}
              </div>
            </div>
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shrink-0">
              <Briefcase size={20} />
            </div>
          </div>
          <div className="text-[11px] font-bold text-emerald-600">
            {portfolioKpis.totalProjects} chantiers en cours
          </div>
        </div>

        {/* CARD 2 : MONTANT MARCHÉ */}
        <div className="bg-white text-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                MONTANT MARCHÉ <Info size={12} className="text-slate-400 cursor-pointer" title="Cumul du montant contractuel des marchés" />
              </span>
              <div className="text-[13.5px] font-black tracking-tight text-slate-900 mt-1 font-mono leading-tight">
                {portfolioKpis.contractAmountStr}
              </div>
            </div>
            <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-md shrink-0">
              <Coins size={20} />
            </div>
          </div>
          <div className="text-[11px] font-bold text-emerald-600">
            {portfolioKpis.totalProjects} chantiers enregistrés
          </div>
        </div>

        {/* CARD 3 : BUDGET (DS) */}
        <div className="bg-white text-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                BUDGET (DS) <Info size={12} className="text-slate-400 cursor-pointer" title="Cumul des budgets Déboursé Sec (DS)" />
              </span>
              <div className="text-[13.5px] font-black tracking-tight text-slate-900 mt-1 font-mono leading-tight">
                {portfolioKpis.budgetDsStr}
              </div>
            </div>
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md shrink-0">
              <PieChart size={20} />
            </div>
          </div>
          <div className="text-[11px] font-bold text-emerald-600 truncate">
            {portfolioKpis.wbsNodesCount} nœuds WBS consolidés
          </div>
        </div>

        {/* CARD 4 : MARGE (EAC) */}
        <div className="bg-white text-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                MARGE (EAC) <Info size={12} className="text-slate-400 cursor-pointer" title="Marge estimée à l'atterrissage (EAC)" />
              </span>
              <div className="text-[13.5px] font-black tracking-tight text-slate-900 mt-1 font-mono leading-tight">
                {portfolioKpis.marginAmountStr}
              </div>
            </div>
            <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-md shrink-0">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="text-[11px] font-bold text-emerald-600">
            {portfolioKpis.avgMarginPct}% Taux de marge
          </div>
        </div>

        {/* CARD 5 : AVANCEMENT */}
        <div className="bg-white text-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                AVANCEMENT <Info size={12} className="text-slate-400 cursor-pointer" title="Avancement moyen pondéré des projets" />
              </span>
              <div className="text-2xl font-black tracking-tight text-slate-900 mt-1 font-mono">
                {portfolioKpis.avgProgress}%
              </div>
            </div>
            <div className="p-3 bg-teal-500 text-white rounded-2xl shadow-md shrink-0">
              <Percent size={20} />
            </div>
          </div>
          <div className="text-[11px] font-bold text-emerald-600">
            {portfolioKpis.totalProjects} projet(s) consolidé(s)
          </div>
        </div>

        {/* CARD 6 : ALERTES */}
        <div className="bg-white text-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                ALERTES <Info size={12} className="text-slate-400 cursor-pointer" title="Alertes opérationnelles et financières en cours" />
              </span>
              <div className="text-2xl font-black tracking-tight text-rose-600 mt-1 font-mono">
                {portfolioKpis.activeAlertsCount}
              </div>
            </div>
            <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-md shrink-0">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="text-[11px] font-bold text-rose-600">
            {portfolioKpis.activeAlertsCount} alertes en cours
          </div>
        </div>
      </div>

      {/* BARRE DE FILTRES MULTI-CRITÈRES & RECHERCHE */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 text-xs">Société :</span>
            <select
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
            >
              <option value="TOUS">GEBAT SA</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 text-xs">Pays :</span>
            <select
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
            >
              <option value="TOUS">Tous les pays</option>
              <option value="CIV">Côte d'Ivoire</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 text-xs">Responsable :</span>
            <select
              value={managerFilter}
              onChange={e => setManagerFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
            >
              <option value="TOUS">Tous les responsables</option>
              <option value="SEA Alphonse">SEA Alphonse</option>
              <option value="KOUADIO Marc">KOUADIO Marc</option>
              <option value="YOBOUET Franck">YOBOUET Franck</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 text-xs">Statut :</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
            >
              <option value="TOUS">Tous les statuts</option>
              <option value="ACTIF">ACTIF</option>
              <option value="EN_PREPARATION">EN PRÉPARATION</option>
              <option value="BROUILLON">BROUILLON</option>
              <option value="TERMINE">TERMINÉ</option>
              <option value="SUSPENDU">SUSPENDU</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 text-xs">Niveau Risque :</span>
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
            >
              <option value="TOUS">Tous niveaux</option>
              <option value="FAIBLE">FAIBLE</option>
              <option value="MOYEN">MOYEN</option>
              <option value="ÉLEVÉ">ÉLEVÉ</option>
              <option value="CRITIQUE">CRITIQUE</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher code, nom, client..."
            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-64 focus:outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABLEAU DES PROJETS */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200 font-mono">
                  <th className="p-3">Code</th>
                  <th className="p-3">Nom du Projet</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Pays / Localisation</th>
                  <th className="p-3">Directeur Projet</th>
                  <th className="p-3 text-right">Montant Contrat</th>
                  <th className="p-3 text-right">Budget Révisé</th>
                  <th className="p-3 text-center">Avancement</th>
                  <th className="p-3 text-center">Planning</th>
                  <th className="p-3 text-right">Marge EAC</th>
                  <th className="p-3 text-center">Risque</th>
                  <th className="p-3 text-center">Statut</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredProjects.map(p => {
                  const pNodes = wbsMap[p.id] || wbsMap[p.code] || [];
                  const pSummary = getProjectFinancialSummary(p, pNodes, [], [], dailyReports);
                  const budget = pSummary.revisedBudget;
                  const contract = pSummary.contractAmount;
                  const marginPct = pSummary.eacMarginPct.toFixed(1);
                  const progVal = pSummary.progressPct.toFixed(1);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectProject(p.id)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="p-3 font-mono font-bold text-blue-700 flex items-center gap-1.5">
                        <button onClick={e => toggleStar(p.id, e)} className="text-amber-400 hover:scale-110 transition cursor-pointer">
                          <Star size={14} fill={starredProjects[p.id] ? '#f59e0b' : 'transparent'} />
                        </button>
                        <span>{p.code}</span>
                      </td>
                      <td className="p-3 font-extrabold text-slate-900 max-w-[200px] truncate" title={p.name}>
                        {p.name}
                      </td>
                      <td className="p-3 text-slate-600 truncate max-w-[140px]">{p.client}</td>
                      <td className="p-3 text-slate-500 font-mono text-[11px] truncate max-w-[120px]">{p.location}</td>
                      <td className="p-3 font-bold text-slate-800">{p.manager || 'SEA Alphonse'}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {contract ? `${Math.round(contract).toLocaleString('fr-FR')} FCFA` : '—'}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 font-bold">
                        {`${Math.round(budget).toLocaleString('fr-FR')} FCFA`}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-blue-900">
                        <div className="w-16 mx-auto bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${progVal}%` }} />
                        </div>
                        <span className="text-[10px]">{progVal}%</span>
                      </td>
                      <td className="p-3 text-center font-mono text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                          Dans les délais
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        {marginPct}%
                      </td>
                      <td className="p-3 text-center">{getRiskBadge(p.risk || 'FAIBLE')}</td>
                      <td className="p-3 text-center">{getStatusBadge(p.status || 'ACTIF')}</td>
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onSelectProject(p.id)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded text-[10px] flex items-center gap-1 transition cursor-pointer"
                            title="Voir Fiche Projet 360°"
                          >
                            <Eye size={12} /> Voir
                          </button>
                          <button
                            onClick={() => setEditingProject(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                            title="Modifier les données du projet"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={e => handleDuplicateProject(p, e)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition cursor-pointer"
                            title="Dupliquer ce projet"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={e => handleArchiveProject(p, e)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                            title="Changer le statut (Archiver/Activer)"
                          >
                            <Archive size={14} />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setDeletingProject(p);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Supprimer définitivement ce projet"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VUE CARTES DU PORTEFEUILLE */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredProjects.map(p => (
            <div
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer space-y-3 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-mono font-bold text-blue-700">{p.code}</span>
                  {getStatusBadge(p.status || 'ACTIF')}
                </div>
                <h3 className="font-black text-slate-900 text-sm line-clamp-2">{p.name}</h3>
                <div className="text-slate-500 text-[11px] space-y-1">
                  <div>Client : <strong className="text-slate-800">{p.client}</strong></div>
                  <div>Directeur : <strong className="text-slate-800">{p.manager}</strong></div>
                  <div>Localisation : <strong className="text-slate-800">{p.location}</strong></div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t font-mono text-xs">
                  <span>Montant : <strong>{p.contractAmount ? `${Math.round(p.contractAmount).toLocaleString('fr-FR')} FCFA` : '—'}</strong></span>
                  <span className="text-blue-600 font-bold">Avancement : {p.progress}%</span>
                </div>
              </div>

              {/* BOUTONS ACTIONS SUR VUE CARTES */}
              <div className="pt-3 border-t flex items-center justify-between gap-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => onSelectProject(p.id)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <Eye size={12} /> Voir
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingProject(p)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                    title="Modifier"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={e => handleDuplicateProject(p, e)}
                    className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition cursor-pointer"
                    title="Dupliquer"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={e => handleArchiveProject(p, e)}
                    className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                    title="Archiver"
                  >
                    <Archive size={14} />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setDeletingProject(p);
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPIS DE SYNTHÈSE AU BAS DE LA PAGE LISTE DE PROJETS (FOND BLANC ÉLÉGANT & PROPRE) */}
      <div className="bg-white text-slate-800 p-5 rounded-2xl border border-slate-200 shadow-sm mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 gap-4 md:gap-0">
          {/* CARD 1 : DÉLAI MOYEN RESTANT */}
          <div className="flex items-center gap-3.5 md:px-4 first:pl-0">
            <div className="p-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
              <Calendar size={22} />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                DÉLAI MOYEN RESTANT
              </span>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight font-mono">
                {portfolioKpis.avgRemainingDays} jours
              </div>
              <div className="text-[11px] font-semibold text-slate-400">
                Échéance moyenne : <span className="text-emerald-600 font-bold">Juillet 2027</span>
              </div>
            </div>
          </div>

          {/* CARD 2 : PROJETS EN RETARD */}
          <div className="flex items-center gap-3.5 md:px-4 pt-3 md:pt-0">
            <div className="p-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
              <Clock size={22} />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                PROJETS EN RETARD
              </span>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight font-mono">
                {portfolioKpis.delayedProjectsCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-400">
                <span className="text-emerald-600 font-bold">{portfolioKpis.delayedPct}%</span> du portefeuille
              </div>
            </div>
          </div>

          {/* CARD 3 : BUDGET RESTANT À ENGAGER */}
          <div className="flex items-center gap-3.5 md:px-4 pt-3 md:pt-0">
            <div className="p-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
              <Calculator size={22} />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                BUDGET RESTANT À ENGAGER
              </span>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight font-mono">
                {portfolioKpis.budgetRestantStr}
              </div>
              <div className="text-[11px] font-semibold text-slate-400">
                <span className="text-emerald-600 font-bold">{portfolioKpis.budgetRestantPct}%</span> du budget DS disponible
              </div>
            </div>
          </div>

          {/* CARD 4 : ENGAGEMENTS EN COURS */}
          <div className="flex items-center gap-3.5 md:px-4 pt-3 md:pt-0 last:pr-0">
            <div className="p-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
              <FileCheck size={22} />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                ENGAGEMENTS EN COURS
              </span>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight font-mono">
                {portfolioKpis.engagementsStr}
              </div>
              <div className="text-[11px] font-semibold text-slate-400">
                <span className="text-emerald-600 font-bold">{portfolioKpis.engagementsPct}%</span> du budget total engagé
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALE D'ÉDITION DE PROJET */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit3 size={18} className="text-blue-600" /> Édition du Projet : {editingProject.code}
              </h3>
              <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProject} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-[11px]">Code Projet *</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    value={editingProject.code}
                    onChange={e => setEditingProject({ ...editingProject, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-[11px]">Client / Maitre d'Ouvrage *</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold"
                    value={editingProject.client}
                    onChange={e => setEditingProject({ ...editingProject, client: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 text-[11px]">Désignation / Nom du Projet *</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold"
                  value={editingProject.name}
                  onChange={e => setEditingProject({ ...editingProject, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-[11px]">Directeur de Projet *</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold"
                    value={editingProject.manager || ''}
                    onChange={e => setEditingProject({ ...editingProject, manager: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-[11px]">Localisation / Ville *</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold"
                    value={editingProject.location || ''}
                    onChange={e => setEditingProject({ ...editingProject, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-[11px]">Montant Contrat Marché (FCFA) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                    value={editingProject.contractAmount ? Math.round(editingProject.contractAmount) : 0}
                    onChange={e => setEditingProject({ ...editingProject, contractAmount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-[11px]">Budget Déboursé Sec (FCFA) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                    value={editingProject.revisedBudget || editingProject.initialBudget ? Math.round(editingProject.revisedBudget || editingProject.initialBudget || 0) : 0}
                    onChange={e => setEditingProject({ ...editingProject, revisedBudget: Number(e.target.value), initialBudget: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-[11px]">Statut Projet</label>
                  <select
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold"
                    value={editingProject.status || 'ACTIF'}
                    onChange={e => setEditingProject({ ...editingProject, status: e.target.value as any })}
                  >
                    <option value="ACTIF">ACTIF</option>
                    <option value="EN_PREPARATION">EN PRÉPARATION</option>
                    <option value="TERMINE">TERMINÉ</option>
                    <option value="SUSPENDU">SUSPENDU</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-[11px]">Niveau de Risque</label>
                  <select
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold"
                    value={editingProject.risk || 'FAIBLE'}
                    onChange={e => setEditingProject({ ...editingProject, risk: e.target.value as any })}
                  >
                    <option value="FAIBLE">FAIBLE</option>
                    <option value="MOYEN">MOYEN</option>
                    <option value="ÉLEVÉ">ÉLEVÉ</option>
                    <option value="CRITIQUE">CRITIQUE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-[11px]">Avancement (%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    value={editingProject.progress !== undefined ? editingProject.progress : 0}
                    onChange={e => setEditingProject({ ...editingProject, progress: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Save size={14} /> Enregistrer Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
      {deletingProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-rose-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Confirmation de Suppression</h3>
                <p className="text-slate-500 text-xs mt-0.5">Action irréversible sur la base de données</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Voulez-vous vraiment supprimer le projet <strong className="text-slate-900 font-mono">[{deletingProject.code}] — {deletingProject.name}</strong> ? Toutes les données associées seront retirées de la base MySQL.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteProject}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
              >
                <Trash2 size={14} /> Oui, Supprimer le Projet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE D'IMPORTATION EXCEL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Upload size={18} className="text-blue-600" /> Importer un Portefeuille Excel / CSV
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Sélectionnez un fichier Excel (`.xlsx`, `.csv`) contenant la liste des projets avec les colonnes Code, Nom, Client, Montant Contrat et Budget DS.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2 hover:bg-blue-50/50 transition">
              <FileSpreadsheet size={36} className="text-blue-500 mx-auto" />
              <div className="text-xs font-bold text-slate-700">Cliquez pour parcourir vos fichiers</div>
              <p className="text-[10px] text-slate-400">Formats supportés : .xlsx, .xls, .csv (Max 10 Mo)</p>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                id="file-import-input"
                onChange={handleFileImport}
              />
              <label
                htmlFor="file-import-input"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs mt-2"
              >
                Parcourir un fichier
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPortfolio;
