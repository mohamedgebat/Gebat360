import React, { useState, useMemo, useRef } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { NonProductiveCategory } from '../../types';
import * as XLSX from 'xlsx';
import {
  Calendar, Sun, CloudRain, ShieldCheck, CheckCircle2, AlertTriangle, Plus,
  FileText, Clock, Lock, ArrowRight, UserCheck, Calculator, TrendingUp, Camera, Paperclip,
  Check, X, Truck, Package, HardHat, AlertCircle, FileSpreadsheet, Eye, Upload, Download, Search,
  ChevronRight, ChevronLeft, ArrowLeft, ChevronDown, RefreshCw, Layers, Building2, User, FileCheck,
  Send, HelpCircle, Bell, Printer
} from 'lucide-react';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../../core/database/realSongonDsData';
import { hasProjectAccess } from '../../core/permissions';

const formatQty = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0,00';
  const rounded = Math.round(Number(val) * 100) / 100;
  return rounded.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatFrenchDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '08/08/2026';

  if (dateStr.includes('T')) {
    const rawDatePart = dateStr.split('T')[0];
    const rawTimePart = dateStr.split('T')[1]?.replace('Z', '').split('.')[0];

    const dateParts = rawDatePart.split('-');
    if (dateParts.length === 3) {
      const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      if (rawTimePart && rawTimePart !== '00:00:00' && rawTimePart !== '00:00') {
        const timeFormatted = rawTimePart.substring(0, 5);
        return `${formattedDate} à ${timeFormatted}`;
      }
      return formattedDate;
    }
  }

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return dateStr;
};

