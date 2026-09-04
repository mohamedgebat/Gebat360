import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../../core/database/realSongonDsData';
import { hasPermission, hasProjectAccess } from '../../core/permissions';
import { PurchaseRequest, PurchaseRequestItem } from '../../types';
import * as XLSX from 'xlsx';
import {
  ShoppingBag, Plus, Trash2, CheckCircle2, AlertTriangle, ShieldCheck,
  ArrowLeft, Calendar, FileText, Download, ChevronRight, ChevronDown, Paperclip,
  Clock, User, Info, Edit3, X, Search, Filter, Lock, Check, Send,
  FileSpreadsheet, Eye, Printer, Layers, Building2
} from 'lucide-react';

const formatFCFA = (val: number): string => {
  if (isNaN(val) || val === undefined || val === null) return '0 FCFA';
  return Math.round(val).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' FCFA';
};

const formatNumber = (val: number): string => {
  if (isNaN(val) || val === undefined || val === null) return '0';
  return Math.round(val).toLocaleString('fr-FR').replace(/\s/g, ' ');
};

const formatNumberQty = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  const rounded = Math.round(Number(val) * 100) / 100;
  return rounded.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).replace(/\s/g, ' ');
};

interface ProcurementDAModuleProps {
  onNavigateView?: (viewKey: string) => void;
  onBackToProject?: () => void;
  initialProjectId?: string;
}

