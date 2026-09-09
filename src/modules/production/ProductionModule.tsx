import React, { useState, useMemo, useRef } from 'react';
import { useAppState, isDemoReportObj } from '../../core/database/AppStateContext';
import * as XLSX from 'xlsx';
import {
  Calendar, CheckCircle2, AlertTriangle, Plus,
  FileText, Clock, Lock,
  X, FileSpreadsheet, Eye, Upload, Download,
  ChevronRight, ArrowLeft, ChevronDown, Layers, Building2,
  Send, HelpCircle, Printer, Trash2
} from 'lucide-react';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../../core/database/realSongonDsData';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';

const formatQty = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0,00';
  const rounded = Math.round(Number(val) * 100) / 100;
  return rounded.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatFrenchDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '—';

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

interface ProductionModuleProps {
  onBackToProject?: () => void;
  initialProjectId?: string;
}

export const ProductionModule: React.FC<ProductionModuleProps> = ({ onBackToProject, initialProjectId }) => {
  const { projects, createDailyReport, updateDailyReportStatus, updateValidationTaskStatus, deleteDailyReport, addAuditLog, currentUser, users = [], wbsMap, dailyReports, stockItems = [], setActiveTab } = useAppState();

  // État local réactif du projet/site sélectionné
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (initialProjectId) {
      const initMatch = projects.find(p => p.id === initialProjectId || p.code === initialProjectId);
      if (initMatch) return initMatch.id;
    }
    return projects[0]?.id || projects[0]?.code || 'CIV-2026-ASS-BEN-002';
  });

  // Synchronisation dynamique lors du passage d'un initialProjectId
  React.useEffect(() => {
    if (initialProjectId) {
      const exists = projects.find(p => p.id === initialProjectId || p.code === initialProjectId);
      if (exists) {
        setSelectedProjectId(exists.id);
      }
    }
  }, [initialProjectId, projects]);

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
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Dynamic status-matching helper : Isolation étanche universelle par chantier (Songon, Bingerville et tous autres chantiers)
  const isProjectReportMatch = (r: any, proj: any): boolean => {
    if (!r) return false;
    if (!proj) return true;
    const pId = String(proj.id || '').toUpperCase().trim();
    const pCode = String(proj.code || '').toUpperCase().trim();
    const pName = String(proj.name || '').toUpperCase().trim();

    const rProjId = String(r.projectId || r.project_id || '').toUpperCase().trim();
    const rProjName = String(r.projectName || r.project_name || '').toUpperCase().trim();

    // 1. Correspondance exacte directe par ID ou Code
    if (rProjId && (rProjId === pId || rProjId === pCode)) return true;

    // 2. Correspondance directe par Nom de Projet
    if (rProjName && pName && (rProjName === pName || rProjName.includes(pName) || pName.includes(rProjName))) return true;

    // 3. Alias spécifique : Site de Songon
    const isSongonProject = pId.includes('SON') || pCode.includes('SON') || pName.includes('SONG') || pName.includes('OUEST');
    const isReportSongon = rProjId.includes('SON') || rProjId.includes('OUEST') || rProjName.includes('SONG') || rProjName.includes('OUEST');
    if (isSongonProject && isReportSongon) return true;

    // 4. Alias spécifique : Site de Bingerville
    const isBingervilleProject = pId.includes('BEN') || pCode.includes('BEN') || pName.includes('BING') || pName.includes('EST');
    const isReportBingerville = rProjId.includes('BEN') || rProjId.includes('BING') || rProjId.includes('EST') || rProjName.includes('BING') || rProjName.includes('EST');
    if (isBingervilleProject && isReportBingerville) return true;

    // 5. Protection anti-pollution inter-sites
    if (isSongonProject && isReportBingerville) return false;
    if (isBingervilleProject && isReportSongon) return false;

    // 6. Correspondance générique pour tout autre chantier (ex: Bouaké, Korhogo, etc.)
    if (rProjId) {
      return (
        (pId !== '' && (rProjId.includes(pId) || pId.includes(rProjId))) ||
        (pCode !== '' && (rProjId.includes(pCode) || pCode.includes(rProjId)))
      );
    }

    return true;
  };

  // Filtre de statut maître pour le tableau (Défaut: 'ALL' pour afficher TOUS les rapports sans disparition)
  const [masterStatusFilter, setMasterStatusFilter] = useState<string>('ALL');

  // Rapports d'étapes filtrés strictement pour le site sélectionné et le statut maître
  const stepReports = useMemo(() => {
    return dailyReports.filter(r => {
      if (isDemoReportObj(r)) return false;
      const matchProj = isProjectReportMatch(r, selectedProject);
      if (!matchProj) return false;

      const normReportStatus = (r.status || 'Soumis').toUpperCase().trim();
      const normFilterStatus = (masterStatusFilter || 'ALL').toUpperCase().trim();

      if (normFilterStatus === 'ALL') return true;

      if (normFilterStatus.includes('BROUILLON')) return normReportStatus.includes('BROUILLON');
      if (normFilterStatus.includes('SOUMIS')) return normReportStatus.includes('SOUMIS') || normReportStatus.includes('ATTENTE') || normReportStatus.includes('PENDING');
      if (normFilterStatus.includes('VALID')) return normReportStatus.includes('VALID') || normReportStatus.includes('APPROVED');
      if (normFilterStatus.includes('VERROU')) return normReportStatus.includes('VERROU') || normReportStatus.includes('CLOSED');
      if (normFilterStatus.includes('REFUS')) return normReportStatus.includes('REFUS') || normReportStatus.includes('REJECTED');

      return normReportStatus === normFilterStatus;
    });
  }, [dailyReports, selectedProject, masterStatusFilter]);
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

  // Options de recherche rapide pour le sélecteur WBS / Activités (Recherche Instantanée)
  const wbsSelectOptions: SelectOption[] = useMemo(() => {
    return projectWbsNodes.map(act => {
      const code = act.wbsCode || act.priceNo || act.id;
      return {
        value: code,
        label: act.description,
        sublabel: `Code WBS: ${code} | Unité: ${act.unit || 'm²'} | Volume Prévu: ${Number(act.plannedQty || act.contractQty || 0).toLocaleString('fr-FR')}`,
        badge: code
      };
    });
  }, [projectWbsNodes]);

  // Fonction de résolution SSOT universelle pour garantir l'affichage permanent et complet de l'Activité WBS
  const resolveReportWbsActivity = (rep: DailyReport | any) => {
    if (!rep) return { code: '', name: 'Activité Chantier', display: 'Activité Chantier' };

    // 1. Si des activités multiples sont enregistrées dans le rapport
    if (Array.isArray(rep.recordedActivities) && rep.recordedActivities.length > 0) {
      const firstAct = rep.recordedActivities[0];
      const code = firstAct.wbsCode || firstAct.code || firstAct.id || '';
      const name = firstAct.activityName || firstAct.name || firstAct.description || '';
      const extra = rep.recordedActivities.length > 1 ? ` (+${rep.recordedActivities.length - 1} autre(s))` : '';
      return {
        code,
        name: (name || 'Activité de Chantier') + extra,
        display: code ? `[${code}] ${(name || 'Activité de Chantier') + extra}` : (name || 'Activité de Chantier')
      };
    }

    // 2. Récupération des propriétés directes
    let code = String(rep.wbsCode || rep.wbsId || rep.activityCode || rep.codeWbs || '').trim();
    let name = String(rep.activityName || rep.taskName || rep.activity || rep.wbsName || rep.name || rep.description || rep.designation || '').trim();

    // 3. Recherche dans le référentiel des activités aplaties du projet actif
    if (!name || name === code || name === 'Activité' || name === '') {
      const matchInWbs = projectWbsNodes.find(n => 
        (code && (n.wbsCode === code || n.priceNo === code || n.id === code)) ||
        (rep.wbsId && (n.id === rep.wbsId || n.wbsCode === rep.wbsId))
      );
      if (matchInWbs) {
        name = matchInWbs.description || matchInWbs.name || '';
        if (!code) code = matchInWbs.wbsCode || matchInWbs.priceNo || matchInWbs.id || '';
      }
    }

    // 4. Recherche dans les dictionnaires réels Bingerville et Songon
    if (!name || name === code || name === 'Activité' || name === '') {
      const allDs = [...REAL_DS_BINGERVILLE_ACTIVITIES, ...REAL_DS_SONGON_ACTIVITIES];
      const matchInDs = allDs.find(d => 
        (code && (d.wbsCode === code || d.priceNo === code || d.id === code)) ||
        (rep.wbsId && (d.id === rep.wbsId || d.wbsCode === rep.wbsId))
      );
      if (matchInDs) {
        name = matchInDs.description;
        if (!code) code = matchInDs.wbsCode || matchInDs.priceNo || '';
      }
    }

    // 5. Recherche dans tout l'arbre wbsMap
    if (!name || name === code || name === 'Activité' || name === '') {
      const allTreeNodes = Object.values(wbsMap || {}).flat();
      const matchInTree = allTreeNodes.find((n: any) => 
        (code && (n.code === code || n.id === code || n.wbsCode === code)) ||
        (rep.wbsId && (n.id === rep.wbsId || n.code === rep.wbsId))
      );
      if (matchInTree) {
        name = matchInTree.name || matchInTree.description || '';
        if (!code) code = matchInTree.code || matchInTree.id || '';
      }
    }

    // 6. Si toujours pas de code ni nom, déduire selon l'unité et le contexte du rapport
    if (!name || name === '' || name === 'Activité') {
      const unit = String(rep.unit || '').toLowerCase();
      if (unit.includes('m3') || unit.includes('m³')) {
        code = code || '200.1.4';
        name = 'Béton armé de structure & Génie Civil';
      } else if (unit.includes('m2') || unit.includes('m²')) {
        code = code || '100.1.1';
        name = 'Terrassement, Décapage & Préparation plate-forme';
      } else if (unit.includes('ml') || unit.includes('m')) {
        code = code || '300.2.1';
        name = 'Pose de canalisations & Réseaux de drainage';
      } else if (unit.includes('kg') || unit.includes('t')) {
        code = code || '200.2.1';
        name = 'Ferraillage et aciers HA pour béton armé';
      } else if (rep.generalComment && rep.generalComment.trim() !== '') {
        code = code || 'WBS-GEN';
        name = rep.generalComment;
      } else {
        code = code || 'WBS-PROD';
        name = 'Travaux Génie Civil & Aménagements Chantier';
      }
    }

    const display = code ? `[${code}] ${name}` : name;
    return { code, name, display };
  };

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

  // Helper pour dériver le personnel selon l'activité WBS et le déboursé sec
  const getPersonnelForWbsActivity = (wbsCode: string, targetQty: number = 0, project: any = null) => {
    if (!wbsCode) return [
      { category: 'Chefs de chantier & Encadrement', effectif: 1, hNormales: 8, hSup: 0 },
      { category: 'Maçons & Coffreurs', effectif: 2, hNormales: 16, hSup: 0 },
      { category: 'Ferrailleurs & Boiseurs', effectif: 2, hNormales: 16, hSup: 0 },
      { category: 'Manoeuvres & Ouvriers', effectif: 3, hNormales: 24, hSup: 0 }
    ];

    const normCode = String(wbsCode).toUpperCase().trim();
    const allActivities = [...REAL_DS_SONGON_ACTIVITIES, ...REAL_DS_BINGERVILLE_ACTIVITIES];
    const matchedDs = allActivities.find(act => 
      String(act.wbsCode || act.priceNo || act.id || '').toUpperCase().trim() === normCode ||
      normCode.includes(String(act.wbsCode || act.priceNo || '').toUpperCase().trim())
    );

    if (matchedDs && Array.isArray(matchedDs.resources) && matchedDs.resources.length > 0) {
      const moResources = matchedDs.resources.filter(r => {
        const nat = String(r.nature || '').toUpperCase();
        const code = String(r.code || '').toUpperCase();
        return nat === 'MO' || nat.includes('MO') || code.startsWith('MO');
      });

      if (moResources.length > 0) {
        return moResources.map(res => {
          const effCount = Math.max(1, Math.round(Number(res.theoreticalQty || 1)));
          return {
            category: res.name || res.code || 'Main d\'œuvre spécialisée',
            effectif: effCount,
            hNormales: effCount * 8,
            hSup: 0
          };
        });
      }
    }

    const actObj = projectWbsNodes.find(a => 
      String(a.wbsCode || a.priceNo || a.id || '').toUpperCase().trim() === normCode
    );
    const desc = String(actObj?.description || actObj?.name || matchedDs?.description || '').toLowerCase();
    const effTarget = targetQty > 0 ? targetQty : 10;

    if (desc.includes('béton') || desc.includes('radier') || desc.includes('voile') || desc.includes('poteau') || desc.includes('dalle') || desc.includes('fondation') || desc.includes('coulage')) {
      const macons = Math.max(2, Math.round(effTarget * 0.4));
      const vibreurs = Math.max(2, Math.round(effTarget * 0.3));
      const manoeuvres = Math.max(2, Math.round(effTarget * 0.3));
      return [
        { category: 'Chef d\'équipe Béton armé', effectif: 1, hNormales: 8, hSup: 0 },
        { category: 'Maçons qualifiés & Coffreurs', effectif: macons, hNormales: macons * 8, hSup: 0 },
        { category: 'Vibreurs & Ouvriers de coulage', effectif: vibreurs, hNormales: vibreurs * 8, hSup: 0 },
        { category: 'Manoeuvres d\'accompagnement', effectif: manoeuvres, hNormales: manoeuvres * 8, hSup: 0 }
      ];
    }

    if (desc.includes('ferraillage') || desc.includes('armature') || desc.includes('acier') || desc.includes('fer ') || desc.includes('ha ')) {
      const ferrailleurs = Math.max(2, Math.round(effTarget * 0.05)) || 3;
      const poseurs = Math.max(2, Math.round(effTarget * 0.04)) || 2;
      return [
        { category: 'Chef d\'équipe Ferrailleur', effectif: 1, hNormales: 8, hSup: 0 },
        { category: 'Ferrailleurs façonneurs qualifiés', effectif: ferrailleurs, hNormales: ferrailleurs * 8, hSup: 0 },
        { category: 'Poseurs d\'armatures & Ligatureurs', effectif: poseurs, hNormales: poseurs * 8, hSup: 0 },
        { category: 'Manoeuvres manutention aciers', effectif: 2, hNormales: 16, hSup: 0 }
      ];
    }

    if (desc.includes('tuyau') || desc.includes('canalis') || desc.includes('assainissement') || desc.includes('collecteur') || desc.includes('drain') || desc.includes('pvc') || desc.includes('pehd')) {
      const poseurs = Math.max(2, Math.round(effTarget * 0.06)) || 2;
      const terrassiers = Math.max(2, Math.round(effTarget * 0.08)) || 3;
      return [
        { category: 'Chef d\'équipe Poseur Réseaux Assainissement', effectif: 1, hNormales: 8, hSup: 0 },
        { category: 'Canalisateurs & Poseurs qualifiés', effectif: poseurs, hNormales: poseurs * 8, hSup: 0 },
        { category: 'Manoeuvres fouilles & lit de pose', effectif: terrassiers, hNormales: terrassiers * 8, hSup: 0 },
        { category: 'Topographe / Implantation pentes', effectif: 1, hNormales: 8, hSup: 0 }
      ];
    }

    if (desc.includes('terrassement') || desc.includes('décapage') || desc.includes('fouille') || desc.includes('remblai') || desc.includes('compactage')) {
      return [
        { category: 'Chef de chantier Terrassement & VRD', effectif: 1, hNormales: 8, hSup: 0 },
        { category: 'Conducteurs d\'engins lourds (Pelle / Bull)', effectif: 2, hNormales: 16, hSup: 0 },
        { category: 'Chauffeurs Camions Bennes 15T', effectif: 2, hNormales: 16, hSup: 0 },
        { category: 'Topographe & Aides réglage plateforme', effectif: 2, hNormales: 16, hSup: 0 }
      ];
    }

    if (desc.includes('coffrage') || desc.includes('boiseur') || desc.includes('étayage') || desc.includes('panneau')) {
      const coffreurs = Math.max(2, Math.round(effTarget * 0.12)) || 3;
      return [
        { category: 'Chef d\'équipe Coffreur-boiseur', effectif: 1, hNormales: 8, hSup: 0 },
        { category: 'Coffreurs-bancheurs qualifiés', effectif: coffreurs, hNormales: coffreurs * 8, hSup: 0 },
        { category: 'Échafaudeurs & Étaieurs', effectif: 2, hNormales: 16, hSup: 0 },
        { category: 'Aides coffreurs & Manoeuvres', effectif: 2, hNormales: 16, hSup: 0 }
      ];
    }

    if (desc.includes('clôture') || desc.includes('installation') || desc.includes('sécuris') || desc.includes('magasin') || desc.includes('bureau')) {
      return [
        { category: 'Chef d\'équipe Clôtures & Sécurisation', effectif: 1, hNormales: 8, hSup: 0 },
        { category: 'Serruriers / Poseurs de bardage', effectif: 2, hNormales: 16, hSup: 0 },
        { category: 'Maçons scellement poteaux', effectif: 2, hNormales: 16, hSup: 0 },
        { category: 'Manoeuvres chantier', effectif: 2, hNormales: 16, hSup: 0 }
      ];
    }

    return [
      { category: 'Chef de chantier & Encadrement', effectif: 1, hNormales: 8, hSup: 0 },
      { category: 'Ouvriers qualifiés', effectif: 2, hNormales: 16, hSup: 0 },
      { category: 'Manoeuvres & Ouvriers d\'exécution', effectif: 3, hNormales: 24, hSup: 0 }
    ];
  };

  // Helper pour dériver le matériel et engins selon l'activité WBS
  const getMaterielForWbsActivity = (wbsCode: string, targetQty: number = 0, project: any = null) => {
    if (!wbsCode) return [
      { name: 'Bulldozer CAT D7', qty: 1, hours: 7, fuel: 90 },
      { name: 'Camion Benne 15T', qty: 1, hours: 8, fuel: 80 },
      { name: 'Pelle Hydraulique 20T', qty: 1, hours: 8, fuel: 110 }
    ];

    const normCode = String(wbsCode).toUpperCase().trim();
    const allActivities = [...REAL_DS_SONGON_ACTIVITIES, ...REAL_DS_BINGERVILLE_ACTIVITIES];
    const matchedDs = allActivities.find(act => 
      String(act.wbsCode || act.priceNo || act.id || '').toUpperCase().trim() === normCode ||
      normCode.includes(String(act.wbsCode || act.priceNo || '').toUpperCase().trim())
    );

    const actObj = projectWbsNodes.find(a => 
      String(a.wbsCode || a.priceNo || a.id || '').toUpperCase().trim() === normCode
    );
    const desc = String(actObj?.description || actObj?.name || matchedDs?.description || '').toLowerCase();

    if (desc.includes('béton') || desc.includes('radier') || desc.includes('voile') || desc.includes('poteau') || desc.includes('dalle') || desc.includes('fondation') || desc.includes('coulage')) {
      return [
        { name: 'Camion Toupie Bétonnière 8m³', qty: 1, hours: 7, fuel: 85 },
        { name: 'Aiguilles vibrantes béton 45mm', qty: 2, hours: 6, fuel: 15 },
        { name: 'Grue / Benne à béton basculante 1000L', qty: 1, hours: 5, fuel: 40 },
        { name: 'Règle vibrante oscillante 3m', qty: 1, hours: 4, fuel: 10 }
      ];
    }

    if (desc.includes('ferraillage') || desc.includes('armature') || desc.includes('acier') || desc.includes('fer ') || desc.includes('ha ')) {
      return [
        { name: 'Cintreuse électrique d’armature 380V', qty: 1, hours: 7, fuel: 20 },
        { name: 'Cisaille à fer électrique d’atelier', qty: 1, hours: 6, fuel: 15 },
        { name: 'Camion plateau approvisionnement fer', qty: 1, hours: 3, fuel: 35 },
        { name: 'Groupe électrogène 15 kVA', qty: 1, hours: 8, fuel: 30 }
      ];
    }

    if (desc.includes('tuyau') || desc.includes('canalis') || desc.includes('assainissement') || desc.includes('collecteur') || desc.includes('drain') || desc.includes('pvc') || desc.includes('pehd')) {
      return [
        { name: 'Mini-Pelle hydraulique 8T sur chenilles', qty: 1, hours: 7.5, fuel: 55 },
        { name: 'Pilonneuse / Compacteur de tranchée', qty: 1, hours: 5, fuel: 18 },
        { name: 'Niveau Laser rotatif d’alignement', qty: 1, hours: 8, fuel: 0 },
        { name: 'Motopompe d’épuisement des eaux', qty: 1, hours: 3, fuel: 12 }
      ];
    }

    if (desc.includes('terrassement') || desc.includes('décapage') || desc.includes('fouille') || desc.includes('remblai') || desc.includes('compactage')) {
      return [
        { name: 'Pelle Hydraulique 20T sur chenilles', qty: 1, hours: 8, fuel: 140 },
        { name: 'Bulldozer CAT D7 / Niveleuse', qty: 1, hours: 7, fuel: 120 },
        { name: 'Camion Benne 15T (Rotation déblais)', qty: 2, hours: 8, fuel: 160 },
        { name: 'Compacteur vibrant monocylindre 14T', qty: 1, hours: 6, fuel: 75 }
      ];
    }

    if (desc.includes('coffrage') || desc.includes('boiseur') || desc.includes('étayage') || desc.includes('panneau')) {
      return [
        { name: 'Scie circulaire de table & Outillage boiseur', qty: 2, hours: 7, fuel: 25 },
        { name: 'Chariot élévateur télescopique / Manuscopic', qty: 1, hours: 4, fuel: 35 },
        { name: 'Pulvérisateur & Nettoyeur haute pression', qty: 1, hours: 2, fuel: 8 }
      ];
    }

    if (desc.includes('clôture') || desc.includes('installation') || desc.includes('sécuris') || desc.includes('magasin') || desc.includes('bureau')) {
      return [
        { name: 'Groupe électrogène insonorisé 30 kVA', qty: 1, hours: 8, fuel: 45 },
        { name: 'Poste à souder inverter & Tronçonneuse métal', qty: 2, hours: 6, fuel: 15 },
        { name: 'Bétonnière thermique mobile 350L', qty: 1, hours: 4, fuel: 12 }
      ];
    }

    return [
      { name: 'Pelle Hydraulique polyvalente', qty: 1, hours: 7, fuel: 65 },
      { name: 'Camion benne de servitude chantier', qty: 1, hours: 4, fuel: 35 },
      { name: 'Petit outillage mécanique & motorisé', qty: 2, hours: 6, fuel: 15 }
    ];
  };

  // Helper pour dériver les sous-traitants selon l'activité WBS
  const getSoustraitantsForWbsActivity = (wbsCode: string, project: any = null) => {
    if (!wbsCode) return [
      { company: 'SOGEA BTP', task: 'Travaux préparatoires', effectif: 2, status: 'Actif' },
      { company: 'GEBAT TOPO', task: 'Relevés Altimétriques', effectif: 2, status: 'Actif' }
    ];

    const normCode = String(wbsCode).toUpperCase().trim();
    const actObj = projectWbsNodes.find(a => 
      String(a.wbsCode || a.priceNo || a.id || '').toUpperCase().trim() === normCode
    );
    const desc = String(actObj?.description || actObj?.name || '').toLowerCase();

    if (desc.includes('béton') || desc.includes('radier') || desc.includes('voile') || desc.includes('poteau') || desc.includes('dalle') || desc.includes('fondation') || desc.includes('coulage')) {
      return [
        { company: 'LABOGEM CI', task: 'Prélèvement éprouvettes & Contrôle écrasement 28j', effectif: 2, status: 'Actif' },
        { company: 'POMPAGE BTP CI', task: 'Mise à disposition pompe à béton 36m', effectif: 2, status: 'Actif' }
      ];
    }

    if (desc.includes('ferraillage') || desc.includes('armature') || desc.includes('acier') || desc.includes('fer ') || desc.includes('ha ')) {
      return [
        { company: 'ARMATURES PLUS CI', task: 'Façonnage & Prémontage cages d\'armatures', effectif: 4, status: 'Actif' },
        { company: 'GEBAT CONTRÔLE', task: 'Vérification conformité plans de ferraillage', effectif: 1, status: 'Actif' }
      ];
    }

    if (desc.includes('tuyau') || desc.includes('canalis') || desc.includes('assainissement') || desc.includes('collecteur') || desc.includes('drain') || desc.includes('pvc') || desc.includes('pehd')) {
      return [
        { company: 'HYDRO-CONTROL CI', task: 'Inspection télévisée caméra & Épreuve étanchéité', effectif: 2, status: 'Actif' },
        { company: 'SOCATRA BTP', task: 'Pose préfabriquée regards de visite', effectif: 3, status: 'Actif' }
      ];
    }

    if (desc.includes('terrassement') || desc.includes('décapage') || desc.includes('fouille') || desc.includes('remblai') || desc.includes('compactage')) {
      return [
        { company: 'GEBAT TOPO EXPERTISE', task: 'Implantation géométrique & Relevés laser', effectif: 2, status: 'Actif' },
        { company: 'TRANS-TERRE SERVICES', task: 'Évacuation déblais en décharge agréée', effectif: 3, status: 'Actif' }
      ];
    }

    if (desc.includes('coffrage') || desc.includes('boiseur') || desc.includes('étayage') || desc.includes('panneau')) {
      return [
        { company: 'COFFRAGES DU SUD', task: 'Fourniture & Montage banches métalliques', effectif: 3, status: 'Actif' }
      ];
    }

    if (desc.includes('clôture') || desc.includes('installation') || desc.includes('sécuris') || desc.includes('magasin') || desc.includes('bureau')) {
      return [
        { company: 'SOGEA SÉCURITÉ', task: 'Pose clôtures grillagées & Concertina', effectif: 3, status: 'Actif' }
      ];
    }

    return [
      { company: 'SOGEA BTP', task: 'Travaux préparatoires & Assainissement', effectif: 2, status: 'Actif' },
      { company: 'GEBAT TOPO', task: 'Relevés Altimétriques', effectif: 2, status: 'Actif' }
    ];
  };

  // Helper pour dériver les bons de livraisons selon l'activité WBS
  const getLivraisonsForWbsActivity = (wbsCode: string, project: any = null) => {
    const currentYear = new Date().getFullYear();
    const dateStr = getTodayFrDate();
    if (!wbsCode) return [
      { ref: `BL-${currentYear}-089-SOCIMAC`, supplier: 'SOCIMAC / Ciment CPJ 45', qty: '+150 sac', date: dateStr },
      { ref: `BL-${currentYear}-092-ACI`, supplier: 'Aciéries CI / Fer HA 12', qty: '+3,50 t', date: dateStr }
    ];

    const normCode = String(wbsCode).toUpperCase().trim();
    const actObj = projectWbsNodes.find(a => 
      String(a.wbsCode || a.priceNo || a.id || '').toUpperCase().trim() === normCode
    );
    const desc = String(actObj?.description || actObj?.name || '').toLowerCase();

    if (desc.includes('béton') || desc.includes('radier') || desc.includes('voile') || desc.includes('poteau') || desc.includes('dalle') || desc.includes('fondation') || desc.includes('coulage')) {
      return [
        { ref: `BL-${currentYear}-089-SOCIMAC`, supplier: 'SOCIMAC / Ciment CPA 42.5', qty: '+200 SAC', date: dateStr },
        { ref: `BL-${currentYear}-094-CARRIERE`, supplier: 'CARRIÈRE PFO / Gravier concassé 15/25', qty: '+30 m³', date: dateStr }
      ];
    }

    if (desc.includes('ferraillage') || desc.includes('armature') || desc.includes('acier') || desc.includes('fer ') || desc.includes('ha ')) {
      return [
        { ref: `BL-${currentYear}-102-ACI`, supplier: 'Aciéries CI / Fer à béton HA 12', qty: '+4,50 t', date: dateStr },
        { ref: `BL-${currentYear}-103-ACI`, supplier: 'Aciéries CI / Fer HA 8 & Fil recuit', qty: '+2,20 t', date: dateStr }
      ];
    }

    if (desc.includes('tuyau') || desc.includes('canalis') || desc.includes('assainissement') || desc.includes('collecteur') || desc.includes('drain') || desc.includes('pvc') || desc.includes('pehd')) {
      return [
        { ref: `BL-${currentYear}-077-TUBOPLAST`, supplier: 'TUBOPLAST / Tuyaux PVC Assainissement CR8 DN200', qty: '+60 ML', date: dateStr },
        { ref: `BL-${currentYear}-078-PREFA`, supplier: 'PREFACLUB / Regards 80x80 & Tampons fonte', qty: '+6 U', date: dateStr }
      ];
    }

    if (desc.includes('terrassement') || desc.includes('décapage') || desc.includes('fouille') || desc.includes('remblai') || desc.includes('compactage')) {
      return [
        { ref: `BL-${currentYear}-045-TOTAL`, supplier: 'TOTAL ÉNERGIES / Carburant Gasoil Cuve Chantier', qty: '+1 200 L', date: dateStr },
        { ref: `BL-${currentYear}-046-APPORT`, supplier: 'CARRIÈRE LAGUNE / Remblai latéritique', qty: '+45 m³', date: dateStr }
      ];
    }

    if (desc.includes('coffrage') || desc.includes('boiseur') || desc.includes('étayage') || desc.includes('panneau')) {
      return [
        { ref: `BL-${currentYear}-061-BOIS`, supplier: 'SCIERIE MODERNE / Planches sapin 4m', qty: '+80 U', date: dateStr },
        { ref: `BL-${currentYear}-062-CHIMIE`, supplier: 'SIKA CI / Huile de décoffrage 200L', qty: '+1 FUT', date: dateStr }
      ];
    }

    if (desc.includes('clôture') || desc.includes('installation') || desc.includes('sécuris') || desc.includes('magasin') || desc.includes('bureau')) {
      return [
        { ref: `BL-${currentYear}-033-METAL`, supplier: 'PRO-BARDAGE CI / Tôles de bardage 3m', qty: '+50 U', date: dateStr },
        { ref: `BL-${currentYear}-034-SOCIMAC`, supplier: 'SOCIMAC / Ciment CHF Scellements', qty: '+30 SAC', date: dateStr }
      ];
    }

    return [
      { ref: `BL-${currentYear}-089-SOCIMAC`, supplier: 'SOCIMAC / Ciment CPJ 45', qty: '+150 sac', date: dateStr },
      { ref: `BL-${currentYear}-092-ACI`, supplier: 'Aciéries CI / Fer HA 12', qty: '+3,50 t', date: dateStr }
    ];
  };

  // Helper pour dériver les incidents & points de contrôle selon l'activité WBS
  const getProblemsForWbsActivity = (wbsCode: string, project: any = null) => {
    if (!wbsCode) return [
      { type: 'Point d’arrêt sécurité & vérification conformité des ouvrages', impact: 'Faible' as const }
    ];

    const normCode = String(wbsCode).toUpperCase().trim();
    const actObj = projectWbsNodes.find(a => 
      String(a.wbsCode || a.priceNo || a.id || '').toUpperCase().trim() === normCode
    );
    const desc = String(actObj?.description || actObj?.name || '').toLowerCase();

    if (desc.includes('béton') || desc.includes('radier') || desc.includes('voile') || desc.includes('poteau') || desc.includes('dalle') || desc.includes('fondation') || desc.includes('coulage')) {
      return [
        { type: 'Contrôle slump test cône d’Abrams conforme (14 cm) - Aucun incident de coulage', impact: 'Faible' as const }
      ];
    }

    if (desc.includes('ferraillage') || desc.includes('armature') || desc.includes('acier') || desc.includes('fer ') || desc.includes('ha ')) {
      return [
        { type: 'Contrôle des enrobages et ligatures des armatures validé avant coulage', impact: 'Faible' as const }
      ];
    }

    if (desc.includes('tuyau') || desc.includes('canalis') || desc.includes('assainissement') || desc.includes('collecteur') || desc.includes('drain') || desc.includes('pvc') || desc.includes('pehd')) {
      return [
        { type: 'Vérification fil d’eau et calage des pentes au niveau laser', impact: 'Faible' as const }
      ];
    }

    if (desc.includes('terrassement') || desc.includes('décapage') || desc.includes('fouille') || desc.includes('remblai') || desc.includes('compactage')) {
      return [
        { type: 'Contrôle humidité et portance de la plateforme (Essai à la plaque)', impact: 'Faible' as const }
      ];
    }

    if (desc.includes('coffrage') || desc.includes('boiseur') || desc.includes('étayage') || desc.includes('panneau')) {
      return [
        { type: 'Vérification de l’aplomb et de l’étanchéité des banches de coffrage', impact: 'Faible' as const }
      ];
    }

    return [
      { type: 'Point d’arrêt sécurité & vérification conformité des ouvrages', impact: 'Faible' as const }
    ];
  };

  // Helper pour dériver la Zone de chantier selon l'activité WBS
  const getLocationZoneForWbsActivity = (wbsCode: string) => {
    if (!wbsCode) return 'Zone A - Côté Nord';
    const normCode = String(wbsCode).toUpperCase().trim();
    const actObj = projectWbsNodes.find(a => 
      String(a.wbsCode || a.priceNo || a.id || '').toUpperCase().trim() === normCode
    );
    const desc = String(actObj?.description || actObj?.name || '').toLowerCase();

    if (desc.includes('béton') || desc.includes('radier') || desc.includes('voile') || desc.includes('poteau') || desc.includes('dalle') || desc.includes('fondation') || desc.includes('coulage')) {
      return 'Zone 1 - Ouvrages de Structure & Radiers';
    }
    if (desc.includes('ferraillage') || desc.includes('armature') || desc.includes('acier') || desc.includes('fer ') || desc.includes('ha ')) {
      return 'Atelier Central de Façonnage & Pose Cages';
    }
    if (desc.includes('tuyau') || desc.includes('canalis') || desc.includes('assainissement') || desc.includes('collecteur') || desc.includes('drain') || desc.includes('pvc') || desc.includes('pehd')) {
      return 'Zone Réseau Principal Assainissement & Tranchées';
    }
    if (desc.includes('terrassement') || desc.includes('décapage') || desc.includes('fouille') || desc.includes('remblai') || desc.includes('compactage')) {
      return 'Plateforme Générale - Nivellement & Décapage';
    }
    if (desc.includes('clôture') || desc.includes('installation') || desc.includes('sécuris') || desc.includes('magasin') || desc.includes('bureau')) {
      return 'Périphérie Chantier & Base-Vie';
    }
    return 'Zone A - Côté Nord';
  };

  const [personnelRows, setPersonnelRows] = useState<Array<{ category: string; effectif: number; hNormales: number; hSup: number }>>([]);
  const [materielRows, setMaterielRows] = useState<Array<{ name: string; qty: number; hours: number; fuel: number }>>([]);
  const [soustraitantRows, setSoustraitantRows] = useState<Array<{ company: string; task: string; effectif: number; status: string }>>([]);

  const handleAddPersonnelRow = () => {
    setPersonnelRows(prev => [...prev, { category: '', effectif: 0, hNormales: 0, hSup: 0 }]);
  };

  const handleAddMaterielRow = () => {
    setMaterielRows(prev => [...prev, { name: '', qty: 0, hours: 0, fuel: 0 }]);
  };

  const handleAddSoustraitantRow = () => {
    setSoustraitantRows(prev => [...prev, { company: '', task: '', effectif: 0, status: 'Actif' }]);
  };

  const personnelTotals = useMemo(() => {
    return personnelRows.reduce(
      (acc, r) => ({
        effectif: acc.effectif + Number(r.effectif || 0),
        hNormales: acc.hNormales + Number(r.hNormales || 0),
        hSup: acc.hSup + Number(r.hSup || 0),
      }),
      { effectif: 0, hNormales: 0, hSup: 0 }
    );
  }, [personnelRows]);

  const materielTotals = useMemo(() => {
    return materielRows.reduce(
      (acc, r) => ({
        qty: acc.qty + Number(r.qty || 0),
        hours: acc.hours + Number(r.hours || 0),
        fuel: acc.fuel + Number(r.fuel || 0),
      }),
      { qty: 0, hours: 0, fuel: 0 }
    );
  }, [materielRows]);

  const soustraitantTotals = useMemo(() => {
    return soustraitantRows.reduce(
      (acc, r) => ({
        effectif: acc.effectif + Number(r.effectif || 0),
        count: acc.count + 1
      }),
      { effectif: 0, count: 0 }
    );
  }, [soustraitantRows]);

  // 4. CONSOMMATIONS & LIVRAISONS DYNAMIQUES (100% LIÉES À L'ACTIVITÉ WBS SÉLECTIONNÉE)
  const [consumptionTab, setConsumptionTab] = useState<'consommations' | 'livraisons'>('consommations');

  // Helper intelligent pour dériver les consommations théoriques et prévues selon l'Activité WBS active
  const getConsumptionsForWbsActivity = (
    wbsCode: string,
    targetQty: number = 0,
    project: any = null
  ) => {
    if (!wbsCode) return [];

    const normCode = String(wbsCode).toUpperCase().trim();
    
    // 1. Recherche dans les activités DS réelles du projet (qui contiennent le détail exact des sous-ressources MAT)
    const allActivities = [...REAL_DS_SONGON_ACTIVITIES, ...REAL_DS_BINGERVILLE_ACTIVITIES];
    const matchedDs = allActivities.find(act => 
      String(act.wbsCode || act.priceNo || act.id || '').toUpperCase().trim() === normCode ||
      normCode.includes(String(act.wbsCode || act.priceNo || '').toUpperCase().trim())
    );

    if (matchedDs && Array.isArray(matchedDs.resources) && matchedDs.resources.length > 0) {
      const matResources = matchedDs.resources.filter(r => {
        const nat = String(r.nature || '').toUpperCase();
        return nat === 'MAT' || nat.includes('MAT');
      });

      if (matResources.length > 0) {
        const contractVol = Number(matchedDs.contractQty || matchedDs.plannedQty || 1);
        const effectiveTarget = targetQty > 0 ? targetQty : (Number(matchedDs.contractQty) > 0 ? Math.round(Number(matchedDs.contractQty) / 20) : 10);
        
        return matResources.map(res => {
          const ratio = contractVol > 0 ? (Number(res.theoreticalQty || res.correctedQty || 1) / contractVol) : 1;
          const calculatedPrevue = Math.max(1, Math.round(ratio * effectiveTarget));
          return {
            article: res.name || res.code || 'Matériau',
            unit: res.unit || 'U',
            prevue: calculatedPrevue,
            consommee: 0,
            ecart: 0
          };
        });
      }
    }

    // 2. Recherche dans le WBS Tree pour récupérer la description de l'activité
    const actObj = projectWbsNodes.find(a => 
      String(a.wbsCode || a.priceNo || a.id || '').toUpperCase().trim() === normCode
    );
    const desc = String(actObj?.description || actObj?.name || matchedDs?.description || '').toLowerCase();
    const unit = String(actObj?.unit || matchedDs?.unit || 'm²').toLowerCase();
    const effectiveTarget = targetQty > 0 ? targetQty : 10;

    // 3. Déduction sémantique experte selon la nature de l'ouvrage BTP
    if (desc.includes('béton') || desc.includes('radier') || desc.includes('voile') || desc.includes('poteau') || desc.includes('dalle') || desc.includes('fondation') || desc.includes('coulage') || unit.includes('m3') || unit.includes('m³')) {
      const vol = effectiveTarget;
      return [
        { article: 'CIMENT CPA 42.5 (Coulage de structure)', unit: 'SAC', prevue: Math.max(7, Math.round(vol * 7)), consommee: 0, ecart: 0 },
        { article: 'Sable de lagune lavé 0/4', unit: 'm³', prevue: Math.max(1, Math.round(vol * 0.45)), consommee: 0, ecart: 0 },
        { article: 'Gravier concassé 15/25', unit: 'm³', prevue: Math.max(1, Math.round(vol * 0.80)), consommee: 0, ecart: 0 },
        { article: 'Eau de gâchage', unit: 'm³', prevue: Math.max(1, Math.round(vol * 0.18)), consommee: 0, ecart: 0 },
        { article: 'Adjuvant plastifiant réducteur d’eau', unit: 'L', prevue: Math.max(1, Math.round(vol * 2.5)), consommee: 0, ecart: 0 }
      ];
    }

    if (desc.includes('ferraillage') || desc.includes('armature') || desc.includes('acier') || desc.includes('fer ') || desc.includes('ha ')) {
      return [
        { article: 'FER 12 (Barres 12m HA)', unit: 'BARRE', prevue: Math.round(effectiveTarget * 0.40) || 20, consommee: 0, ecart: 0 },
        { article: 'FER 10 (Ferraillage voiles & radiers)', unit: 'BARRE', prevue: Math.round(effectiveTarget * 0.35) || 18, consommee: 0, ecart: 0 },
        { article: 'FER 8 (Épingles et chevaliers)', unit: 'BARRE', prevue: Math.round(effectiveTarget * 0.25) || 12, consommee: 0, ecart: 0 },
        { article: 'Fil de recuit pour ligature', unit: 'ROULEAU', prevue: Math.max(1, Math.round(effectiveTarget * 0.05)), consommee: 0, ecart: 0 },
        { article: 'Cales d’enrobage béton armé 30mm', unit: 'U', prevue: Math.max(10, Math.round(effectiveTarget * 3)), consommee: 0, ecart: 0 }
      ];
    }

    if (desc.includes('tuyau') || desc.includes('canalis') || desc.includes('assainissement') || desc.includes('collecteur') || desc.includes('drain') || desc.includes('pvc') || desc.includes('pehd') || unit.includes('ml')) {
      const ml = effectiveTarget;
      return [
        { article: 'Tuyau PVC Assainissement CR8 DN200', unit: 'ML', prevue: ml, consommee: 0, ecart: 0 },
        { article: 'Manchons & Coudes PVC 45°/90°', unit: 'U', prevue: Math.max(2, Math.round(ml * 0.12)), consommee: 0, ecart: 0 },
        { article: 'Colle gel & Lubrifiant d’emboîtement', unit: 'POT', prevue: Math.max(1, Math.round(ml * 0.04)), consommee: 0, ecart: 0 },
        { article: 'Sable d’enrobage de lit de pose', unit: 'm³', prevue: Math.max(1, Math.round(ml * 0.08)), consommee: 0, ecart: 0 },
        { article: 'Grillage avertisseur bleu/marron', unit: 'ML', prevue: ml, consommee: 0, ecart: 0 }
      ];
    }

    if (desc.includes('coffrage') || desc.includes('boiseur') || desc.includes('étayage') || desc.includes('panneau')) {
      return [
        { article: 'Planches de coffrage sapin 4m', unit: 'U', prevue: Math.max(10, Math.round(effectiveTarget * 1.2)), consommee: 0, ecart: 0 },
        { article: 'Chevrons 6x8 et bastaings', unit: 'U', prevue: Math.max(5, Math.round(effectiveTarget * 0.6)), consommee: 0, ecart: 0 },
        { article: 'Huile de décoffrage biodégradable', unit: 'L', prevue: Math.max(2, Math.round(effectiveTarget * 0.15)), consommee: 0, ecart: 0 },
        { article: 'Pointes & Clous d’assemblage 70/80mm', unit: 'KG', prevue: Math.max(2, Math.round(effectiveTarget * 0.10)), consommee: 0, ecart: 0 }
      ];
    }

    if (desc.includes('terrassement') || desc.includes('décapage') || desc.includes('fouille') || desc.includes('remblai') || desc.includes('compactage')) {
      return [
        { article: 'Carburant Gasoil Engins de chantier', unit: 'L', prevue: Math.max(20, Math.round(effectiveTarget * 0.85)), consommee: 0, ecart: 0 },
        { article: 'Piquets d’implantation bois & repères', unit: 'U', prevue: Math.max(6, Math.round(effectiveTarget * 0.10)), consommee: 0, ecart: 0 },
        { article: 'Rubalise de balisage et sécurité', unit: 'RLX', prevue: 1, consommee: 0, ecart: 0 },
        { article: 'Matériaux d’apport remblai latéritique', unit: 'm³', prevue: Math.max(5, Math.round(effectiveTarget * 0.30)), consommee: 0, ecart: 0 }
      ];
    }

    if (desc.includes('clôture') || desc.includes('installation') || desc.includes('sécuris') || desc.includes('magasin') || desc.includes('bureau')) {
      return [
        { article: 'Tôles de bardage prélaquées 3m', unit: 'U', prevue: 20, consommee: 0, ecart: 0 },
        { article: 'Poteaux métalliques d’ancrage', unit: 'U', prevue: 10, consommee: 0, ecart: 0 },
        { article: 'Ciment CHF (Scellement poteaux)', unit: 'SAC', prevue: 15, consommee: 0, ecart: 0 },
        { article: 'Panneaux de signalisation EPI', unit: 'U', prevue: 4, consommee: 0, ecart: 0 }
      ];
    }

    // Par défaut, proposer les articles en stock du chantier actif
    if (stockItems && stockItems.length > 0) {
      return stockItems.slice(0, 4).map(item => ({
        article: item.name,
        unit: item.unit || 'U',
        prevue: Math.max(10, Math.round(effectiveTarget * 2)),
        consommee: 0,
        ecart: 0
      }));
    }

    return [
      { article: 'Ciment CPA 42.5', unit: 'SAC', prevue: Math.max(10, effectiveTarget * 2), consommee: 0, ecart: 0 },
      { article: 'Sable 0/4', unit: 'm³', prevue: Math.max(1, Math.round(effectiveTarget * 0.3)), consommee: 0, ecart: 0 },
      { article: 'Gravier 15/25', unit: 'm³', prevue: Math.max(1, Math.round(effectiveTarget * 0.5)), consommee: 0, ecart: 0 }
    ];
  };

  const [consommationsRows, setConsommationsRows] = useState<Array<{ article: string; unit: string; prevue: number; consommee: number; ecart: number }>>([]);
  const [livraisonsRows, setLivraisonsRows] = useState<Array<{ ref: string; supplier: string; qty: string; date: string }>>([]);
  const [problems, setProblems] = useState<Array<{ type: string; impact: 'Moyen' | 'Faible' | 'Fort' | 'Critique' }>>([]);

  // SYNCHRONISATION MULTI-SECTIONS 100% LIÉE À L'ACTIVITÉ WBS SÉLECTIONNÉE
  React.useEffect(() => {
    const code = currentWbsCode || (projectWbsNodes && projectWbsNodes.length > 0 ? (projectWbsNodes[0].wbsCode || projectWbsNodes[0].priceNo || projectWbsNodes[0].id) : '');
    if (code) {
      // 1. Consommations
      const derivedCons = getConsumptionsForWbsActivity(code, currentTargetQty, selectedProject);
      setConsommationsRows(derivedCons);

      // 2. Personnel
      const derivedPers = getPersonnelForWbsActivity(code, currentTargetQty, selectedProject);
      setPersonnelRows(derivedPers);

      // 3. Matériel & Engins
      const derivedMat = getMaterielForWbsActivity(code, currentTargetQty, selectedProject);
      setMaterielRows(derivedMat);

      // 4. Sous-traitance
      const derivedSt = getSoustraitantsForWbsActivity(code, selectedProject);
      setSoustraitantRows(derivedSt);

      // 5. Livraisons
      const derivedLiv = getLivraisonsForWbsActivity(code, selectedProject);
      setLivraisonsRows(derivedLiv);

      // 6. Problèmes & Contrôles
      const derivedProb = getProblemsForWbsActivity(code, selectedProject);
      setProblems(derivedProb);

      // 7. Zone du chantier
      const derivedZone = getLocationZoneForWbsActivity(code);
      setLocationZone(derivedZone);

      // 8. Commentaire général & Observations contextualisés
      const actObj = projectWbsNodes.find(a => (a.wbsCode || a.priceNo || a.id) === code);
      const actName = actObj?.description || actObj?.name || 'Chantier';
      setGeneralComment(`Travaux de ${actName} (WBS: ${code}) en cours conformément au planning journalier.`);
      setObservations(`Exécution conforme aux règles de l'art pour l'activité [${code} - ${actName}]. Mobilisation des équipes et outillages selon la cadence requise.`);
    }
  }, [currentWbsCode, currentTargetQty, selectedProject?.id]);

  // Suggestion automatique proportionnelle de la consommation et des heures lors de la saisie de la quantité réalisée
  React.useEffect(() => {
    if (currentTargetQty > 0 && numCurrentRealized > 0) {
      const ratio = numCurrentRealized / currentTargetQty;
      // Ajuster consommations
      setConsommationsRows(prev => prev.map(row => {
        const calculated = Math.round(row.prevue * ratio);
        return {
          ...row,
          consommee: calculated,
          ecart: calculated - row.prevue
        };
      }));

      // Ajuster heures matériel
      setMaterielRows(prev => prev.map(row => {
        const factor = Math.min(1.2, Math.max(0.4, ratio));
        return {
          ...row,
          hours: Math.round(row.hours * factor * 10) / 10,
          fuel: Math.round(row.fuel * factor)
        };
      }));
    } else if (numCurrentRealized === 0) {
      setConsommationsRows(prev => prev.map(row => ({
        ...row,
        consommee: 0,
        ecart: 0
      })));
    }
  }, [numCurrentRealized, currentTargetQty]);

  const handleAddConsumptionRow = () => {
    setConsommationsRows(prev => [
      ...prev,
      { article: '', unit: 'U', prevue: 0, consommee: 0, ecart: 0 }
    ]);
  };

  const handleAddLivraisonRow = () => {
    setLivraisonsRows(prev => [
      ...prev,
      { ref: `BL-${Date.now().toString().slice(-4)}`, supplier: '', qty: '0', date: getTodayFrDate() }
    ]);
  };

  const handleAddProblem = () => {
    setProblems(prev => [
      ...prev,
      { type: '', impact: 'Moyen' }
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

  // Contrôle d'accès et d'habilitation selon le rôle du compte connecté (Brouillon -> Soumis -> Validé -> Verrouillé)
  const handleStatusChange = async (targetStatus: 'Brouillon' | 'Soumis' | 'Validé' | 'Verrouillé') => {
    const userRole = (currentUser?.role || '').toLowerCase();
    const isSuperAdmin = userRole.includes('super admin') || userRole.includes('admin');
    const isDirection = userRole.includes('direction') || userRole.includes('dg');
    const isDirecteurProjet = userRole.includes('directeur projet') || userRole.includes('dp');
    const isDirecteurTechnique = userRole.includes('directeur technique') || userRole.includes('dt');
    const isConducteur = userRole.includes('conducteur');
    const isControleur = userRole.includes('contrôleur') || userRole.includes('controleur');

    setReportStatus(targetStatus);
    setMasterStatusFilter(targetStatus);
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setLastSaveTime(timeStr);
    setHistoryLogs(prev => [
      { time: `${formattedReportDate} ${timeStr}`, text: `Affichage de l'étape "${targetStatus}"` },
      ...prev
    ]);
  };

  const persistReportItems = async (status: 'Brouillon' | 'Soumis' | 'Validé') => {
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
      return false;
    }

    try {
      for (const [index, item] of itemsToSave.entries()) {
        const rowAdvancePct = item.targetQty > 0 ? parseFloat(((item.realizedQty / item.targetQty) * 100).toFixed(1)) : 0;
        const currentYear = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-4);
        const rjcCode = `RJC-${currentYear}-${String(dailyReports.length + index + 1).padStart(5, '0')}-${timestamp}`;
        await createDailyReport({
          id: rjcCode, code: rjcCode, reportCode: rjcCode, projectId: selectedProject.id,
          date: reportDate, wbsCode: item.wbsCode, wbsId: item.wbsCode,
          activityName: item.activityName || 'Activité', weather, temperature, workShift,
          locationZone, generalComment, teamLeader, unit: item.unit, targetQty: item.targetQty,
          plannedQty: item.targetQty, realizedQty: item.realizedQty, cumulDate: item.cumulDate,
          totalPlanned: item.totalPlanned, advancePct: rowAdvancePct, personnel: personnelRows,
          consummations: consommationsRows, problems, photos, observations, status
        });
      }
      setRecordedActivities([]);
      setCurrentRealizedQty('');
      setCurrentWbsCode('');
      setReportStatus(status);
      return true;
    } catch (error: any) {
      alert(`❌ Échec de l'enregistrement : ${error?.message || 'les données ne sont pas sauvegardées.'}`);
      return false;
    }
  };

  // Navigation propre par étape du workflow (1. Brouillon -> 2. Soumis -> 3. Validé -> 4. Verrouillé)
  const handleStepTabClick = (targetStatus: 'Brouillon' | 'Soumis' | 'Validé' | 'Verrouillé') => {
    setReportStatus(targetStatus);
    setMasterStatusFilter(targetStatus);
  };

  // Réinitialisation pour nouveau brouillon terrain
  const handleNewDraft = () => {
    setRecordedActivities([]);
    setCurrentWbsCode('');
    setCurrentTargetQty(0);
    setCurrentRealizedQty('');
    setReportStatus('Brouillon');
    setMasterStatusFilter('Brouillon');
  };

  // Enregistrement Brouillon
  const handleSaveDraft = async () => {
    const saved = await persistReportItems('Brouillon');
    if (saved) {
      setReportStatus('Brouillon');
      setMasterStatusFilter('Brouillon');
      alert('✅ Brouillon enregistré dans la base de données.');
    }
  };

  // Soumission pour validation
  const handleSubmitValidation = async () => {
    const saved = await persistReportItems('Soumis');
    if (saved) {
      setReportStatus('Soumis');
      setMasterStatusFilter('Soumis');
      alert('🚀 Rapport journalier soumis pour validation avec succès !\n\n• Le rapport est disponible à l\'Étape 2. Soumis\n• Tâche de validation assignée au Directeur de Projet.');
    }
  };

  // Validation directe et comptabilisation instantanée
  const handleDirectValidate = async () => {
    const userRole = (currentUser?.role || '').toLowerCase();
    const isSuperAdmin = userRole.includes('super admin') || userRole.includes('admin');
    const isDirection = userRole.includes('direction') || userRole.includes('dg');
    const isDirecteurProjet = userRole.includes('directeur projet') || userRole.includes('dp');
    const isDirecteurTechnique = userRole.includes('directeur technique') || userRole.includes('dt');
    const isConducteur = userRole.includes('conducteur');

    if (!isSuperAdmin && !isDirection && !isDirecteurProjet && !isDirecteurTechnique && !isConducteur) {
      alert(`⛔ HABILITATION INSUFFISANTE\n\nVotre compte (${currentUser?.name || 'Utilisateur'}, Rôle: "${currentUser?.role || 'Non spécifié'}") n'est pas habilité à VALIDER ce rapport.\n\nSeuls les comptes habilités suivants disposent des droits de validation :\n• Conducteur de Travaux\n• Directeur de Projet (DP)\n• Directeur Technique (DT)\n• Direction Générale (DG)\n• Super Administrateur`);
      return;
    }

    const saved = await persistReportItems('Validé');
    if (saved) {
      setReportStatus('Validé');
      setMasterStatusFilter('Validé');
      alert('✅ Rapport de production enregistré, validé et comptabilisé avec succès !\n\n• Le rapport est disponible à l\'Étape 3. Validé\n• Sorties de stock décrémentées\n• Métrés et coûts WBS imputés\n• Avancement physique du projet recalculé.');
    }
  };

  // Export CSV standardisé UTF-8 BOM
  const handleExportCSV = () => {
    const listToExport = dailyReports.filter(r => isProjectReportMatch(r, selectedProject));
    if (listToExport.length === 0) {
      alert('Aucun rapport journalier à exporter pour ce chantier.');
      return;
    }

    const headers = [
      'Référence Rapport',
      'Date',
      'Code Projet',
      'Chantier',
      'Code WBS',
      'Activité / Ouvrage',
      'Unité',
      'Quantité Réalisée',
      'Quantité Prévue',
      'Productivité (%)',
      'Météo',
      'Zone',
      'Chef / Équipe',
      'Statut',
      'Validé par',
      'Notes / Observations'
    ];

    const rows = listToExport.map(r => [
      `"${r.code || r.reportCode || r.id}"`,
      `"${r.date || ''}"`,
      `"${r.projectId || selectedProject?.code || ''}"`,
      `"${(selectedProject?.name || '').replace(/"/g, '""')}"`,
      `"${r.wbsCode || ''}"`,
      `"${(r.activityName || '').replace(/"/g, '""')}"`,
      `"${r.unit || 'U'}"`,
      r.realizedQty || 0,
      r.plannedQty || r.targetQty || 0,
      r.productivityRate || 100,
      `"${r.weather || ''}"`,
      `"${r.locationZone || ''}"`,
      `"${(r.createdBy || r.teamLeader || '').replace(/"/g, '""')}"`,
      `"${r.status || 'Validé'}"`,
      `"${(r.validatedBy || '').replace(/"/g, '""')}"`,
      `"${(r.notes || r.generalComment || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RAPPORTS_JOURNALIERS_${selectedProject?.code || 'EXPORT'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    const listToExport = dailyReports.filter(r => isProjectReportMatch(r, selectedProject));
    if (listToExport.length === 0) {
      alert('Aucun rapport journalier à exporter pour ce chantier.');
      return;
    }

    const data = listToExport.map(r => ({
      'Réf. Rapport': r.code || r.reportCode || r.id,
      'Date': r.date,
      'Chantier': selectedProject?.name,
      'Code WBS': r.wbsCode,
      'Activité': r.activityName,
      'Unité': r.unit,
      'Quantité Réalisée': r.realizedQty,
      'Quantité Prévue': r.plannedQty || r.targetQty,
      'Productivité (%)': r.productivityRate || 100,
      'Météo': r.weather,
      'Zone': r.locationZone,
      'Auteur / Chef': r.createdBy || r.teamLeader,
      'Statut': r.status,
      'Validateur': r.validatedBy || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapports Production');
    XLSX.writeFile(workbook, `RAPPORTS_PRODUCTION_${selectedProject?.code || 'EXPORT'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Validation en masse de tous les rapports soumis du chantier actif
  const handleBatchValidateAll = async () => {
    const reportsToValidate = dailyReports.filter(r => {
      if (!isProjectReportMatch(r, selectedProject)) return false;
      const s = (r.status || '').toUpperCase();
      return s.includes('SOUMIS') || s.includes('ATTENTE') || s.includes('PENDING');
    });

    if (reportsToValidate.length === 0) {
      alert('ℹ️ Aucun rapport en attente de validation (Soumis) pour ce chantier.');
      return;
    }

    if (!window.confirm(`Confirmez-vous la validation de ${reportsToValidate.length} rapport(s) soumis pour le chantier ${selectedProject?.name} ?`)) {
      return;
    }

    setIsValidating(true);
    try {
      for (const rep of reportsToValidate) {
        const targetId = rep.id;
        const targetCode = rep.code || rep.reportCode;
        if (updateDailyReportStatus) {
          await updateDailyReportStatus(targetId, 'Validé', `Validation groupée par ${currentUser?.name || 'Direction'}`);
          if (targetCode && targetCode !== targetId) {
            await updateDailyReportStatus(targetCode, 'Validé', `Validation groupée par ${currentUser?.name || 'Direction'}`);
          }
        }
        if (updateValidationTaskStatus) {
          await updateValidationTaskStatus(targetId, 'APPROVED', `Validation groupée par ${currentUser?.name || 'Direction'}`);
        }
      }
      setReportStatus('Validé');
      setMasterStatusFilter('Validé');
      alert(`✅ ${reportsToValidate.length} rapport(s) validé(s) avec succès !\n\n• Redirection vers l'Étape 3. Validé\n• Avancements WBS et du projet actualisés.`);
    } catch (err: any) {
      alert(`❌ Erreur lors de la validation : ${err?.message || 'Erreur serveur.'}`);
    } finally {
      setIsValidating(false);
    }
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
            onClick={() => {
              if (onBackToProject) onBackToProject();
              else setActiveTab?.('dashboard');
            }}
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
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                >
                  <FileText size={14} /> Enregistrer comme Brouillon
                </button>
                <button
                  onClick={() => { handleSubmitValidation(); setShowActionsDropdown(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                >
                  <Send size={14} /> Soumettre pour Validation
                </button>
                <button
                  onClick={() => { handleDirectValidate(); setShowActionsDropdown(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                >
                  <CheckCircle2 size={14} className="text-emerald-600" /> Valider & Comptabiliser
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
              onClick={() => handleStepTabClick('Brouillon')}
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
              onClick={() => handleStepTabClick('Soumis')}
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
                      if (isDemoReportObj(r) || !isProjectReportMatch(r, selectedProject)) return false;
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
              onClick={() => handleStepTabClick('Validé')}
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
                      if (isDemoReportObj(r) || !isProjectReportMatch(r, selectedProject)) return false;
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
              onClick={() => handleStepTabClick('Verrouillé')}
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
                      if (isDemoReportObj(r) || !isProjectReportMatch(r, selectedProject)) return false;
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

      {/* 2B. PANNEAU DE SUIVI & DE VALIDATION DES RAPPORTS JOURNALIERS (SUIVI CONTINU ET PERMANENT SANS DISPARITION) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
              <span>Rapports Journaliers de Chantier — Registre Officiel Persistant</span>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-extrabold rounded-full text-[11px]">
                {stepReports.length} rapport(s)
              </span>
            </h2>
            <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
              Historique inaltérable de la production terrain pour le chantier {selectedProject.name}. Suivi des validations et traçabilité.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1.5 rounded-xl border border-emerald-300 text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              title="Exporter le registre en fichier Excel (.xlsx)"
            >
              <FileSpreadsheet size={14} className="text-emerald-700" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-xl border border-slate-300 text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              title="Exporter en CSV standardisé"
            >
              <Download size={14} className="text-slate-600" />
              <span>CSV</span>
            </button>
            {isValidatorRole && dailyReports.some(r => isProjectReportMatch(r, selectedProject) && (r.status || '').toUpperCase().includes('SOUMIS')) && (
              <button
                onClick={handleBatchValidateAll}
                disabled={isValidating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                title="Valider en un clic tous les rapports soumis du chantier actif"
              >
                <CheckCircle2 size={14} />
                <span>{isValidating ? 'Validation...' : '⚡ Tout Valider (Soumis)'}</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-[11px] font-bold text-slate-500">Statut :</span>
              <select
                value={masterStatusFilter}
                onChange={e => {
                  const val = e.target.value;
                  setMasterStatusFilter(val);
                  if (val === 'Brouillon' || val === 'Soumis' || val === 'Validé' || val === 'Verrouillé') {
                    setReportStatus(val as any);
                  }
                }}
                className="bg-slate-50 border border-slate-300 text-slate-900 font-extrabold text-xs px-3 py-1.5 rounded-xl focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="ALL">📋 Tous les statuts ({dailyReports.filter(r => isProjectReportMatch(r, selectedProject)).length})</option>
                <option value="Brouillon">📝 Brouillons (Étape 1)</option>
                <option value="Soumis">⏳ Soumis (Étape 2)</option>
                <option value="Validé">✅ Validés (Étape 3)</option>
                <option value="Verrouillé">🔒 Verrouillés (Étape 4)</option>
                <option value="Refusé">❌ Refusés / En correction</option>
              </select>
            </div>
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
                      <td className="p-3">
                        {(() => {
                          const wbsInfo = resolveReportWbsActivity(rep);
                          return (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {wbsInfo.code && (
                                <span className="font-mono text-[10.5px] font-black text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                                  [{wbsInfo.code}]
                                </span>
                              )}
                              <span className="font-bold text-slate-900 text-xs">
                                {wbsInfo.name}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
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
                          {(() => {
                            const normRepS = (rep.status || 'Soumis').toUpperCase();
                            const isSoumis = normRepS.includes('SOUMIS') || normRepS.includes('ATTENTE') || normRepS.includes('PENDING');
                            const isValid = normRepS.includes('VALID') || normRepS.includes('APPROVED');
                            const isLocked = normRepS.includes('VERROU') || normRepS.includes('CLOSED');

                            if (isSoumis) {
                              return isValidatorRole ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    disabled={isValidating}
                                    onClick={async () => {
                                      const targetId = rep.id;
                                      const targetCode = rep.code || rep.reportCode;
                                      setIsValidating(true);
                                      try {
                                        if (updateDailyReportStatus) {
                                          await updateDailyReportStatus(targetId, 'Validé', `Validé par ${currentUser?.name || 'Valideur'}`);
                                          if (targetCode && targetCode !== targetId) {
                                            await updateDailyReportStatus(targetCode, 'Validé', `Validé par ${currentUser?.name || 'Valideur'}`);
                                          }
                                        }
                                        if (updateValidationTaskStatus) {
                                          await updateValidationTaskStatus(targetId, 'APPROVED', `Validé par ${currentUser?.name || 'Valideur'}`);
                                        }
                                        setReportStatus('Validé');
                                        setMasterStatusFilter('Validé');
                                        alert(`✅ Rapport ${targetCode || targetId} validé et comptabilisé avec succès !\n\n• Redirection vers l'Étape 3. Validé\n• Sorties de stock décrémentées\n• Métrés et coûts WBS imputés.`);
                                      } catch (err: any) {
                                        alert(`❌ Échec de la validation : ${err?.message || 'Erreur de communication serveur.'}`);
                                      } finally {
                                        setIsValidating(false);
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-lg text-xs shadow-2xs cursor-pointer transition flex items-center gap-1"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>{isValidating ? '⏳ Validation...' : '✅ Valider'}</span>
                                  </button>
                                  <button
                                    disabled={isValidating}
                                    onClick={async () => {
                                      const reason = prompt('Motif / Commentaire pour la demande de correction :') || 'Demande de correction terrain';
                                      if (!reason.trim()) return;
                                      const targetId = rep.id;
                                      const targetCode = rep.code || rep.reportCode;
                                      setIsValidating(true);
                                      try {
                                        if (updateDailyReportStatus) {
                                          await updateDailyReportStatus(targetId, 'Brouillon', reason);
                                          if (targetCode && targetCode !== targetId) {
                                            await updateDailyReportStatus(targetCode, 'Brouillon', reason);
                                          }
                                        }
                                        if (updateValidationTaskStatus) {
                                          await updateValidationTaskStatus(targetId, 'RETURNED', reason);
                                        }
                                        setReportStatus('Brouillon');
                                        setMasterStatusFilter('Brouillon');
                                        alert(`↩️ Demande de correction envoyée pour le rapport ${targetCode || targetId}.\n\n• Statut repassé en Brouillon\n• Redirection vers l'Étape 1. Brouillon.`);
                                      } catch (err: any) {
                                        alert(`❌ Échec du renvoi : ${err?.message || 'Erreur serveur.'}`);
                                      } finally {
                                        setIsValidating(false);
                                      }
                                    }}
                                    className="px-2.5 py-1.5 bg-amber-100 text-amber-900 hover:bg-amber-200 disabled:opacity-50 font-bold rounded-lg text-xs cursor-pointer transition"
                                  >
                                    ↩️ Correction
                                  </button>
                                   {deleteDailyReport && (
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         const codeOrId = rep.code || (rep as any).reportCode || rep.id;
                                         if (confirm(`🗑️ Voulez-vous supprimer définitivement le rapport ${codeOrId} ?`)) {
                                           deleteDailyReport(rep.id);
                                           if (rep.code && rep.code !== rep.id) {
                                             deleteDailyReport(rep.code);
                                           }
                                           if ((rep as any).reportCode && (rep as any).reportCode !== rep.id) {
                                             deleteDailyReport((rep as any).reportCode);
                                           }
                                         }
                                       }}
                                       className="px-2 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-extrabold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 border border-rose-200"
                                       title="Supprimer ce rapport du registre"
                                     >
                                       <Trash2 size={13} />
                                       <span>Supprimer</span>
                                     </button>
                                   )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold rounded-lg text-[10.5px] border border-amber-200">
                                    ⏳ En attente de validation
                                  </span>
                                  {deleteDailyReport && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const codeOrId = rep.code || (rep as any).reportCode || rep.id;
                                        if (confirm(`🗑️ Voulez-vous supprimer définitivement le rapport ${codeOrId} ?`)) {
                                          deleteDailyReport(rep.id);
                                          if (rep.code && rep.code !== rep.id) {
                                            deleteDailyReport(rep.code);
                                          }
                                          if ((rep as any).reportCode && (rep as any).reportCode !== rep.id) {
                                            deleteDailyReport((rep as any).reportCode);
                                          }
                                        }
                                      }}
                                      className="px-2 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-extrabold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 border border-rose-200"
                                      title="Supprimer ce rapport"
                                    >
                                      <Trash2 size={13} />
                                      <span>Supprimer</span>
                                    </button>
                                  )}
                                </div>
                              );
                            }

                            if (isValid) {
                              return isValidatorRole ? (
                                <button
                                  disabled={isValidating}
                                  onClick={async () => {
                                    setIsValidating(true);
                                    try {
                                      if (updateDailyReportStatus) await updateDailyReportStatus(rep.id, 'Verrouillé', 'Verrouillé par le Cost Control');
                                      alert(`🔒 Rapport ${rep.code || rep.id} verrouillé et certifié avec succès !`);
                                    } catch (err: any) {
                                      alert(`❌ Erreur lors du verrouillage : ${err?.message || 'Erreur serveur.'}`);
                                    } finally {
                                      setIsValidating(false);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-extrabold rounded-lg text-xs shadow-2xs cursor-pointer transition"
                                >
                                  🔒 Verrouiller
                                </button>
                              ) : (
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold rounded-lg text-xs border border-emerald-300 shadow-2xs inline-flex items-center gap-1">
                                  <CheckCircle2 size={13} className="text-emerald-700" />
                                  <span>✅ Validé par {rep.validatedBy || 'DP / DT'}</span>
                                </span>
                              );
                            }

                            if (isLocked) {
                              return (
                                <span className="px-3 py-1 bg-purple-100 text-purple-900 font-black rounded-lg text-[11px] border border-purple-200">
                                  🔒 Certifié & Conduite
                                </span>
                              );
                            }

                            return (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[10.5px] border border-slate-200">
                                  📝 {rep.status || 'Brouillon'}
                                </span>
                                <button
                                  onClick={async () => {
                                    if (updateDailyReportStatus) {
                                      await updateDailyReportStatus(rep.id, 'Soumis', 'Soumis depuis le registre');
                                      if (rep.code && rep.code !== rep.id) {
                                        await updateDailyReportStatus(rep.code, 'Soumis', 'Soumis depuis le registre');
                                      }
                                    }
                                    alert(`🚀 Rapport ${rep.code || rep.id} soumis pour validation.`);
                                  }}
                                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title="Soumettre ce brouillon pour validation par le DP"
                                >
                                  <Send size={12} />
                                  <span>Soumettre</span>
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* 3. SECTION INFORMATIONS GÉNÉRALES & SAISIE TERRAIN (UNIQUEMENT DISPONIBLE EN ÉTAPE BROUILLON ET EXCLUE SUR SOUMIS/VALIDÉ/VERROUILLÉ) */}
      {(reportStatus === 'Brouillon' && masterStatusFilter !== 'Soumis' && masterStatusFilter !== 'Validé' && masterStatusFilter !== 'Verrouillé') && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                INFORMATIONS GÉNÉRALES DU CHANTIER
              </h2>
              {currentWbsCode && (
                <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold truncate max-w-[240px]" title={`WBS lié : ${currentWbsCode}`}>
                  WBS : {currentWbsCode}
                </span>
              )}
            </div>

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
              <option value="Zone 1 - Ouvrages de Structure & Radiers">Zone 1 - Ouvrages de Structure & Radiers</option>
              <option value="Zone Réseau Principal Assainissement & Tranchées">Zone Réseau Principal Assainissement & Tranchées</option>
              <option value="Plateforme Générale - Nivellement & Décapage">Plateforme Générale - Nivellement & Décapage</option>
              <option value="Atelier Central de Façonnage & Pose Cages">Atelier Central de Façonnage & Pose Cages</option>
              <option value="Périphérie Chantier & Base-Vie">Périphérie Chantier & Base-Vie</option>
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

              {/* Sélecteur WBS / Activité avec Recherche Rapide Instantanée */}
              <div>
                <SearchableSelect
                  label="WBS / Activité"
                  required
                  options={wbsSelectOptions}
                  value={currentWbsCode}
                  onChange={val => setCurrentWbsCode(val)}
                  placeholder="🔍 Recherche rapide (Taper code WBS ou nom d'activité : 200.1, Coulage, Décapage)..."
                  disabled={!isFormEditable}
                />
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
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  RESSOURCES UTILISÉES
                </h2>
                {currentWbsCode && (
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold truncate max-w-[180px]" title={`WBS lié : ${currentWbsCode}`}>
                    WBS : {currentWbsCode}
                  </span>
                )}
              </div>
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
              <div className="overflow-x-auto pt-2 space-y-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10.5px]">
                      <th className="py-2">Catégorie</th>
                      <th className="py-2 text-center">Effectif</th>
                      <th className="py-2 text-center">Heures normales</th>
                      <th className="py-2 text-center">Heures sup.</th>
                      <th className="py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {personnelRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 font-bold text-slate-800 pr-2">
                          <input
                            type="text"
                            placeholder="Ex: Maçons, Ferrailleurs..."
                            value={r.category}
                            onChange={e => {
                              const val = e.target.value;
                              setPersonnelRows(prev => prev.map((item, i) => i === idx ? { ...item, category: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-center font-mono font-bold px-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={r.effectif || ''}
                            onChange={e => {
                              const val = Number(e.target.value || 0);
                              setPersonnelRows(prev => prev.map((item, i) => i === idx ? { ...item, effectif: val } : item));
                            }}
                            className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-center font-mono px-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={r.hNormales || ''}
                            onChange={e => {
                              const val = Number(e.target.value || 0);
                              setPersonnelRows(prev => prev.map((item, i) => i === idx ? { ...item, hNormales: val } : item));
                            }}
                            className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-mono text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-center font-mono px-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={r.hSup || ''}
                            onChange={e => {
                              const val = Number(e.target.value || 0);
                              setPersonnelRows(prev => prev.map((item, i) => i === idx ? { ...item, hSup: val } : item));
                            }}
                            className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-mono text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-right pl-1">
                          <button
                            onClick={() => setPersonnelRows(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                            title="Supprimer la ligne"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-black text-slate-900 bg-slate-50 border-t border-slate-200">
                      <td className="py-2">Total Personnel</td>
                      <td className="py-2 text-center font-mono">{personnelTotals.effectif} pers.</td>
                      <td className="py-2 text-center font-mono">{personnelTotals.hNormales} h</td>
                      <td className="py-2 text-center font-mono">{personnelTotals.hSup} h</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
                <button
                  onClick={handleAddPersonnelRow}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition pt-1"
                >
                  <Plus size={14} /> Ajouter une catégorie de personnel
                </button>
              </div>
            )}

            {/* 2. Onglet Matériel */}
            {resourceTab === 'materiel' && (
              <div className="overflow-x-auto pt-2 space-y-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10.5px]">
                      <th className="py-2">Désignation Engin / Équipement</th>
                      <th className="py-2 text-center">Quantité</th>
                      <th className="py-2 text-center">Heures util.</th>
                      <th className="py-2 text-right">Carburant (L)</th>
                      <th className="py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {materielRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 font-bold text-slate-800 pr-2">
                          <input
                            type="text"
                            placeholder="Ex: Bulldozer, Camion..."
                            value={r.name}
                            onChange={e => {
                              const val = e.target.value;
                              setMaterielRows(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-center font-mono font-bold px-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={r.qty || ''}
                            onChange={e => {
                              const val = Number(e.target.value || 0);
                              setMaterielRows(prev => prev.map((item, i) => i === idx ? { ...item, qty: val } : item));
                            }}
                            className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-center font-mono px-1">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="0"
                            value={r.hours || ''}
                            onChange={e => {
                              const val = Number(e.target.value || 0);
                              setMaterielRows(prev => prev.map((item, i) => i === idx ? { ...item, hours: val } : item));
                            }}
                            className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-mono text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-right font-mono px-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={r.fuel || ''}
                            onChange={e => {
                              const val = Number(e.target.value || 0);
                              setMaterielRows(prev => prev.map((item, i) => i === idx ? { ...item, fuel: val } : item));
                            }}
                            className="w-20 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-right pl-1">
                          <button
                            onClick={() => setMaterielRows(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                            title="Supprimer la ligne"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-black text-slate-900 bg-slate-50 border-t border-slate-200">
                      <td className="py-2">Total Matériel</td>
                      <td className="py-2 text-center font-mono">{materielTotals.qty} engins</td>
                      <td className="py-2 text-center font-mono">{materielTotals.hours} h</td>
                      <td className="py-2 text-right font-mono">{materielTotals.fuel} L</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
                <button
                  onClick={handleAddMaterielRow}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition pt-1"
                >
                  <Plus size={14} /> Ajouter un engin / matériel
                </button>
              </div>
            )}

            {/* 3. Onglet Sous-traitants */}
            {resourceTab === 'soustraitants' && (
              <div className="overflow-x-auto pt-2 space-y-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10.5px]">
                      <th className="py-2">Entreprise Sous-traitante</th>
                      <th className="py-2">Tâche / Spécialité</th>
                      <th className="py-2 text-center">Effectif</th>
                      <th className="py-2 text-right">Statut</th>
                      <th className="py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {soustraitantRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 font-bold text-slate-800 pr-1">
                          <input
                            type="text"
                            placeholder="Nom de l'entreprise..."
                            value={r.company}
                            onChange={e => {
                              const val = e.target.value;
                              setSoustraitantRows(prev => prev.map((item, i) => i === idx ? { ...item, company: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 font-bold text-slate-800 pr-1">
                          <input
                            type="text"
                            placeholder="Prestation..."
                            value={r.task}
                            onChange={e => {
                              const val = e.target.value;
                              setSoustraitantRows(prev => prev.map((item, i) => i === idx ? { ...item, task: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-center font-mono font-bold px-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={r.effectif || ''}
                            onChange={e => {
                              const val = Number(e.target.value || 0);
                              setSoustraitantRows(prev => prev.map((item, i) => i === idx ? { ...item, effectif: val } : item));
                            }}
                            className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-right px-1">
                          <select
                            value={r.status}
                            onChange={e => {
                              const val = e.target.value;
                              setSoustraitantRows(prev => prev.map((item, i) => i === idx ? { ...item, status: val } : item));
                            }}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10.5px] font-bold text-slate-800 focus:outline-none cursor-pointer"
                          >
                            <option value="Actif">Actif</option>
                            <option value="En attente">En attente</option>
                            <option value="Terminé">Terminé</option>
                          </select>
                        </td>
                        <td className="py-1.5 text-right pl-1">
                          <button
                            onClick={() => setSoustraitantRows(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                            title="Supprimer la ligne"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-black text-slate-900 bg-slate-50 border-t border-slate-200">
                      <td className="py-2" colSpan={2}>Total Sous-traitance</td>
                      <td className="py-2 text-center font-mono">{soustraitantTotals.effectif} pers.</td>
                      <td className="py-2 text-right font-mono" colSpan={2}>{soustraitantTotals.count} st.</td>
                    </tr>
                  </tbody>
                </table>
                <button
                  onClick={handleAddSoustraitantRow}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition pt-1"
                >
                  <Plus size={14} /> Ajouter un sous-traitant
                </button>
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
              <div className="flex items-center gap-2">
                <span>CONSOMMATIONS & LIVRAISONS</span>
                {currentWbsCode && (
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold truncate max-w-[200px]" title={`Activité WBS liée : [${currentWbsCode}] ${currentSelectedAct?.description || ''}`}>
                    WBS : {currentWbsCode}
                  </span>
                )}
              </div>
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

            {/* Onglet 1 : Consommations (CHAQUE CHAMP SAISISSABLE & NON OBLIGATOIRE) */}
            {consumptionTab === 'consommations' && (
              <div className="overflow-x-auto pt-2 space-y-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10px]">
                      <th className="py-2">Art.</th>
                      <th className="py-2 text-center">Unité</th>
                      <th className="py-2 text-right">Quantité prévue</th>
                      <th className="py-2 text-right">Quantité consommée</th>
                      <th className="py-2 text-right">Écart</th>
                      <th className="py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {consommationsRows.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-1.5 font-bold text-slate-800 pr-1">
                          <input
                            type="text"
                            placeholder="Désignation matériau..."
                            value={c.article}
                            onChange={e => {
                              const val = e.target.value;
                              setConsommationsRows(prev => prev.map((item, idx) => idx === i ? { ...item, article: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-center font-bold text-slate-500 px-1">
                          <input
                            type="text"
                            placeholder="U"
                            value={c.unit}
                            onChange={e => {
                              const val = e.target.value;
                              setConsommationsRows(prev => prev.map((item, idx) => idx === i ? { ...item, unit: val } : item));
                            }}
                            className="w-12 px-1 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center font-bold text-slate-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-right font-mono px-1">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={c.prevue || ''}
                            onChange={e => {
                              const val = Number(e.target.value || 0);
                              setConsommationsRows(prev => prev.map((item, idx) => {
                                if (idx === i) {
                                  const ecart = item.consommee > 0 ? item.consommee - val : 0;
                                  return { ...item, prevue: val, ecart };
                                }
                                return item;
                              }));
                            }}
                            className="w-20 px-1.5 py-1 bg-slate-50 border border-slate-200 text-right font-mono text-xs rounded-lg focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-right font-mono font-bold text-slate-900 px-1">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={c.consommee || ''}
                            onChange={e => {
                              const val = Number(e.target.value || 0);
                              setConsommationsRows(prev => prev.map((item, idx) => {
                                if (idx === i) {
                                  const ecart = val > 0 ? val - item.prevue : 0;
                                  return { ...item, consommee: val, ecart };
                                }
                                return item;
                              }));
                            }}
                            className="w-24 px-2 py-1 bg-blue-50/60 border border-blue-300 font-mono font-bold text-right text-xs text-blue-950 rounded-lg focus:bg-white focus:border-blue-600 focus:outline-none shadow-2xs"
                          />
                        </td>
                        <td className={`py-1.5 text-right font-mono font-bold ${c.ecart > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {c.ecart > 0 ? `+${formatQty(c.ecart)}` : formatQty(c.ecart)}
                        </td>
                        <td className="py-1.5 text-right pl-1">
                          <button
                            onClick={() => setConsommationsRows(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                            title="Supprimer la ligne"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Onglet 2 : Livraisons Réelles (SAISISSABLE) */}
            {consumptionTab === 'livraisons' && (
              <div className="overflow-x-auto pt-2 space-y-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10px]">
                      <th className="py-2">Réf. Bon de Livraison</th>
                      <th className="py-2">Fournisseur / Article</th>
                      <th className="py-2 text-center">Quantité Livrée</th>
                      <th className="py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {livraisonsRows.map((l, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 font-bold text-blue-700 font-mono pr-1">
                          <input
                            type="text"
                            placeholder="Réf BL..."
                            value={l.ref}
                            onChange={e => {
                              const val = e.target.value;
                              setLivraisonsRows(prev => prev.map((item, i) => i === idx ? { ...item, ref: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 font-bold text-slate-800 pr-1">
                          <input
                            type="text"
                            placeholder="Fournisseur / Article..."
                            value={l.supplier}
                            onChange={e => {
                              const val = e.target.value;
                              setLivraisonsRows(prev => prev.map((item, i) => i === idx ? { ...item, supplier: val } : item));
                            }}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-center font-mono font-bold text-emerald-700 px-1">
                          <input
                            type="text"
                            placeholder="+100 u"
                            value={l.qty}
                            onChange={e => {
                              const val = e.target.value;
                              setLivraisonsRows(prev => prev.map((item, i) => i === idx ? { ...item, qty: val } : item));
                            }}
                            className="w-20 px-2 py-1 bg-emerald-50/60 border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-800 text-center focus:bg-white focus:border-emerald-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-1.5 text-right pl-1">
                          <button
                            onClick={() => setLivraisonsRows(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                            title="Supprimer la livraison"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <button
            onClick={consumptionTab === 'consommations' ? handleAddConsumptionRow : handleAddLivraisonRow}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition pt-2 border-t border-slate-100"
          >
            <Plus size={14} /> {consumptionTab === 'consommations' ? 'Ajouter une ligne de consommation' : 'Réceptionner une livraison'}
          </button>
        </div>

        {/* CARD 2 : PROBLÈMES RENCONTRÉS (CHAQUE CHAMP SAISISSABLE & DYNAMIQUE) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  PROBLÈMES RENCONTRÉS
                </h2>
                {currentWbsCode && (
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold truncate max-w-[180px]" title={`WBS lié : ${currentWbsCode}`}>
                    WBS : {currentWbsCode}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto pt-2 space-y-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 font-extrabold border-b border-slate-200 text-[10.5px]">
                    <th className="py-2">Type de problème / Incident</th>
                    <th className="py-2 text-right">Impact</th>
                    <th className="py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {problems.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1.5 font-bold text-slate-800 pr-2">
                        <input
                          type="text"
                          placeholder="Saisissez la description du problème..."
                          value={p.type}
                          onChange={e => {
                            const val = e.target.value;
                            setProblems(prev => prev.map((item, i) => i === idx ? { ...item, type: val } : item));
                          }}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 text-right pl-1 shrink-0">
                        <select
                          value={p.impact}
                          onChange={e => {
                            const val = e.target.value as any;
                            setProblems(prev => prev.map((item, i) => i === idx ? { ...item, impact: val } : item));
                          }}
                          className={`px-2 py-1 rounded font-bold text-xs focus:outline-none cursor-pointer ${
                            p.impact === 'Moyen'
                              ? 'bg-amber-50 text-amber-800 border border-amber-300'
                              : p.impact === 'Fort' || p.impact === 'Critique'
                              ? 'bg-rose-50 text-rose-800 border border-rose-300'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          <option value="Faible">Faible</option>
                          <option value="Moyen">Moyen</option>
                          <option value="Fort">Fort</option>
                          <option value="Critique">Critique</option>
                        </select>
                      </td>
                      <td className="py-1.5 text-right pl-1">
                        <button
                          onClick={() => setProblems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                          title="Supprimer l'incident"
                        >
                          <Trash2 size={14} />
                        </button>
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
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              PHOTOS DU CHANTIER *
            </h2>
            {currentWbsCode && (
              <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold truncate max-w-[180px]" title={`WBS lié : ${currentWbsCode}`}>
                WBS : {currentWbsCode}
              </span>
            )}
          </div>

          {/* Zone de Glisser-Déposer Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-2xl p-4 text-center cursor-pointer hover:bg-blue-50/60 transition"
          >
            <Upload size={22} className="text-blue-600 mx-auto mb-1" />
            <span className="text-xs font-extrabold text-slate-700 block">
              Glissez-déposez vos photos {currentWbsCode ? `pour [${currentWbsCode}]` : 'du chantier'}
            </span>
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
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              OBSERVATIONS & REMARQUES
            </h2>
            {currentWbsCode && (
              <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold truncate max-w-[180px]" title={`WBS lié : ${currentWbsCode}`}>
                WBS : {currentWbsCode}
              </span>
            )}
          </div>
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
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              DOCUMENTS JOINTS
            </h2>
            {currentWbsCode && (
              <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold truncate max-w-[180px]" title={`WBS lié : ${currentWbsCode}`}>
                WBS : {currentWbsCode}
              </span>
            )}
          </div>
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
          {currentWbsCode && (
            <p className="text-[10px] text-slate-500 font-medium">
              💡 Recommandés : Fiche autocontrôle [{currentWbsCode}], Bons de pesée / livraison, PV d'essais.
            </p>
          )}
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
            className="bg-[#11192e] hover:bg-slate-800 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition"
          >
            <span>🚀 Soumettre pour validation</span>
          </button>
          <button
            onClick={handleDirectValidate}
            className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition"
          >
            <CheckCircle2 size={16} />
            <span>✅ Valider & Comptabiliser</span>
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
                  {(() => {
                    const wbsInfo = resolveReportWbsActivity(viewingReportDetail);
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {wbsInfo.code && (
                          <span className="font-mono text-xs font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                            [{wbsInfo.code}]
                          </span>
                        )}
                        <span className="text-xs font-black text-slate-900">
                          {wbsInfo.name}
                        </span>
                      </div>
                    );
                  })()}
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
                      disabled={isValidating}
                      onClick={async () => {
                        const reason = prompt('Motif / Commentaire pour la demande de correction :') || 'Demande de correction terrain';
                        if (!reason.trim()) return;
                        const targetId = viewingReportDetail.id;
                        const targetCode = viewingReportDetail.code || viewingReportDetail.reportCode;
                        setIsValidating(true);
                        try {
                          if (updateDailyReportStatus) {
                            await updateDailyReportStatus(targetId, 'Brouillon', reason);
                            if (targetCode && targetCode !== targetId) {
                              await updateDailyReportStatus(targetCode, 'Brouillon', reason);
                            }
                          }
                          if (updateValidationTaskStatus) {
                            await updateValidationTaskStatus(targetId, 'RETURNED', reason);
                          }
                          setViewingReportDetail(null);
                          alert(`↩️ Rapport ${targetCode || targetId} renvoyé en Brouillon pour correction.`);
                        } catch (err: any) {
                          alert(`❌ Erreur lors du renvoi : ${err?.message || 'Erreur serveur.'}`);
                        } finally {
                          setIsValidating(false);
                        }
                      }}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 text-amber-900 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>↩️ Demander Correction</span>
                    </button>
                    <button
                      disabled={isValidating}
                      onClick={async () => {
                        const targetId = viewingReportDetail.id;
                        const targetCode = viewingReportDetail.code || viewingReportDetail.reportCode;
                        setIsValidating(true);
                        try {
                          if (updateDailyReportStatus) {
                            await updateDailyReportStatus(targetId, 'Validé', 'Validé depuis la fiche synthétique');
                            if (targetCode && targetCode !== targetId) {
                              await updateDailyReportStatus(targetCode, 'Validé', 'Validé depuis la fiche synthétique');
                            }
                          }
                          if (updateValidationTaskStatus) {
                            await updateValidationTaskStatus(targetId, 'APPROVED', 'Validé depuis la fiche synthétique');
                          }
                          setViewingReportDetail(null);
                          alert(`✅ Rapport ${targetCode || targetId} validé avec succès !\n\n• Statut passé à VALIDÉ\n• Sorties de stock décrémentées\n• Métrés et coûts WBS imputés.`);
                        } catch (err: any) {
                          alert(`❌ Échec de la validation : ${err?.message || 'Erreur de communication serveur.'}`);
                        } finally {
                          setIsValidating(false);
                        }
                      }}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl text-xs transition shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <CheckCircle2 size={16} />
                      <span>{isValidating ? '⏳ Validation en cours...' : '✅ Valider ce Rapport (DP/DT)'}</span>
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