export const ProductionModule: React.FC = () => {
  const { projects, createDailyReport, updateDailyReportStatus, updateValidationTaskStatus, addAuditLog, currentUser, users = [], wbsMap, dailyReports, stockItems = [], setActiveTab } = useAppState();

  // État local réactif du projet/site sélectionné
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    return projects[0]?.id || projects[0]?.code || 'CIV-2026-ASS-BEN-002';
  });

  // Auto-initialisation si les projets sont rechargés
  React.useEffect(() => {
    if (projects.length > 0 && (!selectedProjectId || !projects.some(p => p.id === selectedProjectId || p.code === selectedProjectId))) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  // Projet sélectionné réactif
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId || p.code === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  // Obtenir la date et l'heure réelles actuelles du système
  const getTodayIso = () => new Date().toISOString().split('T')[0];
  const getNowTimeStr = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const getTodayFrDate = () => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Rôle de l'utilisateur connecté habilité à valider
  const isValidatorRole = useMemo(() => {
    const role = (currentUser?.role || '').toLowerCase();
    return (
      role.includes('conducteur') ||
      role.includes('directeur') ||
      role.includes('super admin') ||
      role.includes('admin') ||
      role.includes('dp') ||
      role.includes('dt')
    );
  }, [currentUser]);

  // État du statut du rapport : Défaut automatique à 'Soumis' pour les valideurs (Conducteur, DP, DT, Admin)
  const [reportStatus, setReportStatus] = useState<'Brouillon' | 'Soumis' | 'Validé' | 'Verrouillé'>(() => {
    const role = (currentUser?.role || '').toLowerCase();
    if (role.includes('conducteur') || role.includes('directeur') || role.includes('super admin') || role.includes('admin') || role.includes('dp') || role.includes('dt')) {
      return 'Soumis';
    }
    return 'Brouillon';
  });

  // Filtre de projet pour le tableau récapitulatif des valideurs (Défaut: 'ALL' pour ne rater aucun rapport soumis)
  const [stepProjectFilter, setStepProjectFilter] = useState<string>('ALL');
  const [viewingReportDetail, setViewingReportDetail] = useState<DailyReport | null>(null);

  // Dynamic status-matching helper : Filtrage strict et étanche par site / projet
  const isProjectReportMatch = (r: any, proj: any): boolean => {
    if (!r || !proj) return false;
    const pId = String(proj.id || '').toUpperCase().trim();
    const pCode = String(proj.code || '').toUpperCase().trim();

    const rProjId = String(r.projectId || r.project_id || '').toUpperCase().trim();
    const rCode = String(r.code || r.id || r.reportCode || '').toUpperCase().trim();
    const rText = `${rProjId} ${rCode} ${String(r.wbsCode || '')} ${String(r.activityName || '')}`.toUpperCase();

    const isSongonProject = pId.includes('SON') || pCode.includes('SON') || (proj.name && proj.name.toUpperCase().includes('SONGON'));
    const isBingervilleProject = pId.includes('BEN') || pCode.includes('BEN') || (proj.name && proj.name.toUpperCase().includes('BINGERVILLE'));

    if (isSongonProject) {
      if (rCode.startsWith('REP-BEN-') || rText.includes('BEN-002') || rText.includes('BINGERVILLE')) {
        return false;
      }
      return rProjId.includes('SON') || rCode.includes('SON') || rText.includes('SONGON') || rProjId === pId || rProjId === pCode;
    }

    if (isBingervilleProject) {
      if (rCode.startsWith('REP-SON-') || rText.includes('SON-001') || rText.includes('SONGON')) {
        return false;
      }
      return rProjId.includes('BEN') || rCode.includes('BEN') || rText.includes('BINGERVILLE') || rProjId === pId || rProjId === pCode;
    }

    return rProjId === pId || rProjId === pCode;
  };

  // Rapports d'étapes (Soumis / Validé / Verrouillé) filtrés strictement pour le site sélectionné
  const stepReports = useMemo(() => {
    return dailyReports.filter(r => {
      const matchProj = isProjectReportMatch(r, selectedProject);
      const normReportStatus = (r.status || 'Soumis').toUpperCase().trim();
      const normCurrentStatus = (reportStatus || 'Soumis').toUpperCase().trim();

      const isStatusMatch =
        normReportStatus === normCurrentStatus ||
        (normCurrentStatus.includes('SOUMIS') && (normReportStatus.includes('SOUMIS') || normReportStatus.includes('ATTENTE') || normReportStatus.includes('PENDING'))) ||
        (normCurrentStatus.includes('VALID') && (normReportStatus.includes('VALID') || normReportStatus.includes('APPROVED'))) ||
        (normCurrentStatus.includes('VERROU') && (normReportStatus.includes('VERROU') || normReportStatus.includes('CLOSED')));

      return matchProj && isStatusMatch;
    });
  }, [dailyReports, selectedProject, reportStatus]);
  const [reportDate, setReportDate] = useState<string>(getTodayIso());
  const [creationTime, setCreationTime] = useState<string>(getNowTimeStr());
  const [lastSaveTime, setLastSaveTime] = useState<string>(getNowTimeStr());
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  const formattedReportDate = useMemo(() => {
    if (!reportDate) return getTodayFrDate();
    const parts = reportDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return reportDate;
  }, [reportDate]);

  // Source d'activités réelles selon le projet sélectionné
  const realActivitiesSource = useMemo(() => {
    const code = (selectedProject?.code || '').toUpperCase();
    const name = (selectedProject?.name || '').toUpperCase();
    if (code.includes('SON') || name.includes('SONGON')) {
      return REAL_DS_SONGON_ACTIVITIES;
    }
    return REAL_DS_BINGERVILLE_ACTIVITIES;
  }, [selectedProject]);

  // Source dynamique de WBS / Activités pour le projet sélectionné (base de données MySQL / IndexedDB wbsMap)
  const projectWbsNodes = useMemo(() => {
    if (!selectedProject) return realActivitiesSource;
    const projectTree = wbsMap[selectedProject.id] || wbsMap[selectedProject.code] || [];
    if (Array.isArray(projectTree) && projectTree.length > 0) {
      const flat: Array<{ id: string; wbsCode: string; priceNo?: string; description: string; unit?: string; contractQty?: number; plannedQty?: number }> = [];
      const walk = (items: typeof projectTree) => {
        items.forEach((item: any) => {
          if (!item.children || item.children.length === 0) {
            flat.push({
              id: item.id || item.code,
              wbsCode: item.code || item.id,
              priceNo: item.code,
              description: item.name || item.description || item.wbsCode,
              unit: item.unit || 'm²',
              contractQty: Number(item.quantity || item.plannedQty || item.contractQty || 100),
              plannedQty: Number(item.quantity || item.plannedQty || item.contractQty || 100)
            });
          } else {
            walk(item.children);
          }
        });
      };
      walk(projectTree);
      if (flat.length > 0) return flat;
    }
    return realActivitiesSource;
  }, [selectedProject, wbsMap, realActivitiesSource]);

  // 1. INFORMATIONS GÉNÉRALES
  const [locationZone, setLocationZone] = useState<string>('');
  const [weather, setWeather] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [generalComment, setGeneralComment] = useState<string>('');
  const [workShift, setWorkShift] = useState<string>('');
  const [teamLeader, setTeamLeader] = useState<string>(currentUser?.name || 'Yacouba Mohamed');

  // 2. OBJECTIFS & RÉALISATIONS (SAISIE PROGRESSIVE MULTI-ACTIVITÉS)
  interface RecordedActivityItem {
    id: string;
    wbsCode: string;
    activityName: string;
    unit: string;
    targetQty: number;
    realizedQty: number;
    totalPlanned: number;
    cumulDate: number;
  }

  // État de la saisie en cours (Haut)
  const [currentWbsCode, setCurrentWbsCode] = useState<string>('');
  const [currentTargetQty, setCurrentTargetQty] = useState<number>(0);
  const [currentRealizedQty, setCurrentRealizedQty] = useState<string | number>('');

  // Liste des activités progressivement enregistrées sur le rapport (Bas)
  const [recordedActivities, setRecordedActivities] = useState<RecordedActivityItem[]>([]);

  // Synchronisation dynamique lors du changement de site/chantier
  React.useEffect(() => {
    if (selectedProject) {
      setStepProjectFilter(selectedProject.id);
      if (projectWbsNodes && projectWbsNodes.length > 0) {
        setCurrentWbsCode(projectWbsNodes[0].wbsCode || projectWbsNodes[0].priceNo || projectWbsNodes[0].id || '');
      } else {
        setCurrentWbsCode('');
      }
      setCurrentRealizedQty('');
    }
  }, [selectedProjectId, selectedProject?.id, selectedProject?.code]);

  // Activité courante sélectionnée
  const currentSelectedAct = useMemo(() => {
    if (!currentWbsCode) return null;
    return projectWbsNodes.find(a => a.wbsCode === currentWbsCode || a.priceNo === currentWbsCode || a.id === currentWbsCode) || null;
  }, [projectWbsNodes, currentWbsCode]);

  // Unité courante
  const currentActUnit = currentSelectedAct?.unit || 'm²';

  // Volume contractuel DQE de l'activité courante
  const currentContractVol = useMemo(() => {
    if (!currentSelectedAct) return 0;
    let contractVol = Number(currentSelectedAct.contractQty || currentSelectedAct.plannedQty || 0);
    if (contractVol <= 1 && currentActUnit !== 'fft' && currentActUnit !== 'U') {
      const wbsNodeMatch = (wbsMap[selectedProject?.id || ''] || wbsMap[selectedProject?.code || ''] || [])
        .find((n: any) => n.code === currentWbsCode || n.id === currentWbsCode);
      if (wbsNodeMatch && Number(wbsNodeMatch.revisedBudget || wbsNodeMatch.plannedQty) > 1) {
        contractVol = Number(wbsNodeMatch.plannedQty || wbsNodeMatch.revisedBudget || 5000);
      } else {
        contractVol = 15570;
      }
    }
    return contractVol;
  }, [currentSelectedAct, currentActUnit, currentWbsCode, wbsMap, selectedProject]);

  // Cumul historique de l'activité courante
  const currentCumulDate = useMemo(() => {
    if (!currentWbsCode || !currentSelectedAct) return 0;
    const previousCumul = dailyReports
      .filter(r => (r.projectId === selectedProject?.id || r.projectId === selectedProject?.code) && 
                   (r.wbsCode === currentWbsCode || r.wbsId === currentWbsCode || r.activityName === currentSelectedAct.description) &&
                   ['VALIDÉ', 'VALIDE', 'VALIDEE', 'VERROUILLÉ', 'VERROUILLE', 'VERROUILLEE'].includes(String(r.status || '').toUpperCase()))
      .reduce((sum, r) => sum + (Number(r.realizedQty) || 0), 0);

    const wbsNodeMatch = (wbsMap[selectedProject?.id || ''] || wbsMap[selectedProject?.code || ''] || [])
      .find((n: any) => n.code === currentWbsCode || n.id === currentWbsCode);
    const initialCumul = Number(wbsNodeMatch?.actualQty || 0);
    return previousCumul > 0 ? previousCumul : initialCumul;
  }, [currentWbsCode, currentSelectedAct, dailyReports, selectedProject, wbsMap]);

  // PROPOSITION 1 : CALCUL AUTOMATIQUE DE L'OBJECTIF JOUR SUR BASE DU PLANNING GANTT (Reste à faire / Délai restants)
  const remainingQty = useMemo(() => {
    return Math.max(0, currentContractVol - currentCumulDate);
  }, [currentContractVol, currentCumulDate]);

  // Nombre de jours de travail restants selon le planning Gantt (ou valeur par défaut basée sur le délai projet)
  const remainingWorkDays = useMemo(() => {
    if (!currentWbsCode) return 15;
    const wbsNodeMatch = (wbsMap[selectedProject?.id || ''] || wbsMap[selectedProject?.code || ''] || [])
      .find((n: any) => n.code === currentWbsCode || n.id === currentWbsCode);
    
    if (wbsNodeMatch?.endDate) {
      const today = new Date();
      const end = new Date(wbsNodeMatch.endDate);
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) return Math.max(1, Math.round(diffDays * (5 / 7)));
    }
    
    return 15; // 15 jours d'exécution ouvrés par défaut si non spécifié
  }, [currentWbsCode, wbsMap, selectedProject]);

  // Objectif jour calculé automatiquement d'après le planning Gantt (Reste à faire / Jours restants)
  const autoCalculatedTargetQty = useMemo(() => {
    if (!currentWbsCode || remainingQty <= 0) return 0;
    const calculated = Math.round(remainingQty / (remainingWorkDays || 1));
    return calculated > 0 ? calculated : Math.ceil(remainingQty);
  }, [currentWbsCode, remainingQty, remainingWorkDays]);

  // Synchronisation automatique de l'objectif jour au changement d'activité WBS
  React.useEffect(() => {
    if (currentWbsCode && autoCalculatedTargetQty > 0) {
      setCurrentTargetQty(autoCalculatedTargetQty);
    } else if (!currentWbsCode) {
      setCurrentTargetQty(0);
    }
  }, [currentWbsCode, autoCalculatedTargetQty]);

  // Quantité réalisée numérique nettoyée
  const numCurrentRealized = useMemo(() => {
    if (currentRealizedQty === '' || currentRealizedQty === undefined || currentRealizedQty === null) return 0;
    const parsed = Number(currentRealizedQty);
    return isNaN(parsed) ? 0 : parsed;
  }, [currentRealizedQty]);

  // Pourcentages de la saisie courante
  const currentAdvancePct = useMemo(() => {
    if (!currentTargetQty || currentTargetQty === 0) return 0;
    return parseFloat(((numCurrentRealized / currentTargetQty) * 100).toFixed(1));
  }, [numCurrentRealized, currentTargetQty]);

  const currentCumulPct = useMemo(() => {
    if (!currentContractVol || currentContractVol === 0) return 0;
    const totalToDate = (currentCumulDate || 0) + numCurrentRealized;
    return parseFloat(((totalToDate / currentContractVol) * 100).toFixed(1));
  }, [currentCumulDate, numCurrentRealized, currentContractVol]);

  // Validation et enregistrement de l'activité courante dans la liste du bas
  const handleAddCurrentActivity = () => {
    if (!currentWbsCode || !currentSelectedAct) {
      alert('⚠️ Veuillez sélectionner une activité WBS dans la liste.');
      return;
    }
    if (currentRealizedQty === '' || isNaN(Number(currentRealizedQty))) {
      alert('⚠️ Veuillez saisir la quantité réalisée pour cette activité.');
      return;
    }

    const newItem: RecordedActivityItem = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      wbsCode: currentWbsCode,
      activityName: currentSelectedAct.description,
      unit: currentActUnit,
      targetQty: currentTargetQty,
      realizedQty: Number(currentRealizedQty),
      totalPlanned: currentContractVol,
      cumulDate: currentCumulDate
    };

    setRecordedActivities(prev => [...prev, newItem]);
    // Réinitialisation du formulaire du haut pour permettre la saisie progressive suivante
    setCurrentWbsCode('');
    setCurrentTargetQty(0);
    setCurrentRealizedQty('');
  };

  const handleRemoveRecordedActivity = (id: string) => {
    setRecordedActivities(prev => prev.filter(r => r.id !== id));
  };

  // 3. RESSOURCES UTILISÉES (Onglets Personnel / Matériel / Sous-traitants)
  const [resourceTab, setResourceTab] = useState<'personnel' | 'materiel' | 'soustraitants'>('personnel');
  const [personnelRows, setPersonnelRows] = useState<Array<{ category: string; effectif: number; hNormales: number; hSup: number }>>([]);

  const personnelTotals = useMemo(() => {
    return personnelRows.reduce(
      (acc, r) => ({
        effectif: acc.effectif + r.effectif,
        hNormales: acc.hNormales + r.hNormales,
        hSup: acc.hSup + r.hSup,
      }),
      { effectif: 0, hNormales: 0, hSup: 0 }
    );
  }, [personnelRows]);

  // 4. CONSOMMATIONS & LIVRAISONS
  const [consumptionTab, setConsumptionTab] = useState<'consommations' | 'livraisons'>('consommations');

  // Initialisation dynamique des consommations basées sur les articles de stock réels de la base de données
  const defaultStockConsumptions = useMemo(() => {
    if (stockItems && stockItems.length > 0) {
      return stockItems.map(item => ({
        article: item.name,
        unit: item.unit || 'U',
        prevue: Number(item.minQuantity || 100),
        consommee: 0,
        ecart: 0
      }));
    }
    return [];
  }, [stockItems]);

  const [consommationsRows, setConsommationsRows] = useState<Array<{ article: string; unit: string; prevue: number; consommee: number; ecart: number }>>(defaultStockConsumptions);

  React.useEffect(() => {
    setConsommationsRows(defaultStockConsumptions);
  }, [defaultStockConsumptions]);

  const handleAddConsumptionRow = () => {
    setConsommationsRows(prev => [
      ...prev,
      { article: '', unit: 'U', prevue: 0, consommee: 0, ecart: 0 }
    ]);
  };

  // 5. PROBLÈMES RENCONTRÉS
  const [problems, setProblems] = useState<Array<{ type: string; impact: 'Moyen' | 'Faible' | 'Fort' }>>([]);

  const handleAddProblem = () => {
    setProblems(prev => [
      ...prev,
      { type: 'Nouvel incident signalisé', impact: 'Moyen' }
    ]);
  };

  // 6. PHOTOS DU CHANTIER
  const [photos, setPhotos] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const url = URL.createObjectURL(files[0]);
      setPhotos(prev => [...prev, url]);
    }
  };

  // 7. OBSERVATIONS & REMARQUES
  const [observations, setObservations] = useState('');

  // 8. HISTORIQUE DE SOUMISSION & REJET
  const [historyLogs, setHistoryLogs] = useState([
    { time: `${getTodayFrDate()} ${getNowTimeStr()}`, text: `Rapport créé par ${currentUser?.name || 'Chef de Projet'}` },
  ]);

  // État de la modal de renvoi / demande de correction
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Verrouillage dynamique du formulaire : Seul le statut Brouillon autorise l'édition par le terrain
  const isFormEditable = useMemo(() => {
    return reportStatus === 'Brouillon';
  }, [reportStatus]);

  // Renvoyer le rapport en Brouillon avec motif explicite du valitateur (DP / DT)
  const handleRejectReport = () => {
    if (!rejectionReason.trim()) {
      alert('⚠️ Veuillez indiquer le motif du rejet ou les corrections demandées au chef de chantier.');
      return;
    }

    setReportStatus('Brouillon');
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setHistoryLogs(prev => [
      { 
        time: `${formattedReportDate} ${timeStr}`, 
        text: `↩️ Rapport renvoyé en Brouillon par ${currentUser?.name || 'Validateur'} — Motif : "${rejectionReason}"` 
      },
      ...prev
    ]);
    setShowRejectModal(false);
    setRejectionReason('');
    alert('↩️ Rapport renvoyé au chef de chantier en statut Brouillon avec le motif d\'ajustement !');
  };

  // Synchronisation dynamique automatique des consommations depuis le stock de l'application
  React.useEffect(() => {
    if (stockItems && stockItems.length > 0) {
      const realCons = stockItems.slice(0, 4).map(item => ({
        article: item.name,
        unit: item.unit || 'U',
        prevue: Number(item.minQuantity || 100),
        consommee: 0,
        ecart: 0
      }));
      setConsommationsRows(realCons);
    }
  }, [stockItems]);

  // Contrôle d'accès et d'habilitation selon le rôle du compte connecté (Brouillon -> Soumis -> Validé -> Verrouillé)
  const handleStatusChange = (targetStatus: 'Brouillon' | 'Soumis' | 'Validé' | 'Verrouillé') => {
    const userRole = (currentUser?.role || '').toLowerCase();
    const isSuperAdmin = userRole.includes('super admin') || userRole.includes('admin');
    const isDirection = userRole.includes('direction') || userRole.includes('dg');
    const isDirecteurProjet = userRole.includes('directeur projet') || userRole.includes('dp');
    const isDirecteurTechnique = userRole.includes('directeur technique') || userRole.includes('dt');
    const isConducteur = userRole.includes('conducteur');
    const isControleur = userRole.includes('contrôleur') || userRole.includes('controleur');

    if (targetStatus === 'Validé') {
      if (!isSuperAdmin && !isDirection && !isDirecteurProjet && !isDirecteurTechnique && !isConducteur) {
        alert(`⛔ HABILITATION INSUFFISANTE\n\nVotre compte (${currentUser?.name || 'Utilisateur'}, Rôle: "${currentUser?.role || 'Non spécifié'}") n'est pas habilité à VALIDER ce rapport.\n\nSeuls les comptes habilités suivants disposent des droits de validation :\n• Conducteur de Travaux\n• Directeur de Projet (DP)\n• Directeur Technique (DT)\n• Direction Générale (DG)\n• Super Administrateur`);
        return;
      }

      // Valider les rapports non validés du chantier actif
      const reportsToValidate = dailyReports.filter(r => {
        if (!isProjectReportMatch(r, selectedProject)) return false;
        const normS = (r.status || '').toUpperCase();
        return !normS.includes('VALID') && !normS.includes('VERROU');
      });

      if (reportsToValidate.length > 0) {
        reportsToValidate.forEach(rep => {
          if (updateDailyReportStatus) {
            updateDailyReportStatus(rep.id, 'Validé', `Validé par ${currentUser?.name || 'Valideur'} (${currentUser?.role || 'DP/DT'})`);
          }
          if (updateValidationTaskStatus) {
            updateValidationTaskStatus(rep.id, 'APPROVED', `Validé par ${currentUser?.name || 'Valideur'}`);
          }
        });
        alert(`✅ ${reportsToValidate.length} rapport(s) du chantier ${selectedProject.name} validé(s) avec succès !\n\n• Métrés & WBS actualisés déterministiquement\n• % Avancement Physique du Projet recalculé\n• Cost Control (AC, EV, EAC, Marge) propagé\n• Sorties de stock enregistrées sans double imputation`);
      } else if (recordedActivities.length > 0 || currentWbsCode) {
        handleSubmitValidation();
      } else {
        alert('ℹ️ Aucun rapport en attente de validation pour ce chantier.');
      }
    }

    if (targetStatus === 'Verrouillé') {
      if (!isSuperAdmin && !isDirection && !isDirecteurProjet && !isControleur) {
        alert(`⛔ HABILITATION INSUFFISANTE\n\nVotre compte (${currentUser?.name || 'Utilisateur'}, Rôle: "${currentUser?.role || 'Non spécifié'}") n'est pas habilité à VERROUILLER définitivement ce rapport.\n\nSeuls les comptes habilités suivants peuvent verrouiller un rapport :\n• Directeur de Projet (DP)\n• Contrôleur de Gestion\n• Direction Générale (DG)\n• Super Administrateur`);
        return;
      }
    }

    setReportStatus(targetStatus);
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setLastSaveTime(timeStr);
    setHistoryLogs(prev => [
      { time: `${formattedReportDate} ${timeStr}`, text: `Statut passé à "${targetStatus}" par ${currentUser?.name || 'Utilisateur'} (${currentUser?.role || 'Compte Habilité'})` },
      ...prev
    ]);
  };

  // Enregistrement Brouillon Multi-Activités Progressivement
  const handleSaveDraft = () => {
    handleStatusChange('Brouillon');

    const itemsToSave = [...recordedActivities];
    if (currentWbsCode && currentSelectedAct && currentRealizedQty !== '') {
      itemsToSave.push({
        id: `rec-current`,
        wbsCode: currentWbsCode,
        activityName: currentSelectedAct.description,
        unit: currentActUnit,
        targetQty: currentTargetQty,
        realizedQty: Number(currentRealizedQty),
        totalPlanned: currentContractVol,
        cumulDate: currentCumulDate
      });
    }

    if (itemsToSave.length === 0) {
      alert('⚠️ Aucune activité saisie ou enregistrée sur ce rapport.');
      return;
    }

    if (createDailyReport) {
      itemsToSave.forEach(item => {
        const rowAdvancePct = item.targetQty > 0 ? parseFloat(((item.realizedQty / item.targetQty) * 100).toFixed(1)) : 0;

        createDailyReport({
          projectId: selectedProject.id,
          date: reportDate,
          wbsCode: item.wbsCode,
          activityName: item.activityName || 'Activité',
          weather,
          temperature,
          workShift,
          locationZone,
          generalComment,
          teamLeader,
          unit: item.unit,
          targetQty: item.targetQty,
          realizedQty: item.realizedQty,
          cumulDate: item.cumulDate,
          totalPlanned: item.totalPlanned,
          advancePct: rowAdvancePct,
          personnel: personnelRows,
          consummations: consommationsRows,
          problems,
          photos,
          observations,
          status: 'Brouillon'
        });
      });
    }

    alert(`✅ Brouillon du Rapport Journalier (${itemsToSave.length} activité(s)) enregistré et persisté dans la base de données !`);
  };

  // Soumission pour validation Multi-Activités Progressivement
  const handleSubmitValidation = () => {
    handleStatusChange('Soumis');

    const itemsToSave = [...recordedActivities];
    if (currentWbsCode && currentSelectedAct && currentRealizedQty !== '') {
      itemsToSave.push({
        id: `rec-current`,
        wbsCode: currentWbsCode,
        activityName: currentSelectedAct.description,
        unit: currentActUnit,
        targetQty: currentTargetQty,
        realizedQty: Number(currentRealizedQty),
        totalPlanned: currentContractVol,
        cumulDate: currentCumulDate
      });
    }

    if (itemsToSave.length === 0) {
      alert('⚠️ Aucune activité saisie ou enregistrée sur ce rapport.');
      return;
    }

    if (createDailyReport) {
      itemsToSave.forEach(item => {
        const rowAdvancePct = item.targetQty > 0 ? parseFloat(((item.realizedQty / item.targetQty) * 100).toFixed(1)) : 0;

        createDailyReport({
          projectId: selectedProject.id,
          date: reportDate,
          wbsCode: item.wbsCode,
          activityName: item.activityName || 'Activité',
          weather,
          temperature,
          workShift,
          locationZone,
          generalComment,
          teamLeader,
          unit: item.unit,
          targetQty: item.targetQty,
          realizedQty: item.realizedQty,
          cumulDate: item.cumulDate,
          totalPlanned: item.totalPlanned,
          advancePct: rowAdvancePct,
          personnel: personnelRows,
          consummations: consommationsRows,
          problems,
          photos,
          observations,
          status: 'Soumis'
        });
      });
    }

    setRecordedActivities([]);
    setCurrentRealizedQty('');
    setReportStatus('Soumis');
    alert(`🚀 Rapport Journalier (${itemsToSave.length} activité(s)) envoyé pour validation et persisté dans la base de données ! Visible immédiatement dans l'onglet Étape 2 (SOUMIS) et dans le Centre de Validation.`);
  };

  if (!selectedProject) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4 max-w-xl mx-auto my-12 text-xs">
        <FileText size={56} className="text-slate-300 mx-auto" />
        <h2 className="text-xl font-extrabold text-slate-900">Rapport Journalier de Production</h2>
        <p className="text-slate-500">
          Aucun projet n'est enregistré dans la base de données.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs font-sans text-slate-800 pb-16 max-w-[1700px] mx-auto bg-slate-50/50 p-2 md:p-4 rounded-3xl">
      {/* 1. TOP HEADER NAVIGATION & ACTION BAR (EXACT MEDIA_1787755381495.PNG) */}
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
              RAPPORT JOURNALIER DE PRODUCTION
            </h1>
            <HelpCircle size={16} className="text-slate-400 cursor-pointer hover:text-slate-600" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Building2 size={15} className="text-blue-600 shrink-0" />
            <span className="font-extrabold text-slate-500 text-xs">Site / Chantier :</span>
            <select
              value={selectedProjectId}
              onChange={e => {
                const newProjId = e.target.value;
                setSelectedProjectId(newProjId);
                setStepProjectFilter(newProjId);
              }}
              className="bg-blue-50/90 border border-blue-300 text-blue-950 font-black text-xs px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs transition hover:bg-blue-100 max-w-[450px] truncate"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  🏗️ {p.code} · {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Picker Input */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
            <span className="text-slate-500 font-medium">Date du rapport</span>
            <input
              type="date"
              value={reportDate}
              onChange={e => setReportDate(e.target.value)}
              className="bg-transparent text-slate-900 font-bold text-xs focus:outline-none cursor-pointer"
            />
            <Calendar size={14} className="text-slate-400" />
          </div>

          {/* Bouton Actions Rapides Dropdown */}
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
                  <FileText size={14} /> Enregistrer comme Brouillon
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

          {/* Bouton Exporter PDF */}
          <button
            onClick={() => window.print()}
            className="bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
          >
            <Download size={14} /> Exporter PDF
          </button>
        </div>
      </div>

      {/* 2. BARRE DE PROGRESSION STEPS WORKFLOW (1. Brouillon -> 2. Soumis -> 3. Validé -> 4. Verrouillé) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            {/* Step 1 : Brouillon */}
            <button
              onClick={() => handleStatusChange('Brouillon')}
              className={`flex-1 flex items-center gap-3 p-3 rounded-2xl border transition text-left cursor-pointer ${
                reportStatus === 'Brouillon'
                  ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs ring-2 ring-blue-500/20'
                  : reportStatus === 'Soumis' || reportStatus === 'Validé' || reportStatus === 'Verrouillé'
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${
                reportStatus === 'Brouillon' ? 'bg-blue-600 text-white shadow-xs' : 'bg-emerald-600 text-white shadow-xs'
              }`}>
                {reportStatus !== 'Brouillon' ? <CheckCircle2 size={18} /> : <FileText size={18} />}
              </div>
              <div>
                <span className="font-black text-xs block text-slate-900 flex items-center gap-1.5">
                  <span>1. Brouillon</span>
                </span>
                <span className="text-[10.5px] font-medium text-slate-500">En cours de saisie</span>
              </div>
            </button>

            <ChevronRight size={18} className="text-slate-300 shrink-0 hidden sm:block" />

            {/* Step 2 : Soumis */}
            <button
              onClick={() => handleStatusChange('Soumis')}
              className={`flex-1 flex items-center gap-3 p-3 rounded-2xl border transition text-left cursor-pointer ${
                reportStatus === 'Soumis'
                  ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs ring-2 ring-blue-500/20'
                  : reportStatus === 'Validé' || reportStatus === 'Verrouillé'
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${
                reportStatus === 'Soumis' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : reportStatus === 'Validé' || reportStatus === 'Verrouillé'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {reportStatus === 'Validé' || reportStatus === 'Verrouillé' ? <CheckCircle2 size={18} /> : <Send size={18} />}
              </div>
              <div>
                <span className="font-black text-xs block text-slate-900 flex items-center gap-1.5">
                  <span>2. Soumis</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-black rounded-full text-[10.5px]">
                    {dailyReports.filter(r => {
                      if (!isProjectReportMatch(r, selectedProject)) return false;
                      const s = (r.status || '').toUpperCase();
                      return s.includes('SOUMIS') || s.includes('ATTENTE') || s.includes('PENDING');
                    }).length}
                  </span>
                </span>
                <span className="text-[10.5px] font-medium text-slate-500">Envoyé pour validation</span>
              </div>
            </button>

            <ChevronRight size={18} className="text-slate-300 shrink-0 hidden sm:block" />

            {/* Step 3 : Validé */}
            <button
              onClick={() => handleStatusChange('Validé')}
              className={`flex-1 flex items-center gap-3 p-3 rounded-2xl border transition text-left cursor-pointer ${
                reportStatus === 'Validé'
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 shadow-2xs ring-2 ring-emerald-500/20'
                  : reportStatus === 'Verrouillé'
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${
                reportStatus === 'Validé' || reportStatus === 'Verrouillé' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
              }`}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span className="font-black text-xs block text-slate-900 flex items-center gap-1.5">
                  <span>3. Validé</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black rounded-full text-[10.5px]">
                    {dailyReports.filter(r => {
                      if (!isProjectReportMatch(r, selectedProject)) return false;
                      const s = (r.status || '').toUpperCase();
                      return s.includes('VALID') || s.includes('APPROVED');
                    }).length}
                  </span>
                </span>
                <span className="text-[10.5px] font-medium text-slate-500">Approuvé par DP</span>
              </div>
            </button>

            <ChevronRight size={18} className="text-slate-300 shrink-0 hidden sm:block" />

            {/* Step 4 : Verrouillé */}
            <button
              onClick={() => handleStatusChange('Verrouillé')}
              className={`flex-1 flex items-center gap-3 p-3 rounded-2xl border transition text-left cursor-pointer ${
                reportStatus === 'Verrouillé'
                  ? 'bg-purple-50/90 border-purple-300 text-purple-900 shadow-2xs ring-2 ring-purple-500/20'
                  : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${reportStatus === 'Verrouillé' ? 'bg-purple-700 text-white shadow-xs' : 'bg-slate-200 text-slate-600'}`}>
                <Lock size={18} />
              </div>
              <div>
                <span className="font-black text-xs block text-slate-900 flex items-center gap-1.5">
                  <span>4. Verrouillé</span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-black rounded-full text-[10.5px]">
                    {dailyReports.filter(r => {
                      if (!isProjectReportMatch(r, selectedProject)) return false;
                      const s = (r.status || '').toUpperCase();
                      return s.includes('VERROU') || s.includes('CLOSED');
                    }).length}
                  </span>
                </span>
                <span className="text-[10.5px] font-medium text-slate-500">Données consolidées</span>
              </div>
            </button>
          </div>

          {/* Encadré de statut à droite */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs font-medium space-y-1 text-right shrink-0 min-w-[210px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-bold text-[11px]">Statut actuel</span>
              <span className={`px-2.5 py-0.5 font-black rounded text-[10.5px] uppercase ${
                reportStatus === 'Brouillon' ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                reportStatus === 'Soumis' ? 'bg-blue-100 border border-blue-200 text-blue-800' :
                reportStatus === 'Validé' ? 'bg-emerald-100 border border-emerald-200 text-emerald-800' :
                'bg-purple-100 border border-purple-200 text-purple-800'
              }`}>
                {reportStatus}
              </span>
            </div>
            <div className="text-[10.5px] text-slate-500">
              Créé par : <strong className="text-slate-800 font-bold">{currentUser?.name || 'Yacouba Mohamed'}</strong>
            </div>
            <div className="text-[10.5px] text-slate-500 font-mono">
              Le : <strong>{formattedReportDate} à {creationTime}</strong>
            </div>
          </div>
        </div>

        {/* BANNIÈRE CONDITIONNELLE SELON LE STATUT DU WORKFLOW */}
        {reportStatus === 'Brouillon' && (
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs font-medium text-blue-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-blue-600 shrink-0" />
              <span>
                <strong>Mode Édition Terrain :</strong> Saisissez les données de production. Le formulaire est éditable par l'équipe chantier.
              </span>
            </div>
            <button
              onClick={handleSubmitValidation}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg text-xs transition shadow-2xs shrink-0 cursor-pointer"
            >
              🚀 Soumettre pour Validation
            </button>
          </div>
        )}

        {reportStatus === 'Soumis' && (
          <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-xs font-medium text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>⏳ Rapport en attente de revue :</strong> Le formulaire est scellé en <strong>lecture seule</strong> pour le terrain.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-3 py-1.5 bg-rose-100 text-rose-800 hover:bg-rose-200 font-extrabold rounded-lg text-xs transition cursor-pointer"
              >
                ↩️ Demander Correction
              </button>
              <button
                onClick={() => handleStatusChange('Validé')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs transition shadow-2xs cursor-pointer"
              >
                ✅ Valider le Rapport (DP/DT)
              </button>
            </div>
          </div>
        )}

        {reportStatus === 'Validé' && (
          <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl text-xs font-medium text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>
                <strong>✅ Rapport Validé :</strong> Approuvé par la Direction Technique. Les quantitatifs sont comptabilisés dans le projet.
              </span>
            </div>
            <button
              onClick={() => handleStatusChange('Verrouillé')}
              className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold rounded-lg text-xs transition shadow-2xs shrink-0 cursor-pointer"
            >
              🔒 Verrouiller (Consolidation CdG)
            </button>
          </div>
        )}

        {reportStatus === 'Verrouillé' && (
          <div className="p-3 bg-purple-50/90 border border-purple-300 rounded-xl text-xs font-medium text-purple-950 flex items-center gap-2">
            <Lock size={16} className="text-purple-700 shrink-0" />
            <span>
              <strong>🔒 Rapport Verrouillé & Certifié :</strong> Données consolidées définitivement pour l'audit et le Cost Control. Aucune modification terrain possible.
            </span>
          </div>
        )}
      </div>

      {/* 2B. PANNEAU DYNAMIQUE WORKFLOW POUR LES ÉTAPES 2 (SOUMIS), 3 (VALIDÉ), 4 (VERROUILLÉ) */}
      {reportStatus !== 'Brouillon' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <span>Rapports Journaliers Terrain — Étape {reportStatus === 'Soumis' ? '2 (Soumis)' : reportStatus === 'Validé' ? '3 (Validés)' : '4 (Verrouillés)'}</span>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-extrabold rounded-full text-[11px]">
                  {stepReports.length}
                </span>
              </h2>
              <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                {reportStatus === 'Soumis' && "Rapports en attente de revue par le Conducteur de Travaux et le Directeur de Projet."}
                {reportStatus === 'Validé' && "Rapports approuvés par la Direction Technique, prêts pour la consolidation financière."}
                {reportStatus === 'Verrouillé' && "Rapports verrouillés et certifiés pour le Cost Control et l'audit comptable."}
              </p>
            </div>
          </div>

          {stepReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl text-xs space-y-1">
              <FileText size={32} className="mx-auto text-slate-300 mb-1" />
              <div>Aucun rapport journalier avec le statut <strong>{reportStatus}</strong> pour le filtre sélectionné.</div>
              <div className="text-[10.5px] text-slate-400">Astuce : Basculez sur "Tous les projets" ou vérifiez le statut à l'étape 1. Brouillon.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[10.5px]">
                    <th className="p-3">Réf. Rapport</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Activité WBS</th>
                    <th className="p-3 text-right">Quantité réalisée</th>
                    <th className="p-3 text-center">Productivité</th>
                    <th className="p-3 text-center">Auteur / Chef</th>
                    <th className="p-3 text-right">Décision & Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {stepReports.map(rep => (
                    <tr key={rep.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-extrabold text-blue-800 cursor-pointer hover:underline" onClick={() => setViewingReportDetail(rep)}>
                        {rep.code || rep.id}
                      </td>
                      <td className="p-3 font-mono text-slate-700 font-bold">{formatFrenchDate(rep.date)}</td>
                      <td className="p-3 font-bold text-slate-900">{rep.wbsCode ? `[${rep.wbsCode}] ` : ''}{rep.activityName}</td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">{formatQty(rep.realizedQty)} {rep.unit}</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-700">{rep.productivityRate || 100}%</td>
                      <td className="p-3 text-center text-slate-600 font-bold">{rep.createdBy || rep.teamLeader || 'Conducteur'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingReportDetail(rep)}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <Eye size={13} />
                            <span>Détails</span>
                          </button>
                          {reportStatus === 'Soumis' && (
                            isValidatorRole ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    const targetId = rep.id;
                                    const targetCode = rep.code || rep.reportCode;
                                    if (updateDailyReportStatus) {
                                      updateDailyReportStatus(targetId, 'Validé', `Validé par ${currentUser?.name || 'Valideur'}`);
                                      if (targetCode && targetCode !== targetId) {
                                        updateDailyReportStatus(targetCode, 'Validé', `Validé par ${currentUser?.name || 'Valideur'}`);
                                      }
                                    }
                                    if (updateValidationTaskStatus) {
                                      updateValidationTaskStatus(targetId, 'APPROVED', `Validé par ${currentUser?.name || 'Valideur'}`);
                                    }
                                    setReportStatus('Validé');
                                    alert(`✅ Rapport ${targetCode || targetId} validé avec succès ! Transféré à l'Étape 3 (VALIDÉ).`);
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs shadow-2xs cursor-pointer transition flex items-center gap-1"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>✅ Valider (Étape 3)</span>
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Motif / Commentaire pour la demande de correction :') || 'Demande de correction terrain';
                                    if (!reason.trim()) return;
                                    const targetId = rep.id;
                                    const targetCode = rep.code || rep.reportCode;
                                    if (updateDailyReportStatus) {
                                      updateDailyReportStatus(targetId, 'Brouillon', reason);
                                      if (targetCode && targetCode !== targetId) {
                                        updateDailyReportStatus(targetCode, 'Brouillon', reason);
                                      }
                                    }
                                    if (updateValidationTaskStatus) {
                                      updateValidationTaskStatus(targetId, 'RETURNED', reason);
                                    }
                                    setReportStatus('Brouillon');
                                    alert(`↩️ Rapport ${targetCode || targetId} renvoyé en Brouillon pour correction.`);
                                  }}
                                  className="px-2.5 py-1.5 bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold rounded-lg text-xs cursor-pointer transition"
                                >
                                  ↩️ Correction
                                </button>
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold rounded-lg text-[10.5px] border border-amber-200">
                                ⏳ En attente de validation (Conducteur / DP)
                              </span>
                            )
                          )}

                          {reportStatus === 'Validé' && (
                            isValidatorRole ? (
                              <button
                                onClick={() => {
                                  if (updateDailyReportStatus) updateDailyReportStatus(rep.id, 'Verrouillé', 'Verrouillé par le Cost Control');
                                  alert(`🔒 Rapport ${rep.code || rep.id} verrouillé et certifié avec succès !`);
                                }}
                                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold rounded-lg text-xs shadow-2xs cursor-pointer transition"
                              >
                                🔒 Verrouiller (Étape 4)
                              </button>
                            ) : (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold rounded-lg text-xs border border-emerald-300 shadow-2xs inline-flex items-center gap-1">
                                <CheckCircle2 size={13} className="text-emerald-700" />
                                <span>✅ Validé par {rep.validatedBy || 'DP / DT'}</span>
                              </span>
                            )
                          )}

                          {reportStatus === 'Verrouillé' && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-900 font-black rounded-lg text-[11px] border border-purple-200">
                              🔒 Certifié & Conduite
                            </span>
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
      )}

      {/* 3. SECTION INFORMATIONS GÉNÉRALES & SAISIE TERRAIN (EXCLUSIF AU MODE BROUILLON) */}
      {reportStatus === 'Brouillon' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              INFORMATIONS GÉNÉRALES DU CHANTIER
            </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Champ Projet */}
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

          {/* Lieu / Zone */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
              Lieu / Zone
            </label>
            <select
              value={locationZone}
              onChange={e => setLocationZone(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
            >
              <option value="Zone A - Côté Nord">Zone A - Côté Nord</option>
              <option value="Zone B - Côté Sud">Zone B - Côté Sud</option>
              <option value="Base-Vie & Ateliers">Base-Vie & Ateliers</option>
            </select>
          </div>

          {/* Météo & Température */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                Météo
              </label>
              <select
                value={weather}
                onChange={e => setWeather(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
              >
                <option value="Ensoleillé">☀️ Ensoleillé</option>
                <option value="Pluie">🌧️ Pluie</option>
                <option value="Nuageux">☁️ Nuageux</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                Température
              </label>
              <select
                value={temperature}
                onChange={e => setTemperature(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
              >
                <option value="32 °C">32 °C</option>
                <option value="28 °C">28 °C</option>
                <option value="35 °C">35 °C</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
              Équipe / Chef d'équipe
            </label>
            <input
              type="text"
              value={currentUser?.name || 'Yacouba Mohamed'}
              disabled
              className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 cursor-not-allowed"
              title="Fixé automatiquement sur l'utilisateur connecté"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          <div className="md:col-span-3">
            <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
              Commentaire général
            </label>
            <input
              type="text"
              value={generalComment}
              onChange={e => setGeneralComment(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-900 focus:bg-white focus:border-blue-500"
              placeholder="Travaux réalisés conformément au planning..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
              Journée <span className="text-rose-500">*</span>
            </label>
            <select
              value={workShift}
              onChange={e => setWorkShift(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
            >
              <option value="Sélectionner">Sélectionner</option>
              <option value="Journée Continue">Journée Continue</option>
              <option value="Poste 1 (Matin)">Poste 1 (Matin)</option>
              <option value="Poste 2 (Soir)">Poste 2 (Soir)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. SECTIONS DU MILIEU : OBJECTIFS & RÉALISATIONS MULTI-ACTIVITÉS (GAUCHE) ET RESSOURCES UTILISÉES (DROITE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BLOC GAUCHE : OBJECTIFS & RÉALISATIONS (SAISIE PROGRESSIVE MULTI-ACTIVITÉS) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                OBJECTIFS & RÉALISATIONS (SAISIE DE PRODUCTION)
              </h2>
              <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                Sélectionnez l'activité WBS, saisissez la quantité et cliquez sur <strong>Enregistrer cette activité</strong> au fur et à mesure.
              </p>
            </div>

            {/* 1. FORMULAIRE DE SAISIE EN COURS (HAUT) */}
            <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-2.5 py-0.5 rounded-md shadow-2xs">
                  Saisie de l'activité
                </span>
                {currentSelectedAct && (
                  <span className="text-[10.5px] font-extrabold text-blue-800">
                    Code WBS : {currentWbsCode}
                  </span>
                )}
              </div>

              {/* Sélecteur WBS / Activité */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-800 mb-1">
                  WBS / Activité <span className="text-rose-500">*</span>
                </label>
                <select
                  value={currentWbsCode}
                  onChange={e => setCurrentWbsCode(e.target.value)}
                  disabled={!isFormEditable}
                  className={`w-full p-2.5 border rounded-xl font-bold text-xs shadow-2xs ${
                    !isFormEditable ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 cursor-pointer'
                  }`}
                >
                  <option value="">Sélectionner une activité WBS...</option>
                  {projectWbsNodes.map(act => (
                    <option key={act.id} value={act.wbsCode || act.priceNo || act.id}>
                      {act.wbsCode ? `${act.wbsCode} - ` : ''}{act.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grille des quantitatifs de l'activité courante */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Unité</label>
                  <input
                    type="text"
                    value={currentActUnit}
                    disabled
                    className="w-full p-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 cursor-not-allowed text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Objectif jour</span>
                    {currentWbsCode && autoCalculatedTargetQty > 0 && (
                      <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded" title="Calculé automatiquement par le système d'après le planning Gantt">
                        Auto Gantt
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={currentTargetQty || ''}
                    placeholder="0"
                    disabled={!isFormEditable}
                    onChange={e => setCurrentTargetQty(parseFloat(e.target.value) || 0)}
                    className={`w-full p-2 border rounded-xl font-mono font-bold text-xs ${
                      !isFormEditable ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                    }`}
                    title="Objectif journalier calculé automatiquement selon le reste à faire et le nombre de jours restants au planning Gantt"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-800 mb-1">
                    Quantité réalisée <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={currentRealizedQty}
                    placeholder={isFormEditable ? "Saisir la quantité..." : "Formulaire verrouillé"}
                    disabled={!isFormEditable}
                    onChange={e => setCurrentRealizedQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className={`w-full p-2 border-2 rounded-xl font-mono font-black text-xs shadow-2xs ${
                      !isFormEditable ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed' : 'bg-white border-blue-500 text-blue-900 placeholder-slate-400 focus:bg-white focus:outline-none'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Avancement jour</label>
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl font-mono font-black text-xs text-emerald-700 text-center">
                    {currentAdvancePct}%
                  </div>
                </div>
              </div>

              {/* Badge d'explication PROPOSITION 1 (Calcul Gantt Reste à Faire / Délai) */}
              {currentWbsCode && remainingQty > 0 && (
                <div className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-extrabold">💡 Objectif Gantt calculé :</span>
                    <span>Reste <strong className="font-mono font-black text-slate-900">{formatQty(remainingQty)} {currentActUnit}</strong> sur <strong className="font-mono font-extrabold text-slate-900">{remainingWorkDays} jours ouvrés</strong></span>
                  </div>
                  <span className="font-mono font-black text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-lg shrink-0">
                    {autoCalculatedTargetQty} {currentActUnit}/j
                  </span>
                </div>
              )}

              {/* Cumul à date de l'activité courante */}
              {currentWbsCode && (
                <div className="pt-1 space-y-1">
                  <div className="flex justify-between items-center text-[10.5px] font-bold">
                    <span className="text-slate-600">Cumul à date</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-900 font-extrabold">
                        {formatQty((currentCumulDate || 0) + numCurrentRealized)} / {formatQty(currentContractVol)} {currentActUnit}
                      </span>
                      <span className="text-blue-700 font-black">{currentCumulPct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-700 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, currentCumulPct))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* BOUTON ENREGISTRER CETTE ACTIVITÉ (AU FUR ET À MESURE) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAddCurrentActivity}
                  disabled={!isFormEditable}
                  className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition ${
                    !isFormEditable ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <Plus size={16} /> Enregistrer cette activité et passer à la suivante
                </button>
              </div>
            </div>

            {/* 2. TABLEAU DES ACTIVITÉS ENREGISTRÉES SUR CE RAPPORT (BAS) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <span>Activités enregistrées sur ce rapport</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-extrabold">
                    {recordedActivities.length}
                  </span>
                </h3>
              </div>

              {recordedActivities.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-300 rounded-2xl text-center text-slate-400 text-xs font-medium">
                  Aucune activité enregistrée pour le moment. Sélectionnez une activité ci-dessus et cliquez sur <strong>Enregistrer cette activité</strong>.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {recordedActivities.map((item, idx) => {
                    const rowAdvance = item.targetQty > 0 ? parseFloat(((item.realizedQty / item.targetQty) * 100).toFixed(1)) : 0;
                    const totalToDate = item.cumulDate + item.realizedQty;
                    const rowCumulPct = item.totalPlanned > 0 ? parseFloat(((totalToDate / item.totalPlanned) * 100).toFixed(1)) : 0;

                    return (
                      <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative group hover:border-slate-300 transition">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="font-extrabold text-xs text-slate-900">
                              {item.wbsCode ? `${item.wbsCode} - ` : ''}{item.activityName}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveRecordedActivity(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
                            title="Supprimer cette activité du rapport"
                          >
                            <X size={15} />
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-xs font-medium bg-white p-2 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block">Réalisé</span>
                            <strong className="text-blue-900 font-mono font-black">{formatQty(item.realizedQty)} {item.unit}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block">Objectif</span>
                            <span className="font-mono text-slate-700 font-bold">{item.targetQty || '-'} {item.unit}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block">Avancement</span>
                            <span className="font-mono text-emerald-700 font-black">{rowAdvance}%</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block">Cumul global</span>
                            <span className="font-mono text-blue-700 font-black">{rowCumulPct}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BLOC DROITE : RESSOURCES UTILISÉES (Personnel / Matériel / Sous-traitants) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                RESSOURCES UTILISÉES
              </h2>
              <div className="flex items-center gap-4 text-xs font-bold">
                <button
                  onClick={() => setResourceTab('personnel')}
                  className={`pb-1 cursor-pointer transition ${resourceTab === 'personnel' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Personnel
                </button>
                <button
                  onClick={() => setResourceTab('materiel')}
                  className={`pb-1 cursor-pointer transition ${resourceTab === 'materiel' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Matériel
                </button>
                <button
                  onClick={() => setResourceTab('soustraitants')}
                  className={`pb-1 cursor-pointer transition ${resourceTab === 'soustraitants' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Sous-traitants
                </button>
              </div>
            </div>

            {/* 1. Onglet Personnel */}
            {resourceTab === 'personnel' && (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10.5px]">
                      <th className="py-2">Catégorie</th>
                      <th className="py-2 text-center">Effectif</th>
                      <th className="py-2 text-center">Heures normales</th>
                      <th className="py-2 text-center">Heures sup.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {personnelRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 font-bold text-slate-800">{r.category}</td>
                        <td className="py-2 text-center font-mono font-bold">{r.effectif}</td>
                        <td className="py-2 text-center font-mono">{r.hNormales} h</td>
                        <td className="py-2 text-center font-mono">{r.hSup > 0 ? `${r.hSup} h` : '-'}</td>
                      </tr>
                    ))}
                    <tr className="font-black text-slate-900 bg-slate-50 border-t border-slate-200">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-center font-mono">{personnelTotals.effectif}</td>
                      <td className="py-2 text-center font-mono">{personnelTotals.hNormales} h</td>
                      <td className="py-2 text-center font-mono">{personnelTotals.hSup} h</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. Onglet Matériel */}
            {resourceTab === 'materiel' && (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10.5px]">
                      <th className="py-2">Désignation Engin</th>
                      <th className="py-2 text-center">Quantité</th>
                      <th className="py-2 text-center">Heures d'utilisation</th>
                      <th className="py-2 text-right">Carburant (L)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 font-bold text-slate-800">Bulldozer CAT D7</td>
                      <td className="py-2 text-center font-mono font-bold">1</td>
                      <td className="py-2 text-center font-mono">8 h</td>
                      <td className="py-2 text-right font-mono font-bold text-slate-900">140,00 L</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 font-bold text-slate-800">Camion Benne 15T</td>
                      <td className="py-2 text-center font-mono font-bold">2</td>
                      <td className="py-2 text-center font-mono">16 h</td>
                      <td className="py-2 text-right font-mono font-bold text-slate-900">180,00 L</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 font-bold text-slate-800">Pelle Hydraulique 20T</td>
                      <td className="py-2 text-center font-mono font-bold">1</td>
                      <td className="py-2 text-center font-mono">7,5 h</td>
                      <td className="py-2 text-right font-mono font-bold text-slate-900">110,00 L</td>
                    </tr>
                    <tr className="font-black text-slate-900 bg-slate-50 border-t border-slate-200">
                      <td className="py-2">Total Matériel</td>
                      <td className="py-2 text-center font-mono">4 engins</td>
                      <td className="py-2 text-center font-mono">31,5 h</td>
                      <td className="py-2 text-right font-mono">430,00 L</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Onglet Sous-traitants */}
            {resourceTab === 'soustraitants' && (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10.5px]">
                      <th className="py-2">Entreprise Sous-traitante</th>
                      <th className="py-2">Tâche / Spécialité</th>
                      <th className="py-2 text-center">Effectif</th>
                      <th className="py-2 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 font-bold text-slate-800">SOGEA BTP</td>
                      <td className="py-2 text-slate-600 font-bold">Débroussement & Élagage</td>
                      <td className="py-2 text-center font-mono font-bold">5</td>
                      <td className="py-2 text-right"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px]">Actif</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 font-bold text-slate-800">GEBAT TOPO</td>
                      <td className="py-2 text-slate-600 font-bold">Relevés Altimétriques</td>
                      <td className="py-2 text-center font-mono font-bold">2</td>
                      <td className="py-2 text-right"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[10px]">Terminé</span></td>
                    </tr>
                    <tr className="font-black text-slate-900 bg-slate-50 border-t border-slate-200">
                      <td className="py-2" colSpan={2}>Total Intervenants Extérieurs</td>
                      <td className="py-2 text-center font-mono">7</td>
                      <td className="py-2 text-right font-mono">2 st.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. TROIS BLOCS BAS : CONSOMMATIONS & LIVRAISONS | PROBLÈMES RENCONTRÉS | PHOTOS DU CHANTIER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CARD 1 : CONSOMMATIONS & LIVRAISONS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>CONSOMMATIONS & LIVRAISONS</span>
              <div className="flex items-center gap-3 text-xs font-bold font-sans">
                <button
                  onClick={() => setConsumptionTab('consommations')}
                  className={`cursor-pointer transition pb-0.5 ${consumptionTab === 'consommations' ? 'text-blue-600 border-b-2 border-blue-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Consommations
                </button>
                <button
                  onClick={() => setConsumptionTab('livraisons')}
                  className={`cursor-pointer transition pb-0.5 ${consumptionTab === 'livraisons' ? 'text-blue-600 border-b-2 border-blue-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Livraisons
                </button>
              </div>
            </h2>

            {/* Onglet 1 : Consommations */}
            {consumptionTab === 'consommations' && (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10px]">
                      <th className="py-2">Art.</th>
                      <th className="py-2 text-center">Unité</th>
                      <th className="py-2 text-right">Quantité prévue</th>
                      <th className="py-2 text-right">Quantité consommée</th>
                      <th className="py-2 text-right">Écart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {consommationsRows.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 font-bold text-slate-800">{c.article}</td>
                        <td className="py-2 text-center font-bold text-slate-500">{c.unit}</td>
                        <td className="py-2 text-right font-mono">{formatQty(c.prevue)}</td>
                        <td className="py-2 text-right font-mono font-bold text-slate-900">{formatQty(c.consommee)}</td>
                        <td className={`py-2 text-right font-mono font-bold ${c.ecart > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {c.ecart > 0 ? `+${formatQty(c.ecart)}` : formatQty(c.ecart)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Onglet 2 : Livraisons Réelles */}
            {consumptionTab === 'livraisons' && (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10px]">
                      <th className="py-2">Réf. Bon de Livraison</th>
                      <th className="py-2">Fournisseur / Article</th>
                      <th className="py-2 text-center">Quantité Livrée</th>
                      <th className="py-2 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 font-bold text-blue-700 font-mono">BL-2026-089-SOCIMAC</td>
                      <td className="py-2 font-bold text-slate-800">SOCIMAC / Ciment CPJ 45</td>
                      <td className="py-2 text-center font-mono font-bold text-emerald-700">+150 sac</td>
                      <td className="py-2 text-right font-mono text-slate-500">10/08/2026</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 font-bold text-blue-700 font-mono">BL-2026-092-ACI</td>
                      <td className="py-2 font-bold text-slate-800">Aciéries CI / Fer HA 12</td>
                      <td className="py-2 text-center font-mono font-bold text-emerald-700">+3,50 t</td>
                      <td className="py-2 text-right font-mono text-slate-500">14/08/2026</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 font-bold text-blue-700 font-mono">BL-2026-104-TOTAL</td>
                      <td className="py-2 font-bold text-slate-800">TotalEnergies / Gasoil</td>
                      <td className="py-2 text-center font-mono font-bold text-emerald-700">+1 200,00 L</td>
                      <td className="py-2 text-right font-mono text-slate-500">20/08/2026</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <button
            onClick={handleAddConsumptionRow}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition pt-2 border-t border-slate-100"
          >
            <Plus size={14} /> {consumptionTab === 'consommations' ? 'Ajouter une ligne de consommation' : 'Réceptionner une livraison'}
          </button>
        </div>

        {/* CARD 2 : PROBLÈMES RENCONTRÉS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider pb-2 border-b border-slate-100">
              PROBLÈMES RENCONTRÉS
            </h2>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10.5px]">
                    <th className="py-2">Type de problème</th>
                    <th className="py-2 text-right">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {problems.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                        {p.type}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
                          p.impact === 'Moyen'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {p.impact}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={handleAddProblem}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition pt-2 border-t border-slate-100"
          >
            <Plus size={14} /> Ajouter un problème
          </button>
        </div>

        {/* CARD 3 : PHOTOS DU CHANTIER * */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider pb-2 border-b border-slate-100">
            PHOTOS DU CHANTIER *
          </h2>

          {/* Zone de Glisser-Déposer Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-2xl p-4 text-center cursor-pointer hover:bg-blue-50/60 transition"
          >
            <Upload size={22} className="text-blue-600 mx-auto mb-1" />
            <span className="text-xs font-extrabold text-slate-700 block">Glissez-déposez vos photos ici</span>
            <span className="text-[10px] text-slate-400 font-medium">ou</span>
            <div className="mt-1">
              <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-[11px] font-bold text-blue-600 shadow-2xs inline-block">
                Parcourir les fichiers
              </span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadPhoto}
              accept="image/*"
              className="hidden"
              multiple
            />
          </div>

          {/* Galerie de 4 Photos miniature */}
          <div className="grid grid-cols-4 gap-2">
            {photos.slice(0, 4).map((pUrl, iIdx) => (
              <div key={iIdx} className="relative rounded-xl overflow-hidden aspect-video group border border-slate-200">
                <img src={pUrl} alt="Chantier" className="w-full h-full object-cover" />
                <button
                  onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== iIdx))}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[9.5px] text-slate-400 text-center font-medium">JPG, PNG (max. 10 Mo par fichier)</p>
        </div>
      </div>

      {/* 6. LIGNE DU BAS : OBSERVATIONS & REMARQUES | DOCUMENTS JOINTS | HISTORIQUE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* OBSERVATIONS & REMARQUES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-2">
            OBSERVATIONS & REMARQUES
          </h2>
          <textarea
            rows={3}
            value={observations}
            onChange={e => setObservations(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-900 focus:bg-white focus:border-blue-500"
            placeholder="Remarques éventuelles sur l'avancement..."
          />
        </div>

        {/* DOCUMENTS JOINTS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-2">
            DOCUMENTS JOINTS
          </h2>
          <div
            onClick={() => docInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50 transition"
          >
            <Upload size={20} className="text-slate-400 mx-auto mb-1" />
            <span className="text-xs font-bold text-slate-600 block">Glissez-déposez vos documents ici</span>
            <span className="text-[10px] text-slate-400">ou</span>
            <div className="mt-1">
              <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-[11px] font-bold text-blue-600 shadow-2xs inline-block">
                Parcourir les fichiers
              </span>
            </div>
            <input type="file" ref={docInputRef} className="hidden" multiple />
          </div>
        </div>

        {/* HISTORIQUE */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-2">
            HISTORIQUE
          </h2>
          <div className="space-y-3 pt-1">
            {historyLogs.map((h, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0"></span>
                <div>
                  <span className="text-[10.5px] font-mono text-slate-400 block">{h.time}</span>
                  <span className="font-bold text-slate-800">{h.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. FOOTER ACTION BAR STICKY (ENREGISTRER LE BROUILLON / SOUMETTRE POUR VALIDATION) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            className="bg-white hover:bg-slate-50 text-slate-800 font-extrabold px-5 py-2.5 rounded-xl border border-slate-300 text-xs shadow-xs cursor-pointer transition"
          >
            📂 Enregistrer le brouillon
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-medium text-center">
          Rapport créé le <strong>{formattedReportDate} à {creationTime}</strong><br />
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
          </button>
        </div>
      </div>
    </div>
  )}

      {/* MODAL SYNTHÈSE & DÉTAILS DU RAPPORT POUR LE VALIDEUR */}
      {viewingReportDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 my-8">
            {/* EN-TÊTE MODAL AVEC BADGES DE STATUT */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full tracking-wide ${
                  viewingReportDetail.status === 'Validé' || viewingReportDetail.status === 'Verrouillé'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : viewingReportDetail.status === 'Soumis'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  FICHE RAPPORT TERRAIN — {viewingReportDetail.status || 'Soumis'}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2 flex items-center gap-2">
                  <span>Réf: {viewingReportDetail.code || viewingReportDetail.id}</span>
                </h3>
              </div>
              <button
                onClick={() => setViewingReportDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                title="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            {/* METADATAS PROJET ET HEURE DU RAPPORT */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-medium">
              <div>
                <span className="text-slate-400 block text-[10.5px]">Projet</span>
                <span className="font-bold text-slate-900">
                  {projects.find(p => p.id === viewingReportDetail.projectId || p.code === viewingReportDetail.projectId)?.name || viewingReportDetail.projectId || selectedProject?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px]">Date & Heure du rapport</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatFrenchDate(viewingReportDetail.date)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px]">Chef / Auteur</span>
                <span className="font-bold text-slate-900">
                  {viewingReportDetail.createdBy || viewingReportDetail.teamLeader || 'Conducteur'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px]">Météo / Température</span>
                <span className="font-bold text-slate-900">
                  {viewingReportDetail.weather || '☀️ Ensoleillé'} ({viewingReportDetail.temperature || '32 °C'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px]">Zone du chantier</span>
                <span className="font-bold text-slate-900">
                  {viewingReportDetail.locationZone || 'Zone A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px]">Productivité</span>
                <span className="font-mono font-black text-emerald-700">
                  {viewingReportDetail.productivityRate || 100}%
                </span>
              </div>
            </div>

            {/* ACTIVITÉ & QUANTITÉ RÉALISÉE */}
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                <Layers size={14} className="text-blue-600" />
                Activité & Quantité Réalisée
              </h4>
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    {viewingReportDetail.wbsCode ? `[${viewingReportDetail.wbsCode}] ` : ''}{viewingReportDetail.activityName}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    Quantité Prévue au Planning : {formatQty(viewingReportDetail.plannedQty || viewingReportDetail.targetQty)} {viewingReportDetail.unit}
                  </span>
                </div>
                <div className="text-left sm:text-right font-mono">
                  <span className="text-xl font-black text-blue-950 block">
                    {formatQty(viewingReportDetail.realizedQty)} {viewingReportDetail.unit}
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1">
                    Avancement : {viewingReportDetail.productivityRate || 100}%
                  </span>
                </div>
              </div>
            </div>

            {/* COMMENTAIRES & OBSERVATIONS */}
            {viewingReportDetail.notes || viewingReportDetail.generalComment || viewingReportDetail.observations ? (
              <div className="space-y-1 border-b border-slate-100 pb-4">
                <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-600" />
                  Commentaires & Observations Terrain
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 italic">
                  "{viewingReportDetail.notes || viewingReportDetail.generalComment || viewingReportDetail.observations}"
                </div>
              </div>
            ) : null}

            {/* HISTORIQUE DE VALIDATION ET TRAÇABILITÉ (SI PRÉSENT) */}
            {Array.isArray(viewingReportDetail.historyLogs) && viewingReportDetail.historyLogs.length > 0 && (
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-600" />
                  Historique de Validation & Traçabilité
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                  {viewingReportDetail.historyLogs.map((log: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-100">
                      <span className="font-mono font-bold text-slate-500">{log.timestamp}</span>
                      <span className="font-semibold text-slate-800">{log.user} ({log.role})</span>
                      <span className="font-bold text-blue-700">{log.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BOUTONS D'ACTION VALIDEURS */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer size={14} /> Imprimer / PDF
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingReportDetail(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Fermer
                </button>
                {isValidatorRole && viewingReportDetail.status === 'Soumis' && (
                  <>
                    <button
                      onClick={() => {
                        const reason = prompt('Motif / Commentaire pour la demande de correction :') || 'Demande de correction terrain';
                        if (!reason.trim()) return;
                        const targetId = viewingReportDetail.id;
                        const targetCode = viewingReportDetail.code || viewingReportDetail.reportCode;
                        if (updateDailyReportStatus) {
                          updateDailyReportStatus(targetId, 'Brouillon', reason);
                          if (targetCode && targetCode !== targetId) {
                            updateDailyReportStatus(targetCode, 'Brouillon', reason);
                          }
                        }
                        if (updateValidationTaskStatus) {
                          updateValidationTaskStatus(targetId, 'RETURNED', reason);
                        }
                        setViewingReportDetail(null);
                        alert(`↩️ Rapport ${targetCode || targetId} renvoyé en Brouillon pour correction.`);
                      }}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>↩️ Demander Correction</span>
                    </button>
                    <button
                      onClick={() => {
                        const targetId = viewingReportDetail.id;
                        const targetCode = viewingReportDetail.code || viewingReportDetail.reportCode;
                        if (updateDailyReportStatus) {
                          updateDailyReportStatus(targetId, 'Validé', 'Validé depuis la fiche synthétique');
                          if (targetCode && targetCode !== targetId) {
                            updateDailyReportStatus(targetCode, 'Validé', 'Validé depuis la fiche synthétique');
                          }
                        }
                        if (updateValidationTaskStatus) {
                          updateValidationTaskStatus(targetId, 'APPROVED', 'Validé depuis la fiche synthétique');
                        }
                        setViewingReportDetail(null);
                        alert(`✅ Rapport ${targetCode || targetId} validé avec succès ! Il est maintenant à l'Étape 3 (VALIDÉ).`);
                      }}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <CheckCircle2 size={16} />
                      <span>✅ Valider ce Rapport (DP/DT)</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REJET / DEMANDE DE CORRECTION */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
                <AlertTriangle size={18} />
                <span>Renvoyer le rapport en Brouillon</span>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-800">
                Motif des corrections demandées au chef de chantier <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Ex: La quantité réalisée sur l'excavation est surévaluée de 50 m³, merci d'ajuster d'après le carnet de suivi..."
                className="w-full p-3 border border-slate-300 rounded-xl text-xs font-medium focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 min-h-[100px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleRejectReport}
                className="px-4 py-2 bg-rose-600 text-white font-extrabold rounded-xl text-xs hover:bg-rose-700 transition shadow-2xs cursor-pointer"
              >
                Confirmer le Renvoi en Brouillon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
