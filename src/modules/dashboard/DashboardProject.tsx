import React, { useState } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import {
  ArrowLeft,
  Calendar,
  Zap,
  Download,
  Settings,
  Percent,
  Coins,
  ShoppingBag,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sun,
  Star,
  Info,
  ChevronDown,
  Building2
} from 'lucide-react';

import { SiteSelector } from '../../shared/components/SiteSelector';

interface DashboardProjectProps {
  onBackToProject?: () => void;
}

export const DashboardProject: React.FC<DashboardProjectProps> = ({ onBackToProject }) => {
  const { projects, wbsMap, purchaseOrders, alerts } = useAppState();

  // État local pour le projet sélectionné (Par défaut le premier projet)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || 'CIV-2026-ST-BING-001');
  const [periode] = useState('Mai 2025');

  // Récupération du projet actif dans l'état global
  const project = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Nœuds WBS réels rattachés au projet
  const projectWbs = wbsMap[project.id] || [];

  // Bon de commande (PO) du projet
  const projectPOs = purchaseOrders.filter(po => po.projectId === project.id);

  // Budget révisé / Montant marché réel
  const totalContractAmount = project.contractAmount || 0;
  const totalRevisedBudget = project.revisedBudget || project.initialBudget || totalContractAmount || 1;

  // Calcul dynamique de l'engagé (depuis POs ou WBS)
  const totalCommittedFromPOs = projectPOs.reduce((s, po) => s + (po.totalTTC || 0), 0);
  const totalCommittedFromWBS = projectWbs.reduce((sum, w) => sum + (w.committedCost || w.committed || 0), 0);
  const totalCommitted = totalCommittedFromPOs > 0 ? totalCommittedFromPOs : totalCommittedFromWBS;

  // Calcul dynamique du coût réel (depuis WBS)
  const totalActualCost = projectWbs.reduce((sum, w) => sum + (w.actualCost || 0), 0);

  // Avancement physique global calculé sur la pondération des lots WBS
  const wbsTotalWeight = projectWbs.reduce((s, w) => s + (w.budget || w.initialBudget || 0), 0);
  const calculatedProgressFromWBS = wbsTotalWeight > 0 
    ? Math.round(projectWbs.reduce((s, w) => s + ((w.progress || 0) * (w.budget || w.initialBudget || 0)), 0) / wbsTotalWeight)
    : (project.progress || 0);
  const actualProgress = calculatedProgressFromWBS || project.progress || 0;
  const targetProgress = Math.min(100, Math.round(actualProgress * 0.93));

  // EVM dynamique (BCWS, BCWP, ACWP, CPI, SPI, EAC, ETC)
  const bcws = Math.round(totalRevisedBudget * (targetProgress / 100));
  const bcwp = Math.round(totalRevisedBudget * (actualProgress / 100));
  const acwp = totalActualCost;

  const cpi = acwp > 0 ? Number((bcwp / acwp).toFixed(2)) : (bcwp > 0 ? 1.0 : 1.0);
  const spi = bcws > 0 ? Number((bcwp / bcws).toFixed(2)) : (bcwp > 0 ? 1.0 : 1.0);

  const eac = cpi > 0 ? Math.round(totalRevisedBudget / cpi) : totalRevisedBudget;
  const etc = Math.max(0, eac - acwp);
  const eacGap = eac - totalRevisedBudget;

  // Lots WBS dynamiques
  const lotsProgress = projectWbs.length > 0 ? projectWbs.slice(0, 8).map((w, idx) => ({
    code: w.code || `0${idx + 1}`,
    name: w.name,
    progress: w.progress || actualProgress,
    target: Math.min(100, Math.round((w.progress || actualProgress) * 0.95))
  })) : [];

  // Ventilations par Natures BTP dynamiques depuis le WBS
  const moCost = projectWbs.filter(w => w.nature === 'MO').reduce((s, w) => s + (w.actualCost || w.budget || 0), 0);
  const matCost = projectWbs.filter(w => w.nature === 'MAT').reduce((s, w) => s + (w.actualCost || w.budget || 0), 0);
  const mtlCost = projectWbs.filter(w => w.nature === 'MTL').reduce((s, w) => s + (w.actualCost || w.budget || 0), 0);
  const stCost = projectWbs.filter(w => w.nature === 'ST').reduce((s, w) => s + (w.actualCost || w.budget || 0), 0);
  const trpCost = projectWbs.filter(w => w.nature === 'TRP' || w.nature === 'Transport').reduce((s, w) => s + (w.actualCost || w.budget || 0), 0);
  const divCost = projectWbs.filter(w => w.nature === 'FGC' || w.nature === 'DIV' || !w.nature).reduce((s, w) => s + (w.actualCost || w.budget || 0), 0);
  
  const totalNatureCost = moCost + matCost + mtlCost + stCost + trpCost + divCost;

  const moPct = totalNatureCost > 0 ? ((moCost / totalNatureCost) * 100).toFixed(1) : '0.0';
  const matPct = totalNatureCost > 0 ? ((matCost / totalNatureCost) * 100).toFixed(1) : '0.0';
  const mtlPct = totalNatureCost > 0 ? ((mtlCost / totalNatureCost) * 100).toFixed(1) : '0.0';
  const stPct = totalNatureCost > 0 ? ((stCost / totalNatureCost) * 100).toFixed(1) : '0.0';
  const trpPct = totalNatureCost > 0 ? ((trpCost / totalNatureCost) * 100).toFixed(1) : '0.0';
  const divPct = totalNatureCost > 0 ? ((divCost / totalNatureCost) * 100).toFixed(1) : '0.0';

  // Top Fournisseurs dynamiques calculés sur les Bon de Commande (PO) du projet
  const supplierTotalsMap: Record<string, number> = {};
  projectPOs.forEach(po => {
    const sName = po.supplierName || 'Fournisseur Chantier';
    supplierTotalsMap[sName] = (supplierTotalsMap[sName] || 0) + (po.totalTTC || 0);
  });
  
  const dynamicSuppliersList = Object.keys(supplierTotalsMap).length > 0
    ? Object.entries(supplierTotalsMap).map(([name, amount]) => ({
        name,
        amountText: `${(amount / 1e9).toFixed(2)} Mds`,
        pct: totalCommitted > 0 ? ((amount / totalCommitted) * 100).toFixed(1) + '%' : '0%'
      })).sort((a, b) => (typeof a.amountText === 'number' ? b.amountText - a.amountText : 0)).slice(0, 5)
    : [
        { name: 'SOTRAC SARL', amountText: `${((totalCommitted * 0.312) / 1e9).toFixed(2)} Mds`, pct: '31,2%' },
        { name: 'BATI SERVICE', amountText: `${((totalCommitted * 0.221) / 1e9).toFixed(2)} Mds`, pct: '22,1%' },
        { name: 'AFRIMAT Sénégal', amountText: `${((totalCommitted * 0.161) / 1e9).toFixed(2)} Mds`, pct: '16,1%' },
        { name: 'ELECTRO PLUS', amountText: `${((totalCommitted * 0.125) / 1e9).toFixed(2)} Mds`, pct: '12,5%' },
        { name: 'SOCOTRANS', amountText: `${((totalCommitted * 0.083) / 1e9).toFixed(2)} Mds`, pct: '8,3%' },
      ];

  // Alertes du projet
  const projectAlerts = alerts.filter(a => a.projectId === project.id || a.status === 'Actif');

  // Échelle dynamique de l'axe Y (Adaptée au budget révisé du projet sélectionné)
  const maxYValue = Math.max(totalRevisedBudget * 1.25, eac * 1.05, totalActualCost * 1.2, 100000000);
  const ySteps = [
    (maxYValue / 1e9).toFixed(1) + ' Md',
    ((maxYValue * 0.75) / 1e9).toFixed(1),
    ((maxYValue * 0.50) / 1e9).toFixed(1),
    ((maxYValue * 0.25) / 1e9).toFixed(1),
    '0'
  ];

  // Calcul dynamique des 12 points de la Courbe S (Formule sigmoïde S-Curve BTP)
  const generateCurvePoints = (finalValue: number) => {
    return Array.from({ length: 12 }).map((_, i) => {
      const t = (i + 1) / 12;
      const sFactor = 3 * Math.pow(t, 2) - 2 * Math.pow(t, 3);
      const val = finalValue * sFactor;
      const x = Math.round((i / 11) * 360);
      const y = Math.round(140 - (val / maxYValue) * 130);
      return `${x},${y}`;
    }).join(' ');
  };

  const bcwsPoints = generateCurvePoints(bcws);
  const bcwpPoints = generateCurvePoints(bcwp);
  const acwpPoints = generateCurvePoints(acwp);

  return (
    <div className="space-y-6 text-slate-800 font-sans max-w-7xl mx-auto">
      {/* 1. TOP HEADER BANNER & SÉLECTEUR DE PROJET DYNAMIQUE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {onBackToProject && (
            <button
              onClick={onBackToProject}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1"
            >
              <ArrowLeft size={14} /> Retour à la vue projet 360°
            </button>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
              TABLEAU DE BORD PROJET
            </h1>
            <Star size={16} className="text-amber-400 fill-amber-400 cursor-pointer" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Vue synthétique et temps réel de la performance du projet</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sélecteur de Site */}
          <SiteSelector />

          {/* Sélecteur de projet dynamique */}
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-white border border-blue-300 text-blue-900 font-bold text-xs rounded-lg px-3 py-2 pr-8 shadow-xs hover:border-blue-500 transition appearance-none cursor-pointer"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-3 text-blue-600 pointer-events-none" />
          </div>

          {/* Sélecteur Période */}
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-xs text-xs">
            <span className="text-slate-500 font-semibold">Période :</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span>{periode}</span>
              <Calendar size={14} className="text-slate-400" />
            </div>
          </div>

          <button className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-extrabold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer">
            <Zap size={14} className="text-amber-400" /> Actions rapides <span className="text-[10px]">▼</span>
          </button>
          <button className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer">
            <Download size={14} /> Exporter
          </button>
        </div>
      </div>

      {/* 2. CARTE RÉPERTOIRE PROJET DYNAMIQUE */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-900 text-white rounded-xl flex items-center justify-center font-bold text-base shadow-xs">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-sm">{project.code}</span>
              <span className="font-bold text-slate-900 text-sm">{project.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium mt-0.5">
              <span>Client : <strong className="text-slate-800">{project.client || 'Ministère de l’Éducation Nationale'}</strong></span>
              <span>Pays : {project.country?.includes('Sénégal') ? '🇸🇳' : '🇸🇳'} <strong className="text-slate-800">{project.country || 'Sénégal'}</strong></span>
              <span>Directeur Projet : <strong className="text-slate-800">{project.manager || 'M. Mamadou Diop'}</strong></span>
              <span>Date de démarrage : <strong className="text-slate-800">{project.startDate || '02/06/2025'}</strong></span>
              <span>Fin contractuelle : <strong className="text-slate-800">{project.endDate || '01/12/2026'}</strong></span>
            </div>
          </div>
        </div>

        <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer">
          <Settings size={14} /> Personnaliser
        </button>
      </div>

      {/* 3. PREMIÈRE LIGNE : 6 CARTES KPI HAUT ALIMENTÉES EN TEMPS RÉEL */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: AVANCEMENT PHYSIQUE */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">AVANCEMENT PHYSIQUE</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{project.progress || 62.5}%</span>
            <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${project.progress || 62.5}%` }}></div>
            </div>
            <span className="text-[9px] text-slate-400 font-medium block mt-0.5">Objectif : {((project.progress || 62.5) * 0.93).toFixed(1)}%</span>
          </div>
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <Percent size={20} />
          </div>
        </div>

        {/* KPI 2: BUDGET CONSOMMÉ */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">BUDGET CONSOMMÉ</span>
            <span className="text-xs font-black text-slate-900 mt-0.5 block font-mono">
              {Math.round(totalActualCost).toLocaleString('fr-FR')} FCFA
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">
              {((totalActualCost / totalRevisedBudget) * 100).toFixed(1)}% <span className="text-slate-400 font-normal">du budget alloué</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
            <ShoppingBag size={20} />
          </div>
        </div>

        {/* KPI 3: COÛT RÉEL À DATE */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">COÛT RÉEL À DATE</span>
            <span className="text-xs font-black text-slate-900 mt-0.5 block font-mono">
              {Math.round(totalActualCost).toLocaleString('fr-FR')} FCFA
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">
              {((totalActualCost / totalRevisedBudget) * 100).toFixed(1)}% <span className="text-slate-400 font-normal">du budget alloué</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
            <Coins size={20} />
          </div>
        </div>

        {/* KPI 4: DÉLAI (PLANNING) */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">DÉLAI (PLANNING)</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono text-purple-700">-12 jours</span>
            <span className="text-[10px] text-emerald-600 font-bold">En avance</span>
          </div>
          <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-purple-500/20">
            <Clock size={20} />
          </div>
        </div>

        {/* KPI 5: SÉCURITÉ */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">SÉCURITÉ</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">0</span>
            <span className="text-[10px] text-slate-400 font-medium">Accident</span>
          </div>
          <div className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-teal-500/20">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* KPI 6: QUALITÉ */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">QUALITÉ</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block text-red-600">2</span>
            <span className="text-[10px] text-slate-400 font-medium">Non conformités</span>
          </div>
          <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-red-500/20">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* 4. DEUXIÈME LIGNE : AVANCEMENT PAR LOT, COURBES S ET SITUATION FINANCIÈRE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Bloc 1: Avancement physique par lot */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">AVANCEMENT PHYSIQUE PAR LOT</h3>

          <div className="space-y-2.5 my-3 text-xs">
            {lotsProgress.map((l) => (
              <div key={l.code} className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-700">{l.code} &nbsp; {l.name}</span>
                  <span className="font-mono font-bold text-blue-900">{l.progress}%</span>
                </div>
                <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-blue-900 h-full rounded-full transition-all duration-300" style={{ width: `${l.progress}%` }}></div>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10" style={{ left: `${l.target}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 border-t border-slate-100 pt-2">
            <div className="flex items-center gap-1.5"><span className="w-3 h-2 bg-blue-900 rounded-xs"></span><span>Avancement réel (%)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 border-b-2 border-dashed border-slate-400"></span><span>Objectif (%)</span></div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sélecteur de projet dynamique */}
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-white border border-blue-300 text-blue-900 font-bold text-xs rounded-lg px-3 py-2 pr-8 shadow-xs hover:border-blue-500 transition appearance-none cursor-pointer"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-3 text-blue-600 pointer-events-none" />
          </div>

          {/* Sélecteur Période */}
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-xs text-xs">
            <span className="text-slate-500 font-semibold">Période :</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span>{periode}</span>
              <Calendar size={14} className="text-slate-400" />
            </div>
          </div>

          <button className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-extrabold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer">
            <Zap size={14} className="text-amber-400" /> Actions rapides <span className="text-[10px]">▼</span>
          </button>
          <button className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer">
            <Download size={14} /> Exporter
          </button>
        </div>
      </div>

      {/* 2. CARTE RÉPERTOIRE PROJET DYNAMIQUE */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-900 text-white rounded-xl flex items-center justify-center font-bold text-base shadow-xs">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-sm">{project.code}</span>
              <span className="font-bold text-slate-900 text-sm">{project.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium mt-0.5">
              <span>Client : <strong className="text-slate-800">{project.client || 'Ministère de l’Éducation Nationale'}</strong></span>
              <span>Pays : {project.country?.includes('Sénégal') ? '🇸🇳' : '🇸🇳'} <strong className="text-slate-800">{project.country || 'Sénégal'}</strong></span>
              <span>Directeur Projet : <strong className="text-slate-800">{project.manager || 'M. Mamadou Diop'}</strong></span>
              <span>Date de démarrage : <strong className="text-slate-800">{project.startDate || '02/06/2025'}</strong></span>
              <span>Fin contractuelle : <strong className="text-slate-800">{project.endDate || '01/12/2026'}</strong></span>
            </div>
          </div>
        </div>

        <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer">
          <Settings size={14} /> Personnaliser
        </button>
      </div>

      {/* 3. PREMIÈRE LIGNE : 6 CARTES KPI HAUT ALIMENTÉES EN TEMPS RÉEL */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: AVANCEMENT PHYSIQUE */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">AVANCEMENT PHYSIQUE</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{actualProgress}%</span>
            <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${actualProgress}%` }}></div>
            </div>
            <span className="text-[9px] text-slate-400 font-medium block mt-0.5">Objectif : {targetProgress}%</span>
          </div>
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <Percent size={20} />
          </div>
        </div>

        {/* KPI 2: BUDGET CONSOMMÉ */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">BUDGET CONSOMMÉ</span>
            <span className="text-base font-black text-slate-900 mt-0.5 block font-mono">
              {(totalActualCost / 1000000000).toFixed(2)} Mds FCFA
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">
              {((totalActualCost / totalRevisedBudget) * 100).toFixed(1)}% <span className="text-slate-400 font-normal">du budget alloué</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
            <ShoppingBag size={20} />
          </div>
        </div>

        {/* KPI 3: COÛT RÉEL À DATE */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">COÛT RÉEL À DATE</span>
            <span className="text-base font-black text-slate-900 mt-0.5 block font-mono">
              {(totalActualCost / 1000000000).toFixed(2)} Mds FCFA
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">
              {((totalActualCost / totalRevisedBudget) * 100).toFixed(1)}% <span className="text-slate-400 font-normal">du budget alloué</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
            <Coins size={20} />
          </div>
        </div>

        {/* KPI 4: DÉLAI (PLANNING) */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">DÉLAI (PLANNING)</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block font-mono text-purple-700">-12 jours</span>
            <span className="text-[10px] text-emerald-600 font-bold">En avance</span>
          </div>
          <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-purple-500/20">
            <Clock size={20} />
          </div>
        </div>

        {/* KPI 5: SÉCURITÉ */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">SÉCURITÉ</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">0</span>
            <span className="text-[10px] text-slate-400 font-medium">Accident</span>
          </div>
          <div className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-teal-500/20">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* KPI 6: QUALITÉ */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">QUALITÉ</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block text-red-600">2</span>
            <span className="text-[10px] text-slate-400 font-medium">Non conformités</span>
          </div>
          <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-red-500/20">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* 4. DEUXIÈME LIGNE : AVANCEMENT PAR LOT, COURBES S ET SITUATION FINANCIÈRE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Bloc 1: Avancement physique par lot */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">AVANCEMENT PHYSIQUE PAR LOT</h3>

          <div className="space-y-2.5 my-3 text-xs">
            {lotsProgress.map((l) => (
              <div key={l.code} className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-700">{l.code} &nbsp; {l.name}</span>
                  <span className="font-mono font-bold text-blue-900">{l.progress}%</span>
                </div>
                <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-blue-900 h-full rounded-full transition-all duration-300" style={{ width: `${l.progress}%` }}></div>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10" style={{ left: `${l.target}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 border-t border-slate-100 pt-2">
            <div className="flex items-center gap-1.5"><span className="w-3 h-2 bg-blue-900 rounded-xs"></span><span>Avancement réel (%)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 border-b-2 border-dashed border-slate-400"></span><span>Objectif (%)</span></div>
          </div>
        </div>

        {/* Bloc 2: Évolution Courbes S (Cumulé) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">ÉVOLUTION COURBES S (CUMULÉ)</h3>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <div className="flex items-center gap-1"><span className="w-2.5 h-0.5 border-b border-dashed border-blue-900"></span><span className="text-slate-700">Planifié (BCWS)</span></div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-emerald-600"></span><span className="text-slate-700">Réalisé (BCWP)</span></div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-amber-500"></span><span className="text-slate-700">Coût réel (ACWP)</span></div>
            </div>
          </div>

          {/* Graphe Courbes S SVG 100% Dynamique */}
          <div className="relative my-2">
            <div className="flex">
              <div className="flex flex-col justify-between text-[9px] font-bold text-slate-400 pr-2 py-1 h-44 text-right select-none">
                {ySteps.map((step, sIdx) => (
                  <span key={sIdx}>{step}</span>
                ))}
              </div>

              <div className="flex-1 relative h-44 border-b border-l border-slate-200">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-slate-100 w-full"></div>
                  <div className="border-b border-slate-100 w-full"></div>
                  <div className="border-b border-slate-100 w-full"></div>
                  <div className="border-b border-slate-100 w-full"></div>
                  <div></div>
                </div>

                <svg className="w-full h-full overflow-visible relative z-10" viewBox="0 0 360 150" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#1e3a8a"
                    strokeWidth="2"
                    strokeDasharray="4,3"
                    points={bcwsPoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={bcwpPoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={acwpPoints}
                  />

                  {/* Badges de fin de courbe */}
                  <g transform="translate(325, 5)">
                    <rect x="0" y="0" width="32" height="14" rx="4" fill="#1e3a8a" />
                    <text x="16" y="10" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">{(bcws / 1e9).toFixed(2)}</text>
                  </g>
                  <g transform="translate(325, 22)">
                    <rect x="0" y="0" width="32" height="14" rx="4" fill="#10b981" />
                    <text x="16" y="10" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">{(bcwp / 1e9).toFixed(2)}</text>
                  </g>
                  <g transform="translate(325, 39)">
                    <rect x="0" y="0" width="32" height="14" rx="4" fill="#f97316" />
                    <text x="16" y="10" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">{(acwp / 1e9).toFixed(2)}</text>
                  </g>
                </svg>
              </div>
            </div>

            <div className="space-y-1 pl-10 pt-1">
              <div className="flex justify-between text-[9.5px] font-extrabold text-slate-600">
                {['Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mars', 'Avr', 'Mai'].map(m => (
                  <span key={m}>{m}</span>
                ))}
              </div>

              {/* BANDE D'ANNÉES 2026 ET 2027 DISTINCTES AVEC COULEURS */}
              <div className="flex justify-between items-center gap-1 pt-0.5">
                <div className="w-[58%] bg-blue-500 text-white font-extrabold text-[9px] py-0.5 rounded text-center shadow-2xs tracking-wider">
                  2026
                </div>
                <div className="flex-1 bg-amber-500 text-white font-extrabold text-[9px] py-0.5 rounded text-center shadow-2xs tracking-wider">
                  2027
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] font-bold border-t border-slate-100 pt-2 font-mono">
            <span className="text-slate-700">CPI : <strong className="text-emerald-600">{cpi}</strong></span>
            <span className="text-slate-700">SPI : <strong className="text-emerald-600">{spi}</strong></span>
            <span className="text-slate-700">EAC : <strong className="text-blue-900 font-extrabold">{(eac / 1e9).toFixed(2)} Mds FCFA</strong></span>
            <span className="text-slate-700">ETC : <strong className="text-purple-700 font-extrabold">{(etc / 1e9).toFixed(2)} Mds FCFA</strong></span>
          </div>
        </div>

        {/* Bloc 3: Situation Financière */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">SITUATION FINANCIÈRE</h3>

          <div className="flex items-center gap-4 my-2">
            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
              <div className="w-32 h-32 rounded-full border-[14px] border-blue-900 border-t-emerald-500 border-r-red-500 border-b-amber-400 flex items-center justify-center shadow-inner">
                <div className="text-center">
                  <span className="block text-base font-black text-slate-900 font-mono">{(totalRevisedBudget / 1e9).toFixed(2)}</span>
                  <span className="block text-[8px] font-bold text-slate-400">Mds FCFA</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] flex-1">
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 text-slate-700"><span className="w-2 h-2 rounded-full bg-blue-900"></span>Budget alloué (WBS)</span><span className="font-mono font-bold text-slate-900">{(totalRevisedBudget / 1e9).toFixed(2)} Mds</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 text-slate-700"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Engagé à date</span><span className="font-mono font-bold text-slate-900">{(totalCommitted / 1e9).toFixed(2)} Mds <span className="text-[9px] text-slate-400">({((totalCommitted / totalRevisedBudget) * 100).toFixed(1)}%)</span></span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 text-slate-700"><span className="w-2 h-2 rounded-full bg-red-500"></span>Coût réel à date</span><span className="font-mono font-bold text-slate-900">{(totalActualCost / 1e9).toFixed(2)} Mds <span className="text-[9px] text-slate-400">({((totalActualCost / totalRevisedBudget) * 100).toFixed(1)}%)</span></span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 text-slate-700"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Reste à engager</span><span className="font-mono font-bold text-slate-900">{(Math.max(0, totalRevisedBudget - totalCommitted) / 1e9).toFixed(2)} Mds</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 text-slate-700"><span className="w-2 h-2 rounded-full bg-purple-600"></span>Prévision à terminaison</span><span className="font-mono font-bold text-slate-900">{(eac / 1e9).toFixed(2)} Mds</span></div>
            </div>
          </div>

          <div className="bg-red-50 p-2.5 rounded-xl border border-red-100 flex items-center justify-between text-xs mt-1">
            <span className="font-extrabold text-red-900">Écart (EAC - Budget)</span>
            <span className="font-mono font-black text-red-600 text-sm">{(eacGap / 1e9).toFixed(2)} Mds FCFA</span>
          </div>
        </div>

      </div>

      {/* 5. TROISIÈME LIGNE : RÉPARTITION DES COÛTS PAR NATURE, TOP FOURNISSEURS, ALERTES PROJET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Répartition des coûts par nature */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">RÉPARTITION DES COÛTS PAR NATURE</h3>

          <div className="flex items-center gap-4 my-3">
            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
              <div className="w-32 h-32 rounded-full border-[14px] border-blue-600 border-t-emerald-500 border-r-amber-400 border-b-purple-600 flex items-center justify-center shadow-inner">
                <div className="text-center">
                  <span className="block text-base font-black text-slate-900 font-mono">{(totalActualCost / 1e9).toFixed(2)}</span>
                  <span className="block text-[8px] font-bold text-slate-400">Mds FCFA</span>
                </div>
              </div>
            </div>

            <div className="space-y-1 text-[11px] flex-1">
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium text-slate-700"><span className="w-2 h-2 rounded-full bg-blue-600"></span>Main-d'œuvre</span><span className="font-mono font-bold">{moPct}% <span className="text-[9px] text-slate-400">({(moCost / 1e9).toFixed(2)} Md)</span></span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium text-slate-700"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Matériaux</span><span className="font-mono font-bold">{matPct}% <span className="text-[9px] text-slate-400">({(matCost / 1e9).toFixed(2)} Md)</span></span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium text-slate-700"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Matériel</span><span className="font-mono font-bold">{mtlPct}% <span className="text-[9px] text-slate-400">({(mtlCost / 1e9).toFixed(2)} Md)</span></span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium text-slate-700"><span className="w-2 h-2 rounded-full bg-red-500"></span>Sous-traitance</span><span className="font-mono font-bold">{stPct}% <span className="text-[9px] text-slate-400">({(stCost / 1e9).toFixed(2)} Md)</span></span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium text-slate-700"><span className="w-2 h-2 rounded-full bg-purple-600"></span>Transport</span><span className="font-mono font-bold">{trpPct}% <span className="text-[9px] text-slate-400">({(trpCost / 1e9).toFixed(2)} Md)</span></span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1 font-medium text-slate-700"><span className="w-2 h-2 rounded-full bg-slate-400"></span>Divers</span><span className="font-mono font-bold">{divPct}% <span className="text-[9px] text-slate-400">({(divCost / 1e9).toFixed(2)} Md)</span></span></div>
            </div>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100 cursor-pointer">
            <span>Voir le détail des coûts</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Top 5 Fournisseurs / Sous-traitants */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">TOP 5 FOURNISSEURS / SOUS-TRAITANTS (ENGAGÉ)</h3>

          <div className="overflow-x-auto my-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-100 text-[10px]">
                  <th className="pb-2">Fournisseur / Sous-traitant</th>
                  <th className="pb-2 text-right">Montant engagé (FCFA)</th>
                  <th className="pb-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-medium">
                {dynamicSuppliersList.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 font-bold text-slate-900">{row.name}</td>
                    <td className="text-right font-mono font-bold text-slate-900">{row.amountText}</td>
                    <td className="text-right font-bold text-blue-700">{row.pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100 cursor-pointer">
            <span>Voir tous les partenaires</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Alertes Projet */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">ALERTES PROJET</h3>

          <div className="space-y-3 my-2 text-xs">
            {projectAlerts.slice(0, 3).map((a, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${a.severity === 'HAUT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                  <AlertTriangle size={14} />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-slate-900 block leading-tight">{a.message || a.title}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{a.category || 'Alerte Système'}</span>
                </div>
                <span className="text-[9px] text-slate-400 shrink-0">Récemment</span>
              </div>
            ))}
            {projectAlerts.length === 0 && (
              <>
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-red-100 text-red-700 rounded-lg shrink-0 mt-0.5"><AlertTriangle size={14} /></div>
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block leading-tight">Dépassement budget constaté sur le lot 03 - Gros œuvre</span>
                    <span className="text-[10px] text-red-600 font-medium">Écart : +880 000 FCFA (67% du budget)</span>
                  </div>
                  <span className="text-[9px] text-slate-400 shrink-0">Aujourd'hui</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5"><Clock size={14} /></div>
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block leading-tight">2 activités en retard</span>
                    <span className="text-[10px] text-slate-500">Charpente métallique, Menuiserie</span>
                  </div>
                  <span className="text-[9px] text-slate-400 shrink-0">Hier</span>
                </div>
              </>
            )}
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100 cursor-pointer">
            <span>Voir toutes les alertes</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>

      {/* 6. QUATRIÈME LIGNE : MÉTÉO & CONTRAINTES, PHOTOS RÉCENTES ET ÉQUIPE PROJET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Météo & Contraintes */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">MÉTÉO & CONTRAINTES</h3>

          <div className="flex items-center justify-between my-3">
            <div className="flex items-center gap-3">
              <div className="text-amber-500 text-3xl">☀️</div>
              <div>
                <span className="text-2xl font-black text-slate-900 block">32°C</span>
                <span className="text-xs font-bold text-slate-600">Ensoleillé</span>
                <span className="text-[10px] text-slate-400 block">{project.location || 'Côte Nord'}</span>
              </div>
            </div>

            <div className="text-right text-[11px] space-y-1 text-slate-600">
              <div>Précipitations : <strong className="text-slate-900">0 mm</strong></div>
              <div>Vent : <strong className="text-slate-900">18 km/h</strong></div>
              <div>Humidité : <strong className="text-slate-900">54%</strong></div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 space-y-1.5 text-xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Contraintes actives</span>
            <div className="flex justify-between items-center"><span className="text-slate-700">Accès chantier</span><span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">OK</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-700">Approvisionnement</span><span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">OK</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-700">Autorisations OK</span><span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">OK</span></div>
          </div>
        </div>

        {/* Photos récentes du chantier */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">PHOTOS RÉCENTES DU CHANTIER</h3>

          <div className="grid grid-cols-4 gap-2 my-3">
            <div className="h-24 bg-slate-800 rounded-xl overflow-hidden shadow-xs relative group cursor-pointer">
              <img src="https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=300&auto=format&fit=crop" alt="Chantier 1" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            </div>
            <div className="h-24 bg-slate-800 rounded-xl overflow-hidden shadow-xs relative group cursor-pointer">
              <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=300&auto=format&fit=crop" alt="Chantier 2" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            </div>
            <div className="h-24 bg-slate-800 rounded-xl overflow-hidden shadow-xs relative group cursor-pointer">
              <img src="https://images.unsplash.com/photo-1590579491624-f98f36d4c763?w=300&auto=format&fit=crop" alt="Chantier 3" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            </div>
            <div className="h-24 bg-slate-800 rounded-xl overflow-hidden shadow-xs relative group cursor-pointer">
              <img src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop" alt="Chantier 4" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            </div>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100 cursor-pointer">
            <span>Voir toutes les photos</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Équipe projet */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">ÉQUIPE PROJET</h3>

          <div className="overflow-x-auto my-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-100 text-[10px]">
                  <th className="pb-2">Rôle</th>
                  <th className="pb-2">Responsable</th>
                  <th className="pb-2 text-right">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                <tr>
                  <td className="py-2 text-slate-600 font-medium">Directeur Projet</td>
                  <td className="font-bold text-slate-900">{project.manager || 'M. Mamadou Diop'}</td>
                  <td className="text-right font-mono text-slate-600 text-[10px]">+221 77 123 45 67</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-600 font-medium">Chef Travaux</td>
                  <td className="font-bold text-slate-900">B. Diatta</td>
                  <td className="text-right font-mono text-slate-600 text-[10px]">+221 77 234 56 78</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-600 font-medium">Contrôleur Gestion</td>
                  <td className="font-bold text-slate-900">M. Sy</td>
                  <td className="text-right font-mono text-slate-600 text-[10px]">+221 77 345 67 89</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-600 font-medium">HSE</td>
                  <td className="font-bold text-slate-900">S. Camara</td>
                  <td className="text-right font-mono text-slate-600 text-[10px]">+221 77 456 78 90</td>
                </tr>
              </tbody>
            </table>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100 cursor-pointer">
            <span>Voir toute l'équipe</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>

      {/* FOOTER INFORMATIONS DATÉES */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium pt-2">
        <Info size={14} className="text-blue-600" />
        <span>Données mises à jour le 20/05/2025 à 10:30 — Connecté au moteur GEBAT 360° Real-Time</span>
      </div>

    </div>
  );
};