export const ProcurementDAModule: React.FC<ProcurementDAModuleProps> = ({
  onNavigateView,
  onBackToProject,
  initialProjectId
}) => {
  const {
    projects = [],
    wbsMap = {},
    purchaseRequests = [],
    stockItems = [],
    createDA,
    updateDAStatus,
    addAuditLog,
    addAlert,
    currentUser,
    setActiveTab
  } = useAppState();

  // Filtrage des projets autorisés par le périmètre RBAC de l'utilisateur
  const authorizedProjects = useMemo(() => {
    return projects.filter(p => hasProjectAccess(currentUser, p.id) || hasProjectAccess(currentUser, p.code));
  }, [projects, currentUser]);

  // 1. PROJET SÉLECTIONNÉ (STRICTEMENT RÉEL DEPUIS LA BASE)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (initialProjectId) {
      const match = authorizedProjects.find(p => p.id === initialProjectId || p.code === initialProjectId);
      if (match) return match.id;
    }
    return authorizedProjects[0]?.id || authorizedProjects[0]?.code || '';
  });
  
  useEffect(() => {
    if (initialProjectId) {
      const match = authorizedProjects.find(p => p.id === initialProjectId || p.code === initialProjectId);
      if (match) {
        setSelectedProjectId(match.id);
      }
    } else if (!selectedProjectId && authorizedProjects.length > 0) {
      setSelectedProjectId(authorizedProjects[0]?.id || authorizedProjects[0]?.code || '');
    }
  }, [authorizedProjects, initialProjectId]);

  const selectedProject = useMemo(() => {
    return authorizedProjects.find(p => p.id === selectedProjectId || p.code === selectedProjectId) || authorizedProjects[0] || null;
  }, [authorizedProjects, selectedProjectId]);

  const handleBackTo360 = () => {
    if (onBackToProject) {
      onBackToProject();
    } else if (onNavigateView) {
      onNavigateView('project-detail');
    } else {
      setActiveTab?.('dashboard');
    }
  };

  // Toggle Vue Formulaire / Liste des DA enregistrées
  const [viewMode, setViewMode] = useState<'form' | 'list'>('form');

  // Filtres de la liste des DA & Modal détails
  const [listSearchQuery, setListSearchQuery] = useState<string>('');
  const [listStatusFilter, setListStatusFilter] = useState<string>('ALL');
  const [listUrgencyFilter, setListUrgencyFilter] = useState<string>('ALL');
  const [viewingDA, setViewingDA] = useState<PurchaseRequest | null>(null);

  // 2. ACTIVITÉS WBS & DÉBOURSÉ SEC RÉELLES SELON LE PROJET SÉLECTIONNÉ
  const projectDsActivities = useMemo(() => {
    if (!selectedProject) return [];
    const isBingerville = selectedProject.code?.includes('BEN') || selectedProject.id?.includes('BEN') || selectedProject.id === 'CIV-2026-ASS-BEN-002';
    const isSongon = selectedProject.code?.includes('SON') || selectedProject.id?.includes('SON') || selectedProject.id === 'CIV-2026-ASS-SON-001';

    if (isBingerville) return REAL_DS_BINGERVILLE_ACTIVITIES;
    if (isSongon) return REAL_DS_SONGON_ACTIVITIES;

    // Fallback: WBS Map issu du store global
    const localWbs = wbsMap[selectedProject.id] || wbsMap[selectedProject.code];
    if (localWbs && localWbs.length > 0) {
      return localWbs.map((w: any) => ({
        id: w.id || w.code,
        wbsCode: w.code,
        priceNo: w.code,
        description: w.name,
        unit: 'ens',
        contractQty: 1,
        marketUnitPrice: Number(w.revisedBudget || w.initialBudget || 0),
        marketAmount: Number(w.revisedBudget || w.initialBudget || 0),
        calculatedDsAmount: Number(w.revisedBudget || w.initialBudget || 0),
        resources: []
      }));
    }
    return REAL_DS_BINGERVILLE_ACTIVITIES;
  }, [selectedProject, wbsMap]);

  // Code WBS sélectionné par défaut
  const [selectedWbsCode, setSelectedWbsCode] = useState<string>('');

  // Mise à jour synchrone du code WBS au changement de projet
  useEffect(() => {
    if (projectDsActivities.length > 0) {
      const firstCode = projectDsActivities[0].wbsCode || projectDsActivities[0].priceNo || '';
      setSelectedWbsCode(firstCode);
    } else {
      setSelectedWbsCode('');
    }
  }, [selectedProjectId, projectDsActivities]);

  // Activité WBS sélectionnée courante
  const selectedActivity = useMemo(() => {
    if (!projectDsActivities || projectDsActivities.length === 0) return null;
    return projectDsActivities.find((a: any) => a.wbsCode === selectedWbsCode || a.priceNo === selectedWbsCode) || projectDsActivities[0] || null;
  }, [projectDsActivities, selectedWbsCode]);

  // 3. CALCULS 100% DYNAMIQUES DU CONTRÔLE BUDGÉTAIRE SANS AUCUNES VALEURS PAR DÉFAUT
  const allocatedBudgetWBS = useMemo(() => {
    if (selectedActivity) {
      return Number(selectedActivity.calculatedDsAmount || selectedActivity.marketAmount || selectedActivity.importedDsAmount || 0);
    }
    if (selectedProject) {
      return Number(selectedProject.revisedBudget || selectedProject.contractAmount || selectedProject.initialBudget || 0);
    }
    return 0;
  }, [selectedActivity, selectedProject]);

  const committedAmountAtDate = useMemo(() => {
    if (!selectedProjectId) return 0;
    return purchaseRequests
      .filter(da => (da.projectId === selectedProjectId || da.projectName === selectedProject?.name) && da.status === 'APPROUVEE')
      .reduce((sum, da) => sum + (Number(da.estimatedTotal) || 0), 0);
  }, [purchaseRequests, selectedProjectId, selectedProject]);

  const pendingRequestsAmount = useMemo(() => {
    if (!selectedProjectId) return 0;
    return purchaseRequests
      .filter(da => (da.projectId === selectedProjectId || da.projectName === selectedProject?.name) && (da.status === 'EN_VALIDATION' || da.status === 'BROUILLON' || da.status === 'EN_COURS'))
      .reduce((sum, da) => sum + (Number(da.estimatedTotal) || 0), 0);
  }, [purchaseRequests, selectedProjectId, selectedProject]);

  // Formulaire d'en-tête (Pas de données statiques ni par défaut)
  const [locationZone, setLocationZone] = useState<string>('');
  const [department, setDepartment] = useState<string>(currentUser?.role || currentUser?.department || '');
  const [priority, setPriority] = useState<string>('Moyenne');
  const [desiredDate, setDesiredDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [justification, setJustification] = useState<string>('');

  const getTodayIso = () => new Date().toISOString().split('T')[0];
  const getNowTimeStr = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const getTodayFrDate = () => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const [lastSaveTime, setLastSaveTime] = useState<string>(getNowTimeStr());
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [requesterComment, setRequesterComment] = useState<string>('');
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4. RESSOURCES ET PRODUITS ÉLECTIF DE L'ACTIVITÉ WBS SÉLECTIONNÉE
  const availableResources = useMemo(() => {
    if (selectedActivity && Array.isArray(selectedActivity.resources) && selectedActivity.resources.length > 0) {
      return selectedActivity.resources;
    }
    return [];
  }, [selectedActivity]);

  const handleSelectResourceForLine = (lineId: string, resourceName: string) => {
    if (!resourceName) return;
    const matched = availableResources.find((r: any) => r.name === resourceName || r.code === resourceName || r.id === resourceName)
                 || stockItems.find((s: any) => s.name === resourceName || s.id === resourceName);

    if (matched) {
      const qtyPlanned = Number(matched.theoreticalQty || matched.correctedQty || matched.contractQty || matched.quantity || 0);
      const pu = Number(matched.unitPrice || matched.unitCost || 0);
      const tot = Number(matched.totalCost || matched.totalValue || (qtyPlanned * pu));
      
      setRequestLines(prev => prev.map(l => l.id === lineId ? {
        ...l,
        article: matched.name,
        unit: matched.unit || 'U',
        plannedQty: qtyPlanned,
        requestedQty: qtyPlanned > 0 ? Math.min(1, qtyPlanned) : 0,
        estimatedUnitPrice: pu,
        availableBudget: tot
      } : l));
    } else {
      setRequestLines(prev => prev.map(l => l.id === lineId ? { ...l, article: resourceName, plannedQty: 0 } : l));
    }
  };

  // 5. LIGNES DE DEMANDE
  const [requestLines, setRequestLines] = useState<Array<{
    id: string;
    article: string;
    unit: string;
    plannedQty: number;
    requestedQty: number;
    estimatedUnitPrice: number;
    availableBudget: number;
  }>>([]);

  // CALCULS TOTALISÉS EN TEMPS RÉEL
  const processedLines = useMemo(() => {
    return requestLines.map((line, idx) => {
      const plannedQty = Number(line.plannedQty) || 0;
      const requestedQty = Number(line.requestedQty) || 0;
      const remainingQty = Math.max(0, plannedQty - requestedQty);
      const estimatedAmount = requestedQty * (Number(line.estimatedUnitPrice) || 0);
      const ecart = estimatedAmount - (Number(line.availableBudget) || 0);
      return {
        ...line,
        lineNo: idx + 1,
        plannedQty,
        requestedQty,
        remainingQty,
        estimatedAmount,
        ecart
      };
    });
  }, [requestLines]);

  const totalEstimatedAmount = useMemo(() => processedLines.reduce((sum, l) => sum + l.estimatedAmount, 0), [processedLines]);
  const totalAvailableBudget = useMemo(() => processedLines.reduce((sum, l) => sum + l.availableBudget, 0), [processedLines]);
  const totalEcart = useMemo(() => totalEstimatedAmount - totalAvailableBudget, [totalEstimatedAmount, totalAvailableBudget]);

  const netAvailableBudget = useMemo(() => {
    return Math.max(0, allocatedBudgetWBS - committedAmountAtDate - pendingRequestsAmount - totalEstimatedAmount);
  }, [allocatedBudgetWBS, committedAmountAtDate, pendingRequestsAmount, totalEstimatedAmount]);

  const isBudgetSufficient = useMemo(() => {
    return (allocatedBudgetWBS - committedAmountAtDate - pendingRequestsAmount) >= totalEstimatedAmount;
  }, [allocatedBudgetWBS, committedAmountAtDate, pendingRequestsAmount, totalEstimatedAmount]);

  // GESTION DES DÉLÉGATIONS D'ACTION ET MISES À JOUR
  const handleAddLine = () => {
    setRequestLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        article: '',
        unit: '',
        plannedQty: 0,
        requestedQty: 0,
        estimatedUnitPrice: 0,
        availableBudget: 0
      }
    ]);
  };

  const handleUpdateLine = (id: string, field: string, value: any) => {
    setRequestLines(prev => prev.map(line => {
      if (line.id !== id) return line;
      if (field === 'requestedQty') {
        const numVal = Math.max(0, parseFloat(value) || 0);
        // Capper la quantité demandée à la quantité prévue au budget si plannedQty > 0
        const maxAllowed = line.plannedQty > 0 ? line.plannedQty : numVal;
        const cappedQty = line.plannedQty > 0 && numVal > maxAllowed ? maxAllowed : numVal;
        return {
          ...line,
          requestedQty: cappedQty
        };
      }
      return { ...line, [field]: value };
    }));
  };

  const handleDeleteLine = (id: string) => {
    setRequestLines(prev => prev.filter(l => l.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0].name);
    }
  };

  const resetForm = () => {
    setRequestLines([]);
    setSelectedWbsCode('');
    setJustification('');
    setLocationZone('');
    setAttachedFile(null);
    setRequesterComment('');
    setPriority('Moyenne');
  };

  const handleSaveDraft = () => {
    const timeStr = getNowTimeStr();
    setLastSaveTime(timeStr);
    const newDaCode = `DA-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    const validLines = processedLines.filter(l => l.article && l.article.trim() !== '');
    const itemsList: PurchaseRequestItem[] = validLines.map(l => ({
      id: l.id,
      description: l.article,
      quantity: l.requestedQty,
      unitPrice: l.estimatedUnitPrice,
      totalPrice: l.estimatedAmount,
      unit: l.unit
    }));

    if (createDA && selectedProject) {
      createDA({
        code: newDaCode,
        projectId: selectedProjectId,
        projectName: selectedProject?.name || '',
        wbsCode: selectedWbsCode,
        wbsName: selectedActivity?.description || '',
        nature: 'MAT',
        itemDescription: validLines.length > 0 
          ? validLines.map(l => `${l.article} (${l.requestedQty} ${l.unit})`).join(', ')
          : 'Fournitures diverses chantier',
        quantity: validLines.reduce((s, l) => s + l.requestedQty, 0),
        unit: 'U',
        estimatedUnitPrice: 0,
        estimatedTotal: totalEstimatedAmount,
        desiredDate: desiredDate,
        urgency: priority as any,
        justification: justification || 'Approvisionnement chantier régulier',
        createdBy: currentUser?.name || 'Utilisateur',
        createdAt: getTodayIso(),
        status: 'BROUILLON',
        attachments: attachedFile ? [attachedFile] : [],
        items: itemsList
      } as any);
    }
    if (addAuditLog) {
      addAuditLog({
        user: currentUser?.name || 'Utilisateur',
        action: 'CREATION_BROUILLON_DA',
        module: 'Achats & DA',
        details: `Demande d'achat ${newDaCode} enregistrée comme Brouillon pour ${formatFCFA(totalEstimatedAmount)} (${validLines.length} article(s))`
      });
    }
    resetForm();
    setViewMode('list');
    alert(`✅ Demande d'Achat ${newDaCode} enregistrée comme Brouillon avec succès !`);
  };

  const handleSubmitValidation = () => {
    const validLines = processedLines.filter(l => l.article && l.article.trim() !== '');
    if (validLines.length === 0) {
      alert("⚠️ Veuillez ajouter au moins une ligne d'article avec une désignation valide avant de soumettre.");
      return;
    }

    if (!justification.trim()) {
      alert("⚠️ Veuillez renseigner le champ 'Justification / Objet de la demande' avant de soumettre.");
      return;
    }

    const timeStr = getNowTimeStr();
    setLastSaveTime(timeStr);
    const newDaCode = `DA-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    const itemsList: PurchaseRequestItem[] = validLines.map(l => ({
      id: l.id,
      description: l.article,
      quantity: l.requestedQty,
      unitPrice: l.estimatedUnitPrice,
      totalPrice: l.estimatedAmount,
      unit: l.unit
    }));

    if (createDA && selectedProject) {
      createDA({
        code: newDaCode,
        projectId: selectedProjectId,
        projectName: selectedProject?.name || '',
        wbsCode: selectedWbsCode,
        wbsName: selectedActivity?.description || '',
        nature: 'MAT',
        itemDescription: validLines.map(l => `${l.article} (${l.requestedQty} ${l.unit})`).join(', '),
        quantity: validLines.reduce((s, l) => s + l.requestedQty, 0),
        unit: 'U',
        estimatedUnitPrice: 0,
        estimatedTotal: totalEstimatedAmount,
        desiredDate: desiredDate,
        urgency: priority as any,
        justification: justification,
        createdBy: currentUser?.name || 'Utilisateur',
        createdAt: getTodayIso(),
        status: 'EN_VALIDATION',
        attachments: attachedFile ? [attachedFile] : [],
        items: itemsList
      } as any);
    }

    if (addAlert) {
      addAlert({
        type: isBudgetSufficient ? 'INFO' : 'WARNING',
        message: `Nouvelle DA ${newDaCode} soumise pour validation par ${currentUser?.name || 'Utilisateur'} (${formatFCFA(totalEstimatedAmount)})`,
        module: 'Procurement',
        timestamp: new Date().toISOString()
      });
    }

    resetForm();
    if (onNavigateView) {
      onNavigateView('procurement-validation');
    } else {
      setViewMode('list');
    }
    alert(`🚀 Demande d'Achat ${newDaCode} transmise avec succès au circuit de validation (Chef Travaux ➔ Responsable Achats ➔ DP) !`);
  };

  // Filtrage des demandes d'achat pour la vue liste
  const filteredPurchaseRequests = useMemo(() => {
    return purchaseRequests.filter(da => {
      // Filtrage par projet
      if (selectedProjectId && selectedProjectId !== 'ALL') {
        const matchesProject = da.projectId === selectedProjectId || 
                               da.projectId === selectedProject?.code ||
                               da.projectName === selectedProject?.name;
        if (!matchesProject) return false;
      }

      // Filtrage par statut
      if (listStatusFilter !== 'ALL') {
        if (listStatusFilter === 'VALIDEE' && da.status !== 'VALIDEE' && da.status !== 'APPROUVEE') return false;
        if (listStatusFilter === 'EN_VALIDATION' && da.status !== 'EN_VALIDATION' && da.status !== 'EN_COURS' && da.status !== 'SOUMIS') return false;
        if (listStatusFilter === 'BROUILLON' && da.status !== 'BROUILLON') return false;
        if (listStatusFilter === 'REFUSEE' && da.status !== 'REFUSEE' && da.status !== 'REJETEE') return false;
        if (listStatusFilter === 'RETOUR_CORRECTION' && da.status !== 'RETOUR_CORRECTION') return false;
      }

      // Filtrage par urgence
      if (listUrgencyFilter !== 'ALL') {
        if (da.urgency !== listUrgencyFilter) return false;
      }

      // Filtrage par recherche
      if (listSearchQuery.trim()) {
        const query = listSearchQuery.toLowerCase();
        const matchesCode = (da.code || '').toLowerCase().includes(query);
        const matchesProject = (da.projectName || '').toLowerCase().includes(query);
        const matchesDesc = (da.itemDescription || '').toLowerCase().includes(query);
        const matchesCreator = (da.createdBy || '').toLowerCase().includes(query);
        const matchesJustif = (da.justification || '').toLowerCase().includes(query);
        if (!matchesCode && !matchesProject && !matchesDesc && !matchesCreator && !matchesJustif) return false;
      }

      return true;
    });
  }, [purchaseRequests, selectedProjectId, selectedProject, listStatusFilter, listUrgencyFilter, listSearchQuery]);

  // Statistiques KPIs sur la liste des DA
  const listKpis = useMemo(() => {
    const total = filteredPurchaseRequests.length;
    const totalAmount = filteredPurchaseRequests.reduce((s, da) => s + (Number(da.estimatedTotal) || 0), 0);
    const approved = filteredPurchaseRequests.filter(da => da.status === 'VALIDEE' || da.status === 'APPROUVEE');
    const approvedAmount = approved.reduce((s, da) => s + (Number(da.estimatedTotal) || 0), 0);
    const pending = filteredPurchaseRequests.filter(da => da.status === 'EN_VALIDATION' || da.status === 'EN_COURS' || da.status === 'SOUMIS');
    const drafts = filteredPurchaseRequests.filter(da => da.status === 'BROUILLON');
    return {
      total,
      totalAmount,
      approvedCount: approved.length,
      approvedAmount,
      pendingCount: pending.length,
      draftsCount: drafts.length
    };
  }, [filteredPurchaseRequests]);

  // Export Excel réel
  const handleExportExcel = () => {
    if (filteredPurchaseRequests.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }

    const dataToExport = filteredPurchaseRequests.map(da => ({
      'Code DA': da.code,
      'Date Création': da.createdAt || '',
      'Projet': da.projectName || selectedProject?.name || '',
      'Code WBS': da.wbsCode || '',
      'Activité WBS': da.wbsName || '',
      'Désignation / Articles': da.itemDescription || '',
      'Quantité Totale': da.quantity || 0,
      'Montant Estimé (FCFA)': da.estimatedTotal || 0,
      'Date Souhaitée': da.desiredDate || '',
      'Demandeur': da.createdBy || '',
      'Urgence': da.urgency || 'Moyenne',
      'Statut': da.status || 'BROUILLON',
      'Justification': da.justification || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandes_Achat');
    XLSX.writeFile(workbook, `GEBAT_Demandes_Achat_${selectedProject?.code || 'TOUS'}_${getTodayIso()}.xlsx`);
  };

  // Export CSV réel
  const handleExportCSV = () => {
    if (filteredPurchaseRequests.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }

    const headers = ['Code DA', 'Date', 'Projet', 'Code WBS', 'Articles', 'Quantité', 'Montant FCFA', 'Demandeur', 'Urgence', 'Statut'];
    const rows = filteredPurchaseRequests.map(da => [
      `"${da.code}"`,
      `"${da.createdAt || ''}"`,
      `"${da.projectName || selectedProject?.name || ''}"`,
      `"${da.wbsCode || ''}"`,
      `"${(da.itemDescription || '').replace(/"/g, '""')}"`,
      da.quantity || 0,
      da.estimatedTotal || 0,
      `"${da.createdBy || ''}"`,
      `"${da.urgency || 'Moyenne'}"`,
      `"${da.status || 'BROUILLON'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GEBAT_Demandes_Achat_${selectedProject?.code || 'TOUS'}_${getTodayIso()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Soumission directe d'un brouillon depuis la liste
  const handleDirectSubmitDraft = (da: PurchaseRequest) => {
    if (updateDAStatus) {
      updateDAStatus(da.id || da.code, 'EN_VALIDATION', 'Soumis pour validation depuis le registre');
      if (addAlert) {
        addAlert({
          type: 'INFO',
          message: `Demande d'achat ${da.code} transmise au circuit de validation.`,
          module: 'Procurement',
          timestamp: new Date().toISOString()
        });
      }
      alert(`🚀 Demande d'Achat ${da.code} transmise avec succès au circuit de validation !`);
    }
  };

  return (
    <div className="space-y-4 text-xs font-sans text-slate-800 pb-16 max-w-[1700px] mx-auto bg-slate-50/50 p-2 md:p-4 rounded-3xl">
      {/* 1. EN-TÊTE SUPERIEUR & ACTIONS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={handleBackTo360}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1 cursor-pointer transition"
          >
            <ArrowLeft size={13} /> Retour à la vue projet 360°
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingBag size={22} className="text-blue-600" /> DEMANDE D'ACHAT (DA)
            </h1>
            <Info size={16} className="text-slate-400 cursor-pointer hover:text-slate-600" title="Module officiel de création, suivi et engagement des demandes d'achats chantiers" />
          </div>
          <p className="text-slate-500 text-xs font-semibold mt-0.5">
            {selectedProject?.code} · {selectedProject?.name}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sélecteur de projet contextualisé */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Building2 size={14} className="text-slate-500" />
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="bg-transparent font-extrabold text-xs text-slate-800 focus:outline-none cursor-pointer"
            >
              {authorizedProjects.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setViewMode(viewMode === 'form' ? 'list' : 'form')}
            className={`font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border transition cursor-pointer ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
            }`}
          >
            {viewMode === 'form' ? '📋 Registre des DA' : '✏️ Nouvelle Demande d\'Achat'}
          </button>

          {/* Actions Rapides Dropdown (en mode formulaire) */}
          {viewMode === 'form' && (
            <div className="relative">
              <button
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                className="bg-[#11192e] hover:bg-slate-800 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition"
              >
                <span>⚡ Actions rapides</span>
                <ChevronDown size={14} />
              </button>
              {showActionsDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                  <button
                    onClick={() => { handleSaveDraft(); setShowActionsDropdown(false); }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText size={14} className="text-slate-500" /> Enregistrer en Brouillon
                  </button>
                  <button
                    onClick={() => { handleSubmitValidation(); setShowActionsDropdown(false); }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Send size={14} className="text-blue-600" /> Soumettre pour Validation
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Exporter PDF */}
          <button
            onClick={() => window.print()}
            className="bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
          >
            <Printer size={14} /> Imprimer / PDF
          </button>
        </div>
      </div>

      {viewMode === 'form' ? (
        <>
          {/* 2. WORKFLOW STEPPER BAR (4 ÉTAPES RÉELLES) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
              <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-blue-50/80 border border-blue-300 text-blue-900 shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <span className="font-black text-xs block text-slate-900">1. Création Demande</span>
                  <span className="text-[10.5px] font-medium text-slate-500">En cours de saisie</span>
                </div>
              </div>

              <div className="h-0.5 flex-1 bg-slate-200 min-w-[20px]"></div>

              <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-slate-50/60 border border-slate-200 text-slate-500">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <span className="font-black text-xs block text-slate-900">2. Validation N+1</span>
                  <span className="text-[10.5px] font-medium text-slate-500">Chef de Travaux</span>
                </div>
              </div>

              <div className="h-0.5 flex-1 bg-slate-200 min-w-[20px]"></div>

              <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-slate-50/60 border border-slate-200 text-slate-500">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <span className="font-black text-xs block text-slate-900">3. Contrôle Achats N+2</span>
                  <span className="text-[10.5px] font-medium text-slate-500">Responsable Achats</span>
                </div>
              </div>

              <div className="h-0.5 flex-1 bg-slate-200 min-w-[20px]"></div>

              <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-slate-50/60 border border-slate-200 text-slate-500">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center shrink-0">
                  4
                </div>
                <div>
                  <span className="font-black text-xs block text-slate-900">4. Approbation Finale</span>
                  <span className="text-[10.5px] font-medium text-slate-500">Directeur de Projet / DG</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SECTION FORMULAIRE GAUCHE & CARD CONTRÔLE BUDGÉTAIRE DROITE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* GAUCHE : FORMULAIRE PRINCIPAL (2 COLS SUR 3) */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Projet */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Projet <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    {authorizedProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* WBS / Activité */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    WBS / Activité <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedWbsCode}
                    onChange={e => setSelectedWbsCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    {projectDsActivities.map((act: any) => (
                      <option key={act.wbsCode || act.priceNo} value={act.wbsCode || act.priceNo}>
                        {act.wbsCode || act.priceNo} - {act.description || act.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lieu / Zone */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Lieu / Zone de livraison</label>
                  <input
                    type="text"
                    value={locationZone}
                    onChange={e => setLocationZone(e.target.value)}
                    placeholder="Ex: Base Vie, Zone Nord, Bloc B..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Demandeur (Dyn. Utilisateur connecté) */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Demandeur <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 uppercase">
                      {(currentUser?.name || 'Demandeur').split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="truncate">
                      <span className="font-extrabold text-xs block text-slate-900 truncate">{currentUser?.name || 'Demandeur'}</span>
                      <span className="text-[9.5px] text-slate-500 font-medium truncate block">{currentUser?.role || currentUser?.department || 'Habilité'}</span>
                    </div>
                  </div>
                </div>

                {/* Équipe / Service */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Équipe / Service <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="Ex: Travaux, HSE, Gros Œuvre..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500"
                  />
                </div>

                {/* Priorité */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Priorité / Urgence</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Moyenne">🟠 Moyenne (Standard)</option>
                    <option value="Haute">🔴 Haute / Urgente</option>
                    <option value="Basse">🟢 Basse (Anticipée)</option>
                  </select>
                </div>

                {/* Date de besoin souhaitée */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Date de besoin sur site <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold">
                    <input
                      type="date"
                      value={desiredDate}
                      onChange={e => setDesiredDate(e.target.value)}
                      className="bg-transparent text-slate-900 font-bold text-xs focus:outline-none cursor-pointer w-full"
                    />
                    <Calendar size={14} className="text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Justification & Pièce jointe */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Justification / Objet de la demande <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-900 focus:bg-white focus:border-blue-500"
                    placeholder="Précisez la destination technique des matériaux et le motif de l'approvisionnement..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Pièce jointe (Devis, plan, fiche technique)
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white border border-slate-300 hover:bg-slate-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg text-xs shadow-2xs cursor-pointer transition inline-block"
                    >
                      📎 Joindre un fichier
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="text-[10px] text-slate-400 font-medium">
                      {attachedFile ? (
                        <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                          <Check size={12} /> {attachedFile}
                        </span>
                      ) : (
                        'Aucun fichier joint pour le moment.'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DROITE : CARD CONTRÔLE BUDGÉTAIRE DYNAMIQUE */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Calculator size={15} className="text-blue-600" /> CONTRÔLE BUDGÉTAIRE EN TEMPS RÉEL
                </h2>

                <div className="space-y-3 pt-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold">Budget alloué (WBS)</span>
                    <span className="font-mono font-extrabold text-slate-900">{formatFCFA(allocatedBudgetWBS)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold">Déjà engagé (Validé)</span>
                    <span className="font-mono font-extrabold text-slate-900">{formatFCFA(committedAmountAtDate)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold">Demandes en cours (Workflow)</span>
                    <span className="font-mono font-extrabold text-slate-900">{formatFCFA(pendingRequestsAmount)}</span>
                  </div>

                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                    <span className="text-slate-800 font-black">Disponible net restant</span>
                    <span className={`font-mono font-black text-sm ${isBudgetSufficient ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatFCFA(netAvailableBudget)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Status Badge Box */}
              {isBudgetSufficient ? (
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-extrabold text-xs block text-emerald-900">Budget disponible suffisant</span>
                    <span className="text-[10.5px] font-medium text-emerald-700">L'imputation reste dans les limites autorisées du Déboursé Sec.</span>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-extrabold text-xs block text-rose-900">Alerte : Dépassement budgétaire potentiel</span>
                    <span className="text-[10.5px] font-medium text-rose-700">Le montant de la demande excède le reliquat budgétaire disponible sur ce WBS.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. TABLEAU DES LIGNES DE DEMANDE DYNAMIQUES */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <Layers size={15} className="text-blue-600" /> ARTICLES & LIGNES DE LA DEMANDE D'ACHAT
              </h2>
              <span className="text-[11px] font-bold text-slate-500">
                {processedLines.length} ligne(s) saisie(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10.5px] bg-slate-50/70">
                    <th className="py-2.5 px-3 w-12 text-center">N°</th>
                    <th className="py-2.5 px-3">Article / Désignation</th>
                    <th className="py-2.5 px-3 text-center w-28">Unité</th>
                    <th className="py-2.5 px-3 text-right w-40">Quantité demandée</th>
                    <th className="py-2.5 px-3 text-right w-44">Prix unitaire estimé (FCFA)</th>
                    <th className="py-2.5 px-3 text-right w-44">Montant estimé (FCFA)</th>
                    <th className="py-2.5 px-3 text-right w-44">Budget alloué WBS (FCFA)</th>
                    <th className="py-2.5 px-3 text-right w-36">Écart</th>
                    <th className="py-2.5 px-3 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {processedLines.length > 0 ? (
                    processedLines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono">{line.lineNo}</td>
                        <td className="py-3 px-3 min-w-[280px]">
                          <div className="space-y-1.5">
                            <select
                              value={line.article}
                              onChange={e => handleSelectResourceForLine(line.id, e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:bg-white focus:border-blue-500 text-xs cursor-pointer shadow-2xs"
                            >
                              <option value="">-- Choisir un produit du Déboursé Sec ({selectedWbsCode || 'WBS'}) --</option>
                              {availableResources.map((res: any, rIdx: number) => (
                                <option key={res.id || rIdx} value={res.name}>
                                  ✓ {res.code ? `[${res.code}] ` : ''}{res.name} ({res.unitPrice ? formatNumber(res.unitPrice) : '0'} FCFA / {res.unit})
                                </option>
                              ))}
                              {stockItems.length > 0 && (
                                <optgroup label="── Articles du Stock Général ──">
                                  {stockItems.map((st: any) => (
                                    <option key={st.id} value={st.name}>
                                      [STOCK] {st.name} ({formatNumber(st.unitPrice || 0)} FCFA / {st.unit})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                            <input
                              type="text"
                              value={line.article}
                              placeholder="ou saisie libre de la désignation de l'article..."
                              onChange={e => handleUpdateLine(line.id, 'article', e.target.value)}
                              className="w-full p-1.5 bg-slate-50/50 rounded-md font-semibold text-slate-700 focus:bg-white border border-slate-200 focus:border-blue-500 text-[11px]"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="text"
                            value={line.unit}
                            placeholder="Unité"
                            onChange={e => handleUpdateLine(line.id, 'unit', e.target.value)}
                            className="w-full text-center p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:bg-white focus:border-blue-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="space-y-1">
                            <input
                              type="number"
                              value={line.requestedQty || ''}
                              max={line.plannedQty > 0 ? line.plannedQty : undefined}
                              placeholder="0"
                              onChange={e => handleUpdateLine(line.id, 'requestedQty', parseFloat(e.target.value) || 0)}
                              className="w-full text-right p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-extrabold text-slate-900 focus:bg-white focus:border-blue-500 text-xs"
                            />
                            {line.plannedQty > 0 && (
                              <div className="text-[10px] text-slate-500 font-semibold flex items-center justify-between gap-1 pt-0.5">
                                <span title="Quantité inscrite au Déboursé Sec">Prévu: <b>{formatNumberQty(line.plannedQty)}</b></span>
                                <span className={`px-1.5 py-0.5 rounded-full font-extrabold text-[9px] ${line.remainingQty > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                  Solde: {formatNumberQty(line.remainingQty)} {line.unit}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            value={line.estimatedUnitPrice || ''}
                            placeholder="0"
                            onChange={e => handleUpdateLine(line.id, 'estimatedUnitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full text-right p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatNumber(line.estimatedAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                          {formatNumber(line.availableBudget)}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-bold ${line.ecart > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {line.ecart > 0 ? `+${formatNumber(line.ecart)}` : formatNumber(line.ecart)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteLine(line.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer transition"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-bold bg-slate-50/50 rounded-xl">
                        Aucune ligne de demande d'achat. Cliquez sur <span className="text-blue-600 font-black">+ Ajouter une ligne</span> ci-dessous pour saisir vos articles.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pied du Tableau avec Bouton Ajouter & Totaux en temps réel */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleAddLine}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-blue-200 cursor-pointer transition"
              >
                <Plus size={14} /> Ajouter une ligne d'article
              </button>

              <div className="flex items-center gap-8 text-xs font-bold font-mono flex-wrap">
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-sans block text-[10px] uppercase">Total estimé</span>
                  <span className="text-slate-900 text-sm font-black">{formatFCFA(totalEstimatedAmount)}</span>
                </div>

                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-sans block text-[10px] uppercase">Total Budget alloué</span>
                  <span className="text-slate-900 text-sm font-black">{formatFCFA(totalAvailableBudget)}</span>
                </div>

                <div className={`px-3 py-1.5 rounded-xl border ${totalEcart > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <span className="text-slate-500 font-sans block text-[10px] uppercase">Écart global</span>
                  <span className={`text-sm font-black ${totalEcart > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {totalEcart > 0 ? `+${formatFCFA(totalEcart)}` : formatFCFA(totalEcart)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. TROIS BLOCS BAS (COMMENTAIRE | HISTORIQUE | CIRCUIT DE VALIDATION) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            {/* Card 1 : Commentaire du Demandeur */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <FileText size={14} className="text-slate-500" /> COMMENTAIRE DU DEMANDEUR
              </h2>
              <textarea
                rows={3}
                value={requesterComment}
                onChange={e => setRequesterComment(e.target.value)}
                placeholder="Instructions particulières de livraison, contact fournisseur recommandé..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 focus:bg-white focus:border-blue-500"
              />
            </div>

            {/* Card 2 : Historique de la Demande */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <Clock size={14} className="text-slate-500" /> HISTORIQUE DE LA DEMANDE
              </h2>
              <div className="space-y-2.5 pt-1">
                <div className="flex items-start gap-2.5 text-xs">
                  <CheckCircle2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">Demande initialisée</span>
                    <span className="text-[10.5px] font-mono text-slate-500">
                      {getTodayFrDate()} à {getNowTimeStr()} par {currentUser?.name || 'Demandeur'}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-xs opacity-75">
                  <Clock size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-700 block">En attente de transmission</span>
                    <span className="text-[10.5px] text-slate-400">Circuit automatique selon matrice d'approbation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3 : Circuit de Validation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-600" /> CIRCUIT D'APPROBATION STANDARD
              </h2>

              <div className="flex items-center justify-between pt-2">
                {/* Demandeur */}
                <div className="text-center">
                  <span className="text-[9.5px] font-extrabold text-slate-500 uppercase block mb-1">Demandeur</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center mx-auto mb-1 shadow-2xs">
                    ✓
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-900 block truncate max-w-[80px]">{currentUser?.name || 'Demandeur'}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{getNowTimeStr()}</span>
                </div>

                <ChevronRight size={14} className="text-slate-300" />

                {/* N+1 */}
                <div className="text-center">
                  <span className="text-[9.5px] font-extrabold text-slate-500 uppercase block mb-1">N+1</span>
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center mx-auto mb-1 shadow-2xs">
                    ⏳
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-900 block">Chef Travaux</span>
                  <span className="text-[9px] text-amber-600 font-medium">Validation</span>
                </div>

                <ChevronRight size={14} className="text-slate-300" />

                {/* N+2 */}
                <div className="text-center">
                  <span className="text-[9.5px] font-extrabold text-slate-500 uppercase block mb-1">N+2</span>
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center mx-auto mb-1">
                    👤
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-900 block">Resp. Achats</span>
                  <span className="text-[9px] text-slate-400 font-medium">Contrôle</span>
                </div>

                <ChevronRight size={14} className="text-slate-300" />

                {/* Approbation */}
                <div className="text-center">
                  <span className="text-[9.5px] font-extrabold text-slate-500 uppercase block mb-1">Directeur</span>
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center mx-auto mb-1">
                    🔒
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-900 block">DP / DG</span>
                  <span className="text-[9px] text-slate-400 font-medium">Approbation</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. FOOTER STICKY ACTION BAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="bg-white hover:bg-slate-50 text-slate-800 font-extrabold px-5 py-2.5 rounded-xl border border-slate-300 text-xs shadow-xs cursor-pointer transition flex items-center gap-2"
            >
              <FileText size={15} /> Enregistrer en brouillon
            </button>

            <div className="text-[11px] text-slate-500 font-medium text-center">
              Dernière mise à jour : <strong>{lastSaveTime}</strong> · Auteur : <strong>{currentUser?.name || 'Utilisateur'}</strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-xs cursor-pointer transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmitValidation}
                className="bg-[#11192e] hover:bg-slate-800 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition"
              >
                <Send size={15} />
                <span>Soumettre pour validation</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        /* VUE 2 : REGISTRE COMPLET DES DEMANDES D'ACHAT (100% PERSISTÉ & RÉACTIF) */
        <div className="space-y-4">
          {/* KPI CARDS EN HAUT DU REGISTRE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-extrabold uppercase text-slate-500 tracking-wider block">Total Demandes</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">{listKpis.total}</span>
                <span className="text-[10px] text-slate-400 font-medium">{formatFCFA(listKpis.totalAmount)}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-extrabold uppercase text-emerald-600 tracking-wider block">Validées / Engagées</span>
                <span className="text-xl font-black text-emerald-600 mt-1 block">{listKpis.approvedCount}</span>
                <span className="text-[10px] text-emerald-700 font-bold font-mono">{formatFCFA(listKpis.approvedAmount)}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-extrabold uppercase text-amber-600 tracking-wider block">En Circuit Validation</span>
                <span className="text-xl font-black text-amber-600 mt-1 block">{listKpis.pendingCount}</span>
                <span className="text-[10px] text-amber-700 font-medium">En attente décision</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-extrabold uppercase text-slate-500 tracking-wider block">Brouillons</span>
                <span className="text-xl font-black text-slate-700 mt-1 block">{listKpis.draftsCount}</span>
                <span className="text-[10px] text-slate-400 font-medium">À finaliser</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <FileText size={20} />
              </div>
            </div>
          </div>

          {/* BARRE DE RECHERCHE, FILTRES ET BOUTONS D'EXPORTATION */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Barre de recherche */}
              <div className="relative flex-1 w-full">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={listSearchQuery}
                  onChange={e => setListSearchQuery(e.target.value)}
                  placeholder="Rechercher par code DA, article, demandeur, justification..."
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500"
                />
                {listSearchQuery && (
                  <button onClick={() => setListSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filtre Statut */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter size={14} className="text-slate-500" />
                <select
                  value={listStatusFilter}
                  onChange={e => setListStatusFilter(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:bg-white focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="BROUILLON">Brouillon</option>
                  <option value="EN_VALIDATION">En validation</option>
                  <option value="VALIDEE">Validée / Approuvée</option>
                  <option value="REFUSEE">Refusée / Rejetée</option>
                  <option value="RETOUR_CORRECTION">Retour correction</option>
                </select>

                {/* Filtre Urgence */}
                <select
                  value={listUrgencyFilter}
                  onChange={e => setListUrgencyFilter(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:bg-white focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">Toutes urgences</option>
                  <option value="Haute">Haute</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Basse">Basse</option>
                </select>
              </div>

              {/* Boutons d'export */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={handleExportExcel}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                  title="Exporter vers Excel (.xlsx)"
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>
                <button
                  onClick={handleExportCSV}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                  title="Exporter au format CSV"
                >
                  <Download size={14} /> CSV
                </button>
                <button
                  onClick={() => setViewMode('form')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition"
                >
                  <Plus size={14} /> + Nouvelle DA
                </button>
              </div>
            </div>
          </div>

          {/* TABLEAU DU REGISTRE DES DA */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10.5px] bg-slate-50/70">
                    <th className="py-3 px-3">Code DA</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Projet</th>
                    <th className="py-3 px-3">WBS / Activité</th>
                    <th className="py-3 px-3">Description / Articles</th>
                    <th className="py-3 px-3 text-right">Montant Estimé</th>
                    <th className="py-3 px-3 text-center">Urgence</th>
                    <th className="py-3 px-3 text-center">Demandeur</th>
                    <th className="py-3 px-3 text-center">Statut</th>
                    <th className="py-3 px-3 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPurchaseRequests.length > 0 ? (
                    filteredPurchaseRequests.map((da: PurchaseRequest) => (
                      <tr key={da.id || da.code} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-bold text-blue-700 font-mono">
                          {da.code}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {da.createdAt || '08/08/2026'}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {da.projectName || selectedProject?.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                          {da.wbsCode || '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-700 max-w-[300px]">
                          <span className="line-clamp-2" title={da.itemDescription}>
                            {da.itemDescription || 'Fournitures chantier'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                          {formatFCFA(da.estimatedTotal || 0)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 font-bold rounded-md text-[10px] ${
                            da.urgency === 'Haute' || da.urgency === 'Très urgent' || da.urgency === 'Critique'
                              ? 'bg-rose-100 text-rose-800'
                              : da.urgency === 'Moyenne'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {da.urgency || 'Moyenne'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {da.createdBy || 'Demandeur'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 font-extrabold rounded-lg text-[10px] ${
                            da.status === 'VALIDEE' || da.status === 'APPROUVEE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : da.status === 'REFUSEE' || da.status === 'REJETEE'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : da.status === 'RETOUR_CORRECTION'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : da.status === 'BROUILLON'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {da.status === 'VALIDEE' || da.status === 'APPROUVEE' ? '✓ Validée' :
                             da.status === 'REFUSEE' || da.status === 'REJETEE' ? '✕ Refusée' :
                             da.status === 'RETOUR_CORRECTION' ? '↩ Correction' :
                             da.status === 'BROUILLON' ? '📄 Brouillon' : '⏳ En validation'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingDA(da)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 cursor-pointer transition"
                              title="Consulter la fiche détaillée de la DA"
                            >
                              <Eye size={14} />
                            </button>
                            {da.status === 'BROUILLON' && (
                              <button
                                onClick={() => handleDirectSubmitDraft(da)}
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white cursor-pointer transition"
                                title="Transmettre directement au circuit de validation"
                              >
                                <Send size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-bold bg-slate-50/50 rounded-xl">
                        Aucune demande d'achat correspondant aux critères de recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : FICHE DÉTAILLÉE DE LA DEMANDE D'ACHAT (VIEWING DA) */}
      {viewingDA && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white p-5 border-b border-slate-200 flex items-center justify-between rounded-t-3xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    Fiche Demande d'Achat : <span className="font-mono text-blue-600">{viewingDA.code}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Créée le {viewingDA.createdAt || '08/08/2026'} par <strong>{viewingDA.createdBy || 'Demandeur'}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
                  title="Imprimer cette fiche"
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={() => setViewingDA(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Metadatas Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Projet</span>
                  <span className="font-extrabold text-slate-900 block mt-0.5">{viewingDA.projectName || selectedProject?.name}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Code WBS</span>
                  <span className="font-mono font-bold text-blue-700 block mt-0.5">{viewingDA.wbsCode || '02.02.001'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Urgence</span>
                  <span className="font-bold text-slate-900 block mt-0.5">{viewingDA.urgency || 'Moyenne'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Montant Estimé</span>
                  <span className="font-mono font-black text-emerald-700 block mt-0.5 text-sm">{formatFCFA(viewingDA.estimatedTotal || 0)}</span>
                </div>
              </div>

              {/* Justification */}
              {viewingDA.justification && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10.5px] uppercase font-extrabold text-slate-600 block">Justification / Objet :</span>
                  <p className="text-slate-800 font-medium">{viewingDA.justification}</p>
                </div>
              )}

              {/* Table of items if present */}
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-2">
                  Détail des Articles Commandés
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10.5px]">
                        <th className="py-2.5 px-3">Désignation</th>
                        <th className="py-2.5 px-3 text-center">Unité</th>
                        <th className="py-2.5 px-3 text-right">Quantité</th>
                        <th className="py-2.5 px-3 text-right">Prix Unitaire (FCFA)</th>
                        <th className="py-2.5 px-3 text-right">Total Estimé (FCFA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {viewingDA.items && viewingDA.items.length > 0 ? (
                        viewingDA.items.map((it, idx) => (
                          <tr key={it.id || idx}>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{it.description}</td>
                            <td className="py-2.5 px-3 text-center">{it.unit || 'U'}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">{it.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatNumber(it.unitPrice)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(it.totalPrice)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{viewingDA.itemDescription || 'Articles divers chantier'}</td>
                          <td className="py-2.5 px-3 text-center">{viewingDA.unit || 'U'}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">{viewingDA.quantity || 1}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatNumber(viewingDA.estimatedUnitPrice || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(viewingDA.estimatedTotal || 0)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status and Workflow Timeline */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[10.5px] uppercase font-extrabold text-slate-600 block">
                  Statut Actuel & Circuit de Validation
                </span>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 font-black rounded-lg text-xs ${
                    viewingDA.status === 'VALIDEE' || viewingDA.status === 'APPROUVEE' ? 'bg-emerald-100 text-emerald-800' :
                    viewingDA.status === 'REFUSEE' || viewingDA.status === 'REJETEE' ? 'bg-rose-100 text-rose-800' :
                    viewingDA.status === 'BROUILLON' ? 'bg-slate-200 text-slate-700' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {viewingDA.status === 'VALIDEE' || viewingDA.status === 'APPROUVEE' ? '✓ VALIDÉE ET ENGAGÉE' :
                     viewingDA.status === 'REFUSEE' || viewingDA.status === 'REJETEE' ? '✕ REFUSÉE' :
                     viewingDA.status === 'BROUILLON' ? '📄 BROUILLON' : '⏳ EN COURS DE VALIDATION'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-3xl flex justify-between items-center">
              {viewingDA.status === 'BROUILLON' ? (
                <button
                  onClick={() => {
                    handleDirectSubmitDraft(viewingDA);
                    setViewingDA(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition"
                >
                  <Send size={14} /> Transmettre en validation
                </button>
              ) : <div></div>}
              <button
                onClick={() => setViewingDA(null)}
                className="bg-white hover:bg-slate-100 text-slate-800 font-extrabold px-5 py-2 rounded-xl border border-slate-300 text-xs cursor-pointer transition"
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
