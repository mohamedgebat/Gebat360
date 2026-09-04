import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { isProjectMatch } from '../../utils/projectMatcher';
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Download,
  Zap,
  Check,
  X,
  Filter,
  CheckSquare,
  RefreshCw,
  PlusCircle,
  FileSpreadsheet,
  AlertOctagon,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { SystemAlert } from '../../types';

interface AlertsCenterModuleProps {
  onBackToProject?: () => void;
}

export const AlertsCenterModule: React.FC<AlertsCenterModuleProps> = ({ onBackToProject }) => {
  const { alerts, resolveAlert, addAuditLog, purchaseRequests = [], stockItems = [], projects = [] } = useAppState();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('Tous');
  const [filterCategory, setFilterCategory] = useState<string>('Tous');
  const [resolvedIds, setResolvedIds] = useState<Record<string, boolean>>({});
  const [selectedAlertForAction, setSelectedAlertForAction] = useState<any | null>(null);
  const [resolutionComment, setResolutionComment] = useState('');
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // ALERTES RÉELLES & DYNAMIQUES DÉTECTÉES EN TEMPS RÉEL SUR LA BASE
  const consolidatedAlerts = useMemo(() => {
    const list: any[] = [];

    // 1. Alertes réelles stockées en base (filtrage strict de tout résidu de maquette)
    (alerts || []).forEach(a => {
      if (a.id === 'ALT-2026-001' || a.code === 'ALT-BUD-01' || String(a.projectName || '').includes('Lycée') || String(a.projectId || '').includes('P-003')) return;
      
      const matchedProj = projects.find(p => isProjectMatch(p.id, a.projectId) || isProjectMatch(p.code, a.projectId));
      list.push({
        id: a.id || a.code,
        code: a.code || a.id,
        category: a.category || 'Budget',
        severity: a.severity || 'Moyenne',
        title: a.title,
        message: a.message,
        project: a.projectName || matchedProj?.name || a.projectId || 'Chantier GEBAT',
        wbs: a.wbsCode || a.wbsId || 'Général',
        impact: a.observedValue ? `Constaté : ${a.observedValue} (Seuil : ${a.thresholdValue || 'N/A'})` : '',
        date: a.createdAt || new Date().toLocaleDateString('fr-FR'),
        status: a.status || 'Actif'
      });
    });

    // 2. Détection dynamique en temps réel des dépassements sur Demandes d'Achat (DAs)
    (purchaseRequests || []).forEach(da => {
      if (da.budgetCheck?.isOverBudget && String(da.status || '').toUpperCase() !== 'REFUSEE' && String(da.status || '').toUpperCase() !== 'REFUSÉ') {
        const overAmt = Number(da.budgetCheck.overBudgetAmount || 0);
        const matchedProj = projects.find(p => isProjectMatch(p.id, da.projectId) || isProjectMatch(p.code, da.projectId));
        list.push({
          id: `ALT-DA-${da.id}`,
          code: `ALT-DA-${da.code}`,
          category: 'Achats',
          severity: overAmt > 5000000 ? 'Critique' : 'Majeure',
          title: `Dépassement Budgétaire sur Demande d'Achat (${da.code})`,
          message: `La Demande d'Achat ${da.code} dépasse le budget disponible de ${overAmt.toLocaleString('fr-FR')} FCFA.`,
          project: da.projectName || matchedProj?.name || da.projectId || 'Chantier GEBAT',
          wbs: da.wbsCode || 'WBS',
          impact: `Dépassement de budget : +${overAmt.toLocaleString('fr-FR')} FCFA`,
          date: da.createdAt ? da.createdAt.substring(0, 10) : new Date().toLocaleDateString('fr-FR'),
          status: 'Actif'
        });
      }
    });

    // 3. Détection dynamique en temps réel des ruptures critiques de stock
    (stockItems || []).forEach(item => {
      const current = Number(item.currentStock || 0);
      const minTh = Number(item.minThreshold ?? (item as any).minQuantity ?? 0);
      if (minTh > 0 && current < minTh) {
        list.push({
          id: `ALT-STK-${item.id}`,
          code: `ALT-STK-${item.code || item.id}`,
          category: 'Stock',
          severity: current === 0 ? 'Critique' : 'Majeure',
          title: current === 0 ? `Rupture Totale de Stock : ${item.name}` : `Stock sous Seuil d'Alerte : ${item.name}`,
          message: `Stock actuel (${current} ${item.unit}) inférieur au seuil de sécurité minimum (${minTh} ${item.unit}).`,
          project: item.warehouse || 'Magasin Central Chantier',
          wbs: 'Logistique / Magasin',
          impact: `Stock disponible : ${current} ${item.unit} (Seuil requis : ${minTh} ${item.unit})`,
          date: new Date().toLocaleDateString('fr-FR'),
          status: 'Actif'
        });
      }
    });

    return list;
  }, [alerts, purchaseRequests, stockItems, projects]);

  const totalOverrunAmount = useMemo(() => {
    return purchaseRequests
      .filter(da => da.budgetCheck?.isOverBudget && String(da.status || '').toUpperCase() !== 'REFUSEE' && String(da.status || '').toUpperCase() !== 'REFUSÉ')
      .reduce((sum, da) => sum + (Number(da.budgetCheck?.overBudgetAmount) || 0), 0);
  }, [purchaseRequests]);

  const criticalStockItems = useMemo(() => {
    return stockItems.filter(i => {
      const minTh = Number(i.minThreshold ?? (i as any).minQuantity ?? 0);
      return minTh > 0 && Number(i.currentStock || 0) < minTh;
    });
  }, [stockItems]);

  const criticalStockName = useMemo(() => {
    if (criticalStockItems.length > 0) {
      return `${criticalStockItems[0].name} (${criticalStockItems[0].currentStock} ${criticalStockItems[0].unit})`;
    }
    return 'Stocks conformes aux seuils';
  }, [criticalStockItems]);

  // Marquer une alerte comme résolue
  const handleResolveAlert = (id: string, title: string) => {
    setResolvedIds(prev => ({ ...prev, [id]: true }));
    addAuditLog(
      'ACQUITTEMENT_ALERTE',
      'ALERTES_RISQUES',
      id,
      `Alerte "${title}" acquittée et traitée avec succès. Commentaire: ${resolutionComment || 'Traitement validé par l\'administrateur'}`
    );
    setSelectedAlertForAction(null);
    setResolutionComment('');
    setActionSuccessMsg(`Alerte [${id}] traitée et clôturée avec succès !`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Marquer toutes les alertes comme lues
  const handleMarkAllAsRead = () => {
    const newResolvedState: Record<string, boolean> = {};
    consolidatedAlerts.forEach(a => {
      newResolvedState[a.id] = true;
    });
    setResolvedIds(newResolvedState);
    addAuditLog('ACQUITTEMENT_MASSIF', 'ALERTES_RISQUES', 'ALL', 'Toutes les alertes actives ont été marquées comme lues.');
    setActionSuccessMsg('Toutes les alertes ont été marquées comme lues.');
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Exporter le journal au format CSV FCFA
  const handleExportCSV = () => {
    const headers = ['ID Alerte', 'Module/Catégorie', 'Sévérité', 'Titre', 'Projet', 'WBS', 'Impact FCFA', 'Date', 'Statut'];
    const rows = consolidatedAlerts.map(a => [
      a.id,
      a.category || a.module,
      a.severity,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${(a.project || 'GEBAT SA').replace(/"/g, '""')}"`,
      `"${(a.wbs || 'Général').replace(/"/g, '""')}"`,
      `"${(a.impact || '').replace(/"/g, '""')}"`,
      a.date || a.timestamp,
      resolvedIds[a.id] || a.status === 'Résolu' ? 'Résolu' : 'Actif'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Registre_Alertes_GEBAT_360_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addAuditLog('EXPORT_CSV', 'ALERTES_RISQUES', 'RAPPORT_FCFA', 'Exportation du registre des alertes métier FCFA au format CSV.');
  };

  // Filtrage dynamique
  const filteredAlerts = consolidatedAlerts.filter(a => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.project && a.project.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.wbs && a.wbs.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSeverity = filterSeverity === 'Tous' || a.severity === filterSeverity;
    const matchesCategory = filterCategory === 'Tous' || (a.category || a.module) === filterCategory;

    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const activeAlerts = consolidatedAlerts.filter(a => !resolvedIds[a.id] && a.status !== 'Résolu');
  const activeCount = activeAlerts.length;
  const budgetOverrunCount = consolidatedAlerts.filter(a => (a.category === 'Budget' || a.module === 'Budget') && !resolvedIds[a.id]).length;
  const stockAlertsCount = consolidatedAlerts.filter(a => (a.category === 'Stock' || a.module === 'Stock') && !resolvedIds[a.id]).length;
  const resolvedCount = consolidatedAlerts.filter(a => resolvedIds[a.id] || a.status === 'Résolu').length;

  return (
    <div className="space-y-6 text-slate-800 font-sans max-w-7xl mx-auto pb-10">
      
      {/* SUCCESS NOTIFICATION BANNER */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-600 text-white font-extrabold rounded-2xl shadow-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={20} />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="hover:opacity-80 cursor-pointer">
            <X size={18} />
          </button>
        </div>
      )}

      {/* 1. TOP HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          {onBackToProject && (
            <button
              onClick={onBackToProject}
              className="text-xs font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 mb-1.5 transition cursor-pointer"
            >
              <ArrowLeft size={14} /> Retour à la vue projet 360°
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
              CENTRE D'ALERTES ET ANOMALIES MÉTIER
            </h1>
            <div className="relative">
              <Bell size={22} className={activeCount > 0 ? "text-red-500 animate-pulse" : "text-slate-400"} />
              {activeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {activeCount}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Surveillance dynamique en temps réel des dérives budgétaires en FCFA, retards et ruptures de stock
          </p>
        </div>

        <div className="flex items-center gap-3 relative">
          <div className="relative">
            <button
              onClick={() => setQuickActionsOpen(!quickActionsOpen)}
              className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 shadow transition cursor-pointer"
            >
              <Zap size={15} className="text-amber-400" />
              <span>Actions rapides</span>
              <span className="text-[10px]">▼</span>
            </button>

            {quickActionsOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 space-y-1 text-xs font-bold text-slate-700">
                <button
                  onClick={() => {
                    handleMarkAllAsRead();
                    setQuickActionsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-xl flex items-center gap-2 text-emerald-700 cursor-pointer"
                >
                  <CheckSquare size={16} /> Acquitter toutes les alertes
                </button>
                <button
                  onClick={() => {
                    handleExportCSV();
                    setQuickActionsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded-xl flex items-center gap-2 text-blue-700 cursor-pointer"
                >
                  <FileSpreadsheet size={16} /> Télécharger le rapport CSV
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleExportCSV}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Download size={15} className="text-slate-500" />
            <span>Exporter le journal FCFA</span>
          </button>
        </div>
      </div>

      {/* 2. CARTES KPI DYNAMIQUES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* KPI 1 : ALERTES ACTIVES */}
        <div className={`bg-white p-4.5 rounded-2xl border shadow-sm flex items-center justify-between transition ${
          activeCount > 0 ? 'border-red-200 hover:border-red-300' : 'border-slate-200'
        }`}>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">ALERTES ACTIVES</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 block mt-1">{activeCount}</span>
            <span className={`text-[11px] font-bold flex items-center gap-1 ${activeCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {activeCount > 0 ? (
                <>
                  <AlertTriangle size={12} /> Nécessitent une action
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} /> Tous les indicateurs sont au vert
                </>
              )}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-xs ${
            activeCount > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}>
            <Bell size={24} />
          </div>
        </div>

        {/* KPI 2 : DÉPASSEMENTS BUDGET */}
        <div className={`bg-white p-4.5 rounded-2xl border shadow-sm flex items-center justify-between transition ${
          budgetOverrunCount > 0 ? 'border-purple-200 hover:border-purple-300' : 'border-slate-200'
        }`}>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">DÉPASSEMENTS BUDGET</span>
            <span className="text-2xl sm:text-3xl font-black text-purple-700 block mt-1">{budgetOverrunCount}</span>
            <span className="text-[11px] text-purple-600 font-extrabold block">
              {budgetOverrunCount > 0 && totalOverrunAmount > 0 ? `Total : +${totalOverrunAmount.toLocaleString('fr-FR')} FCFA` : 'Aucun dépassement'}
            </span>
          </div>
          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center font-bold shadow-xs">
            <AlertOctagon size={24} />
          </div>
        </div>

        {/* KPI 3 : RUPTURES DE STOCK */}
        <div className={`bg-white p-4.5 rounded-2xl border shadow-sm flex items-center justify-between transition ${
          stockAlertsCount > 0 ? 'border-amber-200 hover:border-amber-300' : 'border-slate-200'
        }`}>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">RUPTURES DE STOCK</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-600 block mt-1">{stockAlertsCount}</span>
            <span className="text-[11px] text-amber-700 font-bold truncate block max-w-[140px]">{criticalStockName}</span>
          </div>
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center font-bold shadow-xs">
            <Clock size={24} />
          </div>
        </div>

        {/* KPI 4 : ALERTES RÉSOLUES */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-emerald-300 transition">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">ALERTES RÉSOLUES</span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 block mt-1">{resolvedCount}</span>
            <span className="text-[11px] text-emerald-600 font-bold block">{resolvedCount > 0 ? `${resolvedCount} ce mois` : 'Historique à jour'}</span>
          </div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold shadow-xs">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* 3. BARRE DE RECHERCHE ET FILTRES DYNAMIQUES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs font-semibold">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          
          {/* RECHERCHE TEXTUELLE */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une alerte par titre, code, projet ou WBS..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 text-xs font-semibold text-slate-900"
            />
          </div>

          {/* FILTRE SÉVÉRITÉ */}
          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 cursor-pointer focus:outline-none focus:border-blue-600"
          >
            <option value="Tous">Toutes les sévérités</option>
            <option value="Critique">Critique</option>
            <option value="Majeure">Majeure</option>
            <option value="Moyenne">Moyenne</option>
          </select>

          {/* FILTRE CATÉGORIE */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 cursor-pointer focus:outline-none focus:border-blue-600"
          >
            <option value="Tous">Toutes les catégories</option>
            <option value="Budget">Budget</option>
            <option value="Achats">Achats</option>
            <option value="Stock">Stock</option>
            <option value="Planning">Planning</option>
            <option value="Production">Production</option>
          </select>
        </div>

        {/* TOUT MARQUER COMME LU */}
        {activeCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shrink-0 cursor-pointer"
          >
            <Check size={16} className="text-emerald-600" />
            <span>Tout marquer comme lu</span>
          </button>
        )}
      </div>

      {/* 4. LISTE DYNAMIQUE ET RÉELLE DES ALERTES MÉTIER */}
      <div className="space-y-3.5">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
              <CheckCircle2 size={30} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Aucune anomalie ni alerte active</h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Tous les indicateurs de gestion de chantier (Budgets Déboursé Sec, Demandes d'Achat, Stocks Magasin et Planning) sont conformes aux objectifs prévisionnels.
            </p>
          </div>
        ) : (
          filteredAlerts.map(a => {
            const isResolved = resolvedIds[a.id] || a.status === 'Résolu';
            return (
              <div
                key={a.id}
                className={`bg-white p-5 rounded-2xl border transition shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !isResolved ? 'border-slate-200 hover:border-blue-500' : 'border-slate-100 opacity-60 bg-slate-50'
                }`}
              >
                {/* DÉTAILS DE L'ALERTE */}
                <div className="flex items-start gap-4 flex-1">
                  
                  {/* ICONE SÉVÉRITÉ */}
                  <div className={`p-3 rounded-2xl text-white mt-0.5 shadow-sm shrink-0 ${
                    isResolved
                      ? 'bg-slate-400'
                      : a.severity === 'Critique'
                      ? 'bg-red-600'
                      : a.severity === 'Majeure'
                      ? 'bg-amber-500'
                      : 'bg-blue-600'
                  }`}>
                    <AlertTriangle size={20} />
                  </div>

                  <div className="space-y-1.5">
                    {/* BADGES */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-xs text-slate-500">{a.code || a.id}</span>
                      
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        (a.category || a.module) === 'Budget' ? 'bg-purple-100 text-purple-800' :
                        (a.category || a.module) === 'Achats' ? 'bg-blue-100 text-blue-800' :
                        (a.category || a.module) === 'Stock' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {a.category || a.module}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                        a.severity === 'Critique' ? 'bg-red-100 text-red-800 border border-red-300' :
                        a.severity === 'Majeure' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {a.severity}
                      </span>

                      {isResolved && (
                        <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          ✓ Résolu
                        </span>
                      )}
                    </div>

                    {/* TITRE ET DESCRIPTION */}
                    <h3 className="font-black text-slate-900 text-sm sm:text-base">{a.title}</h3>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-600 font-semibold flex-wrap">
                      <span>Projet : <strong className="text-slate-900">{a.project || 'Chantier GEBAT'}</strong></span>
                      <span>WBS : <strong className="text-slate-900">{a.wbs || 'Général'}</strong></span>
                      <span>Date : <strong className="text-slate-900">{a.date || new Date().toLocaleDateString('fr-FR')}</strong></span>
                    </div>

                    {/* IMPACT FINANCIER OU LOGISTIQUE EN ROUGE SI PRÉSENT */}
                    {a.impact && (
                      <div className="text-xs font-black text-red-600 pt-0.5">
                        {a.impact}
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTION SUR L'ALERTE */}
                <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  {!isResolved ? (
                    <>
                      <button
                        onClick={() => setSelectedAlertForAction(a)}
                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black px-4 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-500/20 cursor-pointer"
                      >
                        Traiter l'anomalie
                      </button>

                      <button
                        onClick={() => handleResolveAlert(a.id, a.title)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-2.5 rounded-xl text-xs transition cursor-pointer"
                        title="Marquer comme lu"
                      >
                        <Check size={18} />
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 size={16} /> Traité
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. MODAL INTERACTIF DE TRAITEMENT D'ANOMALIE */}
      {selectedAlertForAction && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scale-up space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Traitement d'Anomalie Métier</h3>
                  <span className="text-xs text-slate-500 font-mono font-bold">{selectedAlertForAction.id}</span>
                </div>
              </div>
              <button onClick={() => setSelectedAlertForAction(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <span className="font-extrabold text-slate-900 block">{selectedAlertForAction.title}</span>
              <p className="text-slate-600 font-medium">{selectedAlertForAction.message || selectedAlertForAction.description}</p>
              {selectedAlertForAction.impact && (
                <div className="text-red-600 font-bold pt-1">
                  {selectedAlertForAction.impact}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Justification & Plan d'Action Correctif (FCFA / Chantier) *
              </label>
              <textarea
                rows={3}
                value={resolutionComment}
                onChange={e => setResolutionComment(e.target.value)}
                placeholder="Indiquez les mesures correctives prises (ex: Ajustement budgétaire validé, commande validée avec livraison prioritaire...)"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedAlertForAction(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleResolveAlert(selectedAlertForAction.id, selectedAlertForAction.title)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/30 cursor-pointer"
              >
                Valider & Clôturer l'Anomalie
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AlertsCenterModule;

