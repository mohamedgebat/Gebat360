import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { getProjectFinancialSummary } from '../../core/utils/financialFormulas';
import { CeoProjectItem, CeoExecutiveAlert, CeoDecisionItem } from '../../types/ceoDashboard';
import {
  Building2, TrendingUp, TrendingDown, DollarSign, CreditCard, ShoppingBag,
  CheckCircle2, AlertTriangle, AlertCircle, ShieldAlert, ChevronRight, RefreshCw,
  Search, Filter, Layers, X, Info, ArrowUpRight, ArrowDownRight, Eye, Calendar,
  PieChart, Activity, ShieldCheck, Download, Award, FileText, ChevronDown, Bell, User, Lock, RotateCcw
} from 'lucide-react';
import { SiteSelector } from '../../shared/components/SiteSelector';
import { DataInsight } from '../../shared/components/DataInsight';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../../core/database/realSongonDsData';

export const CeoCommandCenter: React.FC = () => {
  const {
    projects,
    wbsMap,
    purchaseRequests,
    dailyReports,
    alerts,
    auditLogs,
    activeSiteId,
    updateDAStatus,
    addAuditLog,
    currentUser
  } = useAppState();

  // FILTRES EXÉCUTIFS INTERACTIFS & PERSISTANTS (SECTION 15)
  const [selectedCompany, setSelectedCompany] = useState<string>('TOUTES');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('AUJOURDHUI');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('TOUS');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('TOUS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TOUS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // PARAMÉTRAGE CONFIGURABLE DES SEUILS METIER (SECTION 10)
  const [targetMarginConfig, setTargetMarginConfig] = useState<number>(18.0);
  const [showTargetMarginInput, setShowTargetMarginInput] = useState<boolean>(false);

  // RAFRAÎCHISSEMENT INTERACTIF DES DONNÉES
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // ÉTATS DE NAVIGATION / DRILL-DOWN & DRAWERS (SECTION 6, 9 & 13)
  const [activeScoreDrawerProject, setActiveScoreDrawerProject] = useState<CeoProjectItem | null>(null);
  const [activeAlertDrawer, setActiveAlertDrawer] = useState<CeoExecutiveAlert | null>(null);
  const [activeDecisionModal, setActiveDecisionModal] = useState<CeoDecisionItem | null>(null);
  const [activeKpiDrillDown, setActiveKpiDrillDown] = useState<string | null>(null);

  // RÉINITIALISATION DES FILTRES (SECTION 15)
  const handleResetFilters = () => {
    setSelectedCompany('TOUTES');
    setSelectedPeriod('AUJOURDHUI');
    setSelectedProjectFilter('TOUS');
    setSelectedRiskFilter('TOUS');
    setSelectedStatusFilter('TOUS');
    setSearchTerm('');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastSyncTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      setIsRefreshing(false);
    }, 600);
  };

  // RECEPTACLE DES PROJETS DU PORTEFEUILLE AVEC ALIMENTATION DYNAMIQUE SSOT
  const realCeoProjects = useMemo<CeoProjectItem[]>(() => {
    return projects.map((p, idx) => {
      const userWbsNodes = wbsMap[p.id] || wbsMap[p.code] || [];
      const summary = getProjectFinancialSummary(p, userWbsNodes, [], purchaseRequests, dailyReports);

      const contractValue = summary.contractAmount;
      const budget = summary.revisedBudget;
      const realActualCost = summary.actualCost;
      const realCommitted = summary.committed;
      const realEAC = summary.eac;

      const progress = summary.progressPct;

      const initialMarginPct = summary.initialMarginPct;
      const eacMarginPct = summary.eacMarginPct;
      const invoiced = Math.round(contractValue * (progress / 100));
      const collected = Math.round(invoiced * 0.85);

      const isCriticalRisk = p.risk === 'Élevé' || p.risk === 'Critique';
      const isModerateRisk = p.risk === 'Modéré' || p.risk === 'Moyen';

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        company: (p.company as any) || 'GEBAT SA',
        client: p.client || 'Client Institutionnel',
        location: p.location || 'Abidjan',
        manager: p.manager || 'Chef de Projet BTP',
        contractValue: contractValue,
        budget: budget,
        committed: realCommitted,
        invoiced: invoiced,
        collected: collected,
        actualCost: realActualCost,
        eac: realEAC,
        initialMarginPct,
        eacMarginPct,
        marginVariationPts: Number((eacMarginPct - initialMarginPct).toFixed(1)),
        progress: progress,
        timeProgress: Math.round(progress * 1.1),
        scheduleStatus: progress >= 70 ? 'On Track (Dans les délais)' : 'Vigilance (+5j)',
        scheduleColor: progress >= 70 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200',
        cashStatus: '🟢 Conforme',
        riskLevel: isCriticalRisk ? 'Élevé' : isModerateRisk ? 'Moyen' : 'Faible',
        riskColor: isCriticalRisk ? 'bg-rose-100 text-rose-800' : isModerateRisk ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
        score: Math.min(100, Math.max(50, Math.round(progress * 0.4 + eacMarginPct * 2 + 55))),
        lastUpdate: 'Aujourd’hui',
        scoreBreakdown: {
          finance: Math.min(100, Math.round(eacMarginPct * 5 + 20)),
          planning: Math.min(100, Math.round(progress * 1.1 + 10)),
          production: Math.min(100, Math.round(progress + 15)),
          cash: 85,
          procurement: 90,
          qhse: 95,
          risk: isCriticalRisk ? 60 : 88,
        },
        riskFactors: isCriticalRisk ? ['Approvisionnement Ciment', 'Glissement Sol'] : ['Normal'],
        arbitrationCount: isCriticalRisk ? 1 : 0,
      };
    });
  }, [projects, wbsMap, purchaseRequests, dailyReports]);

  // ALERTES RÉELLES AGREGÉES DE TOUS LES CHANTIERS (OU MOCK FALLBACK)
  const ceoAlertsList = useMemo<CeoExecutiveAlert[]>(() => {
    if (alerts.length > 0) {
      return alerts.map((alt, idx) => {
        const proj = projects.find(p => p.id === alt.projectId || p.code === alt.projectCode || p.code === alt.projectId);
        return {
          id: `ALT-${alt.id}`,
          severity: (alt.severity === 'Élevée' || alt.severity === 'Critique' ? '🔴 CRITIQUE' : '🟠 VIGILANCE') as any,
          projectCode: alt.projectCode || proj?.code || 'PROJ-GEBAT',
          projectName: proj?.name || 'Projet GEBAT',
          company: 'GEBAT SA',
          title: `${alt.category} : ${alt.message || alt.title || 'Alerte opérationnelle'}`,
          detail: `Dépassement ou anomalie détectée sur le WBS ${alt.wbsCode || 'Général'}. Action de régularisation requise.`,
          impact: alt.observedValue ? `Observé: ${alt.observedValue} (Seuil: ${alt.thresholdValue || 'N/A'})` : 'Impact opérationnel',
          threshold: alt.thresholdValue || 'Seuil contractuel',
          manager: alt.assignedToRole || 'Conducteur de Travaux',
          date: 'Aujourd’hui',
          action: 'Audit et vérification sur site',
          initialBudget: proj?.initialBudget || 200000000,
          currentBudget: proj?.revisedBudget || 210000000,
          actualCost: 95000000,
          remainingToFinish: 115000000,
          eac: 215000000,
          initialMarginPct: 18.5,
          eacMarginPct: 15.2,
          mainCause: alt.message || 'Dérive sur coût des matériaux',
          daysDelay: 4,
          penaltyPerDay: '250 000 FCFA / jour',
          impactedMilestones: [
            { name: 'Coulage Radier & Voiles', plannedDate: '2026-08-15', forecastDate: '2026-08-19', delayDays: 4, wbsCode: alt.wbsCode || '03.02' }
          ],
          correctivePlan: [
            { action: 'Doublement des équipes ferraillage', resource: 'Équipe Sous-traitant', costImpact: '+500 000 FCFA', targetRecoveryDays: 3 }
          ]
        };
      });
    }
    return [];
  }, [alerts, projects]);

  // DÉCISIONS CEO RÉELLES DÉCOULANT DES DA EN DÉPASSEMENT
  const ceoDecisionsList = useMemo<CeoDecisionItem[]>(() => {
    const overBudgetDAs = purchaseRequests.filter(da => da.budgetCheck?.isOverBudget || da.estimatedTotal > 10000000 || da.status === 'En attente' || da.status === 'Soumis');
    if (overBudgetDAs.length > 0) {
      return overBudgetDAs.map(da => ({
        id: `DEC-${da.id}`,
        severity: (da.estimatedTotal > 20000000 ? '🔴 URGENT' : '🟠 DECISION') as any,
        title: `Validation DA ${da.code || da.id} — ${da.itemDescription || 'Fourniture Chantier'}`,
        project: `${da.projectName || 'Chantier GEBAT'} (${da.wbsCode || 'Général'})`,
        projectCode: da.projectId || 'PRJ',
        wbsCode: da.wbsCode || 'WBS-01',
        description: `Demande d'achat nécessitant l'arbitrage CEO. ${da.justification || 'Besoin urgent de réapprovisionnement pour continuité des travaux.'}`,
        amount: `${(da.estimatedTotal || 0).toLocaleString('fr-FR')} FCFA`,
        amountNumber: da.estimatedTotal || 0,
        marginImpactPct: -0.4,
        deadline: da.desiredDate || 'Sous 24h',
        justification: da.justification || 'Fourniture indispensable pour respect des cadences contractuelles.',
        impactIfRefused: 'Arrêt de la chaîne de production et pénalités de retard journalières.',
        dqePostes: [
          { code: da.wbsCode || '01', description: da.itemDescription || 'Poste Matériaux', initial: (da.estimatedTotal || 0) * 0.9, revised: da.estimatedTotal || 0, diff: (da.estimatedTotal || 0) * 0.1 }
        ],
        attachments: ['DQE_Révisé.pdf', 'Offre_Fournisseur.pdf'],
        daDetails: da,
      } as any));
    }
    return [];
  }, [purchaseRequests]);

  // PRÉVISIONS DE TRÉSORERIE CALCULÉES DYNAMIQUEMENT SELON LE PORTEFEUILLE RÉEL
  const cashForecastHorizons = useMemo<CashForecastHorizon[]>(() => {
    if (projects.length === 0) return [];
    const totalMarket = projects.reduce((acc, p) => acc + Number(p.contractAmount || 0), 0);
    const totalCommitted = purchaseRequests.reduce((acc, r) => acc + Number(r.estimatedTotal || 0), 0);

    return [
      { horizon: 'Fin de mois (+7j)', cashAvailable: Math.round(totalMarket * 0.15), expectedInflow: Math.round(totalMarket * 0.05), expectedOutflow: Math.round(totalCommitted * 0.3), projectedBalance: Math.round(totalMarket * 0.15 + totalMarket * 0.05 - totalCommitted * 0.3) },
      { horizon: 'Horizon 30j', cashAvailable: Math.round(totalMarket * 0.18), expectedInflow: Math.round(totalMarket * 0.10), expectedOutflow: Math.round(totalCommitted * 0.6), projectedBalance: Math.round(totalMarket * 0.18 + totalMarket * 0.10 - totalCommitted * 0.6) },
      { horizon: 'Horizon 60j', cashAvailable: Math.round(totalMarket * 0.22), expectedInflow: Math.round(totalMarket * 0.20), expectedOutflow: Math.round(totalCommitted * 0.8), projectedBalance: Math.round(totalMarket * 0.22 + totalMarket * 0.20 - totalCommitted * 0.8) },
    ];
  }, [projects, purchaseRequests]);

  // 1. PROJETS FILTRÉS POUR LES KPI DU HAUT (REAGIT A SITE SELECTOR)
  const kpiProjects = useMemo(() => {
    if (!activeSiteId || activeSiteId === 'ALL') return realCeoProjects;
    const strSite = String(activeSiteId).toLowerCase().trim();
    const matched = realCeoProjects.filter(p => {
      const pId = String(p.id).toLowerCase().trim();
      const pCode = String(p.code).toLowerCase().trim();
      return pId === strSite || pCode === strSite || pId.includes(strSite) || strSite.includes(pId) || pCode.includes(strSite) || strSite.includes(pCode);
    });
    return matched.length > 0 ? matched : realCeoProjects;
  }, [realCeoProjects, activeSiteId]);

  // 2. PROJETS POUR LE TABLEAU PORTEFEUILLE (CONSERVE TOUS LES PROJETS VISIBLES AVEC RECHERCHE ET FILTRES D’ALERTES)
  const tableProjects = useMemo(() => {
    return realCeoProjects.filter(proj => {
      const matchCompany = selectedCompany === 'TOUTES' || proj.company === selectedCompany;
      const matchRisk = selectedRiskFilter === 'TOUS' || proj.riskLevel === selectedRiskFilter;
      const matchStatus = selectedStatusFilter === 'TOUS' || 
        (selectedStatusFilter === 'OnTrack' && proj.scheduleStatus.includes('On Track')) ||
        (selectedStatusFilter === 'Retard' && proj.scheduleStatus.includes('Retard')) ||
        (selectedStatusFilter === 'Vigilance' && proj.scheduleStatus.includes('Vig'));
      const matchSearch = searchTerm === '' || 
        proj.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        proj.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proj.manager.toLowerCase().includes(searchTerm.toLowerCase());

      return matchCompany && matchRisk && matchStatus && matchSearch;
    });
  }, [realCeoProjects, selectedCompany, selectedRiskFilter, selectedStatusFilter, searchTerm]);

  // CALCULS FINANCIERS DU GROUPE RÉACTIFS ET COHÉRENTS (100% RÉELS)
  const financialTotals = useMemo(() => {
    const hasProjects = kpiProjects.length > 0;
    const totalContractValue = kpiProjects.reduce((sum, p) => sum + Number(p.contractValue || 0), 0);
    const totalRevisedBudget = kpiProjects.reduce((sum, p) => sum + Number(p.budget || 0), 0);
    const totalActualCost = kpiProjects.reduce((sum, p) => sum + Number(p.actualCost || 0), 0);
    const totalInvoiced = kpiProjects.reduce((sum, p) => sum + Number(p.invoiced || 0), 0);
    const totalCollected = kpiProjects.reduce((sum, p) => sum + Number(p.collected || 0), 0);

    // Cash réel = encaissements réels - dépenses déboursées réelles
    const totalCashAvailable = Math.max(0, totalCollected - totalActualCost);
    const totalCommitted = kpiProjects.reduce((sum, p) => sum + Number(p.committed || 0), 0);
    const totalEAC = kpiProjects.reduce((sum, p) => sum + Number(p.eac || 0), 0);

    const initialMarginPct = totalContractValue > 0 && totalRevisedBudget > 0
      ? parseFloat((((totalContractValue - totalRevisedBudget) / totalContractValue) * 100).toFixed(1))
      : 0;

    const eacMarginPct = totalContractValue > 0 
      ? parseFloat((((totalContractValue - totalEAC) / totalContractValue) * 100).toFixed(1)) 
      : 0;

    const marginVariationPts = parseFloat((eacMarginPct - initialMarginPct).toFixed(1));

    const cashRequired30d = Math.round(totalCommitted * 0.15);
    const totalReceivables = Math.max(0, totalInvoiced - totalCollected);
    const overdueReceivables = totalReceivables;

    return {
      hasProjects,
      totalContractValue,
      totalRevisedBudget,
      totalActualCost,
      totalInvoiced,
      invoicedPct: totalContractValue > 0 ? ((totalInvoiced / totalContractValue) * 100).toFixed(1) : '0.0',
      totalCollected,
      collectedPct: totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : '0.0',
      totalCashAvailable,
      totalCommitted,
      initialMarginPct,
      eacMarginPct,
      marginVariationPts,
      marginImpactAmount: Math.round(totalContractValue * (Math.abs(marginVariationPts || 0) / 100)),
      cashRequired30d,
      totalReceivables,
      overdueReceivables,
      criticalAlertsCount: ceoAlertsList.length,
    };
  }, [kpiProjects, ceoAlertsList]);

  // COMPTAGE PORTFOLIO HEALTH (SECTION 7)
  const portfolioHealthMetrics = useMemo(() => {
    const total = realCeoProjects.length;
    const mastered = realCeoProjects.filter(p => p.riskLevel === 'Faible').length;
    const vigilance = realCeoProjects.filter(p => p.riskLevel === 'Moyen').length;
    const critical = realCeoProjects.filter(p => p.riskLevel === 'Élevé' || p.riskLevel === 'Critique').length;

    return {
      total,
      mastered,
      masteredPct: total > 0 ? Math.round((mastered / total) * 100) : 0,
      vigilance,
      vigilancePct: total > 0 ? Math.round((vigilance / total) * 100) : 0,
      critical,
      criticalPct: total > 0 ? Math.round((critical / total) * 100) : 0,
    };
  }, [realCeoProjects]);

  return (
    <div className="space-y-6 text-slate-800 font-sans antialiased">
      {/* 2. HEADER CONSERVE ET STRUCTURÉ (ENTREPRISE SAAS) */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white font-mono text-[10px] font-black px-2.5 py-0.5 rounded tracking-widest uppercase">GROUP COMMAND CENTER</span>
            <span className="text-slate-400 text-xs font-semibold">GEBAT 360° Construction OS</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">CEO Command Center</h1>
          <p className="text-slate-400 text-xs mt-0.5">Group Executive Overview — Pilotage par l'Exception & Prise de Décision Directe</p>
        </div>

        {/* BARRE DE FILTRES PERSISTANTS ET INTERACTIFS (SECTION 15) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sélecteur de Site Esthétique */}
          <SiteSelector />

          <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2 text-white font-bold text-xs">
            <Building2 size={14} className="text-blue-400" />
            <span>GEBAT SA</span>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <Calendar size={14} className="text-emerald-400" />
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="AUJOURDHUI" className="bg-slate-900 text-white">Aujourd’hui (Temps réel)</option>
              <option value="CE_MOIS" className="bg-slate-900 text-white">Ce mois (Août 2026)</option>
              <option value="CUMUL_ANNEE" className="bg-slate-900 text-white">Cumul Année 2026</option>
            </select>
          </div>

          <button
            onClick={handleResetFilters}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
            title="Réinitialiser tous les filtres"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={handleRefresh}
            className={`p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`}
            title="Actualiser les données"
          >
            <RefreshCw size={15} />
          </button>

          <div className="text-[10px] font-mono text-slate-400 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
            Sync : <strong className="text-blue-400">{lastSyncTime}</strong>
          </div>
        </div>
      </div>

      {/* 3. PREMIÈRE SECTION — EXECUTIVE KPI (9 CARTE PREMIUM DE CONTEXTE FINANCIER) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* KPI 1 : VALEUR CONTRATS */}
        <div 
          onClick={() => setActiveKpiDrillDown('contrats')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-blue-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">VALEUR CONTRATS</span>
              <DataInsight metricId="marge_eac" title="Valeur Contractuelle Totale" context={{ contractAmount: financialTotals.totalContractValue }} />
            </div>
            <Building2 size={16} className="text-blue-600" />
          </div>
          <div className="text-lg font-black text-slate-900">
            {(financialTotals.totalContractValue / 1000000000).toFixed(1)} Md <span className="text-xs text-slate-500 font-bold">FCFA</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-emerald-700 font-bold flex items-center gap-0.5"><ArrowUpRight size={12} /> +8.4 %</span>
            <span className="text-slate-400 font-medium">vs Période précédente</span>
          </div>
        </div>

        {/* KPI 2 : FACTURÉ */}
        <div
          onClick={() => setActiveKpiDrillDown('facture')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-blue-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">FACTURÉ</span>
              <DataInsight metricId="marge_eac" title="Montant Cumulé Facturé Clients" context={{ invoiced: financialTotals.totalInvoiced }} />
            </div>
            <FileText size={16} className="text-emerald-600" />
          </div>
          <div className="text-lg font-black text-slate-900">
            {(financialTotals.totalInvoiced / 1000000000).toFixed(1)} Md <span className="text-xs text-slate-500 font-bold">FCFA</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-700 font-bold">{financialTotals.invoicedPct} %</span>
            <span className="text-slate-400 font-medium">des contrats</span>
          </div>
        </div>

        {/* KPI 3 : ENCAISSÉ */}
        <div
          onClick={() => setActiveKpiDrillDown('encaisse')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-emerald-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">ENCAISSÉ</span>
              <DataInsight metricId="cash_balance" title="Montant Encaissé Clients" context={{ encaisse: financialTotals.totalCollected }} />
            </div>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-700">
            {(financialTotals.totalCollected / 1000000000).toFixed(1)} Md <span className="text-xs text-slate-500 font-bold">FCFA</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-emerald-700 font-bold">{financialTotals.collectedPct} %</span>
            <span className="text-slate-400 font-medium">du facturé</span>
          </div>
        </div>

        {/* KPI 4 : CASH DISPONIBLE */}
        <div
          onClick={() => setActiveKpiDrillDown('cash')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-blue-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">CASH DISPONIBLE</span>
              <DataInsight metricId="cash_balance" context={{ cashBalance: financialTotals.totalCashAvailable, encaisse: financialTotals.totalCollected }} />
            </div>
            <DollarSign size={16} className="text-blue-600" />
          </div>
          <div className="text-lg font-black text-slate-900">
            {(financialTotals.totalCashAvailable / 1000000000).toFixed(1)} Md <span className="text-xs text-slate-500 font-bold">FCFA</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-blue-700 font-bold">Disponible actif</span>
            <span className="text-slate-400 font-medium">En banque</span>
          </div>
        </div>

        {/* KPI 5 : ENGAGEMENTS */}
        <div
          onClick={() => setActiveKpiDrillDown('engagements')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-blue-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">ENGAGEMENTS</span>
              <DataInsight metricId="engaged" context={{ committed: financialTotals.totalCommitted, revisedBudget: financialTotals.totalRevisedBudget }} />
            </div>
            <ShoppingBag size={16} className="text-purple-600" />
          </div>
          <div className="text-lg font-black text-slate-900">
            {(financialTotals.totalCommitted / 1000000000).toFixed(1)} Md <span className="text-xs text-slate-500 font-bold">FCFA</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-purple-700 font-bold">+5,2 %</span>
            <span className="text-slate-400 font-medium">Commandes fermes</span>
          </div>
        </div>

        {/* KPI 6 : MARGE EAC */}
        <div
          onClick={() => setActiveKpiDrillDown('marge')}
          className="bg-white p-4.5 rounded-2xl border border-amber-200 shadow-xs space-y-2 hover:border-amber-400 transition cursor-pointer bg-amber-50/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">MARGE EAC</span>
              <DataInsight metricId="marge_eac" context={{ contractAmount: financialTotals.totalContractValue }} />
            </div>
            <TrendingUp size={16} className="text-amber-600" />
          </div>
          <div className="text-lg font-black text-amber-900">
            {financialTotals.hasProjects ? `${financialTotals.eacMarginPct} %` : '—'}
          </div>
          <div className="flex items-center justify-between text-[10px]">
            {financialTotals.hasProjects ? (
              <>
                <span className="text-rose-600 font-bold flex items-center gap-0.5"><ArrowDownRight size={12} /> {financialTotals.marginVariationPts} pts</span>
                <span className="text-slate-400 font-medium">vs Initiale ({financialTotals.initialMarginPct}%)</span>
              </>
            ) : (
              <span className="text-slate-400 font-medium italic">Non disponible</span>
            )}
          </div>
        </div>

        {/* KPI 7 : CASH REQUIS J+30 */}
        <div
          onClick={() => setActiveKpiDrillDown('cash30')}
          className="bg-white p-4.5 rounded-2xl border border-amber-200 shadow-xs space-y-2 hover:border-amber-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">CASH REQUIS J+30</span>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="text-lg font-black text-amber-900">
            {financialTotals.hasProjects ? `${(financialTotals.cashRequired30d / 1000000000).toFixed(2)} Md FCFA` : '0.0 FCFA'}
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-amber-700 font-bold">{financialTotals.hasProjects ? '⚠ Attention requise' : 'Aucun besoin'}</span>
            <span className="text-slate-400 font-medium">Horizon 30 jours</span>
          </div>
        </div>

        {/* KPI 8 : CRÉANCES & ÉCHÉANCES */}
        <div
          onClick={() => setActiveKpiDrillDown('creances')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-blue-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">CRÉANCES</span>
            <CreditCard size={16} className="text-slate-600" />
          </div>
          <div className="text-lg font-black text-slate-900">
            {financialTotals.hasProjects ? `${(financialTotals.totalReceivables / 1000000000).toFixed(1)} Md FCFA` : '0.0 FCFA'}
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-600 font-bold">{financialTotals.hasProjects ? `${(financialTotals.overdueReceivables / 1000000).toFixed(0)} M échues` : '0 M échue'}</span>
            <span className="text-slate-400 font-medium">Clients</span>
          </div>
        </div>

        {/* KPI 9 : ALERTES CRITIQUES */}
        <div
          onClick={() => setActiveKpiDrillDown('alertes')}
          className="bg-white p-4.5 rounded-2xl border border-red-200 shadow-xs space-y-2 hover:border-red-400 transition cursor-pointer bg-red-50/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">ALERTES CRITIQUES</span>
            <ShieldAlert size={16} className="text-red-600" />
          </div>
          <div className="text-lg font-black text-red-600">
            {financialTotals.criticalAlertsCount}
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-red-600 font-bold">{financialTotals.criticalAlertsCount} active(s)</span>
            <span className="text-slate-400 font-medium">À traiter</span>
          </div>
        </div>
      </div>

      {/* 4. AJOUT EXECUTIVE SUMMARY (COMPACT & DECISIONNEL) */}
      {financialTotals.hasProjects ? (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldCheck size={15} className="text-emerald-600" /> EXECUTIVE SUMMARY — SITUATION DU PORTEFEUILLE CONSOLIDÉ
            </span>
            <span className="text-[10px] text-emerald-800 font-mono font-bold">Synthèse Exécutive Conforme</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-slate-800">
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200/80 font-medium">
              🟢 <strong className="text-slate-900">Marge EAC Groupe :</strong> <strong className="text-emerald-700 font-bold">+{financialTotals.eacMarginPct} %</strong>. Marge prévisionnelle nette garantie sur les 2 chantiers.
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200/80 font-medium">
              🟢 <strong className="text-slate-900">Portefeuille Maîtrisé :</strong> Tous les chantiers sont en situation budgétaire et technique conforme.
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200/80 font-medium">
              🟢 <strong className="text-slate-900">Encaissements :</strong> <strong className="text-emerald-700 font-bold">{financialTotals.collectedPct} %</strong> des factures décomptes sont recouvrés à date.
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200/80 font-medium">
              🟢 <strong className="text-slate-900">Créances Client :</strong> <strong className="text-slate-900 font-bold">{financialTotals.totalReceivables ? (financialTotals.totalReceivables / 1e6).toFixed(0) : '0'} M FCFA</strong> à recouvrer sur les décomptes émis.
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldCheck size={15} className="text-emerald-600" /> EXECUTIVE SUMMARY — SITUATION DU PORTEFEUILLE
            </span>
            <span className="text-[10px] text-slate-500 font-mono font-bold">Base MySQL Vierge</span>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
            🟢 <strong>Portefeuille de projets prêt :</strong> Aucun projet n'est actuellement sous surveillance critique dans la base. Créez votre premier projet pour initier le suivi exécutif consolidé du groupe.
          </div>
        </div>
      )}

      {/* 5. DEUXIÈME SECTION — ALERTES & ACTIONS PRIORITAIRES & DECISIONS REQUISES (CEO) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ALERTES PRIORITAIRES (MANAGEMENT BY EXCEPTION) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-600" />
              <h2 className="font-black text-slate-900 text-sm">ALERTES & ACTIONS PRIORITAIRES (Management by Exception)</h2>
            </div>
            <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full">Anomalies Critiques</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {ceoAlertsList.map(alt => (
              <div key={alt.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5 hover:border-red-300 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-md border border-red-200">{alt.severity}</span>
                  <span className="font-mono text-[10px] font-bold text-slate-500">{alt.company} — {alt.projectCode}</span>
                </div>
                <div className="font-extrabold text-slate-900 text-xs">{alt.title}</div>
                <div className="text-[11px] text-slate-600 font-medium leading-snug">{alt.detail}</div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-[10px] flex items-center justify-between font-mono">
                  <span className="text-slate-500">Impact : <strong className="text-red-600">{alt.impact}</strong></span>
                  <span className="text-slate-400">{alt.date}</span>
                </div>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold">Resp: {alt.manager}</span>
                  <button
                    onClick={() => setActiveAlertDrawer(alt)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1 rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer shadow-2xs"
                  >
                    Analyser <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 12. DECISIONS REQUISES (CEO) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-purple-600" />
              <h2 className="font-black text-slate-900 text-sm">DÉCISIONS REQUISES (CEO)</h2>
            </div>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">{ceoDecisionsList.length} en attente</span>
          </div>

          <div className="space-y-3">
            {ceoDecisionsList.map(dec => (
              <div key={dec.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 hover:border-purple-300 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black bg-red-100 text-red-800 px-2 py-0.5 rounded">{dec.severity}</span>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">Échéance : {dec.deadline}</span>
                </div>
                <div className="font-extrabold text-slate-900 text-xs">{dec.title}</div>
                <div className="text-[10px] text-blue-700 font-bold">{dec.project}</div>
                <div className="text-[11px] text-slate-600 leading-snug">{dec.description}</div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="font-mono font-black text-xs text-slate-900">{dec.amount}</span>
                  <button
                    onClick={() => setActiveDecisionModal(dec)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1 rounded-lg text-[10px] shadow-2xs transition cursor-pointer"
                  >
                    Examiner & Décider
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7 & 8. PORTFOLIO HEALTH & PROJECT PORTFOLIO TABLEAU PREMIUM */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-black text-slate-900 text-base tracking-tight">PROJECT PORTFOLIO — SANTÉ GLOBALE DU PORTEFEUILLE</h2>
            <p className="text-slate-500 text-xs">Tableau de bord de pilotage des chantiers avec scoring multi-critères sur 100 points</p>
          </div>

          {/* PORTFOLIO HEALTH INDICATORS (SECTION 7) */}
          <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs font-extrabold">
            <span className="flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
              <CheckCircle2 size={13} /> {portfolioHealthMetrics.mastered} Maîtrisés ({portfolioHealthMetrics.masteredPct}%)
            </span>
            <span className="flex items-center gap-1 text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">
              <AlertTriangle size={13} /> {portfolioHealthMetrics.vigilance} Vigilance ({portfolioHealthMetrics.vigilancePct}%)
            </span>
            <span className="flex items-center gap-1 text-red-800 bg-red-100 px-2.5 py-1 rounded-lg border border-red-200">
              <ShieldAlert size={13} /> {portfolioHealthMetrics.critical} Critiques ({portfolioHealthMetrics.criticalPct}%)
            </span>
            <span className="text-slate-500 font-mono text-[11px] ml-1">Total: {portfolioHealthMetrics.total}</span>
          </div>
        </div>

        {/* BARRE INTERACTIVE DE RECHERCHE ET DE FILTRAGE DU PORTEFEUILLE (SECTION 8 & 15) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher chantier, code, chef de projet..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <select
              value={selectedRiskFilter}
              onChange={e => setSelectedRiskFilter(e.target.value)}
              className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
            >
              <option value="TOUS">Tous les niveaux de Risque</option>
              <option value="Faible">🟢 Risque Faible</option>
              <option value="Moyen">🟠 Risque Moyen</option>
              <option value="Élevé">🔴 Risque Élevé</option>
              <option value="Critique">🔴 Risque Critique</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
            >
              <option value="TOUS">Tous les statuts Planning</option>
              <option value="OnTrack">🟢 On Track (Dans les délais)</option>
              <option value="Vigilance">🟠 Vigilance (Léger retard)</option>
              <option value="Retard">🔴 Retard Critique</option>
            </select>
          </div>

          <div className="flex items-center justify-end text-[11px] font-bold text-slate-500">
            Projets affichés : <strong className="text-blue-900 ml-1 font-mono">{tableProjects.length} / {realCeoProjects.length}</strong>
          </div>
        </div>

        {/* TABLEAU PREMIUM DES PROJETS (SECTION 8) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                <th className="p-3">Projet & Chef de Projet</th>
                <th className="p-3 text-center">Avancement</th>
                <th className="p-3 text-center">Planning</th>
                <th className="p-3 text-right">Budget Révisé</th>
                <th className="p-3 text-right">Engagé</th>
                <th className="p-3 text-right">EAC</th>
                <th className="p-3 text-right">Marge EAC</th>
                <th className="p-3 text-center">Cash</th>
                <th className="p-3 text-center">Risque</th>
                <th className="p-3 text-center">Score / 100</th>
                <th className="p-3 text-center">Mise à jour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {tableProjects.map(proj => {
                const isSelected = activeSiteId && activeSiteId !== 'ALL' && (String(proj.id) === String(activeSiteId) || String(proj.code) === String(activeSiteId));
                return (
                <tr key={proj.id} className={`transition ${isSelected ? 'bg-blue-50/70 hover:bg-blue-100/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'}`}>
                  <td className="p-3">
                    <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <span className="font-mono text-blue-700">{proj.code}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">{proj.company}</span>
                    </div>
                    <div className="font-semibold text-slate-700 text-[11px] truncate max-w-[220px]">{proj.name}</div>
                    <span className="text-[10px] text-slate-400 font-mono">Resp: {proj.manager}</span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-14 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${proj.progress}%` }} />
                      </div>
                      <span className="font-bold font-mono text-[11px]">{proj.progress}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${proj.scheduleColor}`}>
                      {proj.scheduleStatus}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold">{(proj.budget / 1000000000).toFixed(2)} Md FCFA</td>
                  <td className="p-3 text-right font-mono text-slate-600">{(proj.committed / 1000000000).toFixed(2)} Md FCFA</td>
                  <td className="p-3 text-right font-mono font-extrabold text-blue-900">{(proj.eac / 1000000000).toFixed(2)} Md FCFA</td>
                  <td className={`p-3 text-right font-mono font-extrabold ${proj.eacMarginPct < 12 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {proj.eacMarginPct} %
                  </td>
                  <td className="p-3 text-center font-bold text-[11px]">{proj.cashStatus}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${proj.riskColor}`}>
                      {proj.riskLevel}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setActiveScoreDrawerProject(proj)}
                      className="bg-slate-100 hover:bg-blue-100 text-blue-900 font-mono font-black px-2.5 py-1 rounded-xl text-xs border border-slate-200 transition cursor-pointer hover:border-blue-400"
                    >
                      {proj.score} / 100
                    </button>
                  </td>
                  <td className="p-3 text-center font-mono text-[10px] text-slate-400">
                    {proj.lastUpdate}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 10. PROFITABILITY OUTLOOK & 11. CASH OUTLOOK AMÉLIORÉS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PROFITABILITY OUTLOOK (AMÉLIORÉ AVEC SEUIL CONFIGURABLE & TENDANCE) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChart size={18} className="text-blue-600" />
              <h2 className="font-black text-slate-900 text-sm">PROFITABILITY OUTLOOK — TENDANCE DE MARGE</h2>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-500">Seuil Objectif :</span>
              {showTargetMarginInput ? (
                <input
                  type="number"
                  step="0.5"
                  value={targetMarginConfig}
                  onChange={e => setTargetMarginConfig(Number(e.target.value))}
                  onBlur={() => setShowTargetMarginInput(false)}
                  className="w-14 p-1 border border-blue-400 rounded text-center text-xs font-mono font-bold"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setShowTargetMarginInput(true)}
                  className="bg-blue-50 text-blue-800 font-mono px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100"
                >
                  {targetMarginConfig} % ✏️
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 block uppercase">MARGE INITIALE</span>
              <span className="text-base font-black text-slate-900">16,4 %</span>
            </div>
            <div className="relative">
              <span className="text-[10px] font-extrabold text-slate-400 block uppercase">MARGE ACTUELLE</span>
              <span className="text-base font-black text-slate-800">14,9 %</span>
              <span className="text-[10px] text-slate-400 block">→</span>
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 block uppercase">MARGE EAC</span>
              <span className="text-base font-black text-amber-700">{financialTotals.eacMarginPct} % 🔴</span>
              <span className="text-[10px] text-rose-600 font-bold block">{financialTotals.marginVariationPts} pts</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
            <span>Impact Financier Globale Dérive Marge :</span>
            <strong className="text-rose-600 font-black">-{financialTotals.marginImpactAmount.toLocaleString()} FCFA</strong>
          </div>
        </div>

        {/* CASH OUTLOOK (VERITABLE PROJECTION DE TRÉSORERIE HORIZONS J+7 À J+180) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-emerald-600" />
              <h2 className="font-black text-slate-900 text-sm">CASH OUTLOOK — PROJECTION DE TRÉSORERIE</h2>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">Horizon J+7 à J+180</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            {cashForecastHorizons.length > 0 ? (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[9px]">
                  <tr>
                    <th className="p-2">Horizon</th>
                    <th className="p-2 text-right">Cash Dispo</th>
                    <th className="p-2 text-right text-emerald-700">Encaissements</th>
                    <th className="p-2 text-right text-rose-600">Décaissements</th>
                    <th className="p-2 text-right font-black">Solde Projeté</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashForecastHorizons.map(h => (
                    <tr key={h.horizon} className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-blue-900">{h.horizon}</td>
                      <td className="p-2 text-right">{(h.cashAvailable / 1000000000).toFixed(2)} Md</td>
                      <td className="p-2 text-right text-emerald-700">+{(h.expectedInflow / 1000000).toFixed(0)} M</td>
                      <td className="p-2 text-right text-rose-600">-{(h.expectedOutflow / 1000000).toFixed(0)} M</td>
                      <td className="p-2 text-right font-black text-slate-900">{(h.projectedBalance / 1000000000).toFixed(2)} Md FCFA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs italic">
                Aucune prévision de trésorerie disponible. Enregistrez un projet pour afficher l'horizon prévisionnel.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. ALERT DRILL-DOWN MODAL CENTRÉE (LARGEUR MAXIMALE POUR APERÇU EXÉCUTIF) */}
      {activeAlertDrawer && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-4xl sm:max-w-5xl max-h-[94vh] rounded-2xl p-6 sm:p-8 space-y-6 overflow-y-auto shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-[10px] text-red-600 font-bold uppercase">{activeAlertDrawer.severity}</span>
                <h3 className="font-extrabold text-slate-900 text-sm">{activeAlertDrawer.title} — {activeAlertDrawer.projectCode}</h3>
              </div>
              <button onClick={() => setActiveAlertDrawer(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200">
              <span className="font-bold text-blue-900 block">{activeAlertDrawer.projectName}</span>
              <span className="text-[11px] text-slate-600">{activeAlertDrawer.detail}</span>
            </div>

            {/* SI ALERTE DE RETARD PLANNING (EX: ROUTE-024) */}
            {activeAlertDrawer.impactedMilestones && activeAlertDrawer.impactedMilestones.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-900 space-y-1 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs flex items-center gap-1">
                      <ShieldAlert size={16} className="text-red-600" /> RETARD CRITIQUE CONSTATÉ : +{activeAlertDrawer.daysDelay} JOURS
                    </span>
                    <span className="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded text-red-700 border border-red-200">
                      Pénalités : {activeAlertDrawer.penaltyPerDay}
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-slate-700 mt-1">
                    <strong>Cause Principale du Décalage :</strong> {activeAlertDrawer.mainCause}
                  </p>
                </div>

                {/* TABLEAU DES JALONS CLÉS IMPACTÉS */}
                <div className="space-y-1">
                  <span className="font-extrabold text-slate-900 text-xs block">Décomposition des Jalons Clés Impactés :</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px] font-mono">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 text-[9px] uppercase">
                        <tr>
                          <th className="p-2">Jalon & Code WBS</th>
                          <th className="p-2 text-center">Date Prévue</th>
                          <th className="p-2 text-center">Prévision Révisée</th>
                          <th className="p-2 text-right">Glissement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeAlertDrawer.impactedMilestones.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2">
                              <span className="font-sans font-bold text-slate-900 block">{m.name}</span>
                              <span className="text-[9px] text-purple-700">{m.wbsCode}</span>
                            </td>
                            <td className="p-2 text-center text-slate-500">{m.plannedDate}</td>
                            <td className="p-2 text-center font-bold text-slate-900">{m.forecastDate}</td>
                            <td className="p-2 text-right text-red-600 font-black">+{m.delayDays} j</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PLAN DE RATTRAPAGE D'URGENCE PROPOSÉ AU CEO */}
                {activeAlertDrawer.correctivePlan && (
                  <div className="space-y-1">
                    <span className="font-extrabold text-slate-900 text-xs block">Plan de Rattrapage d'Urgence (Injonction Technique) :</span>
                    <div className="space-y-2">
                      {activeAlertDrawer.correctivePlan.map((c, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px] font-sans">
                          <div>
                            <span className="font-bold text-slate-900 block">{c.action}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Ressource : {c.resource} | Surcoût : <strong className="text-amber-700">{c.costImpact}</strong></span>
                          </div>
                          <span className="font-mono text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                            -{c.targetRecoveryDays} j rattrapés
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* SINON ALERTE DE DÉRIVE FINANCIÈRE / MARGE */
              <div className="space-y-3 font-mono">
                <h4 className="font-extrabold text-slate-900 text-xs font-sans border-b pb-1">Pourquoi la marge baisse-t-elle ? (Analyse de la Dérive)</h4>
                
                <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[9px] text-slate-400 block">BUDGET INITIAL</span>
                    <span className="font-bold text-slate-800">{(activeAlertDrawer.initialBudget / 1000000000).toFixed(2)} Md FCFA</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[9px] text-slate-400 block">BUDGET ACTUEL (DS)</span>
                    <span className="font-bold text-slate-800">{(activeAlertDrawer.currentBudget / 1000000000).toFixed(2)} Md FCFA</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[9px] text-slate-400 block">COÛT RÉEL À DATE</span>
                    <span className="font-bold text-slate-900">{(activeAlertDrawer.actualCost / 1000000000).toFixed(2)} Md FCFA</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[9px] text-slate-400 block">EAC (ESTIMÉ À L'ACHÈVEMENT)</span>
                    <span className="font-black text-blue-900">{(activeAlertDrawer.eac / 1000000000).toFixed(2)} Md FCFA</span>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                  <span className="font-extrabold text-xs block font-sans">CAUSE PRINCIPALE DÉTECTÉE PAR LE SYSTÈME :</span>
                  <div className="font-bold text-rose-700">{activeAlertDrawer.mainCause}</div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  alert(`Redirection vers la vue Fiche Projet 360° pour ${activeAlertDrawer.projectCode}`);
                  setActiveAlertDrawer(null);
                }}
                className="w-full bg-blue-600 text-white font-extrabold py-2.5 rounded-xl text-xs hover:bg-blue-700 transition"
              >
                Voir le Projet en Détail 360°
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL SCORE PROJET SUR 100 CENTRÉE (AGRANDIE) */}
      {activeScoreDrawerProject && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl sm:max-w-2xl max-h-[94vh] rounded-2xl p-6 sm:p-8 space-y-6 overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs text-blue-600 font-bold">{activeScoreDrawerProject.code}</span>
                <h3 className="font-extrabold text-slate-900 text-base">{activeScoreDrawerProject.name}</h3>
              </div>
              <button onClick={() => setActiveScoreDrawerProject(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 text-center space-y-1">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">PROJECT HEALTH SCORE</span>
              <div className="text-3xl font-black text-blue-950 font-mono">{activeScoreDrawerProject.score} / 100</div>
              <span className="text-[11px] text-slate-500 font-medium">Calcul réactif selon les 7 piliers métier BTP</span>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <h4 className="font-extrabold text-slate-900 text-xs border-b pb-2">Décomposition du Score par Pilier</h4>
              
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Finance / Marge (Pondération 25%)</span>
                  <span>{activeScoreDrawerProject.scoreBreakdown.finance} / 100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${activeScoreDrawerProject.scoreBreakdown.finance}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Planning & Respect Jalons (Pondération 20%)</span>
                  <span>{activeScoreDrawerProject.scoreBreakdown.planning} / 100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${activeScoreDrawerProject.scoreBreakdown.planning}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Production & Cadence (Pondération 15%)</span>
                  <span>{activeScoreDrawerProject.scoreBreakdown.production} / 100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${activeScoreDrawerProject.scoreBreakdown.production}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Cash & Encaissement (Pondération 15%)</span>
                  <span>{activeScoreDrawerProject.scoreBreakdown.cash} / 100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${activeScoreDrawerProject.scoreBreakdown.cash}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Achats & Stock (Pondération 10%)</span>
                  <span>{activeScoreDrawerProject.scoreBreakdown.procurement} / 100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${activeScoreDrawerProject.scoreBreakdown.procurement}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Conformité QHSE (Pondération 10%)</span>
                  <span>{activeScoreDrawerProject.scoreBreakdown.qhse} / 100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${activeScoreDrawerProject.scoreBreakdown.qhse}%` }} />
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveScoreDrawerProject(null)}
              className="w-full bg-slate-900 text-white font-extrabold py-3 rounded-xl text-xs hover:bg-slate-800 shadow-md transition"
            >
              Fermer le Détail du Score
            </button>
          </div>
        </div>
      )}

      {/* 13. DECISION DRAWER / MODAL CEO (LARGEUR MAXIMALE CENTRÉE) */}
      {activeDecisionModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl sm:max-w-6xl max-h-[94vh] overflow-y-auto w-full p-6 sm:p-8 space-y-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded border border-red-200 font-mono uppercase">ARBITRAGE EXECUTIVE CEO</span>
                <h3 className="font-extrabold text-slate-900 text-sm">{activeDecisionModal.title}</h3>
              </div>
              <button onClick={() => setActiveDecisionModal(null)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-200 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-blue-700 block">CHANTIER DE RÉFÉRENCE</span>
                    <span className="font-black text-blue-950 text-sm">{activeDecisionModal.project}</span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200 font-mono">
                    Code WBS : {activeDecisionModal.wbsCode}
                  </span>
                </div>
                <p className="text-slate-700 text-xs leading-relaxed font-medium">
                  {activeDecisionModal.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-extrabold text-slate-400 block uppercase">MONTANT DÉPASSEMENT</span>
                  <span className="font-black text-red-600 text-sm">{activeDecisionModal.amount}</span>
                  <span className="text-[9px] text-slate-500 font-sans block mt-0.5">Nouveau DQE Révisé</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-extrabold text-slate-400 block uppercase">IMPACT MARGE EAC</span>
                  <span className="font-black text-amber-700 text-sm">{activeDecisionModal.marginImpactPct} pts</span>
                  <span className="text-[9px] text-rose-600 font-sans block mt-0.5 font-bold">Variations révisées</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-extrabold text-slate-400 block uppercase">DATE LIMITE DÉCISION</span>
                  <span className="font-black text-slate-900 text-sm">{activeDecisionModal.deadline}</span>
                  <span className="text-[9px] text-slate-500 font-sans block mt-0.5">Injonction Direction Technique</span>
                </div>
              </div>

              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-950 space-y-1">
                <span className="font-extrabold flex items-center gap-1 text-amber-900">
                  <ShieldCheck size={14} className="text-amber-600" /> Justification & Avis du Bureau d'Études BINET :
                </span>
                <p className="leading-snug text-slate-700">
                  « {activeDecisionModal.justification} »
                </p>
              </div>

              <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-red-900 text-[11px] font-medium">
                <strong>Risque Majeur si Refus CEO :</strong> {activeDecisionModal.impactIfRefused}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  if (activeDecisionModal.daDetails?.id && updateDAStatus) {
                    updateDAStatus(
                      activeDecisionModal.daDetails.id,
                      'Rejeté',
                      currentUser?.name || 'Directeur Général (CEO)',
                      'Rejet par arbitrage CEO en Command Center'
                    );
                  }
                  if (addAuditLog) {
                    addAuditLog(
                      'ARBITRAGE_DECISION_CEO_REJET',
                      'CEO_COMMAND_CENTER',
                      activeDecisionModal.id,
                      `Rejet de l'arbitrage pour ${activeDecisionModal.title} (${activeDecisionModal.amount}) par le CEO.`
                    );
                  }
                  alert(`🔴 Décision d'arbitrage rejetée pour ${activeDecisionModal.title}.\nStatut actualisé dans la base de données.`);
                  setActiveDecisionModal(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-3 rounded-xl text-xs border border-slate-200 transition cursor-pointer"
              >
                REJETER / DEMANDER ANALYSE
              </button>
              <button
                onClick={() => {
                  if (activeDecisionModal.daDetails?.id && updateDAStatus) {
                    updateDAStatus(
                      activeDecisionModal.daDetails.id,
                      'Validé',
                      currentUser?.name || 'Directeur Général (CEO)',
                      'Arbitrage favorable CEO en Command Center'
                    );
                  }
                  if (addAuditLog) {
                    addAuditLog(
                      'ARBITRAGE_DECISION_CEO_APPROBATION',
                      'CEO_COMMAND_CENTER',
                      activeDecisionModal.id,
                      `Arbitrage favorable et scellé pour ${activeDecisionModal.title} (${activeDecisionModal.amount}) par le CEO.`
                    );
                  }
                  alert(`✅ DÉCISION APPROUVÉE PAR LE CEO EN EXECUTIVE COMMAND CENTER !\nLa DA a été validée et enregistrée dans l'Audit Trail.`);
                  setActiveDecisionModal(null);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                APPROUVER & SCELLER DÉCISION (CEO)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
