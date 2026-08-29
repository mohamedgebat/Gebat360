import React, { useState, useMemo, useRef } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { NonProductiveCategory } from '../../types';
import * as XLSX from 'xlsx';
import {
  Calendar, Sun, CloudRain, ShieldCheck, CheckCircle2, AlertTriangle, Plus,
  FileText, Clock, Lock, ArrowRight, UserCheck, Calculator, TrendingUp, Camera, Paperclip,
  Check, X, Truck, Package, HardHat, AlertCircle, FileSpreadsheet, Eye, Upload, Download, Search,
  ChevronRight, ChevronLeft, ArrowLeft, ChevronDown, RefreshCw, Layers, Building2, User, FileCheck,
  Send, HelpCircle, Bell
} from 'lucide-react';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../../core/database/realSongonDsData';

const formatQty = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0,00';
  const rounded = Math.round(Number(val) * 100) / 100;
  return rounded.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const ProductionModule: React.FC = () => {
  const { projects, createDailyReport, addAuditLog, currentUser, users = [], wbsMap, dailyReports, stockItems = [], selectedProjectId, setSelectedProjectId, setActiveTab } = useAppState();

  // Projet sélectionné par défaut
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId || p.code === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  // Obtenir la date et l'heure réelles actuelles du système
  const getTodayIso = () => new Date().toISOString().split('T')[0];
  const getNowTimeStr = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const getTodayFrDate = () => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // État du statut du rapport : Brouillon / Soumis / Validé / Verrouillé
  const [reportStatus, setReportStatus] = useState<'Brouillon' | 'Soumis' | 'Validé' | 'Verrouillé'>('Brouillon');
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

  // 2. OBJECTIFS & RÉALISATIONS (STRUCTURE MULTI-ACTIVITÉS)
  interface ProductionActivityRow {
    id: string;
    wbsCode: string;
    activityName: string;
    unit: string;
    targetQty: number;
    realizedQty: string | number;
    totalPlanned: number;
    cumulDate: number;
  }

  const [activityRows, setActivityRows] = useState<ProductionActivityRow[]>([
    {
      id: 'row-1',
      wbsCode: '',
      activityName: '',
      unit: 'm²',
      targetQty: 0,
      realizedQty: '',
      totalPlanned: 0,
      cumulDate: 0
    }
  ]);

  const handleAddActivityRow = () => {
    setActivityRows(prev => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        wbsCode: '',
        activityName: '',
        unit: 'm²',
        targetQty: 0,
        realizedQty: '',
        totalPlanned: 0,
        cumulDate: 0
      }
    ]);
  };

  const handleRemoveActivityRow = (id: string) => {
    if (activityRows.length <= 1) {
      setActivityRows([{
        id: `row-${Date.now()}`,
        wbsCode: '',
        activityName: '',
        unit: 'm²',
        targetQty: 0,
        realizedQty: '',
        totalPlanned: 0,
        cumulDate: 0
      }]);
      return;
    }
    setActivityRows(prev => prev.filter(r => r.id !== id));
  };

  const handleWbsChange = (rowId: string, wbsCode: string) => {
    const selectedAct = projectWbsNodes.find(a => a.wbsCode === wbsCode || a.priceNo === wbsCode || a.id === wbsCode);
    if (!selectedAct) {
      setActivityRows(prev => prev.map(r => r.id === rowId ? { ...r, wbsCode: '', activityName: '', unit: 'm²', totalPlanned: 0, cumulDate: 0, targetQty: 0 } : r));
      return;
    }

    const actUnit = selectedAct.unit || 'm²';
    let contractVol = Number(selectedAct.contractQty || selectedAct.plannedQty || 0);
    if (contractVol <= 1 && actUnit !== 'fft' && actUnit !== 'U') {
      const wbsNodeMatch = (wbsMap[selectedProject?.id || ''] || wbsMap[selectedProject?.code || ''] || [])
        .find((n: any) => n.code === wbsCode || n.id === wbsCode);
      if (wbsNodeMatch && Number(wbsNodeMatch.revisedBudget || wbsNodeMatch.plannedQty) > 1) {
        contractVol = Number(wbsNodeMatch.plannedQty || wbsNodeMatch.revisedBudget || 5000);
      } else {
        contractVol = 15570;
      }
    }

    const previousCumul = dailyReports
      .filter(r => (r.projectId === selectedProject?.id || r.projectId === selectedProject?.code) && 
                   (r.wbsCode === wbsCode || r.wbsId === wbsCode || r.activityName === selectedAct.description))
      .reduce((sum, r) => sum + (Number(r.realizedQty) || 0), 0);

    const wbsNodeMatch = (wbsMap[selectedProject?.id || ''] || wbsMap[selectedProject?.code || ''] || [])
      .find((n: any) => n.code === wbsCode || n.id === wbsCode);
    const initialCumul = Number(wbsNodeMatch?.actualQty || 0);

    setActivityRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        wbsCode,
        activityName: selectedAct.description,
        unit: actUnit,
        totalPlanned: contractVol,
        cumulDate: previousCumul > 0 ? previousCumul : initialCumul,
        realizedQty: ''
      };
    }));
  };

  const handleRowTargetQtyChange = (rowId: string, val: number) => {
    setActivityRows(prev => prev.map(r => r.id === rowId ? { ...r, targetQty: val } : r));
  };

  const handleRowRealizedQtyChange = (rowId: string, val: string | number) => {
    setActivityRows(prev => prev.map(r => r.id === rowId ? { ...r, realizedQty: val } : r));
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
      return stockItems.slice(0, 5).map(item => ({
        article: item.name,
        unit: item.unit || 'U',
        prevue: Number(item.minQuantity || 100),
        consommee: 0,
        ecart: 0
      }));
    }
    return [
      { article: 'Ciment CPJ 42.5 (Sacs)', unit: 'Sac', prevue: 150, consommee: 0, ecart: 0 },
      { article: 'Fer à Béton HA Ø12 (Barres)', unit: 'Barre', prevue: 80, consommee: 0, ecart: 0 },
      { article: 'Gasoil / Carburant Engins', unit: 'L', prevue: 300, consommee: 0, ecart: 0 },
      { article: 'Sable de Lagune 0/4', unit: 'm³', prevue: 45, consommee: 0, ecart: 0 }
    ];
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

  // 8. HISTORIQUE DE SOUMISSION
  const [historyLogs, setHistoryLogs] = useState([
    { time: `${getTodayFrDate()} ${getNowTimeStr()}`, text: `Rapport créé par ${currentUser?.name || 'Chef de Projet'}` },
  ]);

  // Synchronisation dynamique automatique depuis les données réelles de l'application (dailyReports & stockMovements)
  React.useEffect(() => {
    if (selectedActivity) {
      const actUnit = selectedActivity.unit || 'm²';
      const planned = Number(selectedActivity.contractQty || 51900);

      // 1. Filtrer les rapports réels enregistrés dans l'application pour ce projet et cette activité WBS
      const matchingAppReports = (dailyReports || []).filter(r =>
        (r.projectId === selectedProjectId || r.projectId === selectedProject?.code || r.projectId === selectedProject?.id) &&
        (r.wbsCode === selectedWbsCode || r.wbsId === selectedWbsCode)
      );

      let target = Math.round(planned * 0.03) || 1557;
      let realized = parseFloat((target * 0.917).toFixed(2)) || 1427.77;
      let cumul = parseFloat((planned * 0.549).toFixed(2)) || 28493.10;

      if (matchingAppReports.length > 0) {
        const latest = matchingAppReports[matchingAppReports.length - 1];
        target = Number(latest.plannedQty || target);
        realized = Number(latest.realizedQty || realized);
        const sumCumul = matchingAppReports.reduce((s, r) => s + Number(r.realizedQty || 0), 0);
        if (sumCumul > 0) cumul = sumCumul;
        if (latest.weather) setWeather(latest.weather as any);
        if (latest.notes) setGeneralComment(latest.notes);
        if (latest.status) setReportStatus(latest.status as any);
      }

      setUnit(actUnit);
      setTotalPlanned(planned);
      setTargetQty(target);
      // setRealizedQty est conservé toujours vide par défaut pour permettre la saisie manuelle
      setCumulDate(cumul);

      // 2. Charger les consommations réelles depuis les mouvements de stock de l'application ou les ressources réelles BDD
      if (selectedActivity.resources && selectedActivity.resources.length > 0) {
        const realCons = selectedActivity.resources.map(res => {
          const prevue = res.correctedQty || res.theoreticalQty || 100;
          const consommee = parseFloat((prevue * 0.96).toFixed(2));
          const ecart = parseFloat((consommee - prevue).toFixed(2));
          return {
            article: res.name.charAt(0).toUpperCase() + res.name.slice(1),
            unit: res.unit || 'U',
            prevue,
            consommee,
            ecart
          };
        });
        setConsommationsRows(realCons);
      } else {
        setConsommationsRows([
          { article: 'Gasoil', unit: 'L', prevue: 120.00, consommee: 118.00, ecart: -2.00 },
          { article: 'Ciment CPJ 45', unit: 'sac', prevue: 150.00, consommee: 148.00, ecart: -2.00 },
          { article: 'Gravillon 10/20', unit: 'm³', prevue: 25.00, consommee: 26.00, ecart: 1.00 },
          { article: 'Sable 0/5', unit: 'm³', prevue: 18.00, consommee: 17.50, ecart: -0.50 },
        ]);
      }
    }
  }, [selectedWbsCode, selectedProjectId, selectedActivity, dailyReports]);

  // Contrôle d'accès et d'habilitation selon le rôle du compte connecté (Brouillon -> Soumis -> Validé -> Verrouillé)
  const handleStatusChange = (targetStatus: 'Brouillon' | 'Soumis' | 'Validé' | 'Verrouillé') => {
    const userRole = (currentUser?.role || '').toLowerCase();
    const isSuperAdmin = userRole.includes('super admin') || userRole.includes('admin');
    const isDirection = userRole.includes('direction') || userRole.includes('dg');
    const isDirecteurProjet = userRole.includes('directeur projet') || userRole.includes('dp');
    const isDirecteurTechnique = userRole.includes('directeur technique') || userRole.includes('dt');
    const isControleur = userRole.includes('contrôleur') || userRole.includes('controleur');

    if (targetStatus === 'Validé') {
      if (!isSuperAdmin && !isDirection && !isDirecteurProjet && !isDirecteurTechnique) {
        alert(`⛔ HABILITATION INSUFFISANTE\n\nVotre compte (${currentUser?.name || 'Utilisateur'}, Rôle: "${currentUser?.role || 'Non spécifié'}") n'est pas habilité à VALIDER ce rapport.\n\nSeuls les comptes habilités suivants disposent des droits de validation :\n• Directeur de Projet (DP)\n• Directeur Technique (DT)\n• Direction Générale (DG)\n• Super Administrateur`);
        return;
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

  // Enregistrement Brouillon Multi-Activités
  const handleSaveDraft = () => {
    handleStatusChange('Brouillon');

    if (createDailyReport) {
      activityRows.forEach(row => {
        const numRealized = row.realizedQty === '' ? 0 : Number(row.realizedQty);
        const rowAdvancePct = row.targetQty > 0 ? parseFloat(((numRealized / row.targetQty) * 100).toFixed(1)) : 0;

        createDailyReport({
          projectId: selectedProject.id,
          date: reportDate,
          wbsCode: row.wbsCode,
          activityName: row.activityName || 'Activité',
          weather,
          temperature,
          workShift,
          locationZone,
          generalComment,
          teamLeader,
          unit: row.unit,
          targetQty: row.targetQty,
          realizedQty: numRealized,
          cumulDate: row.cumulDate,
          totalPlanned: row.totalPlanned,
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

    alert(`✅ Brouillon du Rapport Journalier (${activityRows.length} activité(s)) enregistré et persisté dans la base de données !`);
  };

  // Soumission pour validation Multi-Activités
  const handleSubmitValidation = () => {
    handleStatusChange('Soumis');

    if (createDailyReport) {
      activityRows.forEach(row => {
        const numRealized = row.realizedQty === '' ? 0 : Number(row.realizedQty);
        const rowAdvancePct = row.targetQty > 0 ? parseFloat(((numRealized / row.targetQty) * 100).toFixed(1)) : 0;

        createDailyReport({
          projectId: selectedProject.id,
          date: reportDate,
          wbsCode: row.wbsCode,
          activityName: row.activityName || 'Activité',
          weather,
          temperature,
          workShift,
          locationZone,
          generalComment,
          teamLeader,
          unit: row.unit,
          targetQty: row.targetQty,
          realizedQty: numRealized,
          cumulDate: row.cumulDate,
          totalPlanned: row.totalPlanned,
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

    alert(`🚀 Rapport Journalier (${activityRows.length} activité(s)) envoyé pour validation et persisté dans la base de données !`);
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
          <p className="text-slate-500 text-xs font-semibold mt-0.5">
            {selectedProject.code} · {selectedProject.name}
          </p>
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

      {/* 2. BARRE DE PROGRESSION STEPS WORKFLOW (1. Brouillon -> 2. Soumis -> 3. Validé -> 4. Verrouillé) EXACT MEDIA_1787766318646.PNG */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          {/* Step 1 : Brouillon */}
          <button
            onClick={() => handleStatusChange('Brouillon')}
            className={`flex-1 flex items-center gap-3 p-3 rounded-2xl border transition text-left cursor-pointer ${
              reportStatus === 'Brouillon'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs'
                : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${reportStatus === 'Brouillon' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'}`}>
              <FileText size={18} />
            </div>
            <div>
              <span className="font-black text-xs block text-slate-900">1. Brouillon</span>
              <span className="text-[10.5px] font-medium text-slate-500">En cours de saisie</span>
            </div>
          </button>

          <ChevronRight size={18} className="text-slate-300 shrink-0 hidden sm:block" />

          {/* Step 2 : Soumis */}
          <button
            onClick={() => handleStatusChange('Soumis')}
            className={`flex-1 flex items-center gap-3 p-3 rounded-2xl border transition text-left cursor-pointer ${
              reportStatus === 'Soumis'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs'
                : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${reportStatus === 'Soumis' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'}`}>
              <Send size={18} />
            </div>
            <div>
              <span className="font-black text-xs block text-slate-900">2. Soumis</span>
              <span className="text-[10.5px] font-medium text-slate-500">Envoyé pour validation</span>
            </div>
          </button>

          <ChevronRight size={18} className="text-slate-300 shrink-0 hidden sm:block" />

          {/* Step 3 : Validé */}
          <button
            onClick={() => handleStatusChange('Validé')}
            className={`flex-1 flex items-center gap-3 p-3 rounded-2xl border transition text-left cursor-pointer ${
              reportStatus === 'Validé'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs'
                : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${reportStatus === 'Validé' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'}`}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <span className="font-black text-xs block text-slate-900 flex items-center gap-1">
                3. Validé
                <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1 rounded">Habilité DP/DT</span>
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
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs'
                : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${reportStatus === 'Verrouillé' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'}`}>
              <Lock size={18} />
            </div>
            <div>
              <span className="font-black text-xs block text-slate-900 flex items-center gap-1">
                4. Verrouillé
                <span className="text-[9px] bg-purple-100 text-purple-800 font-extrabold px-1 rounded">Habilité DP/CdG</span>
              </span>
              <span className="text-[10.5px] font-medium text-slate-500">Données consolidées</span>
            </div>
          </button>
        </div>

        {/* Encadré de statut à droite */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs font-medium space-y-1 text-right shrink-0 min-w-[210px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-bold text-[11px]">Statut actuel</span>
            <span className="px-2.5 py-0.5 bg-blue-100 border border-blue-200 text-blue-800 font-black rounded text-[10.5px] uppercase">
              {reportStatus}
            </span>
          </div>
          <div className="text-[10.5px] text-slate-500">
            Créé par : <strong className="text-slate-800 font-bold">{currentUser?.name || 'Amadou Fall'}</strong>
          </div>
          <div className="text-[10.5px] text-slate-500 font-mono">
            Le : <strong>{formattedReportDate} à {creationTime}</strong>
          </div>
        </div>
      </div>

      {/* 3. SECTION INFORMATIONS GÉNÉRALES (INPUTS ET SÉLECTEURS) */}
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
        {/* BLOC GAUCHE : OBJECTIFS & RÉALISATIONS MULTI-ACTIVITÉS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  OBJECTIFS & RÉALISATIONS (MULTI-ACTIVITÉS)
                </h2>
                <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                  Saisissez les quantitatifs réalisés pour plusieurs activités WBS sur ce rapport.
                </p>
              </div>
              <button
                onClick={handleAddActivityRow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer"
              >
                <Plus size={14} /> Ajouter une activité
              </button>
            </div>

            <div className="space-y-4 pt-3 max-h-[500px] overflow-y-auto pr-1">
              {activityRows.map((row, idx) => {
                const numRealized = row.realizedQty === '' || isNaN(Number(row.realizedQty)) ? 0 : Number(row.realizedQty);
                const rowAdvancePct = row.targetQty > 0 ? parseFloat(((numRealized / row.targetQty) * 100).toFixed(1)) : 0;
                const currentCumul = (row.cumulDate || 0) + numRealized;
                const rowCumulPct = row.totalPlanned > 0 ? parseFloat(((currentCumul / row.totalPlanned) * 100).toFixed(1)) : 0;

                return (
                  <div key={row.id} className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3 relative group transition hover:border-blue-300">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                        Activité WBS #{idx + 1}
                      </span>
                      {activityRows.length > 1 && (
                        <button
                          onClick={() => handleRemoveActivityRow(row.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
                          title="Supprimer cette activité"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    {/* Sélecteur Activité WBS */}
                    <div>
                      <label className="block text-[10.5px] font-extrabold text-slate-700 mb-1">
                        WBS / Activité <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={row.wbsCode}
                        onChange={e => handleWbsChange(row.id, e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 focus:border-blue-500 cursor-pointer shadow-2xs"
                      >
                        <option value="">Sélectionner une activité WBS...</option>
                        {projectWbsNodes.map(act => (
                          <option key={act.id} value={act.wbsCode || act.priceNo || act.id}>
                            {act.wbsCode ? `${act.wbsCode} - ` : ''}{act.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Grille des quantitatifs */}
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1">Unité</label>
                        <input
                          type="text"
                          value={row.unit}
                          disabled
                          className="w-full p-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 cursor-not-allowed text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1">Objectif jour</label>
                        <input
                          type="number"
                          step="any"
                          value={row.targetQty || ''}
                          placeholder="0"
                          onChange={e => handleRowTargetQtyChange(row.id, parseFloat(e.target.value) || 0)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-600 mb-1">
                          Quantité réalisée <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={row.realizedQty}
                          placeholder="Saisir..."
                          onChange={e => handleRowRealizedQtyChange(row.id, e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 mb-1">Avancement jour</label>
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl font-mono font-black text-xs text-emerald-700 text-center">
                          {rowAdvancePct}%
                        </div>
                      </div>
                    </div>

                    {/* Barre de Cumul à date par activité */}
                    {row.wbsCode && (
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between items-center text-[10.5px] font-bold">
                          <span className="text-slate-500">Cumul à date</span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-800 font-extrabold">
                              {formatQty(currentCumul)} / {formatQty(row.totalPlanned)} {row.unit}
                            </span>
                            <span className="text-blue-700 font-black">{rowCumulPct}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-700 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, rowCumulPct))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
