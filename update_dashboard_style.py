import os, sys

tsx = r"""import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import {
  Building2,
  FolderKanban,
  Layers,
  FileText,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShoppingBag,
  DollarSign,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  CheckCircle2,
  ListFilter
} from 'lucide-react';

type DrillLevel = 'groupe' | 'societe' | 'projet' | 'wbs' | 'transaction';

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Mrd FCFA';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' M FCFA';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' K FCFA';
  return n.toLocaleString('fr-FR') + ' FCFA';
}

function fmtPct(n: number): string { return n.toFixed(1) + '%'; }

export const DashboardGeneral: React.FC = () => {
  const { projects, wbsMap, purchaseRequests, alerts, dailyReports } = useAppState();

  const [drillLevel, setDrillLevel] = useState<DrillLevel>('groupe');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedWbsId, setSelectedWbsId] = useState<string | null>(null);

  const companies = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => { if (p.company) set.add(p.company); });
    return Array.from(set);
  }, [projects]);

  const kpis = useMemo(() => {
    const actifs = projects.filter(p => p.status === 'En cours');
    const budgetTotal = projects.reduce((s, p) => s + p.revisedBudget, 0);

    let engaged = 0, actualCost = 0, eacTotal = 0;
    Object.values(wbsMap).forEach(nodes => {
      nodes.forEach(n => {
        engaged += n.committed || 0;
        actualCost += n.actualCost || 0;
        eacTotal += n.eac || 0;
      });
    });

    const avancementMoyen = actifs.length > 0
      ? actifs.reduce((s, p) => s + p.progress, 0) / actifs.length
      : 0;

    const margeEAC = budgetTotal > 0 ? ((budgetTotal - eacTotal) / budgetTotal) * 100 : 0;
    const alertesActives = alerts.filter(a => a.status === 'Actif').length;

    const today = new Date();
    const enRetard = projects.filter(p => {
      const end = new Date(p.endDate);
      return p.status === 'En cours' && end < today && p.progress < 100;
    }).length;

    const achatEnAttente = purchaseRequests.filter(
      da => da.status === 'En attente validation'
    ).length;

    const deriversBudget = projects.filter(p => {
      const wbs = wbsMap[p.id] || [];
      const eac = wbs.reduce((s, n) => s + (n.eac || 0), 0);
      return eac > p.revisedBudget * 1.02;
    }).length;

    return { actifs: actifs.length, budgetTotal, engaged, actualCost, eacTotal,
      avancementMoyen, margeEAC, alertesActives, enRetard, achatEnAttente, deriversBudget };
  }, [projects, wbsMap, purchaseRequests, alerts]);

  const breadcrumb: { label: string; level: DrillLevel; icon: any }[] = [
    { label: 'Groupe (GEBAT SA)', level: 'groupe', icon: Building2 },
  ];
  if (selectedCompany) {
    breadcrumb.push({ label: selectedCompany, level: 'societe', icon: Building2 });
  }
  if (selectedProjectId) {
    const proj = projects.find(p => p.id === selectedProjectId);
    if (proj) breadcrumb.push({ label: proj.name, level: 'projet', icon: FolderKanban });
  }
  if (selectedWbsId) {
    const wbsNodes = selectedProjectId ? (wbsMap[selectedProjectId] || []) : [];
    const node = wbsNodes.find(n => n.id === selectedWbsId);
    breadcrumb.push({ label: node ? node.name : selectedWbsId, level: 'wbs', icon: Layers });
  }
  if (drillLevel === 'transaction') {
    breadcrumb.push({ label: 'Transactions', level: 'transaction', icon: FileText });
  }

  const filteredProjects = useMemo(() => {
    if (!selectedCompany) return projects;
    return projects.filter(p => p.company === selectedCompany);
  }, [projects, selectedCompany]);

  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;
  const wbsNodes = selectedProjectId ? (wbsMap[selectedProjectId] || []) : [];
  const selectedWbs = wbsNodes.find(n => n.id === selectedWbsId) ?? null;

  const transactions = useMemo(() => {
    if (!selectedProjectId) return [];
    const reports = dailyReports
      .filter(r => r.projectId === selectedProjectId)
      .slice(0, 8)
      .map(r => ({
        date: r.date,
        ref: r.code || r.id,
        libelle: r.description || 'Rapport journalier de production',
        montant: r.quantities?.realized ? r.quantities.realized * 15000 : 450000,
        type: 'Production & Main-d\'oeuvre',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }));
    const das = purchaseRequests
      .filter(da => da.projectId === selectedProjectId)
      .map(da => ({
        date: da.createdAt || '2026-03-01',
        ref: da.code || da.id,
        libelle: da.itemDescription || 'Demande d\'achat materiaux',
        montant: da.estimatedTotal || 0,
        type: 'Achats (' + da.status + ')',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
      }));
    return [...reports, ...das];
  }, [dailyReports, purchaseRequests, selectedProjectId]);

  return (
    <div className="space-y-6 text-xs text-slate-800">

      {/* Header Titre */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Dashboard Général Opérationnel</h1>
          <p className="text-slate-500 text-xs mt-0.5">Vue consolidée du Groupe GEBAT — Suivi en temps réel et Drill-down à 5 niveaux</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Système en direct
          </span>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-3 px-4 shadow-md flex items-center gap-2 overflow-x-auto custom-scrollbar">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Drill-Down:</span>
        {breadcrumb.map((b, i) => {
          const Icon = b.icon;
          const isLast = i === breadcrumb.length - 1;
          return (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />}
              <button
                onClick={() => {
                  setDrillLevel(b.level);
                  if (b.level === 'groupe') { setSelectedCompany(null); setSelectedProjectId(null); setSelectedWbsId(null); }
                  else if (b.level === 'societe') { setSelectedProjectId(null); setSelectedWbsId(null); }
                  else if (b.level === 'projet') { setSelectedWbsId(null); }
                }}
                className={lex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition font-semibold whitespace-nowrap }
              >
                <Icon size={14} />
                <span>{b.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* 10 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: 'Projets Actifs', value: kpis.actifs, unit: 'projets en cours', icon: Building2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { label: 'Budget Total', value: fmt(kpis.budgetTotal), unit: 'Budget révisé cumulé', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
          { label: 'Engagé Total', value: fmt(kpis.engaged), unit: 'Engagements WBS', icon: Layers, color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'Coût Réel Total', value: fmt(kpis.actualCost), unit: 'Dépenses comptabilisées', icon: TrendingUp, color: 'text-orange-600 bg-orange-50 border-orange-200' },
          { label: 'Avancement Moyen', value: fmtPct(kpis.avancementMoyen), unit: 'Moyenne des chantiers', icon: TrendingUp, color: 'text-purple-600 bg-purple-50 border-purple-200' },
          { label: 'Marge EAC', value: fmtPct(kpis.margeEAC), unit: 'Marge prévisionnelle', icon: kpis.margeEAC >= 0 ? ArrowUpRight : ArrowDownRight, color: kpis.margeEAC >= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200' },
          { label: 'Alertes Actives', value: kpis.alertesActives, unit: 'Anomalies détectées', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
          { label: 'Projets en Retard', value: kpis.enRetard, unit: 'Échéance dépassée', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Achats en Attente', value: kpis.achatEnAttente, unit: 'Demandes d\'Achat DA', icon: ShoppingBag, color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { label: 'Dérives Budgétaires', value: kpis.deriversBudget, unit: 'Dépassement > 2%', icon: ShieldAlert, color: 'text-rose-600 bg-rose-50 border-rose-200' },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className={p-3.5 rounded-xl border  shadow-sm space-y-1 transition hover:shadow-md}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">{k.label}</span>
                <Icon size={16} />
              </div>
              <div className="text-base font-extrabold text-slate-900 tracking-tight leading-none pt-1">{k.value}</div>
              <div className="text-[10px] text-slate-500 font-medium">{k.unit}</div>
            </div>
          );
        })}
      </div>

      {/* ===== NIVEAU 1 : GROUPE ===== */}
      {drillLevel === 'groupe' && (
        <div className="space-y-6">
          {/* Sociétés filiales */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="text-blue-600" size={18} />
                <h2 className="font-extrabold text-slate-900 text-sm">Filiales du Groupe GEBAT</h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">Cliquez sur une filiale pour filtrer les projets</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {companies.map((comp, idx) => {
                const compProjects = projects.filter(p => p.company === comp);
                const compBudget = compProjects.reduce((s, p) => s + p.revisedBudget, 0);
                const compActifs = compProjects.filter(p => p.status === 'En cours').length;
                return (
                  <div
                    key={idx}
                    onClick={() => { setSelectedCompany(comp); setDrillLevel('societe'); }}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-500 hover:shadow-md transition cursor-pointer group space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 group-hover:text-blue-600 transition text-sm">{comp}</span>
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600 transition" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Projets rattachés :</span>
                      <span className="font-bold text-slate-900">{compProjects.length} ({compActifs} actifs)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Budget total :</span>
                      <span className="font-bold text-emerald-700">{fmt(compBudget)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tableau de tous les projets */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="text-slate-700" size={18} />
                <h2 className="font-extrabold text-slate-900 text-sm">Tous les Projets du Groupe</h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">{projects.length} projets référencés</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <th className="p-3 pl-4">Code</th>
                    <th className="p-3">Projet</th>
                    <th className="p-3">Société</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3 text-right">Budget Révisé</th>
                    <th className="p-3 text-right">Engagé</th>
                    <th className="p-3 text-right">Coût Réel</th>
                    <th className="p-3 min-w-[120px]">Avancement</th>
                    <th className="p-3 text-right">EAC</th>
                    <th className="p-3 text-right">Marge</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {projects.map(p => {
                    const wbs = wbsMap[p.id] || [];
                    const engaged = wbs.reduce((s, n) => s + (n.committed || 0), 0);
                    const actual = wbs.reduce((s, n) => s + (n.actualCost || 0), 0);
                    const eac = wbs.reduce((s, n) => s + (n.eac || 0), 0);
                    const marge = p.revisedBudget > 0 ? ((p.revisedBudget - eac) / p.revisedBudget) * 100 : 0;
                    const derive = eac > p.revisedBudget * 1.02;
                    return (
                      <tr key={p.id} className={hover:bg-slate-50/80 transition }>
                        <td className="p-3 pl-4 font-mono text-slate-500 font-semibold">{p.code}</td>
                        <td className="p-3 font-bold text-slate-900">{p.name}</td>
                        <td className="p-3 text-slate-600">{p.company}</td>
                        <td className="p-3">
                          <span className={px-2.5 py-1 rounded-full text-[10px] font-extrabold }>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">{fmt(p.revisedBudget)}</td>
                        <td className="p-3 text-right font-mono text-amber-700">{fmt(engaged)}</td>
                        <td className="p-3 text-right font-mono text-orange-700">{fmt(actual)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={h-full rounded-full }
                                style={{ width: ${p.progress}% }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 w-9 text-right">{fmtPct(p.progress)}</span>
                          </div>
                        </td>
                        <td className={p-3 text-right font-mono font-bold }>{fmt(eac)}</td>
                        <td className={p-3 text-right font-extrabold }>{fmtPct(marge)}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => { setSelectedCompany(p.company); setSelectedProjectId(p.id); setDrillLevel('projet'); }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] transition shadow-sm"
                          >
                            Voir WBS &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== NIVEAU 2 : SOCIÉTÉ ===== */}
      {drillLevel === 'societe' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">Filiale : {selectedCompany}</h2>
              <p className="text-slate-500 text-xs">Liste des chantiers gérés par cette entité</p>
            </div>
            <button
              onClick={() => { setSelectedCompany(null); setDrillLevel('groupe'); }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition"
            >
              &larr; Retour au Groupe
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="p-3">Code</th>
                  <th className="p-3">Projet</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3 text-right">Budget Révisé</th>
                  <th className="p-3 text-right">Engagé</th>
                  <th className="p-3 text-right">Coût Réel</th>
                  <th className="p-3">Avancement</th>
                  <th className="p-3 text-right">EAC</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredProjects.map(p => {
                  const wbs = wbsMap[p.id] || [];
                  const engaged = wbs.reduce((s, n) => s + (n.committed || 0), 0);
                  const actual = wbs.reduce((s, n) => s + (n.actualCost || 0), 0);
                  const eac = wbs.reduce((s, n) => s + (n.eac || 0), 0);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono text-slate-500">{p.code}</td>
                      <td className="p-3 font-bold text-slate-900">{p.name}</td>
                      <td className="p-3 text-slate-600">{p.client}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">{p.status}</span>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold">{fmt(p.revisedBudget)}</td>
                      <td className="p-3 text-right font-mono text-amber-700">{fmt(engaged)}</td>
                      <td className="p-3 text-right font-mono text-orange-700">{fmt(actual)}</td>
                      <td className="p-3 font-bold text-slate-700">{fmtPct(p.progress)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{fmt(eac)}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => { setSelectedProjectId(p.id); setDrillLevel('projet'); }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] transition shadow-sm"
                        >
                          Entrer WBS &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== NIVEAU 3 : PROJET (WBS) ===== */}
      {(drillLevel === 'projet' || drillLevel === 'wbs') && selectedProject && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="text-purple-600" size={18} />
                <h2 className="font-extrabold text-slate-900 text-base">WBS : {selectedProject.name}</h2>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Budget Révisé : <strong className="text-slate-900">{fmt(selectedProject.revisedBudget)}</strong> | Avancement : <strong className="text-blue-600">{fmtPct(selectedProject.progress)}</strong>
              </p>
            </div>
            <button
              onClick={() => setDrillLevel(selectedCompany ? 'societe' : 'groupe')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition"
            >
              &larr; Remonter au projet
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="p-3">Code WBS</th>
                  <th className="p-3">Intitulé de la Tâche</th>
                  <th className="p-3 text-right">Budget</th>
                  <th className="p-3 text-right">Engagé</th>
                  <th className="p-3 text-right">Coût Réel</th>
                  <th className="p-3 text-right">EAC</th>
                  <th className="p-3 min-w-[100px]">Avancement</th>
                  <th className="p-3 text-right">Écart</th>
                  <th className="p-3 text-center">Nature</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {wbsNodes.length === 0 ? (
                  <tr><td colSpan={10} className="p-4 text-center text-slate-400">Aucune ligne WBS enregistrée</td></tr>
                ) : (
                  wbsNodes.map(n => {
                    const ecart = n.revisedBudget - n.eac;
                    const derive = n.eac > n.revisedBudget * 1.02;
                    return (
                      <tr key={n.id} className={hover:bg-slate-50 transition }>
                        <td className="p-3 font-mono text-slate-500">{n.code}</td>
                        <td className="p-3 font-bold text-slate-900">{n.name}</td>
                        <td className="p-3 text-right font-mono">{fmt(n.revisedBudget)}</td>
                        <td className="p-3 text-right font-mono text-amber-700">{fmt(n.committed)}</td>
                        <td className="p-3 text-right font-mono text-orange-700">{fmt(n.actualCost)}</td>
                        <td className={p-3 text-right font-mono font-bold }>{fmt(n.eac)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={h-full rounded-full }
                                style={{ width: ${n.progress}% }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700">{fmtPct(n.progress)}</span>
                          </div>
                        </td>
                        <td className={p-3 text-right font-bold }>{fmt(ecart)}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">{n.nature}</span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => { setSelectedWbsId(n.id); setDrillLevel('transaction'); }}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] transition shadow-sm"
                          >
                            Transactions &darr;
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== NIVEAU 4 / 5 : TRANSACTIONS ===== */}
      {drillLevel === 'transaction' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="text-emerald-600" size={18} />
                <h2 className="font-extrabold text-slate-900 text-base">Transactions : {selectedWbs ? selectedWbs.name : ''}</h2>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Coût réel comptabilisé sur cette ligne : <strong className="text-emerald-700">{selectedWbs ? fmt(selectedWbs.actualCost) : '0 FCFA'}</strong>
              </p>
            </div>
            <button
              onClick={() => setDrillLevel('wbs')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition"
            >
              &larr; Retour aux WBS
            </button>
          </div>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Aucune transaction individuelle répertoriée sur cette ligne WBS
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <th className="p-3">Date</th>
                    <th className="p-3">Réf Transaction</th>
                    <th className="p-3">Description / Libellé</th>
                    <th className="p-3">Nature du Flux</th>
                    <th className="p-3 text-right">Montant FCFA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {transactions.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono text-slate-500">{t.date}</td>
                      <td className="p-3 font-mono font-bold text-blue-600">{t.ref}</td>
                      <td className="p-3 font-semibold text-slate-800">{t.libelle}</td>
                      <td className="p-3">
                        <span className={px-2.5 py-1 rounded-full text-[10px] font-bold border }>
                          {t.type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-slate-900">{fmt(t.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
"""

with open("src/modules/dashboard/DashboardGeneral.tsx", "w", encoding="utf-8") as f:
    f.write(tsx)
print("OK - Style ameliorer avec succes")
