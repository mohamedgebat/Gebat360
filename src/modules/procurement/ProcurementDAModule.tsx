import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../../core/database/realSongonDsData';
import { hasPermission, hasProjectAccess } from '../../core/permissions';
import {
  ShoppingBag, Plus, Trash2, CheckCircle2, AlertTriangle, ShieldCheck,
  ArrowLeft, Calendar, FileText, Download, ChevronRight, ChevronDown, Paperclip,
  Clock, User, Info, Edit3, X, Search, Filter, Lock, Check, Send
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
}

export const ProcurementDAModule: React.FC<ProcurementDAModuleProps> = ({ onNavigateView }) => {
  const { projects = [], wbsMap = {}, purchaseRequests = [], stockItems = [], createDA, addAuditLog, addAlert, currentUser, setActiveTab } = useAppState();

  // Filtrage des projets autorisés par le périmètre RBAC de l'utilisateur
  const authorizedProjects = useMemo(() => {
    return projects.filter(p => hasProjectAccess(currentUser, p.id) || hasProjectAccess(currentUser, p.code));
  }, [projects, currentUser]);

  // 1. PROJET SÉLECTIONNÉ (STRICTEMENT RÉEL DEPUIS LA BASE)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(authorizedProjects[0]?.id || authorizedProjects[0]?.code || '');
  
  useEffect(() => {
    if (!selectedProjectId && authorizedProjects.length > 0) {
      setSelectedProjectId(authorizedProjects[0]?.id || authorizedProjects[0]?.code || '');
    }
  }, [authorizedProjects, selectedProjectId]);

  const selectedProject = useMemo(() => {
    return authorizedProjects.find(p => p.id === selectedProjectId || p.code === selectedProjectId) || authorizedProjects[0] || null;
  }, [authorizedProjects, selectedProjectId]);

  // Toggle Vue Formulaire / Liste des DA enregistrées
  const [viewMode, setViewMode] = useState<'form' | 'list'>('form');

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

    if (createDA && selectedProject) {
      createDA({
        code: newDaCode,
        projectId: selectedProjectId,
        projectName: selectedProject?.name || '',
        wbsCode: selectedWbsCode,
        wbsName: selectedActivity?.description || '',
        nature: 'MAT',
        itemDescription: processedLines.map(l => `${l.article} (${l.requestedQty} ${l.unit})`).join(', '),
        quantity: processedLines.reduce((s, l) => s + l.requestedQty, 0),
        unit: 'U',
        estimatedUnitPrice: 0,
        estimatedTotal: totalEstimatedAmount,
        desiredDate: desiredDate,
        urgency: priority as any,
        justification: justification,
        createdBy: currentUser?.name || 'Utilisateur',
        createdAt: getTodayIso(),
        status: 'BROUILLON',
        attachments: attachedFile ? [attachedFile] : []
      } as any);
    }
    if (addAuditLog) {
      addAuditLog({
        user: currentUser?.name || 'Utilisateur',
        action: 'CREATION_BROUILLON_DA',
        module: 'Achats & DA',
        details: `Demande d'achat ${newDaCode} enregistrée comme Brouillon pour ${formatFCFA(totalEstimatedAmount)}`
      });
    }
    resetForm();
    setViewMode('list');
    alert(`✅ Demande d'Achat ${newDaCode} enregistrée comme Brouillon avec succès !`);
  };

  const handleSubmitValidation = () => {
    const timeStr = getNowTimeStr();
    setLastSaveTime(timeStr);
    const newDaCode = `DA-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    if (createDA && selectedProject) {
      createDA({
        code: newDaCode,
        projectId: selectedProjectId,
        projectName: selectedProject?.name || '',
        wbsCode: selectedWbsCode,
        wbsName: selectedActivity?.description || '',
        nature: 'MAT',
        itemDescription: processedLines.map(l => `${l.article} (${l.requestedQty} ${l.unit})`).join(', '),
        quantity: processedLines.reduce((s, l) => s + l.requestedQty, 0),
        unit: 'U',
        estimatedUnitPrice: 0,
        estimatedTotal: totalEstimatedAmount,
        desiredDate: desiredDate,
        urgency: priority as any,
        justification: justification,
        createdBy: currentUser?.name || 'Utilisateur',
        createdAt: getTodayIso(),
        status: 'EN_VALIDATION',
        attachments: attachedFile ? [attachedFile] : []
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

  return (
    <div className="space-y-4 text-xs font-sans text-slate-800 pb-16 max-w-[1700px] mx-auto bg-slate-50/50 p-2 md:p-4 rounded-3xl">
      {/* 1. EN-TÊTE SUPERIEUR & ACTIONS (CONFORME À LA MAQUETTE) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => setActiveTab?.('dashboard')}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1 cursor-pointer transition"
          >
            <ArrowLeft size={13} /> Retour à la vue projet 360°
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              DEMANDE D'ACHAT
            </h1>
            <Info size={16} className="text-slate-400 cursor-pointer hover:text-slate-600" />
          </div>
          <p className="text-slate-500 text-xs font-semibold mt-0.5">
            {selectedProject.code} · {selectedProject.name}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setViewMode(viewMode === 'form' ? 'list' : 'form')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
          >
            {viewMode === 'form' ? '📋 Voir la liste des DA' : '✏️ Nouvelle Demande d\'Achat'}
          </button>

          {/* Actions Rapides Dropdown */}
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
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 flex items-center gap-2"
                >
                  <FileText size={14} /> Enregistrer en Brouillon
                </button>
                <button
                  onClick={() => { handleSubmitValidation(); setShowActionsDropdown(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 flex items-center gap-2"
                >
                  <Send size={14} /> Soumettre pour Validation
                </button>
              </div>
            )}
          </div>

          {/* Exporter PDF */}
          <button
            onClick={() => window.print()}
            className="bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
          >
            <Download size={14} /> Exporter PDF
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
                  <span className="font-black text-xs block text-slate-900">Création</span>
                  <span className="text-[10.5px] font-medium text-slate-500">En cours</span>
                </div>
              </div>

              <div className="h-0.5 flex-1 bg-slate-200 min-w-[20px]"></div>

              <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-slate-50/60 border border-slate-200 text-slate-500">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <span className="font-black text-xs block text-slate-900">Validation N+1</span>
                  <span className="text-[10.5px] font-medium text-slate-500">En attente</span>
                </div>
              </div>

              <div className="h-0.5 flex-1 bg-slate-200 min-w-[20px]"></div>

              <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-slate-50/60 border border-slate-200 text-slate-500">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <span className="font-black text-xs block text-slate-900">Validation N+2</span>
                  <span className="text-[10.5px] font-medium text-slate-500">En attente</span>
                </div>
              </div>

              <div className="h-0.5 flex-1 bg-slate-200 min-w-[20px]"></div>

              <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-slate-50/60 border border-slate-200 text-slate-500">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center shrink-0">
                  4
                </div>
                <div>
                  <span className="font-black text-xs block text-slate-900">Approbation</span>
                  <span className="text-[10.5px] font-medium text-slate-500">En attente</span>
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
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
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
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Lieu / Zone</label>
                  <input
                    type="text"
                    value={locationZone}
                    onChange={e => setLocationZone(e.target.value)}
                    placeholder="Ex: Zone Nord, Block A..."
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
                    placeholder="Ex: Travaux, HSE..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500"
                  />
                </div>

                {/* Priorité */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Priorité</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Moyenne">🟠 Moyenne</option>
                    <option value="Haute">🔴 Haute / Urgente</option>
                    <option value="Basse">🟢 Basse</option>
                  </select>
                </div>

                {/* Date de besoin souhaitée */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Date de besoin souhaitée <span className="text-rose-500">*</span>
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
                    placeholder="Précisez le besoin et le contexte du chantier..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Pièce jointe (facultatif)
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white border border-slate-300 hover:bg-slate-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg text-xs shadow-2xs cursor-pointer transition inline-block"
                    >
                      Joindre un fichier
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
                        'Aucun fichier joint.'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DROITE : CARD CONTRÔLE BUDGÉTAIRE DYNAMIQUE */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider pb-2 border-b border-slate-100">
                  CONTRÔLE BUDGÉTAIRE
                </h2>

                <div className="space-y-3 pt-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold">Budget alloué (WBS)</span>
                    <span className="font-mono font-extrabold text-slate-900">{formatFCFA(allocatedBudgetWBS)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold">Engagé à date</span>
                    <span className="font-mono font-extrabold text-slate-900">{formatFCFA(committedAmountAtDate)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold">Demandes en cours</span>
                    <span className="font-mono font-extrabold text-slate-900">{formatFCFA(pendingRequestsAmount)}</span>
                  </div>

                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                    <span className="text-slate-800 font-black">Disponible net</span>
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
                    <span className="text-[10.5px] font-medium text-emerald-700">Aucune alerte budgétaire détectée.</span>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-extrabold text-xs block text-rose-900">Dépassement budgétaire potentiel</span>
                    <span className="text-[10.5px] font-medium text-rose-700">La demande excède le disponible net.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. TABLEAU DES LIGNES DE DEMANDE DYNAMIQUES */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              LIGNES DE DEMANDE
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10.5px]">
                    <th className="py-2.5 px-2 w-12 text-center">N°</th>
                    <th className="py-2.5 px-2">Article / Désignation</th>
                    <th className="py-2.5 px-2 text-center w-28">Unité</th>
                    <th className="py-2.5 px-2 text-right w-36">Quantité demandée</th>
                    <th className="py-2.5 px-2 text-right w-44">Prix unitaire estimé (FCFA)</th>
                    <th className="py-2.5 px-2 text-right w-44">Montant estimé (FCFA)</th>
                    <th className="py-2.5 px-2 text-right w-44">Budget disponible (FCFA)</th>
                    <th className="py-2.5 px-2 text-right w-36">Écart</th>
                    <th className="py-2.5 px-2 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {processedLines.length > 0 ? (
                    processedLines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50">
                        <td className="py-3 px-2 text-center font-bold text-slate-500 font-mono">{line.lineNo}</td>
                        <td className="py-3 px-2 min-w-[280px]">
                          <div className="space-y-1">
                            <select
                              value={line.article}
                              onChange={e => handleSelectResourceForLine(line.id, e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:bg-white focus:border-blue-500 text-xs cursor-pointer"
                            >
                              <option value="">-- Choisir un produit du WBS ({selectedWbsCode || 'Sélectionner WBS'}) --</option>
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
                              placeholder="ou saisie libre de l'article..."
                              onChange={e => handleUpdateLine(line.id, 'article', e.target.value)}
                              className="w-full p-1 bg-transparent font-medium text-slate-600 focus:bg-white border-b border-transparent focus:border-blue-500 text-[11px]"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <input
                            type="text"
                            value={line.unit}
                            placeholder="Unité"
                            onChange={e => handleUpdateLine(line.id, 'unit', e.target.value)}
                            className="w-full text-center p-1 bg-transparent font-medium text-slate-600 focus:bg-white border-b border-transparent focus:border-blue-500"
                          />
                        </td>
                        <td className="py-3 px-2 text-right w-44">
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
                        <td className="py-3 px-2 text-right">
                          <input
                            type="number"
                            value={line.estimatedUnitPrice || ''}
                            placeholder="0"
                            onChange={e => handleUpdateLine(line.id, 'estimatedUnitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full text-right p-1 bg-transparent font-mono font-bold text-slate-900 focus:bg-white border-b border-transparent focus:border-blue-500"
                          />
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">
                          {formatNumber(line.estimatedAmount)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-slate-700">
                          {formatNumber(line.availableBudget)}
                        </td>
                        <td className={`py-3 px-2 text-right font-mono font-bold ${line.ecart > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {line.ecart > 0 ? `+${formatNumber(line.ecart)}` : formatNumber(line.ecart)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer">
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteLine(line.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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
                onClick={handleAddLine}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition"
              >
                <Plus size={14} /> Ajouter une ligne
              </button>

              <div className="flex items-center gap-8 text-xs font-bold font-mono flex-wrap">
                <div>
                  <span className="text-slate-500 font-sans block text-[10.5px]">Total estimé</span>
                  <span className="text-slate-900 text-sm font-black">{formatNumber(totalEstimatedAmount)}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-sans block text-[10.5px]">Total Budget disponible</span>
                  <span className="text-slate-900 text-sm font-black">{formatNumber(totalAvailableBudget)}</span>
                </div>

                <div>
                  <span className="text-slate-500 font-sans block text-[10.5px]">Écart total</span>
                  <span className={`text-sm font-black ${totalEcart > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {totalEcart > 0 ? `+${formatNumber(totalEcart)}` : formatNumber(totalEcart)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. TROIS BLOCS BAS (COMMENTAIRE | HISTORIQUE | CIRCUIT DE VALIDATION) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            {/* Card 1 : Commentaire du Demandeur */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider pb-2 border-b border-slate-100">
                COMMENTAIRE DU DEMANDEUR
              </h2>
              <textarea
                rows={3}
                value={requesterComment}
                onChange={e => setRequesterComment(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 focus:bg-white focus:border-blue-500"
              />
            </div>

            {/* Card 2 : Historique de la Demande */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider pb-2 border-b border-slate-100">
                HISTORIQUE DE LA DEMANDE
              </h2>
              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2.5 text-xs">
                  <CheckCircle2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">Demande créée</span>
                    <span className="text-[10.5px] font-mono text-slate-500">
                      {getTodayFrDate()} à {getNowTimeStr()} par {currentUser?.name || 'Amadou Fall'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3 : Circuit de Validation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider pb-2 border-b border-slate-100">
                CIRCUIT DE VALIDATION
              </h2>

              <div className="flex items-center justify-between pt-2">
                {/* Demandeur */}
                <div className="text-center">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Demandeur</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center mx-auto mb-1 shadow-2xs">
                    ✓
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-900 block truncate max-w-[80px]">{currentUser?.name || 'Amadou Fall'}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{getNowTimeStr()}</span>
                </div>

                <ChevronRight size={14} className="text-slate-300" />

                {/* N+1 */}
                <div className="text-center">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">N+1</span>
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center mx-auto mb-1 shadow-2xs">
                    ⏳
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-900 block">Chef Travaux</span>
                  <span className="text-[9px] text-amber-600 font-medium">En attente</span>
                </div>

                <ChevronRight size={14} className="text-slate-300" />

                {/* N+2 */}
                <div className="text-center">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">N+2</span>
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center mx-auto mb-1">
                    👤
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-900 block">Resp. Achats</span>
                  <span className="text-[9px] text-slate-400 font-medium">En attente</span>
                </div>

                <ChevronRight size={14} className="text-slate-300" />

                {/* Approbation */}
                <div className="text-center">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Approbation</span>
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center mx-auto mb-1">
                    🔒
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-900 block">Directeur Projet</span>
                  <span className="text-[9px] text-slate-400 font-medium">En attente</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. FOOTER STICKY ACTION BAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <button
              onClick={handleSaveDraft}
              className="bg-white hover:bg-slate-50 text-slate-800 font-extrabold px-5 py-2.5 rounded-xl border border-slate-300 text-xs shadow-xs cursor-pointer transition"
            >
              📄 Enregistrer en brouillon
            </button>

            <div className="text-[11px] text-slate-500 font-medium text-center">
              Rapport créé le <strong>{getTodayFrDate()} à {getNowTimeStr()}</strong><br />
              Dernière sauvegarde : <strong>{lastSaveTime}</strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab?.('dashboard')}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-xs cursor-pointer transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitValidation}
                className="bg-[#11192e] hover:bg-slate-800 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition"
              >
                <span>🚀 Soumettre pour validation</span>
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* VUE 2 : LISTE DES DEMANDES D'ACHAT ENREGISTRÉES (SOUCE DE DONNÉES RÉELLE) */
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              LISTE DES DEMANDES D'ACHAT REGISTRÉES ({purchaseRequests.length})
            </h2>
            <button
              onClick={() => setViewMode('form')}
              className="bg-blue-600 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Nouvelle Demande d'Achat
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10.5px]">
                  <th className="py-2.5 px-2">Code DA</th>
                  <th className="py-2.5 px-2">Projet</th>
                  <th className="py-2.5 px-2">Description / Articles</th>
                  <th className="py-2.5 px-2 text-right">Montant Total</th>
                  <th className="py-2.5 px-2 text-center">Demandeur</th>
                  <th className="py-2.5 px-2 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {purchaseRequests.length > 0 ? (
                  purchaseRequests.map((da: any) => (
                    <tr key={da.id || da.code} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-bold text-blue-700 font-mono">{da.code}</td>
                      <td className="py-3 px-2 font-bold text-slate-800">{da.projectName || selectedProject.name}</td>
                      <td className="py-3 px-2 text-slate-600">{da.itemDescription || 'Fournitures chantier'}</td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">{formatFCFA(da.estimatedTotal || 0)}</td>
                      <td className="py-3 px-2 text-center font-bold">{da.createdBy || 'Amadou Fall'}</td>
                      <td className="py-3 px-2 text-right">
                        <span className={`px-2.5 py-1 font-bold rounded-lg text-[10px] ${
                          da.status === 'APPROUVEE' ? 'bg-emerald-50 text-emerald-800' :
                          da.status === 'REJETEE' ? 'bg-rose-50 text-rose-800' :
                          'bg-amber-50 text-amber-800'
                        }`}>
                          {da.status || 'EN_VALIDATION'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      Aucune demande d'achat enregistrée dans la base de données.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
