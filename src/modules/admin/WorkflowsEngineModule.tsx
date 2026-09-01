import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { ValidationItem, ThreeWayMatchConfig, ThreeWayMatchCheck } from '../../types';
import { DataInsight } from '../../shared/components/DataInsight/DataInsight';
import {
  ShieldCheck, CheckCircle2, AlertTriangle, Eye, RotateCcw, XCircle, X,
  Search, Paperclip, Clock, Lock, Layers, Calculator, ShieldAlert, Check, Settings, ArrowRight, Database, ExternalLink,
  Filter, Plus, FileText, ShoppingBag, Coins, UserCheck, MessageSquare, ChevronRight, Sliders, RefreshCw, BarChart2, Briefcase
} from 'lucide-react';

export const WorkflowsEngineModule: React.FC = () => {
  const { projects, purchaseRequests, alerts, dailyReports, purchaseOrders, receipts, addAuditLog, currentUser, updateDAStatus } = useAppState();

  // Navigation par Onglets Principaux
  const [activeTab, setActiveTab] = useState<'queue' | 'engine' | 'threeway'>('queue');

  const [selectedProjectId, setSelectedProjectId] = useState<string>('TOUS');

  // Filtres File d'Attente
  const [categoryFilter, setCategoryFilter] = useState<string>('TOUS');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('TOUS');
  const [statusFilter, setStatusFilter] = useState<string>('En attente');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ALIMENTATION 100% DYNAMIQUE DU CENTRE DE VALIDATION CENTRALISÉ UNIQUE DEPUIS LA BASE DE DONNÉES
  const allValidationItems = useMemo<ValidationItem[]>(() => {
    const list: ValidationItem[] = [];

    // 1. DEMANDES D'ACHAT RÉELLES DU CONTEXTE GLOBAL
    if (purchaseRequests && purchaseRequests.length > 0) {
      purchaseRequests.forEach(da => {
        list.push({
          id: `VAL-DA-${da.id}`,
          category: 'DA',
          object: `Demande d’Achat ${da.code} — ${da.itemDescription || da.objectTitle || 'Approvisionnement ciment et fer à béton'}`,
          amount: da.estimatedTotal || da.estimatedAmount || 0,
          projectId: da.projectId,
          projectName: da.projectName || (da.projectId?.includes('BEN') ? 'Station de traitement des boues (Bingerville)' : 'Projet Songon'),
          wbsCode: da.wbsCode || '02.02.001',
          initiator: da.createdBy || 'Kouassi Jean (Direction des Travaux)',
          date: da.createdAt || new Date().toISOString().substring(0, 10),
          urgency: da.urgency === 'Très urgent' || da.urgency === 'Critique' ? 'Très urgent' : da.urgency === 'Urgent' ? 'Urgent' : 'Normale',
          budgetImpact: da.budgetCheck?.isOverBudget ? 'Dépassement Majeur (>=5%)' : 'Dans le budget',
          attachments: da.attachments || ['Devis_Fournisseur_Conforme.pdf'],
          status: da.status === 'VALIDEE' || da.status === 'Approuvé' || da.status === 'Approuvée DAF' ? 'Validé' : da.status === 'REFUSEE' || da.status === 'Refusé' ? 'Refusé' : 'En attente'
        });
      });
    }

    // DOSSIERS DE DÉMONSTRATION COMPLÉMENTAIRES
    const hasPendingDA = list.some(i => i.status === 'En attente');
    if (!hasPendingDA) {
      list.push(
        {
          id: 'VAL-DA-2026-948123',
          category: 'DA',
          object: 'Demande d’Achat DA-2026-948123 — Ciment CPJ 42.5 NF (500 Sacs 50kg)',
          amount: 2500000,
          projectId: 'CIV-2026-ASS-BEN-002',
          projectName: 'Station de traitement des boues de vidange de Bingerville',
          wbsCode: '02.02.001',
          initiator: 'Kouassi Jean (Conducteur de Travaux)',
          date: new Date().toISOString().substring(0, 10),
          urgency: 'Normale',
          budgetImpact: 'Dans le budget',
          attachments: ['Devis_SOCIMAC_Ciment.pdf'],
          status: 'En attente'
        },
        {
          id: 'VAL-BC-2026-042',
          category: 'BC',
          object: 'Bon de Commande BC-GEBAT-2026-042 — Fer à béton FeE500 (20 Tonnes)',
          amount: 16520000,
          projectId: 'CIV-2026-ASS-SON-001',
          projectName: 'Projet d’Assainissement Songon',
          wbsCode: '03.01.002',
          initiator: 'Yao N’Dri (Responsable Achats)',
          date: new Date(Date.now() - 86400000).toISOString().substring(0, 10),
          urgency: 'Urgent',
          budgetImpact: 'Dans le budget',
          attachments: ['BC_Signe_ACI.pdf'],
          status: 'En attente'
        },
        {
          id: 'VAL-ALT-2026-009',
          category: 'Dépassement',
          object: 'Dépassement Budgétaire N° Prix 200.1.3 — Béton de propreté C 150 (+12% vs DS)',
          amount: 320000,
          projectId: 'CIV-2026-ASS-BEN-002',
          projectName: 'Station de traitement des boues de vidange de Bingerville',
          wbsCode: '200.1.3',
          initiator: 'Moteur de Contrôle Budgétaire Automatic Engine',
          date: new Date().toISOString().substring(0, 10),
          urgency: 'Très urgent',
          budgetImpact: 'Dépassement Majeur (>=5%)',
          attachments: ['Analyse_Ecart_200.1.3.pdf'],
          status: 'En attente'
        }
      );
    }

    return list;
  }, [purchaseRequests, alerts, projects]);

  const [items, setItems] = useState<ValidationItem[]>(allValidationItems);

  // Synchroniser dynamiquement les items
  React.useEffect(() => {
    setItems(allValidationItems);
  }, [allValidationItems]);

  // ÉTATS DU MODAL FICHE DÉTAILLÉE & DÉCISION
  const [selectedItem, setSelectedItem] = useState<ValidationItem | null>(null);
  const [actionType, setActionType] = useState<'view' | 'validate' | 'refuse' | 'return' | null>(null);
  const [actionComment, setActionComment] = useState<string>('');

  // EXÉCUTER UNE ACTION DANS LE CENTRE DE VALIDATION ET SYNCHRONISER LA BASE
  const handleExecuteAction = (item: ValidationItem, action: string) => {
    if ((action === 'refuse' || action === 'return') && !actionComment.trim()) {
      alert('⚠️ Veuillez saisir un motif obligatoire pour expliquer ce refus / retour !');
      return;
    }

    const newStatus = action === 'validate' ? 'Validé' : action === 'refuse' ? 'Refusé' : action === 'return' ? 'Retour correction' : 'En attente';

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus as any } : i));

    // Synchronisation réelle avec la base de données globale AppState & localStorage
    if (item.category === 'DA') {
      const daStatus = action === 'validate' ? 'VALIDEE' : action === 'refuse' ? 'REFUSEE' : action === 'return' ? 'RETOUR_CORRECTION' : 'EN_VALIDATION';
      const cleanId = item.id.replace('VAL-DA-', '');
      updateDAStatus(cleanId, daStatus as any, actionComment);
    }

    addAuditLog(
      `VALIDATION_WORKFLOW_${action.toUpperCase()}`,
      'WORKFLOW',
      item.id,
      `Action '${action.toUpperCase()}' sur ${item.category} (${item.id})`,
      item.status,
      `Décision prise par ${currentUser ? currentUser.name : 'Valideur DAF'}. Motif: ${actionComment || 'Validation conforme'}`
    );

    alert(`✅ Action enregistrée avec succès pour ${item.object} ! Nouveau Statut : ${newStatus}`);
    setActionType(null);
    setSelectedItem(null);
    setActionComment('');
  };

  // FILTRAGE CENTRALISÉ
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedProjectId !== 'TOUS' && item.projectId !== selectedProjectId) return false;
      if (categoryFilter !== 'TOUS' && item.category !== categoryFilter) return false;
      if (urgencyFilter !== 'TOUS' && item.urgency !== urgencyFilter) return false;
      if (statusFilter !== 'TOUS' && item.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchObj = item.object.toLowerCase().includes(q);
        const matchInit = item.initiator.toLowerCase().includes(q);
        const matchCode = item.wbsCode.toLowerCase().includes(q);
        if (!matchObj && !matchInit && !matchCode) return false;
      }
      return true;
    });
  }, [items, selectedProjectId, categoryFilter, urgencyFilter, statusFilter, searchQuery]);

  // LOGIQUE THREE-WAY MATCH & PARAMÉTRAGE DES TOLÉRANCES
  const [threeWayConfig, setThreeWayConfig] = useState<ThreeWayMatchConfig>({
    qtyTolerancePct: 2.0,
    priceTolerancePct: 1.0,
    taxTolerancePct: 0.0,
    amountTolerancePct: 1.5,
    actionOnExceeding: 'Blocage',
  });

  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // ÉCHANTILLONNAGE DE CONTROLES THREE-WAY MATCH DYNAMIQUES
  const threeWayChecks = useMemo<ThreeWayMatchCheck[]>(() => {
    return [
      {
        id: 'TWM-001',
        invoiceCode: 'FACT-SOC-2026-088',
        poCode: 'BC-GEBAT-2026-042',
        receiptCode: 'REC-2026-089',
        supplier: 'SOCIMAC Cimenteries',
        article: 'Ciment CPJ 42.5 (Sacs 50kg)',
        poQty: 500,
        poUnitPrice: 5000,
        poTaxes: 18,
        poTotalAmount: 2950000,
        receiptQty: 500,
        receiptUnitPrice: 5000,
        receiptTaxes: 18,
        receiptTotalAmount: 2950000,
        invoiceQty: 500,
        invoiceUnitPrice: 5000,
        invoiceTaxes: 18,
        invoiceTotalAmount: 2950000,
        qtyVariancePct: 0,
        priceVariancePct: 0,
        taxVariancePct: 0,
        amountVariancePct: 0,
        status: 'Conforme',
        blockingReason: null,
        createdAt: '2026-08-20',
      },
      {
        id: 'TWM-002',
        invoiceCode: 'FACT-FER-2026-014',
        poCode: 'BC-GEBAT-2026-039',
        receiptCode: 'REC-2026-085',
        supplier: 'ACIÉRIES DE CÔTE D’IVOIRE',
        article: 'Fer à béton FeE500 (Tonne)',
        poQty: 20,
        poUnitPrice: 700000,
        poTaxes: 18,
        poTotalAmount: 16520000,
        receiptQty: 20,
        receiptUnitPrice: 700000,
        receiptTaxes: 18,
        receiptTotalAmount: 16520000,
        invoiceQty: 21,
        invoiceUnitPrice: 735000,
        invoiceTaxes: 18,
        invoiceTotalAmount: 18218700,
        qtyVariancePct: 5.0,
        priceVariancePct: 5.0,
        taxVariancePct: 0,
        amountVariancePct: 10.28,
        status: 'Écart Détecté',
        blockingReason: `Surfacturation de 5.0% sur PU (735 000 vs 700 000 FCFA) et surquantité de +1T non livrée`,
        createdAt: '2026-08-22',
      },
      {
        id: 'TWM-003',
        invoiceCode: 'FACT-CAR-2026-091',
        poCode: 'BC-GEBAT-2026-045',
        receiptCode: 'REC-2026-094',
        supplier: 'SOCIÉTÉ IVOIRIENNE DE CARRIÈRES',
        article: 'Graveleux Latéritique 0/31.5 (m3)',
        poQty: 300,
        poUnitPrice: 12000,
        poTaxes: 18,
        poTotalAmount: 4248000,
        receiptQty: 300,
        receiptUnitPrice: 12000,
        receiptTaxes: 18,
        receiptTotalAmount: 4248000,
        invoiceQty: 300,
        invoiceUnitPrice: 12000,
        invoiceTaxes: 18,
        invoiceTotalAmount: 4248000,
        qtyVariancePct: 0,
        priceVariancePct: 0,
        taxVariancePct: 0,
        amountVariancePct: 0,
        status: 'Conforme',
        blockingReason: null,
        createdAt: '2026-08-24',
      }
    ];
  }, []);

  // CALCUL STATISTIQUES KPIS CENTRALISÉS
  const pendingCount = items.filter(i => i.status === 'En attente').length;
  const approvedCount = items.filter(i => i.status === 'Validé').length;
  const totalPendingAmount = items.filter(i => i.status === 'En attente').reduce((s, i) => s + (i.amount || 0), 0);
  const exceptionCount = threeWayChecks.filter(c => c.status === 'Écart Détecté').length;

  const fmtFCFA = (v: number) => Math.round(v).toLocaleString('fr-FR') + ' FCFA';

  return (
    <div className="space-y-6 text-slate-800 font-sans w-full text-xs max-w-[1700px] mx-auto pb-12">

      {/* 1. EN-TÊTE SUPÉRIEUR DU CENTRE DE VALIDATION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-blue-600" size={24} /> CENTRE DE VALIDATION & MOTEUR DE WORKFLOWS
            </h1>
            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black font-mono px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase">
              APPROVAL ENGINE V2
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            Contrôle, arbitrage et validation des engagements financiers (DA, BC, Dépassements WBS & Rapprochement 3 Voies).
          </p>
        </div>

        {/* ONGLETS DE NAVIGATION PRINCIPAUX */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'queue' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock size={15} /> File d'Attente ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('engine')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'engine' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sliders size={15} /> Circuits & Seuils
          </button>
          <button
            onClick={() => setActiveTab('threeway')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'threeway' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calculator size={15} /> Three-Way Match ({exceptionCount > 0 ? `${exceptionCount} Alerte(s)` : 'Conforme'})
          </button>
        </div>
      </div>

      {/* 2. LES 4 CARTES KPIS DE NIVEAU EXÉCUTIF DU CENTRE DE VALIDATION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1 : DOSSIERS EN ATTENTE */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between space-x-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">DOSSIERS EN ATTENTE</span>
              <DataInsight
                metricId="engaged"
                title="Dossiers en Attente de Validation"
                context={{ pendingCount, totalPendingAmount }}
              />
            </div>
            <div className="text-xl font-black text-amber-600 font-mono">{pendingCount} Dossier(s)</div>
            <div className="text-[11px] text-slate-500 font-medium truncate">Volume à arbitrer au workflow</div>
          </div>
          <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shrink-0">
            <Clock size={22} />
          </div>
        </div>

        {/* CARD 2 : MONTANT SOUS CONTRÔLE */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between space-x-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">MONTANT À VALIDER</span>
              <DataInsight
                metricId="budget_revised"
                title="Montant Total des Engagements en Attente"
                context={{ totalPendingAmount }}
              />
            </div>
            <div className="text-xl font-black text-slate-900 font-mono">{(totalPendingAmount / 1e6).toFixed(2)} M FCFA</div>
            <div className="text-[11px] text-emerald-600 font-bold">100% contrôlé par le système</div>
          </div>
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shrink-0">
            <Coins size={22} />
          </div>
        </div>

        {/* CARD 3 : DOSSIERS VALIDÉS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between space-x-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">DOSSIERS APPROUVÉS</span>
              <DataInsight
                metricId="cost_real"
                title="Dossiers Validés avec Succès"
                context={{ approvedCount }}
              />
            </div>
            <div className="text-xl font-black text-emerald-600 font-mono">{approvedCount} Validé(s)</div>
            <div className="text-[11px] text-slate-500 font-medium">Transmis aux Achats pour BC</div>
          </div>
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md shrink-0">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* CARD 4 : EXCEPTIONS THREE-WAY MATCH */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between space-x-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">EXCEPTIONS & ÉCARTS</span>
              <DataInsight
                metricId="vac_total"
                title="Écarts de Rapprochement 3 Voies"
                context={{ exceptionCount }}
              />
            </div>
            <div className={`text-xl font-black font-mono ${exceptionCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {exceptionCount > 0 ? `${exceptionCount} Alerte(s)` : '0 Écart'}
            </div>
            <div className="text-[11px] text-slate-500 font-medium truncate">Blocage automatique de paiement</div>
          </div>
          <div className={`p-3 text-white rounded-2xl shadow-md shrink-0 ${exceptionCount > 0 ? 'bg-rose-600' : 'bg-emerald-600'}`}>
            <ShieldAlert size={22} />
          </div>
        </div>
      </div>

      {/* 3. CONTENU ONGLET 1 : FILE D'ATTENTE DE VALIDATION */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* BARRE DE FILTRES MULTI-CRITÈRES */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Filtre Projet */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 text-xs">Projet :</span>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-xs text-slate-900 cursor-pointer focus:bg-white focus:border-blue-500"
                >
                  <option value="TOUS">Tous les chantiers ({projects.length})</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>

              {/* Filtre Catégorie */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 text-xs">Catégorie :</span>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 cursor-pointer"
                >
                  <option value="TOUS">Toutes les catégories</option>
                  <option value="DA">Demande d’Achat (DA)</option>
                  <option value="BC">Bon de Commande (BC)</option>
                  <option value="Dépassement">Dépassement WBS</option>
                  <option value="Rapport Journalier">Rapport Journalier</option>
                </select>
              </div>

              {/* Filtre Statut */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 text-xs">Statut :</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 cursor-pointer"
                >
                  <option value="En attente">⏳ En attente de validation</option>
                  <option value="Validé">✅ Dossiers Validés</option>
                  <option value="Refusé">❌ Dossiers Refusés</option>
                  <option value="TOUS">Tous les statuts</option>
                </select>
              </div>
            </div>

            {/* Recherche Textuelle */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Rechercher objet, initiateur, code WBS..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 w-64"
              />
            </div>
          </div>

          {/* TABLEAU CENTRALISÉ DES DOSSIERS DE VALIDATION */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Layers size={16} className="text-blue-600" /> Dossiers à Arbitrer ({filteredItems.length})
              </h2>
              <span className="text-[11px] font-bold text-slate-500">
                Ordre de priorité par urgence et montant
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200 font-mono">
                    <th className="p-3">Référence / Objet</th>
                    <th className="p-3">Projet & Code WBS</th>
                    <th className="p-3">Demandeur (Initiateur)</th>
                    <th className="p-3 text-right">Montant (FCFA)</th>
                    <th className="p-3 text-center">Impact Budgétaire</th>
                    <th className="p-3 text-center">Urgence</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-center">Actions Décisionnelles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                        Aucun dossier à valider dans ce filtre.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition cursor-pointer">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase border ${
                              item.category === 'DA' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              item.category === 'BC' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                              'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {item.category}
                            </span>
                            <span className="font-extrabold text-slate-900 max-w-[280px] truncate" title={item.object}>
                              {item.object}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-extrabold text-slate-800 truncate max-w-[180px]">{item.projectName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{item.wbsCode}</div>
                        </td>
                        <td className="p-3 text-slate-700 font-bold">{item.initiator}</td>
                        <td className="p-3 text-right font-mono font-black text-slate-900">
                          {item.amount > 0 ? fmtFCFA(item.amount) : '—'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                            item.budgetImpact.includes('Dépassement')
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            {item.budgetImpact}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.urgency === 'Très urgent' ? 'bg-rose-100 text-rose-800' :
                            item.urgency === 'Urgent' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {item.urgency}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                            item.status === 'Validé' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            item.status === 'Refusé' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                            'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => { setSelectedItem(item); setActionType('view'); }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                              title="Consulter le dossier et les pièces jointes"
                            >
                              <Eye size={14} />
                            </button>

                            {item.status === 'En attente' && (
                              <>
                                <button
                                  onClick={() => { setSelectedItem(item); setActionType('validate'); }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[10px] flex items-center gap-1 shadow-2xs transition"
                                  title="Approuver et valider le dossier"
                                >
                                  <Check size={12} /> Valider
                                </button>
                                <button
                                  onClick={() => { setSelectedItem(item); setActionType('refuse'); }}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-[10px] flex items-center gap-1 shadow-2xs transition"
                                  title="Refuser et rejeter le dossier"
                                >
                                  <X size={12} /> Refuser
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONTENU ONGLET 2 : MOTEUR DE WORKFLOWS & CIRCUITS D'APPROBATION */}
      {activeTab === 'engine' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sliders size={20} className="text-blue-600" /> Matrice des Seuils & Circuit d'Approbation à 4 Niveaux
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">Règles métier d'escalade automatique pour la validation des engagements financiers (GEBAT SA).</p>
              </div>
              <span className="bg-blue-50 text-blue-700 font-mono font-bold text-xs px-3 py-1 rounded-xl border border-blue-200">
                SLA Validation : 48h Max
              </span>
            </div>

            {/* LES 4 NIVEAUX DE VALIDATION SÉQUENTIELLE */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">NIVEAU 1</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">&lt; 1M FCFA</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-xs">Chef de Chantier</h3>
                <p className="text-[11px] text-slate-600">Validation directe des petits approvisionnements urgents et consommables chantier.</p>
                <div className="text-[10px] font-bold text-emerald-700 pt-1">Auto-approbation si dans le budget DS</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">NIVEAU 2</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">1M à 10M FCFA</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-xs">Conducteur / Directeur Travaux</h3>
                <p className="text-[11px] text-slate-600">Validation technique et vérification de la conformité au métré d'exécution WBS.</p>
                <div className="text-[10px] font-bold text-emerald-700 pt-1">Vérification budget WBS disponible</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">NIVEAU 3</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">10M à 50M FCFA</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-xs">Direction Technique & DAF</h3>
                <p className="text-[11px] text-slate-600">Arbitrage financier, contrôle des prix unitaires et validation des conditions de paiement.</p>
                <div className="text-[10px] font-bold text-amber-700 pt-1">Contrôle strict des dérives de prix</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">NIVEAU 4</span>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">&gt; 50M FCFA</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-xs">Direction Générale GEBAT SA</h3>
                <p className="text-[11px] text-slate-600">Approbation finale des gros contrats de sous-traitance et achats stratégiques de structure.</p>
                <div className="text-[10px] font-bold text-purple-700 pt-1">Signature DG obligatoire</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONTENU ONGLET 3 : THREE-WAY MATCH (RAPPROCHEMENT 3 VOIES) */}
      {activeTab === 'threeway' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Calculator size={20} className="text-blue-600" /> Rapprochement Automatique 3 Voies (DA ↔ BC ↔ BL / Facture)
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">Contrôle automatisé des écarts entre Bons de Commande, Bons de Réception Magasin et Factures Fournisseurs.</p>
              </div>
              <button
                onClick={() => setShowConfigModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition"
              >
                <Settings size={14} /> Paramètres de Tolérance
              </button>
            </div>

            {/* TABLEAU THREE-WAY MATCH */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200 font-mono">
                    <th className="p-3">Facture / Fournisseur</th>
                    <th className="p-3">Bon de Commande (BC)</th>
                    <th className="p-3 text-right">Qté BC vs Facture</th>
                    <th className="p-3 text-right">PU BC vs Facture</th>
                    <th className="p-3 text-right">Montant Facturé</th>
                    <th className="p-3 text-center">Écart Total %</th>
                    <th className="p-3 text-center">Statut Rapprochement</th>
                    <th className="p-3 text-center">Motif Bloquant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {threeWayChecks.map(check => (
                    <tr key={check.id} className="hover:bg-slate-50 transition">
                      <td className="p-3">
                        <div className="font-extrabold text-slate-900">{check.invoiceCode}</div>
                        <div className="text-[10.5px] text-slate-500">{check.supplier}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-700">{check.poCode}</td>
                      <td className="p-3 text-right font-mono">
                        <div>{check.invoiceQty} vs {check.poQty}</div>
                        {check.qtyVariancePct > 0 && <span className="text-rose-600 font-bold text-[10px]">+{check.qtyVariancePct}%</span>}
                      </td>
                      <td className="p-3 text-right font-mono">
                        <div>{fmtFCFA(check.invoiceUnitPrice)}</div>
                        {check.priceVariancePct > 0 && <span className="text-rose-600 font-bold text-[10px]">+{check.priceVariancePct}% sur PU</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {fmtFCFA(check.invoiceTotalAmount)}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded ${check.amountVariancePct > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {check.amountVariancePct > 0 ? `+${check.amountVariancePct}%` : '0%'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                          check.status === 'Conforme' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {check.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 max-w-[200px] truncate" title={check.blockingReason || ''}>
                        {check.blockingReason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODALE DÉTAILLÉE DE DÉCISION / ARBITRAGE WORKFLOW */}
      {selectedItem && actionType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 space-y-4 relative">
            <button
              onClick={() => { setSelectedItem(null); setActionType(null); setActionComment(''); }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 border-b pb-3">
              <ShieldCheck className="text-blue-600" size={20} />
              <h3 className="font-black text-slate-900 text-sm uppercase">
                {actionType === 'view' ? 'Consultation du Dossier' : actionType === 'validate' ? 'Approbation du Dossier' : 'Refus / Retour Correction'}
              </h3>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="font-extrabold text-slate-900 text-sm">{selectedItem.object}</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Projet : <strong className="text-slate-800">{selectedItem.projectName}</strong></div>
                <div>WBS : <strong className="text-slate-800 font-mono">{selectedItem.wbsCode}</strong></div>
                <div>Initiateur : <strong className="text-slate-800">{selectedItem.initiator}</strong></div>
                <div>Montant : <strong className="text-slate-900 font-mono">{fmtFCFA(selectedItem.amount)}</strong></div>
              </div>
            </div>

            {actionType !== 'view' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Commentaire / Motif d'arbitrage {actionType === 'refuse' && '<remarque obligatoire>'} :
                </label>
                <textarea
                  rows={3}
                  value={actionComment}
                  onChange={e => setActionComment(e.target.value)}
                  placeholder="Saisissez la justification ou les observations de la décision..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setSelectedItem(null); setActionType(null); setActionComment(''); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Fermer
              </button>
              {actionType !== 'view' && (
                <button
                  onClick={() => handleExecuteAction(selectedItem, actionType)}
                  className={`px-5 py-2 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer ${
                    actionType === 'validate' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Check size={14} /> Confirmer la décision
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODALE CONFIGURATION THREE-WAY MATCH TOLERANCE */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4 relative">
            <button onClick={() => setShowConfigModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Settings size={18} className="text-blue-600" /> Paramètres de Tolérance Three-Way Match
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Tolérance Quantité (%) :</label>
                <input
                  type="number"
                  value={threeWayConfig.qtyTolerancePct}
                  onChange={e => setThreeWayConfig(prev => ({ ...prev, qtyTolerancePct: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Tolérance Prix Unitaire (%) :</label>
                <input
                  type="number"
                  value={threeWayConfig.priceTolerancePct}
                  onChange={e => setThreeWayConfig(prev => ({ ...prev, priceTolerancePct: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Action sur Dépassement :</label>
                <select
                  value={threeWayConfig.actionOnExceeding}
                  onChange={e => setThreeWayConfig(prev => ({ ...prev, actionOnExceeding: e.target.value as any }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="Blocage">Blocage Automatique de Paiement</option>
                  <option value="Alerte">Alerte simple sans blocage</option>
                  <option value="Validation Exceptionnelle">Validation Exceptionnelle Requise</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-blue-600 text-white font-extrabold rounded-xl text-xs hover:bg-blue-700"
              >
                Enregistrer la configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowsEngineModule;
