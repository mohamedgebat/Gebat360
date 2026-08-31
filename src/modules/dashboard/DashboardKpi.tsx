import React, { useState } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import {
  ArrowLeft,
  Calendar,
  Zap,
  Download,
  Percent,
  Coins,
  ShoppingBag,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Award,
  Users,
  HardHat,
  Truck,
  Package,
  Plus,
  Info
} from 'lucide-react';

import { SiteSelector } from '../../shared/components/SiteSelector';

interface DashboardKpiProps {
  onBackToProject?: () => void;
}

export const DashboardKpi: React.FC<DashboardKpiProps> = ({ onBackToProject }) => {
  const { projects, activeSiteId, wbsMap } = useAppState();
  const activeProject = projects.find(p => String(p.siteId) === String(activeSiteId)) || projects[0];
  const projectWbsNodes = activeProject ? (wbsMap[activeProject.id] || wbsMap[activeProject.code] || []) : [];

  const contractAmount = Number(activeProject?.contractAmount || 0);
  const revisedBudget = Number(activeProject?.revisedBudget || activeProject?.initialBudget || 0);
  const totalActualCost = projectWbsNodes.reduce((sum, n) => sum + (n.actualCost || 0), 0);
  const progressPct = Number(activeProject?.progress || 0).toFixed(1);

  const fmtMds = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0 FCFA';
    return `${Math.round(val).toLocaleString('fr-FR')} FCFA`;
  };

  const [periode] = useState('Juin 2026');
  const [comparePeriod] = useState('Mai 2026');

  return (
    <div className="space-y-6 text-slate-800 font-sans max-w-7xl mx-auto">
      {/* 1. TOP HEADER BANNER */}
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
              TABLEAU DE BORD KPI
            </h1>
            <Info size={16} className="text-slate-400" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Indicateurs clés de performance consolidés</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sélecteur de Site */}
          <SiteSelector />

          {/* Sélecteur Période */}
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-xs text-xs">
            <span className="text-slate-500 font-semibold">Période :</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span>{periode}</span>
              <Calendar size={14} className="text-slate-400" />
            </div>
          </div>

          <button className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-extrabold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs">
            <Zap size={14} className="text-amber-400" /> Actions rapides <span className="text-[10px]">▼</span>
          </button>
          <button className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Download size={14} /> Exporter
          </button>

          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-xs text-xs">
            <span className="text-slate-500 font-semibold">Comparer avec :</span>
            <span className="font-bold text-slate-900">{comparePeriod}</span>
          </div>
        </div>
      </div>

      {/* 2. CARTE RÉPERTOIRE PROJET */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-base shadow-xs">
            🏢
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-sm font-mono">{activeProject?.code || 'PRJ-001'}</span>
              <span className="font-bold text-slate-900 text-sm">{activeProject?.name || 'Aucun projet sélectionné'}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mt-0.5 flex-wrap">
              <span>Client : <strong>{activeProject?.client || '—'}</strong></span>
              <span>Pays : <strong>{activeProject?.country || "Côte d'Ivoire"}</strong></span>
              <span>Directeur Projet : <strong>{activeProject?.manager || 'SEA Alphonse'}</strong></span>
              <span>Date de démarrage : <strong>{activeProject?.startDate ? String(activeProject.startDate).substring(0, 10) : '—'}</strong></span>
              <span>Fin contractuelle : <strong>{activeProject?.endDate ? String(activeProject.endDate).substring(0, 10) : '—'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PREMIÈRE LIGNE : 6 CARTES KPI HAUT DES INDICATEURS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: AVANCEMENT PHYSIQUE */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">AVANCEMENT PHYSIQUE</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{progressPct}%</span>
            <span className="text-[9px] text-slate-400 font-medium block">Objectif : {progressPct}%</span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Conforme au WBS</span>
          </div>
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <Percent size={20} />
          </div>
        </div>

        {/* KPI 2: AVANCEMENT FINANCIER (EAC) */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">AVANCEMENT FINANCIER (EAC)</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">
              {revisedBudget > 0 ? ((totalActualCost / revisedBudget) * 100).toFixed(1) : '0.0'}%
            </span>
            <span className="text-[9px] text-slate-400 font-medium block">Budget Révisé</span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Suivi MySQL</span>
          </div>
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
            <ShoppingBag size={20} />
          </div>
        </div>

        {/* KPI 3: COÛT RÉEL À DATE */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">COÛT RÉEL À DATE</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">{fmtMds(totalActualCost)}</span>
            <span className="text-[9px] text-slate-400 font-medium block">Budget : {fmtMds(revisedBudget)}</span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Écart révisé</span>
          </div>
          <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
            <Coins size={20} />
          </div>
        </div>

        {/* KPI 4: DÉLAI (PLANNING) */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">DÉLAI (PLANNING)</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">-12 jours</span>
            <span className="text-[9px] text-slate-400 font-medium block">Objectif : 0 jour</span>
            <span className="text-[10px] text-purple-600 font-bold mt-1 block">En avance</span>
          </div>
          <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-purple-500/20">
            <Clock size={20} />
          </div>
        </div>

        {/* KPI 5: TAUX DE SÉCURITÉ */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">TAUX DE SÉCURITÉ</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">0</span>
            <span className="text-[9px] text-slate-400 font-medium block">Objectif : 0</span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Aucun accident</span>
          </div>
          <div className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-teal-500/20">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* KPI 6: QUALITÉ */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">QUALITÉ</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">2</span>
            <span className="text-[9px] text-slate-400 font-medium block">Objectif : ≤ 3</span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Conforme</span>
          </div>
          <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-red-500/20">
            <Award size={20} />
          </div>
        </div>
      </div>

      {/* 4. DEUXIÈME LIGNE : ÉVOLUTION KPI PRINCIPAUX, PERFORMANCE PAR DIMENSION ET BALANCED SCORECARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Évolution des KPI principaux (5/12) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">ÉVOLUTION DES KPI PRINCIPAUX</h3>
            <div className="flex items-center gap-2 text-[9px] font-bold">
              <span className="text-blue-600">━ Avancement phys. (%)</span>
              <span className="text-emerald-600">━ Avancement fin. (%)</span>
              <span className="text-amber-500">━ Coût réel (Mds FCFA)</span>
              <span className="text-purple-600">┅ Prévision à terminaison (Mds)</span>
            </div>
          </div>

          {/* Représentation graphique de la courbe d'évolution */}
          <div className="relative h-44 my-2 flex items-end justify-between px-2 text-[9px] text-slate-400 border-b border-l border-slate-200">
            <span className="absolute top-1 left-2 font-mono">Mds FCFA 20</span>
            <span className="absolute top-12 left-2 font-mono">15</span>
            <span className="absolute top-24 left-2 font-mono">10</span>
            <span className="absolute top-36 left-2 font-mono">5</span>

            {['Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.', 'Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai'].map((m, i) => (
              <div key={m} className="flex flex-col items-center gap-1">
                <div className="w-1 bg-blue-500 rounded-t" style={{ height: `${(i + 1) * 7}px` }}></div>
                <span>{m}</span>
              </div>
            ))}
            <div className="absolute top-8 right-4 bg-purple-600 text-white font-bold text-[8px] px-1 py-0.5 rounded">15,09 Mds</div>
            <div className="absolute top-16 right-4 bg-blue-600 text-white font-bold text-[8px] px-1 py-0.5 rounded">62,5%</div>
            <div className="absolute top-24 right-4 bg-emerald-600 text-white font-bold text-[8px] px-1 py-0.5 rounded">47,9%</div>
            <div className="absolute top-30 right-4 bg-amber-500 text-white font-bold text-[8px] px-1 py-0.5 rounded">8,74 Mds</div>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir le détail des courbes</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Performance par dimension (4/12) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">PERFORMANCE PAR DIMENSION</h3>

          {/* 5 Jauges semi-circulaires (Coût, Délai, Qualité, Rés. Humaines, Sécurité) */}
          <div className="grid grid-cols-3 gap-2 my-2 text-center">
            <div className="p-2 border rounded-xl bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">COÛT</span>
              <span className="text-base font-black text-emerald-600 block my-1">95%</span>
              <span className="text-[8px] text-slate-400 font-medium">Objectif : ≥ 90%</span>
            </div>

            <div className="p-2 border rounded-xl bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">DÉLAI</span>
              <span className="text-base font-black text-emerald-600 block my-1">108%</span>
              <span className="text-[8px] text-slate-400 font-medium">Objectif : 100%</span>
            </div>

            <div className="p-2 border rounded-xl bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">QUALITÉ</span>
              <span className="text-base font-black text-emerald-600 block my-1">93%</span>
              <span className="text-[8px] text-slate-400 font-medium">Objectif : ≥ 90%</span>
            </div>

            <div className="p-2 border rounded-xl bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">RÉS. HUMAINES</span>
              <span className="text-base font-black text-amber-500 block my-1">89%</span>
              <span className="text-[8px] text-slate-400 font-medium">Objectif : ≥ 85%</span>
            </div>

            <div className="p-2 border rounded-xl bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">SÉCURITÉ</span>
              <span className="text-base font-black text-emerald-600 block my-1">100%</span>
              <span className="text-[8px] text-slate-400 font-medium">Objectif : 100%</span>
            </div>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir l'analyse détaillée</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Performance Globale (Balanced Scorecard Radar) (3/12) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">PERFORMANCE GLOBALE (BALANCED SCORECARD)</h3>

          <div className="relative w-36 h-36 mx-auto my-2 border-2 border-blue-200 rounded-full flex items-center justify-center bg-blue-50/30">
            <div className="w-24 h-24 border-2 border-blue-400 rounded-full flex items-center justify-center bg-blue-100/50">
              <span className="font-black text-blue-900 text-sm">94%</span>
            </div>

            {/* Sub-labels Radar */}
            <span className="absolute top-1 text-[8px] font-bold text-emerald-600">Financier 95%</span>
            <span className="absolute right-0 top-10 text-[8px] font-bold text-blue-600">Parties prenantes 92%</span>
            <span className="absolute bottom-1 right-2 text-[8px] font-bold text-emerald-600">Processus 90%</span>
            <span className="absolute bottom-1 left-2 text-[8px] font-bold text-emerald-600">Environnement 100%</span>
            <span className="absolute left-0 top-10 text-[8px] font-bold text-blue-600">Qualité 93%</span>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir méthodologie</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>

      {/* 5. TROISIÈME LIGNE : KPI PAR LOT / ZONE, TOP ÉCARTS BUDGÉTAIRES ET INDICATEURS RESSOURCES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* KPI par Lot / Zone (5/12) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">KPI PAR LOT / ZONE</h3>

          <div className="overflow-x-auto my-2 text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-100 text-[10px]">
                  <th className="pb-1.5">Lot / Zone</th>
                  <th className="pb-1.5 text-center">Avancement phys.</th>
                  <th className="pb-1.5 text-center">Avancement fin.</th>
                  <th className="pb-1.5 text-right">Coût réel (FCFA)</th>
                  <th className="pb-1.5 text-right">Écart budget</th>
                  <th className="pb-1.5 text-center">Délai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                <tr><td className="py-1.5 font-bold text-slate-900">01 – Terrassements</td><td className="text-center font-bold">70,2%</td><td className="text-center font-mono">55,8%</td><td className="text-right font-mono">2 680 000 000</td><td className="text-right font-mono text-emerald-600 font-bold">-240 000 000</td><td className="text-center text-emerald-600 font-bold">En avance</td></tr>
                <tr><td className="py-1.5 font-bold text-slate-900">02 – Fondations</td><td className="text-center font-bold">65,0%</td><td className="text-center font-mono">45,6%</td><td className="text-right font-mono">2 160 000 000</td><td className="text-right font-mono text-emerald-600 font-bold">-240 000 000</td><td className="text-center text-emerald-600 font-bold">En avance</td></tr>
                <tr><td className="py-1.5 font-bold text-slate-900">03 – Gros œuvre</td><td className="text-center font-bold">58,8%</td><td className="text-center font-mono">42,1%</td><td className="text-right font-mono">3 120 000 000</td><td className="text-right font-mono text-red-600 font-bold">+360 000 000</td><td className="text-center text-red-600 font-bold">En retard</td></tr>
                <tr><td className="py-1.5 font-bold text-slate-900">04 – Charpente & Couverture</td><td className="text-center font-bold">35,4%</td><td className="text-center font-mono">30,2%</td><td className="text-right font-mono">1 020 000 000</td><td className="text-right font-mono text-red-600 font-bold">+320 000 000</td><td className="text-center text-red-600 font-bold">En retard</td></tr>
                <tr><td className="py-1.5 font-bold text-slate-900">05 – Menuiseries</td><td className="text-center font-bold">22,0%</td><td className="text-center font-mono">18,5%</td><td className="text-right font-mono">380 000 000</td><td className="text-right font-mono text-red-600 font-bold">+120 000 000</td><td className="text-center text-red-600 font-bold">En retard</td></tr>
                <tr><td className="py-1.5 font-bold text-slate-900">06 – Électricité</td><td className="text-center font-bold">18,0%</td><td className="text-center font-mono">14,2%</td><td className="text-right font-mono">240 000 000</td><td className="text-right font-mono text-red-600 font-bold">+60 000 000</td><td className="text-center text-red-600 font-bold">En retard</td></tr>
              </tbody>
            </table>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir tous les lots</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Top Écarts Budgétaires (3/12) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">TOP ÉCARTS BUDGÉTAIRES</h3>

          <div className="overflow-x-auto my-2 text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-100 text-[10px]">
                  <th className="pb-1.5">Désignation</th>
                  <th className="pb-1.5 text-right">Écart (FCFA)</th>
                  <th className="pb-1.5 text-right">% écart</th>
                  <th className="pb-1.5 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                <tr><td className="py-1.5 font-bold text-slate-900">Charpente & Couverture</td><td className="text-right font-mono font-bold text-red-600">+320 000 000</td><td className="text-right font-mono font-bold text-red-600">+31,4%</td><td className="text-center"><span className="bg-red-100 text-red-800 text-[9px] font-bold px-1.5 py-0.5 rounded">Critique</span></td></tr>
                <tr><td className="py-1.5 font-bold text-slate-900">Gros œuvre</td><td className="text-right font-mono font-bold text-red-600">+360 000 000</td><td className="text-right font-mono font-bold text-red-600">+13,0%</td><td className="text-center"><span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">Élevé</span></td></tr>
                <tr><td className="py-1.5 font-bold text-slate-900">Menuiseries</td><td className="text-right font-mono font-bold text-red-600">+120 000 000</td><td className="text-right font-mono font-bold text-red-600">+46,2%</td><td className="text-center"><span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">Élevé</span></td></tr>
                <tr><td className="py-1.5 font-bold text-slate-900">Terrassements</td><td className="text-right font-mono font-bold text-emerald-600">-240 000 000</td><td className="text-right font-mono font-bold text-emerald-600">-8,2%</td><td className="text-center"><span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">Favorable</span></td></tr>
                <tr><td className="py-1.5 font-bold text-slate-900">Fondations</td><td className="text-right font-mono font-bold text-emerald-600">-240 000 000</td><td className="text-right font-mono font-bold text-emerald-600">-10,0%</td><td className="text-center"><span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">Favorable</span></td></tr>
              </tbody>
            </table>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir l'analyse complète</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Indicateurs Ressources (4/12) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">INDICATEURS RESSOURCES</h3>

          <div className="grid grid-cols-4 gap-2 my-2 text-center text-xs">
            <div className="p-2 border rounded-xl bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">MAIN-D'ŒUVRE</span>
              <span className="text-lg font-black text-slate-900 block my-0.5">248</span>
              <span className="text-[8px] text-slate-400 block">Heures / jour</span>
              <span className="text-[9px] text-emerald-600 font-bold block mt-1">95%</span>
            </div>

            <div className="p-2 border rounded-xl bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">MATÉRIEL</span>
              <span className="text-lg font-black text-slate-900 block my-0.5">18</span>
              <span className="text-[8px] text-slate-400 block">Équipements</span>
              <span className="text-[9px] text-amber-500 font-bold block mt-1">90%</span>
            </div>

            <div className="p-2 border rounded-xl bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">MATÉRIAUX</span>
              <span className="text-lg font-black text-slate-900 block my-0.5">87%</span>
              <span className="text-[8px] text-slate-400 block">Livraison temps</span>
              <span className="text-[9px] text-emerald-600 font-bold block mt-1">87%</span>
            </div>

            <div className="p-2 border rounded-xl bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">CARBURANT</span>
              <span className="text-lg font-black text-slate-900 block my-0.5">12 480 L</span>
              <span className="text-[8px] text-slate-400 block">Ce mois</span>
              <span className="text-[9px] text-emerald-600 font-bold block mt-1">↑ 6,3%</span>
            </div>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir le détail ressources</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>

      {/* 6. QUATRIÈME LIGNE : TENDANCES & PRÉVISIONS, RISQUES MAJEURS ET NOTES & COMMENTAIRES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Tendances & Prévisions (4/12) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">TENDANCES & PRÉVISIONS</h3>

          <div className="my-2 space-y-2 text-xs">
            <p className="text-slate-700 leading-relaxed font-medium">
              À fin Mai 2025, la tendance indique une fin de projet <strong>en avance de 8 jours</strong> avec une prévision de sous-budget de <strong>3,09 Mds FCFA</strong>.
            </p>

            <div className="relative h-28 border-b border-l border-slate-200 flex items-end justify-between px-2 text-[9px] text-slate-400">
              {['Mai 2025', 'Août 2025', 'Déc. 2025', 'Avr. 2026', 'Août 2026', 'Déc. 2026'].map(m => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Risques Majeurs (5/12) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">RISQUES MAJEURS</h3>

          <div className="overflow-x-auto my-2 text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-100 text-[10px]">
                  <th className="pb-1.5">Risque</th>
                  <th className="pb-1.5 text-center">Probabilité</th>
                  <th className="pb-1.5 text-center">Impact</th>
                  <th className="pb-1.5 text-center">Niveau</th>
                  <th className="pb-1.5 text-center">Plan d'action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                <tr><td className="py-1.5 font-bold text-slate-900">Retard livraison matériaux</td><td className="text-center font-medium">Élevée</td><td className="text-center font-medium">Élevé</td><td className="text-center"><span className="bg-red-100 text-red-800 text-[9px] font-bold px-1.5 py-0.5 rounded">Critique</span></td><td className="text-center font-medium text-slate-600">En cours</td></tr>
                <tr><td className="py-1.5 font-bold text-slate-900">Saison des pluies</td><td className="text-center font-medium">Moyenne</td><td className="text-center font-medium">Élevé</td><td className="text-center"><span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">Élevé</span></td><td className="text-center font-medium text-slate-600">En cours</td></tr>
                <tr><td className="py-1.5 font-bold text-slate-900">Variation prix matériaux</td><td className="text-center font-medium">Moyenne</td><td className="text-center font-medium">Moyen</td><td className="text-center"><span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded">Modéré</span></td><td className="text-center font-medium text-slate-600">Surveillance</td></tr>
              </tbody>
            </table>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <span>Voir tous les risques</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Notes & Commentaires (3/12) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">NOTES & COMMENTAIRES</h3>

          <div className="space-y-1.5 my-2 text-xs text-slate-700 leading-relaxed font-medium">
            <p>• Bonne progression des terrassements et fondations.</p>
            <p>• Vigilance sur le gros œuvre et la charpente.</p>
            <p>• Renforcer la planification des approvisionnements.</p>
            <p>• Réunion de coordination prévue le 28/05/2025.</p>
          </div>

          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 pt-2 border-t border-slate-100">
            <Plus size={14} /> Ajouter une note
          </button>
        </div>

      </div>

      {/* FOOTER METADATA METIER */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 font-medium">
        <div className="flex items-center gap-2">
          <Info size={14} />
          <span>Dernière mise à jour : 20/05/2025 à 10:30 · Prochain rafraîchissement : 21/05/2025 à 08:00</span>
        </div>
        <span>Sources : Données GEBAT 360°</span>
      </div>

    </div>
  );
};
