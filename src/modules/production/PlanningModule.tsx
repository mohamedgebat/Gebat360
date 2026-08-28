import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAppState } from '../../core/database/AppStateContext';
import { REAL_BINGERVILLE_PLANNING_TASKS } from '../../core/database/realBingervillePlanningData';
import { REAL_SONGON_PLANNING_TASKS } from '../../core/database/realSongonPlanningData';
import {
  Calendar,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Layers,
  BarChart3,
  Download,
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle,
  Info
} from 'lucide-react';

interface PlanningModuleProps {
  onBackToProject?: () => void;
}

export interface PlanningTask {
  id: string;
  wbsCode: string;
  name: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  progress: number;
  isCategory: boolean;
  status: 'Terminé' | 'En cours' | 'A venir';
}

export const PlanningModule: React.FC<PlanningModuleProps> = ({ onBackToProject }) => {
  const { projects, wbsMap, updateProjectWBS } = useAppState();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryOnly, setFilterCategoryOnly] = useState(false);

  // État de la modale d'importation de planning
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [importedFileName, setImportedFileName] = useState('');
  const [parsedPlanningTasks, setParsedPlanningTasks] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (rawRows.length === 0) return;

        let headerIdx = 0;
        for (let i = 0; i < Math.min(10, rawRows.length); i++) {
          const nonEmp = rawRows[i].filter(c => String(c).trim() !== '');
          if (nonEmp.length >= 2) {
            headerIdx = i;
            break;
          }
        }

        const headers = rawRows[headerIdx].map(h => String(h).trim().toUpperCase());
        
        let codeCol = headers.findIndex(h => h.includes('CODE') || h.includes('N°') || h.includes('REF') || h.includes('PRIX'));
        let nameCol = headers.findIndex(h => h.includes('TACHE') || h.includes('TÂCHE') || h.includes('DESIGNATION') || h.includes('DÉSIGNATION') || h.includes('LIBELLE') || h.includes('NOM') || h.includes('ACTIVITÉ'));
        let startCol = headers.findIndex(h => h.includes('DEBUT') || h.includes('DÉBUT') || h.includes('START'));
        let endCol = headers.findIndex(h => h.includes('FIN') || h.includes('END') || h.includes('LIVRAISON'));
        let durCol = headers.findIndex(h => h.includes('DUREE') || h.includes('DURÉE') || h.includes('JOURS'));
        let progCol = headers.findIndex(h => h.includes('AVANCEMENT') || h.includes('PROGRESS') || h.includes('%'));

        if (nameCol === -1) nameCol = 1;
        if (codeCol === -1) codeCol = 0;

        const tasksParsed: any[] = [];
        for (let i = headerIdx + 1; i < rawRows.length; i++) {
          const r = rawRows[i];
          if (!r || r.every(c => String(c).trim() === '')) continue;

          const code = String(r[codeCol] !== undefined ? r[codeCol] : `04.01.${String(tasksParsed.length + 1).padStart(3, '0')}`).trim();
          const name = String(r[nameCol] !== undefined ? r[nameCol] : `Tâche ${tasksParsed.length + 1}`).trim();
          const startDate = String(r[startCol] !== undefined ? r[startCol] : '2026-02-01').trim() || '2026-02-01';
          const endDate = String(r[endCol] !== undefined ? r[endCol] : '2027-08-01').trim() || '2027-08-01';
          const duration = parseInt(String(r[durCol] || '30'), 10) || 30;
          const progress = parseFloat(String(r[progCol] || '0')) || 0;

          if (name && !name.toUpperCase().includes('DÉSIGNATION') && !name.toUpperCase().includes('N° PRIX')) {
            tasksParsed.push({
              id: `plan-imp-${selectedProject?.id || 'p'}-${i}`,
              code,
              name,
              startDate,
              endDate,
              durationDays: duration,
              progress
            });
          }
        }

        setParsedPlanningTasks(tasksParsed);
        setImportStep(2);
      } catch (err) {
        console.error('Erreur de lecture du planning:', err);
        alert('Erreur lors de la lecture du fichier de planning.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => {
    if (!selectedProject || parsedPlanningTasks.length === 0) return;

    const newWbsNodes = parsedPlanningTasks.map((t, idx) => ({
      id: t.id,
      projectId: selectedProject.id,
      code: t.code || `04.01.${String(idx + 1).padStart(3, '0')}`,
      name: t.name,
      description: t.name,
      unit: 'm³',
      plannedQty: 100,
      contractQty: 100,
      startDate: t.startDate,
      endDate: t.endDate,
      durationDays: t.durationDays,
      progress: t.progress,
      contractUnitPrice: 50000,
      contractAmount: 5000000,
      initialBudget: 4000000,
      revisedBudget: 4000000,
      importedDsAmount: 4000000,
      committed: 0,
      actualCost: 0,
      forecast: 4000000,
      eac: 4000000,
      nature: 'MAT' as const,
      manager: selectedProject.manager || 'Chef de Chantier'
    }));

    updateProjectWBS(selectedProject.id, newWbsNodes);

    try {
      localStorage.setItem(`gebat_wbs_${selectedProject.id}`, JSON.stringify(newWbsNodes));
      localStorage.setItem(`gebat_debourse_sec_${selectedProject.id}`, JSON.stringify(newWbsNodes));
    } catch (e) {}

    setShowImportModal(false);
    setImportStep(1);
    setImportedFileName('');
    setParsedPlanningTasks([]);
  };

  const tasks = useMemo<PlanningTask[]>(() => {
    if (!selectedProject) return [];
    const isBingerville = selectedProject.id?.includes('BEN') || selectedProject.code?.includes('BEN');
    const isSongon = selectedProject.id?.includes('SON') || selectedProject.code?.includes('SON');

    if (isBingerville) {
      return REAL_BINGERVILLE_PLANNING_TASKS as PlanningTask[];
    }
    if (isSongon) {
      return REAL_SONGON_PLANNING_TASKS as PlanningTask[];
    }

    const wbsNodes = wbsMap[selectedProject.id] || wbsMap[selectedProject.code] || [];
    
    const list: PlanningTask[] = [];
    const flatten = (nodes: any[]) => {
      nodes.forEach((n, idx) => {
        const isCat = Boolean(n.children && n.children.length > 0);
        list.push({
          id: n.id || `task-${idx}`,
          wbsCode: n.code || `0${idx + 1}`,
          name: n.name || n.description,
          startDate: n.startDate || selectedProject.startDate || '2026-02-01',
          endDate: n.endDate || selectedProject.endDate || '2027-08-01',
          durationDays: n.durationDays || 30,
          progress: n.progress || 0,
          isCategory: isCat,
          status: (n.progress >= 100 ? 'Terminé' : (n.progress > 0 ? 'En cours' : 'A venir')) as any,
        });
        if (n.children && n.children.length > 0) flatten(n.children);
      });
    };
    flatten(wbsNodes);
    return list;
  }, [wbsMap, selectedProject]);

  if (projects.length === 0 || !selectedProject) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4 max-w-xl mx-auto my-12 text-xs">
        <Calendar size={56} className="text-slate-300 mx-auto" />
        <h2 className="text-xl font-extrabold text-slate-900">Planning Gantt Operational</h2>
        <p className="text-slate-500">
          Aucun projet n'est enregistré dans la base de données. Créez votre premier projet pour piloter le planning et l'avancement.
        </p>
      </div>
    );
  }

  // Filtrage des tâches
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategoryOnly ? t.isCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Calculs statistiques du planning
  const totalTasksCount = tasks.length;
  const categoriesCount = tasks.filter(t => t.isCategory).length;
  const subTasksCount = totalTasksCount - categoriesCount;

  // Dates de début et fin globales
  const validStartDates = tasks.map(t => t.startDate).filter(Boolean).sort();
  const validEndDates = tasks.map(t => t.endDate).filter(Boolean).sort();
  const globalStartDate = validStartDates[0] || '2026-06-01';
  const globalEndDate = validEndDates[validEndDates.length - 1] || '2027-09-30';

  // Formatage propre des dates françaises (ex: 2026-06-01 -> Juin 2026)
  const formatDateFr = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m) return dateStr;
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const monthIdx = parseInt(m, 10) - 1;
    return `${d ? d + ' ' : ''}${months[monthIdx] || m} ${y}`;
  };

  return (
    <div className="space-y-5 text-slate-800 font-sans w-full pb-12">
      
      {/* 1. EN-TÊTE DE LA PAGE PLANNING */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 px-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">PLANNING ACTUALISÉ DES TRAVAUX</h1>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">Données Réelles Excel</span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Suivi des délais d'exécution et calendrier prévisionnel des stations STBV.
          </p>
        </div>

        {/* SÉLECTEUR DE PROJET / CHANTIER */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800">
            <Building2 size={16} className="text-blue-900" />
            <span className="text-slate-400 font-bold">Projet :</span>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="bg-transparent font-black text-slate-900 focus:outline-none cursor-pointer uppercase max-w-xs truncate"
            >
              {projects.length > 0 ? (
                projects.map(p => (
                  <option key={p.id} value={p.id}>
                    📁 {p.name} ({p.code})
                  </option>
                ))
              ) : (
                <option value="">Aucun projet disponible</option>
              )}
            </select>
          </div>

          <button 
            onClick={() => setShowImportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Upload size={14} />
            <span>Importer Planning</span>
          </button>

          <button 
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Download size={14} />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* 2. CARTES SYNTHÈSE DU PLANNING */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* CARTE 1: NOMBRE TOTAL DE TÂCHES */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">TOTAL TÂCHES ET OUVRAGES</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{totalTasksCount}</span>
            <span className="text-[10px] text-slate-500 font-bold block mt-1">
              {categoriesCount} Ouvrages principaux | {subTasksCount} Sous-tâches
            </span>
          </div>
          <div className="w-11 h-11 bg-blue-900 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-900/20 shrink-0">
            <Layers size={20} />
          </div>
        </div>

        {/* CARTE 2: DATE DE DÉBUT DE CHANTIER */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">DATE DE DÉBUT CHANTIER</span>
            <span className="text-sm font-black text-slate-900 mt-1 block font-mono">{formatDateFr(globalStartDate)}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">
              Ordre de service démarré
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <Calendar size={20} />
          </div>
        </div>

        {/* CARTE 3: FIN PRÉVISIONNELLE ET LIVRAISON */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">FIN DE CHANTIER RÉCEPTION</span>
            <span className="text-sm font-black text-slate-900 mt-1 block font-mono">{formatDateFr(globalEndDate)}</span>
            <span className="text-[10px] text-blue-600 font-bold block mt-1">
              Réception provisoire programmée
            </span>
          </div>
          <div className="w-11 h-11 bg-purple-700 text-white rounded-2xl flex items-center justify-center shadow-md shadow-purple-700/20 shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* CARTE 4: UNITÉ D'EXÉCUTION & AVANCEMENT MOYEN */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">AVANCEMENT PHYSIQUE</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
              {selectedProject ? `${Number(selectedProject.progress || 0).toFixed(1)}%` : '0.0%'}
            </span>
            <span className="text-[10px] text-slate-500 font-bold block mt-1">
              Planning rattaché au découpage WBS
            </span>
          </div>
          <div className="w-11 h-11 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Clock size={20} />
          </div>
        </div>

      </div>

      {/* 3. BARRE DE FILTRES ET DE RECHERCHE */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher une tâche, un ouvrage, un lot..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-900"
          />
          <Filter size={14} className="absolute left-3 top-2.5 text-slate-400" />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={filterCategoryOnly}
              onChange={e => setFilterCategoryOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-900 focus:ring-blue-900 h-4 w-4"
            />
            <span>Afficher uniquement les ouvrages principaux</span>
          </label>
        </div>
      </div>

      {/* 3.5. LÉGENDE DU PLANNING GANTT */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-blue-400 shrink-0" />
          <span className="font-black uppercase tracking-wide text-[11px] text-blue-300">LÉGENDE ET CODES COULEURS DU PLANNING :</span>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-[11px]">
          {/* Ouvrage Principal */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="w-3.5 h-3.5 bg-blue-900 border border-blue-400 rounded-xs shadow-xs inline-block"></span>
            <span className="text-slate-200 font-bold">Ouvrage Principal / Catégorie</span>
          </div>

          {/* Tâche En cours */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="w-3.5 h-3.5 bg-blue-500 rounded-xs inline-block"></span>
            <span className="text-slate-200 font-bold">Tâche En cours</span>
          </div>

          {/* Tâche Terminée */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="w-3.5 h-3.5 bg-emerald-500 rounded-xs inline-block"></span>
            <span className="text-slate-200 font-bold">Tâche Terminée (100%)</span>
          </div>

          {/* Tâche À venir */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="w-3.5 h-3.5 bg-slate-600 rounded-xs inline-block"></span>
            <span className="text-slate-200 font-bold">Tâche À venir</span>
          </div>

          {/* Jalons & Réception */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="w-3 h-3 bg-purple-400 rotate-45 inline-block"></span>
            <span className="text-slate-200 font-bold">Jalon / Livrable Clé</span>
          </div>

          {/* Avancement Réel */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <div className="w-10 h-2.5 bg-slate-700 rounded-full overflow-hidden flex">
              <div className="w-2/3 h-full bg-emerald-400"></div>
            </div>
            <span className="text-slate-200 font-bold">Progression Réelle %</span>
          </div>
        </div>
      </div>

      {/* 4. TABLEAU DU PLANNING GANTT DES TRAVAUX (DONNÉES EXCEL RÉELLES) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
            PLANNING D'EXÉCUTION — {selectedProject ? selectedProject.name : 'PROJET'} ({filteredTasks.length} TÂCHES)
          </h2>
          <span className="text-[11px] font-bold text-slate-500">
            Fichier d'origine: <code className="bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-900">planning actualisé des travaux bingerville et songon.xlsx</code>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-500 font-extrabold text-[10px] uppercase border-b border-slate-200">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4 min-w-[280px]">Désignation des Tâches</th>
                <th className="py-3 px-4 w-28">Début</th>
                <th className="py-3 px-4 w-28">Fin</th>
                <th className="py-3 px-4 w-24 text-center">Durée</th>
                <th className="py-3 px-4 min-w-[360px]">
                  <div className="flex justify-between text-[9px] font-black text-slate-400 font-mono">
                    <span>{formatDateFr(globalStartDate)}</span>
                    <span>ÉCHELLE TEMPORELLE DU CHANTIER</span>
                    <span>{formatDateFr(globalEndDate)}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTasks.map((task: any, idx) => {
                const isCat = task.isCategory;

                const gStartMs = new Date(globalStartDate).getTime();
                const gEndMs = new Date(globalEndDate).getTime();
                const totalTimelineMs = Math.max(1, gEndMs - gStartMs);

                let sMs = new Date(task.startDate).getTime();
                let eMs = new Date(task.endDate).getTime();
                if (isNaN(sMs)) sMs = gStartMs;
                if (isNaN(eMs)) eMs = gEndMs;

                const leftPercent = Math.max(0, Math.min(92, ((sMs - gStartMs) / totalTimelineMs) * 100));
                const rawWidth = ((eMs - sMs) / totalTimelineMs) * 100;
                const widthPercent = Math.max(5, Math.min(100 - leftPercent, rawWidth));

                const durationDisplay = task.durationMonths
                  ? `${task.durationMonths} Mois`
                  : (task.durationWeeks
                    ? `${task.durationWeeks} Sem.`
                    : (task.durationDays
                      ? (task.durationDays >= 30 ? `${Math.round(task.durationDays / 30)} Mois` : `${task.durationDays} Jours`)
                      : '1 Mois'));

                return (
                  <tr
                    key={task.id}
                    className={`hover:bg-slate-50/80 transition ${
                      isCat ? 'bg-slate-50/50 font-bold' : 'font-normal'
                    }`}
                  >
                    {/* # INDEX */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    {/* NOM DE LA TÂCHE / OUVRAGE */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {isCat ? (
                          <ChevronRight size={14} className="text-blue-900 shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300 ml-4 shrink-0"></span>
                        )}
                        <span className={`leading-tight ${isCat ? 'font-black text-slate-900 uppercase' : 'text-slate-700 font-medium'}`}>
                          {task.name}
                        </span>
                      </div>
                    </td>

                    {/* DÉBUT */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap">
                      {formatDateFr(task.startDate)}
                    </td>

                    {/* FIN */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap">
                      {formatDateFr(task.endDate)}
                    </td>

                    {/* DURÉE */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-mono font-extrabold text-[10px] whitespace-nowrap ${
                        isCat ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {durationDisplay}
                      </span>
                    </td>

                    {/* REPRÉSENTATION CHRONOLOGIQUE GANTT */}
                    <td className="py-3 px-4">
                      <div className="w-full bg-slate-100/80 rounded-full h-4 relative overflow-hidden flex items-center p-0.5 border border-slate-200">
                        <div
                          className={`h-3 rounded-full transition-all flex items-center px-2 text-[9px] font-bold text-white shadow-xs ${
                            isCat ? 'bg-blue-900' : 'bg-emerald-600'
                          }`}
                          style={{
                            marginLeft: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                          title={`${task.name} (${formatDateFr(task.startDate)} → ${formatDateFr(task.endDate)})`}
                        >
                          <span className="truncate">{task.name}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    Aucune tâche trouvée pour la recherche "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER AVEC PRÉCISION DE LA SOURCE DES DONNÉES */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-blue-900" />
          <span>Fichier source vérifié : <strong>Données/planning actualisé des travaux bingerville et songon.xlsx</strong></span>
        </div>
        <span className="font-mono text-[10px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-600">
          Mis à jour le {new Date().toLocaleDateString('fr-FR')}
        </span>
      </div>

      {/* MODALE D'IMPORTATION DE PLANNING EXCEL / CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet size={16} />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  Importer un Fichier de Planning Excel / CSV
                </h3>
              </div>
              <button 
                onClick={() => { setShowImportModal(false); setImportStep(1); setImportedFileName(''); setParsedPlanningTasks([]); }} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {importStep === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">
                  Sélectionnez votre fichier de planning (export Excel MS Project, Primavera ou tableur .xlsx, .csv) pour <strong>{selectedProject.name}</strong>.
                </p>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-2xl p-8 text-center cursor-pointer transition space-y-2"
                >
                  <Upload size={36} className="mx-auto text-emerald-600" />
                  <span className="font-extrabold text-slate-900 block text-xs">
                    {importedFileName ? importedFileName : 'Cliquez ici pour Parcourir et Charger votre Fichier Excel (.xlsx, .csv)'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Formats acceptés : .xlsx, .xls, .csv (Colonnes : Code, Tâche, Début, Fin, Durée, Avancement)
                  </span>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                </div>
              </div>
            )}

            {importStep === 2 && (
              <div className="space-y-4">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <strong className="text-slate-900 text-xs font-bold block">{importedFileName}</strong>
                      <span className="text-[10px] text-emerald-800 font-mono font-bold">
                        {parsedPlanningTasks.length} Tâches de planning extraites avec succès
                      </span>
                    </div>
                  </div>
                  <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-black">Prêt</span>
                </div>

                <div className="max-h-[200px] overflow-y-auto border border-slate-200 rounded-xl text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 sticky top-0 text-[10px] uppercase font-black text-slate-600">
                      <tr>
                        <th className="p-2">Code</th>
                        <th className="p-2">Intitulé Tâche</th>
                        <th className="p-2">Début</th>
                        <th className="p-2">Fin</th>
                        <th className="p-2 text-right">Durée</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {parsedPlanningTasks.slice(0, 8).map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold text-slate-700">{t.code}</td>
                          <td className="p-2 font-bold text-slate-900">{t.name}</td>
                          <td className="p-2 font-mono text-slate-600">{t.startDate}</td>
                          <td className="p-2 font-mono text-slate-600">{t.endDate}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">{t.durationDays}j</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button 
                    onClick={() => { setImportStep(1); setImportedFileName(''); setParsedPlanningTasks([]); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Changer de fichier
                  </button>
                  <button 
                    onClick={handleConfirmImport}
                    className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> Confirmer l'intégration dans {selectedProject.code}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
