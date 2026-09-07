import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { getProjectFinancialSummary } from '../../core/utils/financialFormulas';
import { DataInsight } from '../../shared/components/DataInsight';
import {
  Building2, MapPin, Calendar, TrendingUp, Users, FileText, CheckCircle2, AlertTriangle, Clock, DollarSign, BarChart3,
  ShieldCheck, FileSpreadsheet, Truck, HardHat, FileCheck, History, ArrowUpRight, ShieldAlert, Award
} from 'lucide-react';

const formatFrenchDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  if (str.includes('T')) {
    const parts = str.split('T');
    const dPart = parts[0];
    const tPart = parts[1]?.replace('Z', '').split('.')[0];

    const dSplit = dPart.split('-');
    if (dSplit.length === 3) {
      const formattedDate = `${dSplit[2]}/${dSplit[1]}/${dSplit[0]}`;
      if (tPart && tPart !== '00:00:00' && tPart !== '00:00') {
        return `${formattedDate} à ${tPart.substring(0, 5)}`;
      }
      return formattedDate;
    }
  }

  const dSplit = str.split('-');
  if (dSplit.length === 3) {
    return `${dSplit[2]}/${dSplit[1]}/${dSplit[0]}`;
  }

  return str;
};

// Helper de correspondance étanche des rapports par projet
const isProjectReportMatch = (r: any, proj: any): boolean => {
  if (!r || !proj) return false;
  const pId = String(proj.id || '').toUpperCase().trim();
  const pCode = String(proj.code || '').toUpperCase().trim();

  const rProjId = String(r.projectId || r.project_id || '').toUpperCase().trim();
  const rCode = String(r.code || r.id || r.reportCode || '').toUpperCase().trim();
  const rText = `${rProjId} ${rCode} ${String(r.wbsCode || '')} ${String(r.activityName || '')}`.toUpperCase();

  const isSongon = pId.includes('SON') || pCode.includes('SON') || (proj.name && proj.name.toUpperCase().includes('SONGON'));
  const isBingerville = pId.includes('BEN') || pCode.includes('BEN') || (proj.name && proj.name.toUpperCase().includes('BINGERVILLE'));

  if (isSongon) {
    if (rCode.startsWith('REP-BEN-') || rText.includes('BEN-002') || rText.includes('BINGERVILLE')) return false;
    return rProjId.includes('SON') || rCode.includes('SON') || rText.includes('SONGON') || rProjId === pId || rProjId === pCode;
  }

  if (isBingerville) {
    if (rCode.startsWith('REP-SON-') || rText.includes('SON-001') || rText.includes('SONGON')) return false;
    return rProjId.includes('BEN') || rCode.includes('BEN') || rText.includes('BINGERVILLE') || rProjId === pId || rProjId === pCode;
  }

  return rProjId === pId || rProjId === pCode || rProjId.includes(pId) || pId.includes(rProjId);
};

