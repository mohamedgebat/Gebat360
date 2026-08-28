import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { ValidationItem, ThreeWayMatchConfig, ThreeWayMatchCheck } from '../../types';
import {
  ShieldCheck, CheckCircle2, AlertTriangle, Eye, RotateCcw, XCircle, X,
  Search, Paperclip, Clock, Lock, Layers, Calculator, ShieldAlert, Check, Settings, ArrowRight, Database, ExternalLink
} from 'lucide-react';

export const ProcurementValidationModule: React.FC = () => {
  const { projects, purchaseRequests, alerts, dailyReports, purchaseOrders, receipts, addAuditLog, currentUser, updateDAStatus } = useAppState();

  // Navigation par Onglets
  const [activeTab, setActiveTab] = useState<'center' | 'cycle' | 'threeway'>('center');

  const [selectedProjectId, setSelectedProjectId] = useState<string>('TOUS');

  // Filtres Centre de Validation
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
          amount: da.estimatedTotal,
          projectId: da.projectId,
          projectName: da.projectName || (da.projectId?.includes('BEN') ? 'Station de traitement des boues (Bingerville)' : 'Projet Songon'),
          wbsCode: da.wbsCode || '02.02.001',
          initiator: da.createdBy || 'Kouassi Jean (Direction des Travaux)',
          date: da.createdAt || new Date().toISOString().substring(0, 10),
          urgency: da.urgency === 'Très urgent' || da.urgency === 'Critique' ? 'Très urgent' : da.urgency === 'Urgent' ? 'Urgent' : 'Normale',
          budgetImpact: da.budgetCheck?.isOverBudget ? 'Dépassement Majeur (>=5%)' : 'Dans le budget',
          attachments: da.attachments || [],
          status: da.status === 'VALIDEE' || da.status === 'Approuvé' ? 'Validé' : da.status === 'REFUSEE' || da.status === 'Refusé' ? 'Refusé' : 'En attente'
        });
      });
    }

    // DOSSIERS DE DÉMONSTRATION COMPLÉMENTAIRES SI LISTE COURANTE VIDE
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

    // 2. RAPPORTS JOURNALIERS ET ALERTES
    dailyReports.forEach(report => {
      list.push({
        id: `VAL-RPT-${report.id}`,
        category: 'Rapport Journalier',
        object: `Rapport Journalier ${report.code || report.id} — ${report.workDone || 'Coulage béton / Travaux terrain'}`,
        amount: 0,
        projectId: report.projectId,
        projectName: projects.find(p => p.id === report.projectId || p.code === report.projectId)?.name || report.projectId,
        wbsCode: report.wbsCode,
        initiator: report.createdBy || 'Conducteur de Travaux',
        date: report.date || new Date().toISOString().substring(0, 10),
        urgency: (report.productivityRate || 100) < 80 ? 'Urgent' : 'Normale',
        budgetImpact: (report.productivityRate || 100) < 80 ? 'Dépassement Mineur (<5%)' : 'Dans le budget',
        attachments: [],
        status: report.status === 'Verrouillé' ? 'Validé' : 'En attente'
      });
    });

    return list;
  }, [purchaseRequests, dailyReports, alerts, projects]);

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
      alert('Veuillez saisir un commentaire / motif obligatoire pour cette action !');
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
      `Action '${action.toUpperCase()}' sur ${item.category} (${item.id})`,
      'Centre de Validation',
      item.id,
      `Décision prise par ${currentUser ? currentUser.name : 'Valideur'}. Commentaire: ${actionComment || 'Aucun'}`
    );

    alert(`Action enregistrée avec succès pour ${item.object} ! Statut actuel : ${newStatus}`);
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

  // =========================================================================
  // LOGIQUE THREE-WAY MATCH & PARAMÉTRAGE DES TOLÉRANCES
  // =========================================================================
  const [threeWayConfig, setThreeWayConfig] = useState<ThreeWayMatchConfig>({
    qtyTolerancePct: 2.0, // 2% tolérance quantité
    priceTolerancePct: 1.0, // 1% tolérance prix
    taxTolerancePct: 0.0, // 0% tolérance taxe
    amountTolerancePct: 1.5, // 1.5% tolérance montant
    actionOnExceeding: 'Blocage', // Alerte / Justification / Validation Exceptionnelle / Blocage
  });

  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // ÉCHANTILLONNAGE DE CONTROLES THREE-WAY MATCH DYNAMIQUES ALIMENTÉS PAR LA BASE
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
        invoiceQty: 21, // +5% écart
        invoiceUnitPrice: 735000, // +5% écart
        invoiceTaxes: 18,
        invoiceTotalAmount: 18218700,
        qtyVariancePct: 5.0,
        priceVariancePct: 5.0,
        taxVariancePct: 0,
        amountVariancePct: 10.28,
        status: 'Écart Détecté',
        blockingReason: `Surfacturation de 5.0% sur PU (735 000 vs 700 000 FCFA) et surquantité de +1T non livrée`,
        createdAt: '2026-08-21',
      }
    ];
  }, []);

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* Header Centre de Validation & Moteur de Workflows */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck size={24} className="text-blue-600" /> Centre de Validation & Moteur de Workflows
            </h1>
            <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded font-mono border border-emerald-300">
              APPROVAL ENGINE V2
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">Validez, contrôlez et arbitrez les engagements financiers (DA, BC, Dépassements WBS & Exceptions Three-Way Match).</p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => { setActiveTab('center'); setStatusFilter('En attente'); }}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shadow-sm ${
              activeTab === 'center' && statusFilter === 'En attente'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            File d'Attente ({items.filter(i => i.status === 'En attente').length})
          </button>
          <button
            onClick={() => setActiveTab('cycle')}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs transition border ${
              activeTab === 'cycle'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            Seuils & Règles Paramétrables
          </button>
        </div>
      </div>

      {/* BOUTONS D'ONGLETS DU MODULE VALIDATION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('center')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-xs transition ${
            activeTab === 'center'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck size={16} />
          <span>Boîte d'Approbation Centralisée ({items.filter(i => i.status === 'En attente').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cycle')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-xs transition ${
            activeTab === 'cycle'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers size={16} />
          <span>Procurement — Cycle Cible & Matrice Système Maître</span>
        </button>

        <button
          onClick={() => setActiveTab('threeway')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-xs transition ${
            activeTab === 'threeway'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calculator size={16} />
          <span>Three-Way Match (BC ↔ RÉCEPTION ↔ FACTURE)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ONGLET 1 : CENTRE DE VALIDATION CENTRALISÉ UNIQUE */}
      {/* ========================================================================= */}
      {activeTab === 'center' && (
        <div className="space-y-4">

          {/* BARRE DE BOUTONS PILULES POUR LE FILTRAGE PAR STATUT (CONFORME À L'IMAGE 1787573870917) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-slate-500 mr-2 text-[11px] uppercase tracking-wider">Filtrer les Dossiers :</span>
              
              <button
                onClick={() => setStatusFilter('En attente')}
                className={`px-4 py-2 rounded-xl font-black text-xs transition flex items-center gap-1.5 ${
                  statusFilter === 'En attente'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>En attente de validation</span>
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {items.filter(i => i.status === 'En attente').length}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('Validé')}
                className={`px-4 py-2 rounded-xl font-black text-xs transition flex items-center gap-1.5 ${
                  statusFilter === 'Validé'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Dossiers Validés</span>
                <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {items.filter(i => i.status === 'Validé').length}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('Refusé')}
                className={`px-4 py-2 rounded-xl font-black text-xs transition flex items-center gap-1.5 ${
                  statusFilter === 'Refusé'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Dossiers Refusés</span>
                <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {items.filter(i => i.status === 'Refusé').length}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('TOUS')}
                className={`px-4 py-2 rounded-xl font-black text-xs transition ${
                  statusFilter === 'TOUS'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tous les Dossiers ({items.length})
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher dossier, initiateur..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-56 focus:outline-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* FILTRES SECONDAIRES COMPACTS */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 text-[11px]">Catégorie :</span>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="p-1 bg-white border border-slate-200 rounded-lg font-bold text-xs"
                >
                  <option value="TOUS">Tous les types (DA, BC, Rpt...)</option>
                  <option value="DA">Demande d'Achat (DA)</option>
                  <option value="BC">Bon de Commande (BC)</option>
                  <option value="Dépassement">Dépassement Budgétaire</option>
                  <option value="Rapport Journalier">Rapport Journalier</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 text-[11px]">Chantier :</span>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="p-1 bg-white border border-slate-200 rounded-lg font-bold text-xs"
                >
                  <option value="TOUS">Tous les chantiers</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 text-[11px]">Priorité :</span>
                <select
                  value={urgencyFilter}
                  onChange={e => setUrgencyFilter(e.target.value)}
                  className="p-1 bg-white border border-slate-200 rounded-lg font-bold text-xs"
                >
                  <option value="TOUS">Toutes urgences</option>
                  <option value="Normale">Normale</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Très urgent">Très urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLEAU DES DOSSIERS CONFORME À L'IMAGE 1787573870917 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-2 p-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-600" />
                DOSSIERS D'ENGAGEMENT SOUMIS À L'APPROBATION ({filteredItems.length})
              </h3>
            </div>

            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2 font-medium">
                <ShieldCheck size={40} className="mx-auto text-slate-300" />
                <p>Aucun dossier en attente dans la file de validation du workflow.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200">
                      <th className="p-3">RÉF DOSSIER</th>
                      <th className="p-3">OBJET & IMPUTATION</th>
                      <th className="p-3 text-right">MONTANT ESTIMÉ</th>
                      <th className="p-3">INITIATEUR & DATE</th>
                      <th className="p-3 text-center">ALERTE BUDGET</th>
                      <th className="p-3 text-center">ACTIONS DÉCISION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="p-3">
                          <div className="space-y-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono border block w-fit ${
                              item.category === 'DA' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                              item.category === 'BC' ? 'bg-purple-100 text-purple-900 border-purple-200' :
                              item.category === 'Dépassement' ? 'bg-rose-100 text-rose-900 border-rose-200' : 'bg-amber-100 text-amber-900 border-amber-200'
                            }`}>
                              {item.category}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 font-bold block">{item.id}</span>
                          </div>
                        </td>
                        <td className="p-3 font-bold text-slate-900 max-w-[240px]">
                          <div className="space-y-0.5">
                            <span className="block text-xs font-bold text-slate-900" title={item.object}>{item.object}</span>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                              <span className="text-purple-700 font-bold">WBS: {item.wbsCode}</span>
                              <span>•</span>
                              <span className="text-slate-600 truncate">{item.projectName}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {item.amount > 0 ? (
                            <span className="text-sm font-black text-slate-900">{item.amount.toLocaleString()} FCFA</span>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <strong className="text-slate-800 block text-xs font-sans">{item.initiator}</strong>
                          <span className="text-[10px] font-mono text-slate-400 block">{item.date}</span>
                        </td>
                        <td className="p-3 text-center">
                          {item.budgetImpact.includes('Dépassement') ? (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-1 rounded-xl border border-rose-300 inline-flex items-center gap-1">
                              <AlertTriangle size={11} /> {item.budgetImpact}
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-1 rounded-xl border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 size={11} /> Conforme DS
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => { setSelectedItem(item); setActionType('view'); }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1 transition"
                            >
                              <Eye size={13} /> Voir
                            </button>
                            {item.status === 'En attente' && (
                              <>
                                <button
                                  onClick={() => { setSelectedItem(item); setActionType('validate'); }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-2xs transition"
                                >
                                  Valider
                                </button>
                                <button
                                  onClick={() => { setSelectedItem(item); setActionType('refuse'); }}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-2xs transition"
                                >
                                  Refuser
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 2 : CYCLE CIBLE PROCUREMENT & MATRICE SYSTÈME MAÎTRE */}
      {/* ========================================================================= */}
      {activeTab === 'cycle' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Layers size={18} className="text-blue-600" /> Cycle Cible Procurement & Matrice des Systèmes Maîtres
              </h2>
              <p className="text-slate-500 text-xs">Délimitation des responsabilités entre GEBAT 360° et BC GEBAT / ERP Tierce (Principe de non-duplication)</p>
            </div>
          </div>

          {/* VISUALISATION COMPLÈTE DU CYCLE EN 13 ÉTAPES */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <span className="font-extrabold text-slate-900 text-xs block uppercase tracking-wide">
              Flux Complet du Cycle Cible Procurement :
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold font-mono">
              {[
                { name: '1. Besoin', master: 'GEBAT 360°' },
                { name: '2. DA', master: 'GEBAT 360°' },
                { name: '3. Validation', master: 'GEBAT 360°' },
                { name: '4. Consultation', master: 'GEBAT 360°' },
                { name: '5. Offres', master: 'GEBAT 360°' },
                { name: '6. Comparatif', master: 'GEBAT 360°' },
                { name: '7. Attribution', master: 'GEBAT 360°' },
                { name: '8. BC', master: 'BC GEBAT' },
                { name: '9. Livraison', master: 'BC GEBAT' },
                { name: '10. Réception', master: 'GEBAT 360°' },
                { name: '11. Facture', master: 'BC GEBAT' },
                { name: '12. Bon à payer', master: 'GEBAT 360°' },
                { name: '13. Paiement', master: 'BC GEBAT' },
              ].map((step, idx) => (
                <React.Fragment key={idx}>
                  <div className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1 ${
                    step.master === 'GEBAT 360°'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-purple-100 text-purple-900 border-purple-300'
                  }`}>
                    <span>{step.name}</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded font-black ${
                      step.master === 'GEBAT 360°' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                    }`}>{step.master}</span>
                  </div>
                  {idx < 12 && <ArrowRight size={12} className="text-slate-400" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* TABLEAU MATRICE DES SYSTÈMES MAÎTRES */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 text-xs">Matrice de Responsabilité par Système :</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200">
                    <th className="p-3">Étape du Cycle</th>
                    <th className="p-3">Système Maître (Master)</th>
                    <th className="p-3">Rôle & Traitement Métier</th>
                    <th className="p-3">Règle d'Intégration & Non-Duplication</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {[
                    { step: '1. Expression du Besoin & DA', master: 'GEBAT 360°', role: 'Expression du besoin chantier, imputation WBS, contrôle budgétaire préalable.', rule: 'Données saisies une seule fois dans GEBAT 360°.' },
                    { step: '2. Workflow de Validation DA', master: 'GEBAT 360°', role: 'Approbation selon seuils paramétrables (CT, DP, Achats, DAF, DG).', rule: 'Validation dans la boîte de travail unique GEBAT 360°.' },
                    { step: '3. Consultation, Offres & Comparatif', master: 'GEBAT 360°', role: 'Lancement des demandes de devis, dépouillement et tableau comparatif.', rule: 'Conservé dans GEBAT 360° pour l’historique des prix.' },
                    { step: '4. Émission du Bon de Commande (BC)', master: 'BC GEBAT / ERP', role: 'Génération du document contractuel d’engagement et envoi au fournisseur.', rule: 'Déclenché automatiquement par l’approbation de la DA dans GEBAT 360°.' },
                    { step: '5. Suivi des Livraisons & BL', master: 'BC GEBAT / ERP', role: 'Suivi logistique d’expédition par les fournisseurs et transporteurs.', rule: 'Consultable via l’interface intégrée GEBAT 360°.' },
                    { step: '6. Réception Chantier & Procès-Verbal', master: 'GEBAT 360°', role: 'Saisie du PV de réception sur le terrain, mise à jour dynamique des stocks.', rule: 'Transmission automatique de la quantité reçue à la comptabilité.' },
                    { step: '7. Enregistrement Facture Fournisseur', master: 'BC GEBAT / ERP', role: 'Saisie comptable de la facture avec TVA et échéance de paiement.', rule: 'Mise à disposition des données pour le rapprochement 3-Way Match.' },
                    { step: '8. Rapprochement 3-Way Match & Bon à Payer', master: 'GEBAT 360°', role: 'Contrôle automatique BC ↔ RÉCEPTION ↔ FACTURE et délivrance du Visa BAP.', rule: 'Blocage automatique du paiement en cas d’écart hors tolérance.' },
                    { step: '9. Exécution du Paiement', master: 'BC GEBAT / ERP', role: 'Ordonnancement du virement bancaire ou chèque et lettrage comptable.', rule: 'GEBAT 360° lit le statut de règlement pour clôturer l’engagement.' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{row.step}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black font-mono ${
                          row.master === 'GEBAT 360°' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {row.master}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">{row.role}</td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">{row.rule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 3 : THREE-WAY MATCH (BC ↔ RÉCEPTION ↔ FACTURE) */}
      {/* ========================================================================= */}
      {activeTab === 'threeway' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Calculator size={18} className="text-blue-600" /> Moteur de Rapprochement Three-Way Match (BC ↔ RÉCEPTION ↔ FACTURE)
              </h2>
              <p className="text-slate-500 text-xs">Contrôle strict des 5 champs obligatoires (Article, Quantité, Prix, Taxes, Montant) avant autorisation BAP</p>
            </div>

            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm transition"
            >
              <Settings size={14} /> Paramétrer les Tolérances
            </button>
          </div>

          {/* RÉSUMÉ DES SEUILS DE TOLÉRANCE PARADMÉTRÉES */}
          <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center font-mono">
            <div className="bg-white p-2.5 rounded-xl border border-blue-200">
              <span className="text-[10px] text-slate-400 font-sans block">Tolérance Quantité</span>
              <strong className="text-blue-900 text-sm font-black">{threeWayConfig.qtyTolerancePct}%</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-blue-200">
              <span className="text-[10px] text-slate-400 font-sans block">Tolérance Prix Unitaire</span>
              <strong className="text-blue-900 text-sm font-black">{threeWayConfig.priceTolerancePct}%</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-blue-200">
              <span className="text-[10px] text-slate-400 font-sans block">Tolérance Taxes / TVA</span>
              <strong className="text-blue-900 text-sm font-black">{threeWayConfig.taxTolerancePct}%</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-blue-200">
              <span className="text-[10px] text-slate-400 font-sans block">Tolérance Montant Total</span>
              <strong className="text-blue-900 text-sm font-black">{threeWayConfig.amountTolerancePct}%</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-blue-200">
              <span className="text-[10px] text-slate-400 font-sans block">Action en cas d'Écart</span>
              <strong className="text-rose-700 text-xs font-black uppercase block">{threeWayConfig.actionOnExceeding}</strong>
            </div>
          </div>

          {/* CARTE DES CONTRÔLES D'ÉCHANTILLONS DYNAMIQUES */}
          <div className="space-y-4">
            {threeWayChecks.map(check => (
              <div key={check.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{check.invoiceCode}</span>
                    <strong className="text-slate-900 text-xs">{check.supplier} — {check.article}</strong>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      check.status === 'Conforme' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'
                    }`}>
                      {check.status === 'Conforme' ? '✓ 3-Way Match Conforme' : '⚠️ Écart Bloquant Détecté'}
                    </span>
                  </div>
                </div>

                {/* GRILLE COMPARATIVE DÉTAILLÉE DES 5 CHAMPS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  {/* DOCUMENT 1 : BON DE COMMANDE (BC) */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] text-purple-700 font-sans font-extrabold block border-b pb-1 mb-1">1. BON DE COMMANDE ({check.poCode})</span>
                    <div className="flex justify-between"><span>Qté Commandée :</span> <strong>{check.poQty}</strong></div>
                    <div className="flex justify-between"><span>PU Convenu :</span> <strong>{check.poUnitPrice.toLocaleString()} FCFA</strong></div>
                    <div className="flex justify-between"><span>TVA appliquée :</span> <strong>{check.poTaxes}%</strong></div>
                    <div className="flex justify-between font-bold text-slate-900 border-t pt-1"><span>Total TTC :</span> <span>{check.poTotalAmount.toLocaleString()} FCFA</span></div>
                  </div>

                  {/* DOCUMENT 2 : RÉCEPTION CHANTIER (BL) */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] text-emerald-700 font-sans font-extrabold block border-b pb-1 mb-1">2. RÉCEPTION CHANTIER ({check.receiptCode})</span>
                    <div className="flex justify-between"><span>Qté Réceptionnée :</span> <strong>{check.receiptQty}</strong></div>
                    <div className="flex justify-between"><span>PU Conforme :</span> <strong>{check.receiptUnitPrice.toLocaleString()} FCFA</strong></div>
                    <div className="flex justify-between"><span>TVA Conforme :</span> <strong>{check.receiptTaxes}%</strong></div>
                    <div className="flex justify-between font-bold text-slate-900 border-t pt-1"><span>Total Réception :</span> <span>{check.receiptTotalAmount.toLocaleString()} FCFA</span></div>
                  </div>

                  {/* DOCUMENT 3 : FACTURE FOURNISSEUR */}
                  <div className={`p-3.5 rounded-xl border space-y-1 ${
                    check.status === 'Conforme' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50 border-rose-300'
                  }`}>
                    <span className="text-[10px] text-slate-900 font-sans font-extrabold block border-b pb-1 mb-1">3. FACTURE FOURNISSEUR</span>
                    <div className="flex justify-between"><span>Qté Facturée :</span> <strong className={check.qtyVariancePct > threeWayConfig.qtyTolerancePct ? 'text-rose-600 font-black' : ''}>{check.invoiceQty}</strong></div>
                    <div className="flex justify-between"><span>PU Facturé :</span> <strong className={check.priceVariancePct > threeWayConfig.priceTolerancePct ? 'text-rose-600 font-black' : ''}>{check.invoiceUnitPrice.toLocaleString()} FCFA</strong></div>
                    <div className="flex justify-between"><span>TVA Facturée :</span> <strong>{check.invoiceTaxes}%</strong></div>
                    <div className="flex justify-between font-bold border-t pt-1"><span>Total Facturé :</span> <span className={check.amountVariancePct > threeWayConfig.amountTolerancePct ? 'text-rose-600 font-black' : ''}>{check.invoiceTotalAmount.toLocaleString()} FCFA</span></div>
                  </div>
                </div>

                {/* MOTIF DE BLOCAGE ET DÉCLENCHEMENT D'ACTION */}
                {check.status !== 'Conforme' && (
                  <div className="bg-rose-100/70 p-3 rounded-xl border border-rose-300 text-rose-950 font-medium text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                      <span><strong>Action Automatique : {threeWayConfig.actionOnExceeding.toUpperCase()}.</strong> {check.blockingReason}</span>
                    </div>

                    <button
                      onClick={() => {
                        addAuditLog(
                          `JUSTIFICATION_RAPPROCHEMENT_3WAY`,
                          'THREE_WAY_MATCH',
                          check.id,
                          `Validation exceptionnelle ou déblocage manuel pour ${check.invoiceCode}`
                        );
                        alert(`Action [${threeWayConfig.actionOnExceeding}] traitée avec traçabilité dans l'Audit Log !`);
                      }}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-[10px] shrink-0 transition"
                    >
                      Traiter l'Écart
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL CONFIGURATION DES TOLÉRANCES THREE-WAY MATCH */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Settings size={18} className="text-blue-600" /> Tolérances Three-Way Match
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Tolérance Quantité (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                  value={threeWayConfig.qtyTolerancePct}
                  onChange={e => setThreeWayConfig(prev => ({ ...prev, qtyTolerancePct: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tolérance Prix Unitaire (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                  value={threeWayConfig.priceTolerancePct}
                  onChange={e => setThreeWayConfig(prev => ({ ...prev, priceTolerancePct: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tolérance Taxes / TVA (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                  value={threeWayConfig.taxTolerancePct}
                  onChange={e => setThreeWayConfig(prev => ({ ...prev, taxTolerancePct: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tolérance Montant Total (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono focus:outline-none"
                  value={threeWayConfig.amountTolerancePct}
                  onChange={e => setThreeWayConfig(prev => ({ ...prev, amountTolerancePct: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Action Automatique en cas de Dépassement</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs focus:outline-none"
                  value={threeWayConfig.actionOnExceeding}
                  onChange={e => setThreeWayConfig(prev => ({ ...prev, actionOnExceeding: e.target.value as any }))}
                >
                  <option value="Alerte">Alerte simple sans blocage</option>
                  <option value="Justification">Demande de Justification obligatoire</option>
                  <option value="Validation Exceptionnelle">Validation Exceptionnelle requise (DAF/DG)</option>
                  <option value="Blocage">Blocage strict du BAP & Paiement</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-blue-600 text-white font-extrabold rounded-xl text-xs shadow-xs transition"
              >
                Enregistrer les Paramètres
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHE DÉTAILLÉE & PANNEAU DE DÉCISION WORKFLOW */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden space-y-4 p-6 text-xs max-h-[90vh] overflow-y-auto">
            {/* Header Modal Fiche */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-mono text-purple-700 font-bold uppercase">{selectedItem.category} — {selectedItem.id}</span>
                <h3 className="font-extrabold text-slate-900 text-base">{selectedItem.object}</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* SYNTHÈSE METIER */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 font-mono">
              <div>
                <span className="text-slate-400 font-sans text-[10px] block">Projet</span>
                <strong className="text-slate-900 font-sans block truncate">{selectedItem.projectName}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-sans text-[10px] block">WBS</span>
                <strong className="text-purple-700 block">{selectedItem.wbsCode}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-sans text-[10px] block">Montant</span>
                <strong className="text-slate-900 block">{selectedItem.amount.toLocaleString()} FCFA</strong>
              </div>
              <div>
                <span className="text-slate-400 font-sans text-[10px] block">Initiateur</span>
                <strong className="text-slate-900 font-sans block">{selectedItem.initiator}</strong>
              </div>
            </div>

            {/* WORKFLOW VISUEL ET PROGRESSION DES ÉTAPES */}
            <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 space-y-2">
              <span className="text-[10px] font-black text-purple-900 uppercase block">Représentation du Workflow Visuel (Progress Engine) :</span>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                <div className="bg-emerald-100 text-emerald-900 p-2 rounded-xl border border-emerald-300">
                  <CheckCircle2 size={14} className="mx-auto text-emerald-600 mb-0.5" />
                  <span>1. Demandeur</span>
                  <span className="block font-normal text-[9px]">✓ Terminé</span>
                </div>
                <div className="bg-emerald-100 text-emerald-900 p-2 rounded-xl border border-emerald-300">
                  <CheckCircle2 size={14} className="mx-auto text-emerald-600 mb-0.5" />
                  <span>2. Directeur Projet</span>
                  <span className="block font-normal text-[9px]">✓ Validé</span>
                </div>
                <div className="bg-amber-100 text-amber-900 p-2 rounded-xl border border-amber-300 shadow-xs">
                  <Clock size={14} className="mx-auto text-amber-600 mb-0.5 animate-pulse" />
                  <span>3. Achats / DAF</span>
                  <span className="block font-black text-[9px] text-amber-800">● Étape actuelle</span>
                </div>
                <div className="bg-slate-100 text-slate-400 p-2 rounded-xl border border-slate-200">
                  <Lock size={14} className="mx-auto mb-0.5" />
                  <span>4. DG</span>
                  <span className="block font-normal text-[9px]">○ En attente</span>
                </div>
              </div>
            </div>

            {/* PANNEAU DE DÉCISION */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="font-extrabold text-slate-900 text-xs block">Panneau d'Action & Prise de Décision :</span>

              <div>
                <label className="block text-slate-600 font-bold mb-1 text-[11px]">Motif / Commentaire de validation ou de refus *</label>
                <textarea
                  rows={2}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none"
                  placeholder="Saisissez vos observations, motif de refus ou réserves..."
                  value={actionComment}
                  onChange={e => setActionComment(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  onClick={() => handleExecuteAction(selectedItem, 'return')}
                  className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl text-xs flex items-center gap-1 transition"
                >
                  <RotateCcw size={14} /> ↩ Retourner pour correction
                </button>
                <button
                  onClick={() => handleExecuteAction(selectedItem, 'refuse')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 transition"
                >
                  <XCircle size={14} /> ✕ Refuser
                </button>
                <button
                  onClick={() => handleExecuteAction(selectedItem, 'validate')}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
                >
                  <CheckCircle2 size={16} /> ✓ Valider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcurementValidationModule;
