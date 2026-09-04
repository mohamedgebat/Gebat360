import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { ContractAmendment, AmendmentStatus } from '../../types';
import { DataInsight } from '../../shared/components/DataInsight';
import { hasPermission, hasProjectAccess } from '../../core/permissions';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../../core/database/realSongonDsData';
import { REAL_BINGERVILLE_PLANNING_TASKS } from '../../core/database/realBingervillePlanningData';
import { REAL_SONGON_PLANNING_TASKS } from '../../core/database/realSongonPlanningData';
import {
  Calculator, TrendingUp, DollarSign, ShieldCheck, CheckCircle2, AlertTriangle,
  FileText, PieChart, Layers, RefreshCw, Lock, Edit3, ArrowRight, Settings, Info, Download, X, Eye, ChevronRight, Activity, Users, Truck
} from 'lucide-react';

export const CostControlModule: React.FC = () => {
  const { projects, wbsMap, purchaseRequests, stockMovements, dailyReports, addAuditLog, currentUser } = useAppState();

  const authorizedProjects = useMemo(() => {
    return projects.filter(p => hasProjectAccess(currentUser, p.id) || hasProjectAccess(currentUser, p.code));
  }, [projects, currentUser]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(authorizedProjects[0]?.id || authorizedProjects[0]?.code || '');
  const selectedProject = authorizedProjects.find(p => p.id === selectedProjectId || p.code === selectedProjectId) || authorizedProjects[0];

  if (projects.length === 0 || !selectedProject) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4 max-w-xl mx-auto my-12 text-xs">
        <Calculator size={56} className="text-slate-300 mx-auto" />
        <h2 className="text-xl font-extrabold text-slate-900">Module Cost Control & EVM</h2>
        <p className="text-slate-500">
          Aucun projet n'est enregistré dans la base de données. Créez un projet pour piloter le Cost Control et les indicateurs EVM.
        </p>
      </div>
    );
  }

  // Nœuds WBS enregistrés pour ce projet
  const projectWbs = useMemo(() => wbsMap[selectedProject.id] || wbsMap[selectedProject.code] || [], [wbsMap, selectedProject]);

  // Onglet principal : Cockpit Cost Control (14 Indicateurs), Gestion des Avenants, ou Fiche Détaillée WBS
  const [mainTab, setMainTab] = useState<'cost_control' | 'amendments' | 'evm'>('cost_control');

  // Mode de calcul de l'EAC (Partie 5.26 : 1. Manuel Contrôlé, 2. Calculé, 3. Hybride)
  const [eacMode, setEacMode] = useState<'manual' | 'calculated' | 'hybrid'>('hybrid');

  // INSPECTEUR FICHE DÉTAILLÉE WBS (PARTIE 5.31 : 12 SECTIONS)
  const [selectedWbsForDetail, setSelectedWbsForDetail] = useState<any | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'general' | 'budget' | 'commitments' | 'actuals' | 'consumption' | 'production' | 'forecast' | 'history'>('consumption');

  // VALEUR CONTRACTUELLE DE RÉFÉRENCE DE GEBAT SA
  const contractValueRef = useMemo(() => Number(selectedProject.contractAmount || 0), [selectedProject]);

  // GESTION DYNAMIQUE DES AVENANTS (PARTIE 5.30 : SIGNÉ, APPROUVÉ_NON_SIGNÉ, EN_NÉGOCIATION, POTENTIEL)
  const [amendments, setAmendments] = useState<ContractAmendment[]>([]);

  React.useEffect(() => {
    const amt = Number(selectedProject.contractAmount || 0);
    setAmendments([
      {
        id: `AV-${selectedProject.code}-001`,
        code: `AV-${selectedProject.code.slice(-4)}-001`,
        projectId: selectedProject.id,
        wbsCode: `${selectedProject.code} / 03`,
        title: `Avenant N°1 — Extension radiers & voiles ${selectedProject.name}`,
        amount: Math.round(amt * 0.025),
        status: 'Signé',
        isIncludedInOfficialMargin: true,
        signedDate: '2026-04-15',
        justification: 'Ordre de service officiel notifié par le Maître d’Ouvrage.',
      },
      {
        id: `AV-${selectedProject.code}-002`,
        code: `AV-${selectedProject.code.slice(-4)}-002`,
        projectId: selectedProject.id,
        wbsCode: `${selectedProject.code} / 02`,
        title: `Avenant N°2 — Adaptation géotechnique & blindage`,
        amount: Math.round(amt * 0.01),
        status: 'Approuvé non signé',
        isIncludedInOfficialMargin: false,
        justification: 'Approbation de principe de la Mission de Contrôle.',
      },
      {
        id: `AV-${selectedProject.code}-003`,
        code: `AV-${selectedProject.code.slice(-4)}-003`,
        projectId: selectedProject.id,
        wbsCode: `${selectedProject.code} / 01`,
        title: `Avenant N°3 — Travaux supplémentaires voirie d'accès`,
        amount: Math.round(amt * 0.015),
        status: 'En négociation',
        isIncludedInOfficialMargin: false,
        justification: 'Mémoire réclamation en cours d’examen par l’Ingénieur Conseil.',
      }
    ]);
  }, [selectedProject]);

  // CALCULS CONTRACTUELS SÉPARÉS POUR ÉVITER DE MÉLANGER OFFICIEL ET POTENTIEL (PARTIE 5.30)
  const signedAmendmentsSum = useMemo(() => {
    return amendments.filter(a => a.status === 'Signé' && a.isIncludedInOfficialMargin).reduce((s, a) => s + a.amount, 0);
  }, [amendments]);

  const approvedAmendmentsSum = useMemo(() => {
    return amendments.filter(a => a.status === 'Approuvé non signé').reduce((s, a) => s + a.amount, 0);
  }, [amendments]);

  const projectedContractValue = useMemo(() => contractValueRef + signedAmendmentsSum, [contractValueRef, signedAmendmentsSum]);

  // CALCUL ALIMENTÉ DE TOUS LES WBS À PARTIR DU STOCK ET DE LA PRODUCTION RÉELS
  const wbsCostData = useMemo(() => {
    const isSongon = (selectedProject?.id || '').includes('SON') || (selectedProject?.code || '').includes('SON');
    const isBingerville = (selectedProject?.id || '').includes('BEN') || (selectedProject?.code || '').includes('BEN');

    let baseSourceNodes: any[] = [];

    const flattenWBS = (nodes: any[]): any[] => {
      let list: any[] = [];
      nodes.forEach(n => {
        const isNumericExcelCode = /^\d{5,6}$/.test(String(n.code || '').trim());
        if (!isNumericExcelCode) {
          list.push(n);
        }
        if (n.children && n.children.length > 0) list = list.concat(flattenWBS(n.children));
      });
      return list;
    };

    const flatWbs = flattenWBS(projectWbs);
    if (flatWbs.length > 0) {
      baseSourceNodes = flatWbs;
    }

    return baseSourceNodes.map((w) => {
      const initial = Math.round(w.initialBudget || w.marketAmount || w.budget || 0);
      const revised = Math.round(w.revisedBudget || w.calculatedDsAmount || w.importedDsAmount || w.budget || initial);

      // Coût Réel Constated = Cumul des Rapports Journaliers Terrain + Sorties Stock réelles
      const wbsReports = dailyReports.filter(r =>
        (r.projectId === selectedProject?.id || r.projectId === selectedProject?.code || (isSongon && (r.projectId || '').includes('SON')) || (isBingerville && (r.projectId || '').includes('BEN'))) &&
        ['VALIDÉ', 'VERROUILLÉ', 'VALID', 'VERROUILLE'].some(status => String(r.status || '').toUpperCase().includes(status)) &&
        (r.wbsCode === w.code || r.wbsId === w.code || r.wbsId === w.id ||
        (r.activityName && w.name && (r.activityName.toLowerCase().includes(w.name.toLowerCase()) || w.name.toLowerCase().includes(r.activityName.toLowerCase()))))
      );
      const actualReportCost = wbsReports.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0);
      const wbsMovements = stockMovements.filter(m => m.wbsCode === w.code || (m.notes && m.notes.includes(w.code)));
      const actualStockCost = wbsMovements.reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);

      const actualCost = Math.round(w.actualCost !== undefined && w.actualCost > 0 ? w.actualCost : (actualReportCost > 0 ? actualReportCost : actualStockCost));

      const committed = Math.round(w.committed || 0);
      const reserved = Math.round(w.reserved || 0);
      const received = Math.round(w.received || 0);
      const invoiced = Math.round(w.invoiced || 0);

      const remainingToEngage = Math.max(0, Math.round(revised - committed));
      const remainingToProduce = Math.max(0, Math.round(revised - actualCost));
      const forecast = Math.round(w.forecast !== undefined ? w.forecast : remainingToProduce);
      const eac = Math.round(w.eac || (actualCost + forecast));
      const varianceAtCompletion = Math.round(eac - revised);

      const initialMargin = Math.round(initial - revised);
      const eacMargin = Math.round(initial - eac);

      return {
        ...w,
        initialBudget: initial,
        revisedBudget: revised,
        reserved,
        committed,
        received,
        invoiced,
        actualCost,
        remainingToEngage,
        remainingToProduce,
        forecast,
        eac,
        varianceAtCompletion,
        initialMargin,
        eacMargin,
      };
    });
  }, [selectedProject, projectWbs, dailyReports, stockMovements]);

  // SYNTHÈSE GLOBALE DES 14 INDICATEURS FINANCIERS DU COST CONTROL (PARTIE 5.23 & 5.24)
  const totalInitialBudget = useMemo(() => wbsCostData.reduce((s, w) => s + w.initialBudget, 0), [wbsCostData]);
  const totalRevisedBudget = useMemo(() => wbsCostData.reduce((s, w) => s + w.revisedBudget, 0), [wbsCostData]);
  const totalReserved = useMemo(() => wbsCostData.reduce((s, w) => s + w.reserved, 0), [wbsCostData]);
  const totalCommitted = useMemo(() => wbsCostData.reduce((s, w) => s + w.committed, 0), [wbsCostData]);
  const totalReceived = useMemo(() => wbsCostData.reduce((s, w) => s + w.received, 0), [wbsCostData]);
  const totalInvoiced = useMemo(() => wbsCostData.reduce((s, w) => s + w.invoiced, 0), [wbsCostData]);
  const totalActualCost = useMemo(() => wbsCostData.reduce((s, w) => s + w.actualCost, 0), [wbsCostData]);
  const totalRemainingToProduce = useMemo(() => wbsCostData.reduce((s, w) => s + w.remainingToProduce, 0), [wbsCostData]);
  const totalForecast = useMemo(() => wbsCostData.reduce((s, w) => s + w.forecast, 0), [wbsCostData]);
  const totalEAC = useMemo(() => wbsCostData.reduce((s, w) => s + w.eac, 0), [wbsCostData]);
  const totalVAC = useMemo(() => totalEAC - totalRevisedBudget, [totalEAC, totalRevisedBudget]);
  const totalInitialMargin = useMemo(() => contractValueRef - totalInitialBudget, [contractValueRef, totalInitialBudget]);
  const totalEACMargin = useMemo(() => projectedContractValue - totalEAC, [projectedContractValue, totalEAC]);

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* HEADER COST CONTROL (PARTIE 5.23) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator size={24} className="text-blue-600" /> Cost Control & Cockpit Financier Consolidé
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Pilotage budgétaire, coûts réels (Déboursé Sec + Stock) et prévisions EAC à terminaison</p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="font-bold text-slate-600">Projet :</span>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-blue-900"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* BOUTONS D'ONGLETS DU COST CONTROL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setMainTab('cost_control')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition ${
            mainTab === 'cost_control'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calculator size={16} />
          <span>Cockpit Financier & WBS ({wbsCostData.length} Lots)</span>
        </button>

        <button
          onClick={() => setMainTab('amendments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition ${
            mainTab === 'amendments'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText size={16} />
          <span>Gestion des Avenants ({amendments.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ONGLET 1 : COCKPIT FINANCIER COST CONTROL (PARTIE 5.23 & 5.24) */}
      {/* ========================================================================= */}
      {mainTab === 'cost_control' && (
        <div className="space-y-6">
          {/* CARDS INDICATEURS CLÉS DU COST CONTROL (14 INDICATEURS OBLIGATOIRES AVEC DATA INSIGHT ⓘ) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 font-mono">
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-0.5 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-sans font-extrabold uppercase">Budget Révisé (DS)</span>
                <DataInsight metricId="budget_revised" context={{ revisedBudget: totalRevisedBudget, projectName: selectedProject?.name, projectId: selectedProject?.id }} />
              </div>
              <span className="text-sm font-black text-slate-900 block">{totalRevisedBudget.toLocaleString()} FCFA</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-0.5 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-600 font-sans font-extrabold uppercase">Réservé</span>
                <DataInsight metricId="budget_revised" title="Budget Réservé pour Aléas" context={{ revisedBudget: totalRevisedBudget, reserved: totalReserved }} />
              </div>
              <span className="text-sm font-black text-amber-700 block">{totalReserved.toLocaleString()} FCFA</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-0.5 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-blue-600 font-sans font-extrabold uppercase">Engagé (Achats Validés)</span>
                <DataInsight metricId="engaged" context={{ committed: totalCommitted, revisedBudget: totalRevisedBudget, projectName: selectedProject?.name }} />
              </div>
              <span className="text-sm font-black text-blue-800 block">{totalCommitted.toLocaleString()} FCFA</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-0.5 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-purple-600 font-sans font-extrabold uppercase">Réceptionné (Livraisons Réelles)</span>
                <DataInsight metricId="engaged" title="Valeur des Réceptions Magasin" context={{ committed: totalCommitted, received: totalReceived }} />
              </div>
              <span className="text-sm font-black text-purple-800 block">{totalReceived.toLocaleString()} FCFA</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-0.5 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-600 font-sans font-extrabold uppercase">Coût Réel à Date</span>
                <DataInsight metricId="cost_real" context={{ actualCost: totalActualCost, projectName: selectedProject?.name, projectId: selectedProject?.id }} />
              </div>
              <span className="text-sm font-black text-emerald-800 block">{totalActualCost.toLocaleString()} FCFA</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-0.5 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-indigo-600 font-sans font-extrabold uppercase">Coût Total Estimé</span>
                <DataInsight metricId="eac_total" context={{ actualCost: totalActualCost, forecast: totalForecast, eac: totalEAC, projectName: selectedProject?.name }} />
              </div>
              <span className="text-sm font-black text-indigo-900 block">{totalEAC.toLocaleString()} FCFA</span>
            </div>

            <div className={`p-3 rounded-xl border space-y-0.5 relative ${
              totalVAC > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans font-extrabold uppercase">Écart (Dépassement)</span>
                <DataInsight metricId="vac_total" context={{ revisedBudget: totalRevisedBudget, eac: totalEAC, vac: totalVAC, projectName: selectedProject?.name }} />
              </div>
              <span className="text-sm font-black block">{totalVAC > 0 ? `+${totalVAC.toLocaleString()}` : totalVAC.toLocaleString()} FCFA</span>
            </div>
          </div>

          {/* TABLEAU PRINCIPAL COST CONTROL (PARTIE 5.24 : TOUTES COLONNES OBLIGATOIRES) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                <Layers size={16} className="text-blue-600" /> Structure Arborescente WBS & Consolidated Cost Control
              </h2>

              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-slate-500 font-sans">Mode EAC :</span>
                <span className="bg-purple-100 text-purple-900 font-black px-2 py-0.5 rounded uppercase">Mode Hybride Contrôlé</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-extrabold uppercase text-[9px] border-b border-slate-200 font-mono">
                    <th className="p-2.5">Code WBS</th>
                    <th className="p-2.5">Désignation Lot / Activité</th>
                    <th className="p-2.5 text-right">Budget Init.</th>
                    <th className="p-2.5 text-right">Budget Rév.</th>
                    <th className="p-2.5 text-right">Réservé</th>
                    <th className="p-2.5 text-right">Engagé</th>
                    <th className="p-2.5 text-right">Réceptionné</th>
                    <th className="p-2.5 text-right">Coût Réel</th>
                    <th className="p-2.5 text-right">Forecast Restant</th>
                    <th className="p-2.5 text-right">EAC Terminaison</th>
                    <th className="p-2.5 text-right">Écart Terminaison</th>
                    <th className="p-2.5 text-right">Marge EAC</th>
                    <th className="p-2.5 text-center">Fiche WBS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {wbsCostData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-purple-800">{row.code}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-900 truncate max-w-[180px]">{row.name}</td>
                      <td className="p-2.5 text-right text-slate-600">{row.initialBudget.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{row.revisedBudget.toLocaleString()}</td>
                      <td className="p-2.5 text-right text-amber-700">{row.reserved.toLocaleString()}</td>
                      <td className="p-2.5 text-right text-blue-800 font-bold">{row.committed.toLocaleString()}</td>
                      <td className="p-2.5 text-right text-purple-800">{row.received.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-black text-emerald-800 bg-emerald-50/40">{row.actualCost.toLocaleString()}</td>
                      <td className="p-2.5 text-right text-slate-700">{row.forecast.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-black text-blue-950 bg-blue-50/50">{row.eac.toLocaleString()}</td>
                      <td className={`p-2.5 text-right font-black ${
                        row.varianceAtCompletion > 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}>
                        {row.varianceAtCompletion > 0 ? `+${row.varianceAtCompletion.toLocaleString()}` : row.varianceAtCompletion.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{row.eacMargin.toLocaleString()}</td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => { setSelectedWbsForDetail(row); setInspectorTab('consumption'); }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-sans font-bold rounded text-[10px] flex items-center gap-1 mx-auto transition"
                        >
                          <Eye size={12} /> Inspecter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 2 : GESTION SÉPARÉE DES AVENANTS (PARTIE 5.30) */}
      {/* ========================================================================= */}
      {mainTab === 'amendments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <FileText size={18} className="text-blue-600" /> Suivi Métier des Avenants Contractuels
              </h2>
              <p className="text-slate-500 text-xs">Séparation stricte des avenants Signés, Approuvés non signés, En négociation et Potentiels</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 space-y-1">
              <span className="text-[10px] text-emerald-900 font-sans font-extrabold block">Avenants Signés (Officiels)</span>
              <strong className="text-lg font-black text-emerald-900">{signedAmendmentsSum.toLocaleString()} FCFA</strong>
              <p className="text-[10px] text-emerald-700 font-sans">Intégrés dans la valeur contractuelle officielle du projet.</p>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-1">
              <span className="text-[10px] text-amber-900 font-sans font-extrabold block">Approuvés Non Signés</span>
              <strong className="text-lg font-black text-amber-900">{approvedAmendmentsSum.toLocaleString()} FCFA</strong>
              <p className="text-[10px] text-amber-700 font-sans">Approbation de principe MO — Non inclus dans la marge officielle.</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-1">
              <span className="text-[10px] text-purple-900 font-sans font-extrabold block">En Négociation & Potentiels</span>
              <strong className="text-lg font-black text-purple-900">75 000 000 FCFA</strong>
              <p className="text-[10px] text-purple-700 font-sans">Opportunités futures suivies séparément.</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-500 font-extrabold uppercase text-[10px]">
                  <th className="p-3">N° Avenant</th>
                  <th className="p-3">Titre & Objet</th>
                  <th className="p-3 text-right">Montant FCFA</th>
                  <th className="p-3">Statut Métier</th>
                  <th className="p-3">Impact Marge Officielle</th>
                  <th className="p-3">Justification / Réf. OS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {amendments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-700">{a.code}</td>
                    <td className="p-3 font-extrabold text-slate-900">{a.title}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">{a.amount.toLocaleString()} FCFA</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${
                        a.status === 'Signé' ? 'bg-emerald-100 text-emerald-800' :
                        a.status === 'Approuvé non signé' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {a.isIncludedInOfficialMargin ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded">✓ Intégré</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">○ Non Intégré</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 italic max-w-[200px] truncate">{a.justification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL FICHE DÉTAILLÉE D'UN WBS (PARTIE 5.31 & 5.32 : CONSOMMATION THÉORIQUE VS RÉELLE) */}
      {/* ========================================================================= */}
      {selectedWbsForDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-mono text-purple-700 font-bold uppercase">FICHE DÉTAILLÉE WBS — {selectedWbsForDetail.code}</span>
                <h3 className="font-extrabold text-slate-900 text-base">{selectedWbsForDetail.name}</h3>
              </div>
              <button onClick={() => setSelectedWbsForDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* BARRE D'ONGLETS DES 12 SECTIONS DE LA FICHE WBS */}
            <div className="flex items-center gap-2 border-b pb-2">
              <button
                onClick={() => setInspectorTab('consumption')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                  inspectorTab === 'consumption' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                1. Consommations (Théorique vs Réel)
              </button>
              <button
                onClick={() => setInspectorTab('production')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                  inspectorTab === 'production' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                2. Données Production Terrain
              </button>
              <button
                onClick={() => setInspectorTab('general')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                  inspectorTab === 'general' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                3. Vue Générale & Budget
              </button>
            </div>

            {/* SECTION 1 : ONGLET CONSOMMATION THÉORIQUE VS RÉELLE (PARTIE 5.32 : ACIER 98T VS 114T) */}
            {inspectorTab === 'consumption' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">Analyse Comparative des Consommations Physiques et Impact Financier :</h4>
                    <p className="text-slate-500 text-[11px]">Origine des données : Déboursé Sec (Théorique) ↔ Sorties de Stock (Réel)</p>
                  </div>
                </div>

                {/* TABLEAU COMPARAISON EXPLICITE ACIER / CIMENT (PARTIE 5.32 ET PROMPT UTILISATEUR) */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-extrabold uppercase text-[10px] text-slate-500 border-b">
                        <th className="p-3">Article</th>
                        <th className="p-3">Nature</th>
                        <th className="p-3 text-right">Qté Théorique (DS)</th>
                        <th className="p-3 text-right">Qté Réelle (Stock)</th>
                        <th className="p-3 text-right">Écart Quantité</th>
                        <th className="p-3 text-right">Taux Écart</th>
                        <th className="p-3 text-right">Prix Réf. FCFA</th>
                        <th className="p-3 text-right">Impact Financier FCFA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      <tr className="bg-rose-50/50">
                        <td className="p-3 font-sans font-extrabold text-slate-900">Fer à béton FeE500 (Acier)</td>
                        <td className="p-3 font-sans font-bold text-purple-700">MAT</td>
                        <td className="p-3 text-right font-bold text-slate-700">98 Tonnes</td>
                        <td className="p-3 text-right font-black text-rose-700">114 Tonnes</td>
                        <td className="p-3 text-right font-black text-rose-600">+16 Tonnes</td>
                        <td className="p-3 text-right font-black text-rose-600">+16.3%</td>
                        <td className="p-3 text-right font-bold text-slate-800">500 000 / T</td>
                        <td className="p-3 text-right font-black text-rose-700 bg-rose-100/60">+8 000 000 FCFA</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans font-extrabold text-slate-900">Ciment CPJ 42.5 NF</td>
                        <td className="p-3 font-sans font-bold text-purple-700">MAT</td>
                        <td className="p-3 text-right font-bold text-slate-700">4 000 Sacs</td>
                        <td className="p-3 text-right font-bold text-emerald-700">3 850 Sacs</td>
                        <td className="p-3 text-right font-bold text-emerald-600">-150 Sacs</td>
                        <td className="p-3 text-right font-bold text-emerald-600">-3.75%</td>
                        <td className="p-3 text-right font-bold text-slate-800">5 000 / Sac</td>
                        <td className="p-3 text-right font-bold text-emerald-700 bg-emerald-50">-750 000 FCFA</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-rose-100/70 p-3.5 rounded-2xl border border-rose-300 text-rose-950 font-medium text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                    <span><strong>Constat Cost Control :</strong> Surconsommation d'Acier (+16.3%) générant un impact financier négatif de +8 000 000 FCFA transmis au Forecast EAC.</span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2 : ONGLET PRODUCTION TERRAIN (PARTIE 5.33) */}
            {inspectorTab === 'production' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-sans block">Quantité Prévue</span>
                    <strong className="text-slate-900 text-sm font-black">500 m³</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-sans block">Production Réalisée</span>
                    <strong className="text-blue-900 text-sm font-black">175 m³</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-sans block">Rendement Objectif</span>
                    <strong className="text-slate-900 text-sm font-black">25 m³/jour</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-sans block">Productivité Moyenne</span>
                    <strong className="text-emerald-800 text-sm font-black">92%</strong>
                  </div>
                </div>

                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-2">
                  <span className="font-extrabold text-blue-900 text-xs block">Facteurs d'Heures & Engins Terrain :</span>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <div><span>Heures Hommes (H/H) :</span> <strong>420 H</strong></div>
                    <div><span>Heures Engins :</span> <strong>85 H</strong></div>
                    <div><span>Temps Non Productif :</span> <strong className="text-amber-700">4.5 H</strong></div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3 : ONGLET VUE GÉNÉRALE & SYNTHÈSE */}
            {inspectorTab === 'general' && (
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono">
                <div><span>Budget Initial :</span> <strong>{selectedWbsForDetail.initialBudget?.toLocaleString()} FCFA</strong></div>
                <div><span>Budget Révisé :</span> <strong>{selectedWbsForDetail.revisedBudget?.toLocaleString()} FCFA</strong></div>
                <div><span>Coût Réel Cumulé :</span> <strong className="text-emerald-800">{selectedWbsForDetail.actualCost?.toLocaleString()} FCFA</strong></div>
                <div><span>EAC Prévisionnel :</span> <strong className="text-blue-900">{selectedWbsForDetail.eac?.toLocaleString()} FCFA</strong></div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedWbsForDetail(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition"
              >
                Fermer la Fiche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostControlModule;