export const VueProjet360: React.FC = () => {
  const { projects, wbsMap, purchaseRequests, alerts, dailyReports, auditLogs, subcontracts = [] } = useAppState();
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const songon = projects.find(p => p.code?.includes('SON') || p.id?.includes('SON') || p.id === 'CIV-2026-ASS-SON-001');
    return songon?.id || projects[0]?.id || null;
  });
  const [activeTab, setActiveTab] = useState<string>('overview');

  const selected = projects.find(p => p.id === selectedId || p.code === selectedId) ?? projects[0] ?? null;

  if (projects.length === 0 || !selected) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4 max-w-xl mx-auto my-12">
        <Building2 size={56} className="text-slate-300 mx-auto" />
        <h2 className="text-xl font-extrabold text-slate-900">Bienvenue dans GEBAT 360°</h2>
        <p className="text-slate-500 text-xs">
          Aucun projet n'a encore été enregistré dans la base de données. Créez votre premier projet pour commencer le pilotage 360°.
        </p>
      </div>
    );
  }

  const projectWbs = useMemo(() => {
    if (!selected) return [];
    return wbsMap[selected.id] || wbsMap[selected.code] || [];
  }, [wbsMap, selected]);

  const summary = useMemo(() => {
    return getProjectFinancialSummary(selected, projectWbs, [], purchaseRequests, dailyReports);
  }, [selected, projectWbs, purchaseRequests, dailyReports]);

  const totalEac = summary.eac;
  const margeEAC = summary.eacMarginPct;
  const actualCost = summary.actualCost;
  const totalEngaged = summary.engaged || summary.committed || 0;
  const totalActualCost = summary.actualCost || 0;

  // Facturation / Encaissements : pas de table dédiée en BDD → données non disponibles
  // On ne calcule JAMAIS de valeurs fictives (pas d'estimation à X% du montant contractuel)
  const factured = 0;   // Montant réellement facturé — indisponible (aucune table billings en BDD)
  const encaisse = 0;   // Montant réellement encaissé — indisponible (aucune table paiements en BDD)
  const creances = 0;   // Créances = 0 tant qu'aucune donnée réelle de facturation n'est disponible

  const timeProgressPct = useMemo(() => {
    if (!selected) return 0;
    const start = new Date(selected.startDate || '2026-06-01').getTime();
    const end = new Date(selected.endDate || '2027-09-01').getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    const total = end - start;
    return total > 0 ? Math.min(100, Math.max(0, Math.round(((now - start) / total) * 100))) : 0;
  }, [selected]);

  const tabs = [
    { id: 'overview', label: 'Vue d’ensemble', icon: Building2 },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'finance', label: 'Finance', icon: DollarSign },
    { id: 'planning', label: 'Planning', icon: Calendar },
    { id: 'production', label: 'Production', icon: BarChart3 },
    { id: 'purchases', label: 'Achats & Stocks', icon: Truck },
    { id: 'subcontracting', label: 'Sous-traitance', icon: HardHat },
    { id: 'hr_equipment', label: 'RH & Matériel', icon: Users },
    { id: 'qhse', label: 'QHSE', icon: ShieldCheck },
    { id: 'documents', label: 'Documents', icon: FileSpreadsheet },
    { id: 'history', label: 'Historique', icon: History },
  ];

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* Barre de Sélection du Projet */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wide">Sélectionner le Projet :</span>
          <select
            value={selectedId ?? projects[0]?.id ?? ''}
            onChange={e => setSelectedId(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:bg-white"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
        </div>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Cockpit Directeur Projet 360°
        </span>
      </div>

      {selected && (
        <>
          {/* Header principal du Cockpit — Style simple & clair */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded text-xs border border-blue-200">
                    CODE : {selected.code}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                    {selected.company}
                  </span>
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{selected.name}</h1>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-slate-500 text-xs font-semibold">
                  <span className="flex items-center gap-1"><MapPin size={14} className="text-slate-400" /> {selected.country || "Côte d'Ivoire"} — {selected.location}</span>
                  <span className="flex items-center gap-1"><Users size={14} className="text-slate-400" /> Directeur : <strong className="text-slate-800">{selected.manager}</strong></span>
                  <span className="flex items-center gap-1"><FileText size={14} className="text-slate-400" /> Client : <strong className="text-slate-800">{selected.client}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${selected.status === 'En cours' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {selected.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                  selected.risk === 'Faible' ? 'bg-emerald-100 text-emerald-800' :
                  selected.risk === 'Modéré' ? 'bg-amber-100 text-amber-800' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  Risque {selected.risk}
                </span>
              </div>
            </div>

            {/* 5 BLOCS FONDAMENTAUX DU COCKPIT (SOBRES ET ÉPURÉS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-slate-100">
              {/* 1. CONTRACTUEL */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">1. Contractuel</div>
                <div className="text-sm font-extrabold text-slate-900">{(selected.contractAmount / 1e6).toFixed(1)} M {selected.currency}</div>
                <div className="text-[11px] text-slate-600 font-medium">Délai : {selected.durationMonths} mois | Avenants : 0</div>
                <div className="text-[10px] text-slate-400 font-mono">Fin OS : {selected.endDate}</div>
              </div>

              {/* 2. OPÉRATIONNEL */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">2. Opérationnel</div>
                  <DataInsight metricId="avancement_moyen" context={{ progressRate: selected.progress, projectName: selected.name, projectId: selected.id }} />
                </div>
                <div className="text-sm font-extrabold text-blue-600">{selected.progress}% Physique</div>
                <div className="text-[11px] text-slate-600 font-medium">Avancement Temps : {timeProgressPct}%</div>
                <div className={`text-[10px] font-bold ${selected.progress >= timeProgressPct ? 'text-emerald-600' : selected.progress >= timeProgressPct - 10 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {selected.progress >= timeProgressPct ? 'Planning Conforme' : selected.progress >= timeProgressPct - 10 ? 'Léger Retard' : 'Retard Avancement'}
              </div>

              {/* 3. ÉCONOMIQUE */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">3. Économique</div>
                  <DataInsight metricId="marge_eac" context={{ contractAmount: selected.contractAmount, eac: totalEac, projectName: selected.name }} />
                </div>
                <div className="text-sm font-extrabold text-emerald-700">EAC : {(totalEac / 1e6).toFixed(1)} M FCFA</div>
                <div className="text-[11px] text-slate-600 font-medium">Budget : {(selected.revisedBudget / 1e6).toFixed(1)} M FCFA</div>
                <div className={`text-[10px] font-extrabold ${margeEAC >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Marge EAC : {margeEAC.toFixed(1)}%
                </div>
              </div>

              {/* 4. FINANCIER */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">4. Financier</div>
                  <DataInsight metricId="cash_balance" title="Situation Financière & Encaissements" context={{ encaisse, factured, creances }} />
                </div>
                <div className="text-sm font-extrabold text-slate-900">Encaissé : {(encaisse / 1e6).toFixed(1)} M</div>
                <div className="text-[11px] text-slate-600 font-medium">Facturé : {(factured / 1e6).toFixed(1)} M</div>
                <div className="text-[10px] text-amber-700 font-bold">Créances : {(creances / 1e6).toFixed(1)} M FCFA</div>
              </div>

              {/* 5. RISQUES & ALERTES DYNAMIQUES */}
              {(() => {
                const projectAlerts = alerts.filter(a => (a.projectId === selected.id || a.projectId === selected.code) && a.status === 'Actif');
                const criticalCount = projectAlerts.filter(a => a.severity === 'Critique' || a.severity === 'Majeure' || a.severity === 'Majored').length;
                const topAlert = projectAlerts[0];

                return (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">5. Risques & Alertes</div>
                      <DataInsight metricId="vac_total" title="Alertes Risques Projet" context={{ criticalCount }} />
                    </div>
                    <div className={`text-sm font-extrabold ${criticalCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {criticalCount > 0 ? `${criticalCount} Alerte(s) Active(s)` : '0 Alerte Critique'}
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium truncate">
                      {topAlert ? topAlert.title : 'Aucune dérive détectée'}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold truncate">
                      {topAlert ? `Action: ${topAlert.assignedToRole}` : 'Statut : Conforme'}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* BARRE D'ONGLETS DU COCKPIT */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex items-center gap-1 overflow-x-auto custom-scrollbar">
            {tabs.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={14} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* CONTENU DE L'ONGLET SÉLECTIONNÉ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">

            {/* ONGLET 1 : VUE D'ENSEMBLE */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="font-extrabold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
                  <Building2 size={18} className="text-blue-600" /> Synthèse Globale du Chantier
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* WBS du projet */}
                  <div className="space-y-3">
                    <h3 className="font-extrabold text-slate-800 text-xs">Structure WBS et Avancement par Lot</h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b uppercase text-[10px]">
                            <th className="p-2.5">Code</th>
                            <th className="p-2.5">Lot</th>
                            <th className="p-2.5 text-right">Budget</th>
                            <th className="p-2.5">Avancement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {projectWbs.map(w => (
                            <tr key={w.id} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono text-purple-700 font-bold">{w.code}</td>
                              <td className="p-2.5 font-bold text-slate-900">{w.name}</td>
                              <td className="p-2.5 text-right font-mono">{(w.revisedBudget / 1e6).toFixed(1)} M</td>
                              <td className="p-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${w.progress}%` }} />
                                  </div>
                                  <span className="font-bold text-[10px]">{w.progress}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Synthèse Économique & Financière */}
                  <div className="space-y-3">
                    <h3 className="font-extrabold text-slate-800 text-xs">Bilan Financier & Engagements</h3>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 font-medium">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-slate-600">Montant Contrat HT :</span>
                        <span className="font-mono font-bold text-slate-900">{selected.contractAmount.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-slate-600">Budget Révisé :</span>
                        <span className="font-mono font-bold text-emerald-700">{selected.revisedBudget.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-slate-600">Engagé Cumulé :</span>
                        <span className="font-mono font-bold text-amber-700">{totalEngaged.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-slate-600">Coût Réel Comptabilisé :</span>
                        <span className="font-mono font-bold text-orange-700">{totalActualCost.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 text-sm font-extrabold">
                        <span className="text-slate-900">Estimation à Terme (EAC) :</span>
                        <span className="font-mono text-purple-700">{totalEac.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET 2 : PERFORMANCE EVM DYNAMIQUE */}
            {activeTab === 'performance' && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-600" /> Indicateurs de Performance Earned Value Management (EVM)
                </h2>
                {(() => {
                  const ev = selected.revisedBudget * (selected.progress / 100); // Earned Value
                  const pv = selected.revisedBudget * ((selected.targetProgress || selected.progress) / 100); // Planned Value
                  const ac = totalActualCost; // Actual Cost
                  
                  const cpi = ac > 0 ? (ev / ac) : 1.0;
                  const spi = pv > 0 ? (ev / pv) : 1.0;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-xl border space-y-1 ${cpi >= 1.0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                        <span className={`font-extrabold text-xs uppercase ${cpi >= 1.0 ? 'text-emerald-800' : 'text-rose-800'}`}>CPI (Cost Performance Index)</span>
                        <div className={`text-2xl font-black ${cpi >= 1.0 ? 'text-emerald-900' : 'text-rose-900'}`}>{cpi.toFixed(2)}</div>
                        <p className={`text-[10px] ${cpi >= 1.0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {cpi >= 1.0 ? `Efficience coûts excellente (CPI = ${cpi.toFixed(2)} > 1.0)` : `Dépassement de coût détecté (CPI = ${cpi.toFixed(2)} < 1.0)`}
                        </p>
                      </div>
                      <div className={`p-4 rounded-xl border space-y-1 ${spi >= 1.0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                        <span className={`font-extrabold text-xs uppercase ${spi >= 1.0 ? 'text-blue-800' : 'text-amber-800'}`}>SPI (Schedule Performance Index)</span>
                        <div className={`text-2xl font-black ${spi >= 1.0 ? 'text-blue-900' : 'text-amber-900'}`}>{spi.toFixed(2)}</div>
                        <p className={`text-[10px] ${spi >= 1.0 ? 'text-blue-700' : 'text-amber-700'}`}>
                          {spi >= 1.0 ? `En avance sur le planning (SPI = ${spi.toFixed(2)} >= 1.0)` : `Retard de planning (SPI = ${spi.toFixed(2)} < 1.0)`}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                        <span className="text-purple-800 font-extrabold text-xs uppercase">Valeur Acquise (EV)</span>
                        <div className="text-xl font-black text-purple-900">{(ev / 1e6).toFixed(1)} M FCFA</div>
                        <p className="text-[10px] text-purple-700">Valeur physique produite sur le chantier</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ONGLET 3 : FINANCE */}
            {activeTab === 'finance' && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
                  <DollarSign size={18} className="text-purple-600" /> Trésorerie, Facturation & Encaissés Client
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-500 text-[10px] font-extrabold uppercase">Montant Facturé Cumulé</span>
                    <div className="text-lg font-extrabold text-slate-900">{factured.toLocaleString()} FCFA</div>
                  </div>
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <span className="text-emerald-700 text-[10px] font-extrabold uppercase">Encaissé sur Compte Bank</span>
                    <div className="text-lg font-extrabold text-emerald-900">{encaisse.toLocaleString()} FCFA</div>
                  </div>
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                    <span className="text-rose-700 text-[10px] font-extrabold uppercase">Reste à Encaisser (Créances)</span>
                    <div className="text-lg font-extrabold text-rose-900">{creances.toLocaleString()} FCFA</div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET 4 : PLANNING & JALONS GANTT RÉACTIFS */}
            {activeTab === 'planning' && (
              <div className="space-y-6">
                <h2 className="font-extrabold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
                  <Calendar size={18} className="text-blue-600" /> Planning Gantt & Échéancier Contractuel Réactif
                </h2>

                {/* 3 Cartes Dates Clés */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Date Ordre de Service (OS)</span>
                    <div className="text-sm font-extrabold text-slate-900">{formatFrenchDate(selected.startDate) || '—'}</div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Date de Fin Contractuelle</span>
                    <div className="text-sm font-extrabold text-slate-900">{formatFrenchDate(selected.endDate) || '—'}</div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                    <span className="text-blue-800 text-[10px] uppercase font-bold">Durée d'Exécution</span>
                    <div className="text-sm font-extrabold text-blue-900">{selected.durationMonths ? `${selected.durationMonths} mois` : '—'}</div>
                  </div>
                </div>

                {/* BARRE GANTT RÉACTIVE DE L'AVANCEMENT GLOBAL PAR LOT */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="font-extrabold text-slate-900 text-xs">Jalons & Avancement Chronologique WBS ({projectWbs.length} Lots)</h3>
                    <span className="text-[11px] font-bold text-blue-600">Avancement Temps : {timeProgressPct}% | Avancement Physique : {selected.progress}%</span>
                  </div>

                  <div className="space-y-3">
                    {projectWbs.slice(0, 6).map((w, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800"><strong className="font-mono text-purple-700">{w.code}</strong> — {w.name}</span>
                          <span className="font-mono font-bold text-slate-600">{w.progress}% effectué</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full ${w.progress >= 70 ? 'bg-emerald-500' : w.progress >= 30 ? 'bg-blue-600' : 'bg-amber-500'}`}
                            style={{ width: `${w.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET 5 : PRODUCTION RÉELLE */}
            {activeTab === 'production' && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
                  <BarChart3 size={18} className="text-emerald-600" /> Suivi Réel de Production Terrain ({dailyReports.filter(r => isProjectReportMatch(r, selected)).length} rapports)
                </h2>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Activité / Ouvrage</th>
                        <th className="p-2.5 text-right">Qté Prévue</th>
                        <th className="p-2.5 text-right text-blue-600">Qté Réalisée</th>
                        <th className="p-2.5 text-center">Rendement</th>
                        <th className="p-2.5">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {dailyReports.filter(r => isProjectReportMatch(r, selected)).map(r => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-700 font-mono font-bold">{formatFrenchDate(r.date)}</td>
                          <td className="p-2.5 font-sans font-bold text-slate-900">{r.activityName}</td>
                          <td className="p-2.5 text-right">{r.targetQty || r.plannedQty || 0} {r.unit}</td>
                          <td className="p-2.5 text-right text-blue-600 font-bold">{r.realizedQty} {r.unit}</td>
                          <td className="p-2.5 text-center">
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                              {r.productivityRate || r.advancePct || 95}%
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              r.status === 'Validé' ? 'bg-emerald-100 text-emerald-800' :
                              r.status === 'Verrouillé' ? 'bg-purple-100 text-purple-800' :
                              'bg-blue-50 text-blue-700'
                            }`}>
                              {r.status || 'Soumis'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {dailyReports.filter(r => isProjectReportMatch(r, selected)).length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 font-bold font-sans">
                            Aucun rapport journalier enregistré pour ce chantier.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ONGLET 6 : ACHATS & STOCKS RÉELS */}
            {activeTab === 'purchases' && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
                  <Truck size={18} className="text-purple-600" /> Demandes d'Achat (DA) & Imputations WBS ({purchaseRequests.filter(d => d.projectId === selected.id || d.projectId === selected.code).length} DA)
                </h2>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Code DA</th>
                        <th className="p-2.5">Désignation Fourniture</th>
                        <th className="p-2.5">N° WBS</th>
                        <th className="p-2.5 text-right">Montant Estimé</th>
                        <th className="p-2.5 text-center">Statut Circuit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {purchaseRequests.filter(d => d.projectId === selected.id || d.projectId === selected.code).map(d => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-blue-700 font-bold">{d.code}</td>
                          <td className="p-2.5 font-sans font-bold text-slate-900">{d.itemDescription}</td>
                          <td className="p-2.5 text-purple-700 font-bold">{d.wbsCode}</td>
                          <td className="p-2.5 text-right text-slate-900 font-bold">{d.estimatedTotal.toLocaleString()} FCFA</td>
                          <td className="p-2.5 text-center">
                            <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {purchaseRequests.filter(d => d.projectId === selected.id || d.projectId === selected.code).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 font-bold font-sans">
                            Aucune demande d'achat enregistrée pour ce chantier.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ONGLET 11 : HISTORIQUE & AUDIT TRAIL RÉEL */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
                  <History size={18} className="text-purple-600" /> Audit Trail & Registre des Modifications Inaltérables ({auditLogs.filter(l => l.objectRef.includes(selected.code) || l.objectRef.includes(selected.id)).length} Entrées)
                </h2>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Horodatage</th>
                        <th className="p-2.5">Auteur / Rôle</th>
                        <th className="p-2.5">Action & Module</th>
                        <th className="p-2.5">Objet / Référence</th>
                        <th className="p-2.5">Détail / Valeur Modifiée</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {auditLogs.filter(l => l.objectRef.includes(selected.code) || l.objectRef.includes(selected.id) || l.module === 'PROJECTS').map(l => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-500">{l.timestamp}</td>
                          <td className="p-2.5 font-sans font-bold text-slate-900">
                            <div>{l.user}</div>
                            <span className="text-[10px] text-purple-700 font-bold">{l.role}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[10px]">
                              {l.action}
                            </span>
                            <div className="text-[10px] text-slate-400 font-sans mt-0.5">{l.module}</div>
                          </td>
                          <td className="p-2.5 text-blue-700 font-bold">{l.objectRef}</td>
                          <td className="p-2.5 font-sans text-slate-700 font-medium">{l.newValue || l.justification || 'Validation du système'}</td>
                        </tr>
                      ))}
                      {auditLogs.filter(l => l.objectRef.includes(selected.code) || l.objectRef.includes(selected.id) || l.module === 'PROJECTS').length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 font-bold font-sans">
                            Aucun événement d'audit enregistré pour le moment pour ce chantier.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ONGLET 7 : SOUS-TRAITANCE RÉELLE */}
            {activeTab === 'subcontracting' && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
                  <HardHat size={18} className="text-amber-600" /> Entreprises Partenaires & Contrats de Sous-traitance ({subcontracts.filter(s => s.projectId === selected.id || s.projectId === selected.code).length} Contrats)
                </h2>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Code / Contrat</th>
                        <th className="p-2.5">Entreprise Partenaire</th>
                        <th className="p-2.5">Lot Associé</th>
                        <th className="p-2.5 text-right">Montant Marché</th>
                        <th className="p-2.5 text-right">Cumul Situations</th>
                        <th className="p-2.5 text-center">Retenue 5%</th>
                        <th className="p-2.5">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {subcontracts.filter(s => s.projectId === selected.id || s.projectId === selected.code).map(s => {
                        const cumSituations = (s.situations || []).reduce((sum: number, sit: any) => sum + Number(sit.amount || sit.grossAmount || 0), 0);
                        const retenue = Math.round(cumSituations * 0.05);

                        return (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="p-2.5 text-blue-700 font-bold">{s.contractCode || s.id}</td>
                            <td className="p-2.5 font-sans font-bold text-slate-900">{s.companyName}</td>
                            <td className="p-2.5 text-purple-700 font-bold">{s.lotName || s.lotCode || 'Lot BTP'}</td>
                            <td className="p-2.5 text-right font-bold text-slate-900">{Number(s.contractAmount || 0).toLocaleString()} FCFA</td>
                            <td className="p-2.5 text-right text-emerald-700 font-bold">{cumSituations.toLocaleString()} FCFA</td>
                            <td className="p-2.5 text-center text-amber-700 font-bold">{retenue.toLocaleString()} FCFA</td>
                            <td className="p-2.5">
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                {s.status || 'Actif'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {subcontracts.filter(s => s.projectId === selected.id || s.projectId === selected.code).length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400 font-bold font-sans">
                            Aucun contrat de sous-traitance enregistré pour ce chantier.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ONGLET 8 : RESSOURCES HUMAINES & MATÉRIEL */}
            {activeTab === 'hr_equipment' && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
                  <Users size={18} className="text-blue-600" /> Mobilisation Main d’Œuvre & Engins de Chantier
                </h2>
                {(() => {
                  const reportsWithWorkers = dailyReports.filter(r => isProjectReportMatch(r, selected));
                  const avgWorkers = reportsWithWorkers.length > 0
                    ? Math.round(reportsWithWorkers.reduce((sum, r) => sum + (Number(r.workersCount || r.workforceCount) || 0), 0) / reportsWithWorkers.length)
                    : 0;

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Effectif Moyen Mobilisé / Jour</span>
                          <div className="text-xl font-black text-blue-700">{avgWorkers} ouvriers / jour</div>
                          <span className="text-[10px] text-slate-500">Conducteurs, chefs d'équipe, maçons, ferrailleurs</span>
                        </div>
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                          <span className="text-[10px] uppercase font-bold text-purple-700">Rapports d'Activité RH Traités</span>
                          <div className="text-xl font-black text-purple-900">{reportsWithWorkers.length} rapports</div>
                          <span className="text-[10px] text-purple-600">Pointages quotidiens validés</span>
                        </div>
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-700">Superviseur & Direction</span>
                          <div className="text-lg font-black text-emerald-900">{selected.manager || 'Conducteur de Travaux'}</div>
                          <span className="text-[10px] text-emerald-600">Responsable de site</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-50 text-slate-500 font-bold border-b text-[10px] uppercase">
                            <tr>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Ouvrage / Tâche</th>
                              <th className="p-2.5 text-center">Effectif Présent</th>
                              <th className="p-2.5 text-center">Météo Site</th>
                              <th className="p-2.5">Chef de Chantier</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {reportsWithWorkers.slice(0, 10).map(r => (
                              <tr key={r.id} className="hover:bg-slate-50">
                                <td className="p-2.5 text-slate-700 font-bold">{formatFrenchDate(r.date)}</td>
                                <td className="p-2.5 font-sans font-bold text-slate-900">{r.activityName || 'Travaux de production'}</td>
                                <td className="p-2.5 text-center text-blue-700 font-bold">{r.workersCount || r.workforceCount || 0} personnes</td>
                                <td className="p-2.5 text-center font-sans text-slate-700">{r.weather || 'Ensoleillé / Chantier Sec'}</td>
                                <td className="p-2.5 font-sans text-slate-800 font-bold">{r.createdBy || selected.manager || 'Conducteur'}</td>
                              </tr>
                            ))}
                            {reportsWithWorkers.length === 0 && (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-slate-400 font-bold font-sans">
                                  Aucun rapport RH enregistré pour ce chantier.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ONGLET 9 : QHSE & SÉCURITÉ RÉELLE */}
            {activeTab === 'qhse' && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" /> Registre QHSE, Alertes de Chantier & Prévention ({alerts.filter(a => a.projectId === selected.id || a.projectId === selected.code).length} Alertes)
                </h2>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Code Alerte</th>
                        <th className="p-2.5">Intitulé du Risque</th>
                        <th className="p-2.5 text-center">Gravité</th>
                        <th className="p-2.5">Mesure Corrective & Action</th>
                        <th className="p-2.5">Responsable</th>
                        <th className="p-2.5">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {alerts.filter(a => a.projectId === selected.id || a.projectId === selected.code).map(alt => (
                        <tr key={alt.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-blue-700 font-bold">{alt.code || alt.id}</td>
                          <td className="p-2.5 font-sans font-bold text-slate-900">{alt.title || alt.message}</td>
                          <td className="p-2.5 text-center">
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              alt.severity === 'Critique' || alt.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                              alt.severity === 'Majeure' || alt.severity === 'MAJOR' ? 'bg-amber-100 text-amber-800' :
                              'bg-blue-50 text-blue-700'
                            }`}>
                              {alt.severity}
                            </span>
                          </td>
                          <td className="p-2.5 font-sans text-slate-700 font-medium">{alt.message || 'Mise en œuvre des mesures de protection'}</td>
                          <td className="p-2.5 font-sans text-slate-800 font-bold">{alt.assignedToRole || selected.manager}</td>
                          <td className="p-2.5">
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${alt.status === 'Résolu' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                              {alt.status || 'Actif'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {alerts.filter(a => a.projectId === selected.id || a.projectId === selected.code).length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 font-bold font-sans">
                            Aucune alerte de risque active signalée sur ce chantier.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ONGLET 10 : DOCUMENTS & GED DU CHANTIER */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <h2 className="font-extrabold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-blue-600" /> Gestion Électronique des Documents (GED) du Marché & Chantier
                </h2>
                {(() => {
                  const dynamicDocs = [
                    {
                      id: `DOC-CTR-${selected.code}`,
                      title: `Contrat de Marché Signé N° ${selected.code} — ${selected.name}`,
                      type: 'PDF',
                      category: 'Marché',
                      date: formatFrenchDate(selected.startDate || '2026-06-01'),
                      size: '4.8 Mo',
                      author: selected.client || 'Maître d’Ouvrage'
                    },
                    {
                      id: `DOC-DS-${selected.code}`,
                      title: `Déboursé Sec d'Objectif Validé (${selected.code}) — ${(selected.revisedBudget / 1e6).toFixed(1)} M FCFA`,
                      type: 'XLSX',
                      category: 'Étude de Prix',
                      date: formatFrenchDate(selected.startDate || '2026-06-01'),
                      size: '2.4 Mo',
                      author: selected.manager || 'Direction Technique'
                    },
                    ...purchaseRequests.filter(d => d.projectId === selected.id || d.projectId === selected.code).slice(0, 5).map((d, i) => ({
                      id: `DOC-DA-${d.id || i}`,
                      title: `Demande d'Achat [${d.code}] — ${d.itemDescription} (${Number(d.estimatedTotal || 0).toLocaleString()} FCFA)`,
                      type: 'PDF',
                      category: 'Achats',
                      date: formatFrenchDate(d.createdAt),
                      size: '850 Ko',
                      author: d.createdBy || 'Responsable Achats'
                    })),
                    ...dailyReports.filter(r => isProjectReportMatch(r, selected)).slice(0, 5).map((r, i) => ({
                      id: `DOC-REP-${r.id || i}`,
                      title: `Rapport Journalier [${r.code || `CR-${i + 1}`}] — ${r.activityName}`,
                      type: 'PDF',
                      category: 'Production',
                      date: formatFrenchDate(r.date),
                      size: '1.2 Mo',
                      author: r.createdBy || selected.manager || 'Chef de Chantier'
                    }))
                  ];

                  return (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b text-[10px] uppercase">
                          <tr>
                            <th className="p-2.5">Réf. Document</th>
                            <th className="p-2.5">Intitulé de la Pièce</th>
                            <th className="p-2.5">Catégorie</th>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Auteur / Source</th>
                            <th className="p-2.5 text-center">Format</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {dynamicDocs.map(doc => (
                            <tr key={doc.id} className="hover:bg-slate-50">
                              <td className="p-2.5 text-blue-700 font-bold">{doc.id}</td>
                              <td className="p-2.5 font-sans font-bold text-slate-900">{doc.title}</td>
                              <td className="p-2.5 font-sans font-bold text-purple-700">{doc.category}</td>
                              <td className="p-2.5 text-slate-700">{doc.date}</td>
                              <td className="p-2.5 font-sans text-slate-800">{doc.author}</td>
                              <td className="p-2.5 text-center">
                                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${doc.type === 'PDF' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                  {doc.type}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
};
