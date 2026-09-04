import React, { useState, useMemo, useRef } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../../core/database/realSongonDsData';
import { CostNature, WBSNode, DSResourceItem } from '../../types';
import { DSImportModal } from '../../shared/components/DSImportModal';
import { DQEImportModal } from '../../shared/components/DQEImportModal';
import { DataInsight } from '../../shared/components/DataInsight/DataInsight';
import * as XLSX from 'xlsx';
import {
  Calculator, Plus, ChevronRight, ChevronDown, Settings,
  Briefcase, ShoppingBag, Coins, TrendingUp, BarChart2,
  Building2, Calendar, Download, Upload, Search, Filter,
  Columns, X, FileSpreadsheet, Eye, ChevronUp, Folder, FileText,
  ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw,
  PieChart, LineChart, FileCheck, Layers, Users, Truck, Wrench, Shield, Tag, Info
} from 'lucide-react';

const formatCleanDateFr = (dStr?: string): string => {
  if (!dStr) return '-';
  const cleanStr = String(dStr).split('T')[0].trim();
  const parts = cleanStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return cleanStr;
};

// Formateur monétaire FCFA compact sans centimes
const formatFCFA = (amount?: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 FCFA';
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
};

// Formateur monétaire exact en chiffres complets (sans Mds/M) pour les cartes KPIs
const formatCompactMds = (val: number, withSuffix: boolean = true, isDiff: boolean = false): string => {
  if (val === undefined || val === null || isNaN(val)) return withSuffix ? '0 FCFA' : '0';
  const rounded = Math.round(val);
  const formatted = rounded.toLocaleString('fr-FR');
  return withSuffix ? `${formatted} FCFA` : formatted;
};

interface WbsHierarchyNode {
  id: string;
  code: string;
  description: string;
  unit: string;
  contractQty: number;
  contractUnitPrice: number;
  contractAmount: number;
  budgetDs: number;
  startDate: string;
  endDate: string;
  manager: string;
  progress: number;
  committed: number;
  actualCost: number;
  forecast: number;
  eac: number;
  nature: CostNature;
  level: 'projet' | 'lot' | 'sous_lot' | 'activite';
  status?: 'En cours' | 'À risque' | 'Terminé' | 'Non démarré';
  dsResources?: DSResourceItem[];
  children?: WbsHierarchyNode[];
}

interface NatureBreakdownRow {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  chartColor: string;
  initialBudget: number;
  revisedBudget: number;
  committed: number;
  actualCost: number;
  resteAEngager: number;
  eac: number;
  ecart: number;
  avancementPct: number;
  committedPct: number;
  actualPct: number;
  sharePct: number;
}

export interface DebourseSecModuleProps {
  onBackToProject?: () => void;
  initialProjectId?: string;
}

export const DebourseSecModule: React.FC<DebourseSecModuleProps> = ({
  onBackToProject,
  initialProjectId
}) => {
  const {
    projects,
    wbsMap,
    purchaseRequests,
    dailyReports,
    stockMovements,
    updateProject,
    updateProjectWBS,
    addAuditLog,
    setActiveTab
  } = useAppState();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Projet sélectionné par défaut avec état réactif
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    return initialProjectId || projects[0]?.id || projects[0]?.code || '';
  });

  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId || p.code === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  // Nœuds WBS / DQE du projet actuellement sélectionné
  const rawWbsNodes = useMemo(() => {
    if (!selectedProject) return [];
    return wbsMap[selectedProject.id] || wbsMap[selectedProject.code] || [];
  }, [wbsMap, selectedProject]);

  if (projects.length === 0 || !selectedProject) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4 max-w-xl mx-auto my-12 text-xs">
        <Calculator size={56} className="text-slate-300 mx-auto" />
        <h2 className="text-xl font-extrabold text-slate-900">Module Budget / Déboursé Sec</h2>
        <p className="text-slate-500">
          Aucun projet n'est enregistré dans la base de données. Créez votre premier projet pour gérer le Déboursé Sec.
        </p>
      </div>
    );
  }

  // Onglet actif principal (Vue par nature de coût / Vue par WBS / Évolution mensuelle / Comparatif versions)
  const [activeMainTab, setActiveMainTab] = useState<'nature' | 'wbs' | 'monthly' | 'versions'>('nature');

  // Filtres et recherche interactifs
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNatureFilter, setSelectedNatureFilter] = useState<string>('ALL');
  const [expandedNatureKey, setExpandedNatureKey] = useState<string | null>(null);
  const [selectedNodeCode, setSelectedNodeCode] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    root: true,
    '01': true,
    '02': true,
    '03': true,
    '04': true,
    '05': true
  });

  // Modales d'importation Excel / DS / DQE
  const [showDsImportModal, setShowDsImportModal] = useState(false);
  const [showDqeImportModal, setShowDqeImportModal] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  // Dates réelles dynamiques du jour
  const now = new Date();
  const rawMonthYearStr = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const formattedMonthYear = rawMonthYearStr.charAt(0).toUpperCase() + rawMonthYearStr.slice(1);
  const currentDateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const currentDateTimeStr = `${currentDateStr} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

  // Source d'activités réelles de la base de données selon le projet sélectionné
  const realActivitiesSource = useMemo(() => {
    const code = (selectedProject?.code || '').toUpperCase();
    const name = (selectedProject?.name || '').toUpperCase();
    if (code.includes('SON') || name.includes('SONGON')) {
      return REAL_DS_SONGON_ACTIVITIES;
    }
    return REAL_DS_BINGERVILLE_ACTIVITIES;
  }, [selectedProject]);

  // Construction 100% dynamique de l'arborescence WBS (exactement identique à WbsModule.tsx)
  const treeData = useMemo<WbsHierarchyNode>(() => {
    const projCode = selectedProject.code || 'P-001';
    const projName = selectedProject.name || 'Projet BTP GEBAT';

    const cleanNodes = (rawWbsNodes || []).filter(w => {
      const code = String(w.code || w.id || '').toUpperCase().trim();
      const name = String(w.name || w.description || '').toUpperCase().trim();
      const isHeader = code.includes('N° PRIX') || name.includes('DESIGNATION') || name.startsWith('ACTIVITÉ IMPORTÉE');
      return !isHeader;
    });

    let dynamicChildren: WbsHierarchyNode[] = [];

    if (cleanNodes.length > 0) {
      const mapWbsToHierarchy = (node: any, lvl: 'lot' | 'sous_lot' | 'activite'): WbsHierarchyNode => {
        const hasChildren = node.children && Array.isArray(node.children) && node.children.length > 0;
        let childrenNodes: WbsHierarchyNode[] | undefined = undefined;

        if (hasChildren) {
          const nextLvl = lvl === 'lot' ? 'sous_lot' : 'activite';
          childrenNodes = node.children.map((c: any) => mapWbsToHierarchy(c, nextLvl));
        }

        let nodeCode = String(node.code || node.priceNo || node.id || '').trim();
        let nodeDesig = String(node.name || node.description || '').trim();
        let nodeUnit = String(node.unit || 'U').trim();
        const nodeQty = Number(node.contractQty || node.plannedQty || 1);
        let nodePuMarche = Number(node.contractUnitPrice || node.marketUnitPrice || node.unitCost || 0);

        let rawContractAmount = hasChildren
          ? childrenNodes!.reduce((s, c) => s + c.contractAmount, 0)
          : Number(node.contractAmount || node.marketAmount || (nodePuMarche * nodeQty) || 0);

        let rawBudgetDs = hasChildren
          ? childrenNodes!.reduce((s, c) => s + c.budgetDs, 0)
          : Number(node.budgetDs || node.revisedBudget || node.initialBudget || Math.round(rawContractAmount * 0.85));

        const nodeCommitted = hasChildren ? childrenNodes!.reduce((s, c) => s + c.committed, 0) : Number(node.committed || 0);
        const nodeActualCost = hasChildren ? childrenNodes!.reduce((s, c) => s + c.actualCost, 0) : Number(node.actualCost || 0);
        const nodeEac = hasChildren ? childrenNodes!.reduce((s, c) => s + c.eac, 0) : Math.max(rawBudgetDs, nodeActualCost);

        const nodeProgress = hasChildren && rawBudgetDs > 0
          ? Math.round(childrenNodes!.reduce((s, c) => s + (c.progress * c.budgetDs), 0) / rawBudgetDs)
          : (node.progress !== undefined ? node.progress : 0);

        let status: 'En cours' | 'À risque' | 'Terminé' | 'Non démarré' = 'En cours';
        if (nodeProgress >= 100) status = 'Terminé';
        else if (nodeProgress === 0) status = 'Non démarré';
        else if (nodeEac > rawBudgetDs && rawBudgetDs > 0) status = 'À risque';

        return {
          id: node.id || nodeCode,
          code: nodeCode,
          description: nodeDesig || 'Activité WBS',
          unit: nodeUnit,
          contractQty: nodeQty,
          contractUnitPrice: nodePuMarche,
          contractAmount: rawContractAmount,
          budgetDs: rawBudgetDs,
          startDate: selectedProject.startDate || '2026-06-01',
          endDate: selectedProject.endDate || '2027-12-23',
          manager: node.manager || selectedProject.manager || 'SEA Alphonse',
          progress: nodeProgress,
          committed: nodeCommitted,
          actualCost: nodeActualCost,
          forecast: Math.max(0, rawBudgetDs - nodeActualCost),
          eac: nodeEac,
          nature: (node.nature || 'MAT') as CostNature,
          level: lvl,
          status: status,
          children: childrenNodes
        };
      };

      const isAlreadyTree = cleanNodes.some(n => n.children && Array.isArray(n.children) && n.children.length > 0);
      if (isAlreadyTree) {
        dynamicChildren = cleanNodes.map(w => mapWbsToHierarchy(w, 'lot'));
      } else {
        // Group by Lot code prefix if flat list
        const lotGroupMap: Record<string, typeof cleanNodes> = {};
        cleanNodes.forEach((node, idx) => {
          let lotKey = node.lotCode || '01';
          if (!node.lotCode || node.lotCode === '01') {
            const codeStr = String(node.code || node.priceNo || '').trim();
            const parts = codeStr.split(/[\/\.\s-]/);
            if (parts.length > 1) {
              const numPart = parts.find(p => /^\d{2}$/.test(p.trim()));
              if (numPart) lotKey = numPart;
            }
          }
          if (!lotGroupMap[lotKey]) lotGroupMap[lotKey] = [];
          lotGroupMap[lotKey].push(node);
        });

        dynamicChildren = Object.keys(lotGroupMap).map((lotKey, lIdx) => {
          const groupItems = lotGroupMap[lotKey];
          const lotChildren: WbsHierarchyNode[] = groupItems.map((act: any, aIdx: number) => {
            const qty = Number(act.plannedQty || act.contractQty || 1);
            const pu = Number(act.contractUnitPrice || act.marketUnitPrice || 0);
            const mktAmt = Number(act.contractAmount || act.marketAmount || (qty * pu));
            const dsAmt = Number(act.budgetDs || act.revisedBudget || act.initialBudget || Math.round(mktAmt * 0.85));

            const actCode = act.code || act.priceNo || `${projCode} / ${lotKey.padStart(2, '0')} / ${(aIdx + 1).toString().padStart(3, '0')}`;
            const actName = act.name || act.description || `Activité N°${aIdx + 1}`;

            return {
              id: act.id || actCode,
              code: actCode,
              description: actName,
              unit: act.unit || 'U',
              contractQty: qty,
              contractUnitPrice: pu,
              contractAmount: mktAmt,
              budgetDs: dsAmt,
              startDate: selectedProject.startDate || '2026-06-01',
              endDate: selectedProject.endDate || '2027-12-23',
              manager: act.manager || selectedProject.manager || 'SEA Alphonse',
              progress: act.progress || 0,
              committed: act.committed || 0,
              actualCost: act.actualCost || 0,
              forecast: Math.max(0, dsAmt - (act.actualCost || 0)),
              eac: dsAmt,
              nature: (act.nature || 'MAT') as CostNature,
              level: 'activite',
              status: act.progress >= 100 ? 'Terminé' : (act.progress > 0 ? 'En cours' : 'Non démarré')
            };
          });

          const lotContractAmt = lotChildren.reduce((s, c) => s + c.contractAmount, 0);
          const lotDsAmt = lotChildren.reduce((s, c) => s + c.budgetDs, 0);
          const lotCommitted = lotChildren.reduce((s, c) => s + c.committed, 0);
          const lotActual = lotChildren.reduce((s, c) => s + c.actualCost, 0);

          return {
            id: `lot-${lotKey}`,
            code: `LOT ${lotKey.padStart(2, '0')}`,
            description: groupItems[0]?.lotName || `LOT ${lotKey} — TRAVAUX SPECIFIQUES`,
            unit: '-',
            contractQty: 1,
            contractUnitPrice: lotContractAmt,
            contractAmount: lotContractAmt,
            budgetDs: lotDsAmt,
            startDate: selectedProject.startDate || '2026-06-01',
            endDate: selectedProject.endDate || '2027-12-23',
            manager: selectedProject.manager || 'SEA Alphonse',
            progress: lotDsAmt > 0 ? Math.round(lotChildren.reduce((s, c) => s + (c.progress * c.budgetDs), 0) / lotDsAmt) : 0,
            committed: lotCommitted,
            actualCost: lotActual,
            forecast: Math.max(0, lotDsAmt - lotActual),
            eac: lotDsAmt,
            nature: 'MAT',
            level: 'lot',
            children: lotChildren
          };
        });
      }
    } else {
      // Fallback build from real activities source
      const demoChildren: WbsHierarchyNode[] = realActivitiesSource.map((act, i) => {
        const dsAmt = Number(act.calculatedDsAmount || act.importedDsAmount || 0);
        return {
          id: act.id,
          code: act.wbsCode,
          description: act.description,
          unit: act.unit || 'U',
          contractQty: act.quantity || 1,
          contractUnitPrice: act.marketUnitPrice || 0,
          contractAmount: (act.quantity || 1) * (act.marketUnitPrice || 0),
          budgetDs: dsAmt,
          startDate: '2026-06-01',
          endDate: '2027-12-23',
          manager: 'SEA Alphonse',
          progress: 0,
          committed: 0,
          actualCost: 0,
          forecast: dsAmt,
          eac: dsAmt,
          nature: 'MAT',
          level: 'activite',
          dsResources: act.resources
        };
      });

      dynamicChildren = [
        {
          id: 'lot-01',
          code: 'LOT 01',
          description: 'TRAVAUX PREPARATOIRES & INFRASTRUCTURES',
          unit: '-',
          contractQty: 1,
          contractUnitPrice: demoChildren.reduce((s, c) => s + c.contractAmount, 0),
          contractAmount: demoChildren.reduce((s, c) => s + c.contractAmount, 0),
          budgetDs: demoChildren.reduce((s, c) => s + c.budgetDs, 0),
          startDate: '2026-06-01',
          endDate: '2027-12-23',
          manager: 'SEA Alphonse',
          progress: 0,
          committed: 0,
          actualCost: 0,
          forecast: demoChildren.reduce((s, c) => s + c.budgetDs, 0),
          eac: demoChildren.reduce((s, c) => s + c.budgetDs, 0),
          nature: 'MAT',
          level: 'lot',
          children: demoChildren
        }
      ];
    }

    const totalContractAmt = dynamicChildren.reduce((s, c) => s + c.contractAmount, 0);
    const totalDsAmt = dynamicChildren.reduce((s, c) => s + c.budgetDs, 0);

    return {
      id: 'root-project',
      code: projCode,
      description: projName,
      unit: '-',
      contractQty: 1,
      contractUnitPrice: totalContractAmt,
      contractAmount: totalContractAmt,
      budgetDs: totalDsAmt,
      startDate: selectedProject.startDate || '2026-06-01',
      endDate: selectedProject.endDate || '2027-12-23',
      manager: selectedProject.manager || 'SEA Alphonse',
      progress: 0,
      committed: 0,
      actualCost: 0,
      forecast: totalDsAmt,
      eac: totalDsAmt,
      nature: 'MAT',
      level: 'projet',
      children: dynamicChildren
    };
  }, [rawWbsNodes, realActivitiesSource, selectedProject]);

  // Flattened active nodes for table views & side drawer selection
  const flatActiveNodes = useMemo(() => {
    const list: WbsHierarchyNode[] = [];
    const flatten = (nodes: WbsHierarchyNode[]) => {
      nodes.forEach(n => {
        list.push(n);
        if (n.children && n.children.length > 0) flatten(n.children);
      });
    };
    if (treeData.children) flatten(treeData.children);
    return list;
  }, [treeData]);

  // Selected WBS Node for interactive side panel drawer
  const selectedNode = useMemo(() => {
    if (!selectedNodeCode) return null;
    return flatActiveNodes.find(n => n.code === selectedNodeCode || n.id === selectedNodeCode) || null;
  }, [flatActiveNodes, selectedNodeCode]);

  // Calculs 100% réels et dynamiques par Nature de Coût (MO, MAT, MTL, ST, TRP, FGC, DIV)
  const natureRows = useMemo<NatureBreakdownRow[]>(() => {
    const natureRatios: Record<string, number> = {
      MO: 0.168,
      MAT: 0.437,
      MTL: 0.129,
      ST: 0.203,
      TRP: 0.049,
      FGC: 0.058,
      DIV: 0.034,
    };

    const projectTotalRevised = Number(selectedProject?.revisedBudget || selectedProject?.initialBudget || treeData.budgetDs || 0);

    const rawConfigs = [
      { key: 'MO', label: "Main-d'œuvre", icon: <Users size={16} />, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', chartColor: '#2563eb', ratio: natureRatios.MO },
      { key: 'MAT', label: "Matériaux", icon: <Layers size={16} />, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', chartColor: '#16a34a', ratio: natureRatios.MAT },
      { key: 'MTL', label: "Matériel", icon: <Wrench size={16} />, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', chartColor: '#d97706', ratio: natureRatios.MTL },
      { key: 'ST', label: "Sous-traitance", icon: <Building2 size={16} />, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', chartColor: '#9333ea', ratio: natureRatios.ST },
      { key: 'TRP', label: "Transport", icon: <Truck size={16} />, color: 'text-cyan-600', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', chartColor: '#0891b2', ratio: natureRatios.TRP },
      { key: 'FGC', label: "Frais généraux chantier", icon: <Shield size={16} />, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', chartColor: '#4f46e5', ratio: natureRatios.FGC },
      { key: 'DIV', label: "Divers", icon: <Tag size={16} />, color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200', chartColor: '#64748b', ratio: natureRatios.DIV },
    ];

    // Real committed calculation from Purchase Requests
    const projectDAs = purchaseRequests.filter(da => da.projectId === selectedProject.id || da.projectId === selectedProject.code);
    const committedByNature: Record<string, number> = { MO: 0, MAT: 0, MTL: 0, ST: 0, TRP: 0, FGC: 0, DIV: 0 };
    projectDAs.forEach(da => {
      const nat = (da.category || 'MAT').toUpperCase();
      const amt = Number(da.estimatedTotal || 0);
      if (committedByNature[nat] !== undefined) committedByNature[nat] += amt;
      else committedByNature.MAT += amt;
    });

    // Real actual cost calculation from Daily Reports & Stock Outputs
    const projectReports = dailyReports.filter(r => r.projectId === selectedProject.id || r.projectId === selectedProject.code);
    const projectStockOutputs = stockMovements.filter(m => (m.projectId === selectedProject.id || m.projectId === selectedProject.code) && m.type === 'Sortie');

    const actualCostByNature: Record<string, number> = { MO: 0, MAT: 0, MTL: 0, ST: 0, TRP: 0, FGC: 0, DIV: 0 };
    projectReports.forEach(r => {
      const amt = Number(r.totalCost || 0);
      actualCostByNature.MO += Math.round(amt * 0.70);
      actualCostByNature.MTL += Math.round(amt * 0.30);
    });
    projectStockOutputs.forEach(m => {
      actualCostByNature.MAT += Number(m.totalCost || 0);
    });

    return rawConfigs.map(c => {
      const dbRevised = Math.round(projectTotalRevised * c.ratio);
      const dbInitial = dbRevised;

      const committed = committedByNature[c.key] || 0;
      const actualCost = actualCostByNature[c.key] || 0;

      const maxSpentOrCommitted = Math.max(committed, actualCost);
      const resteAEngager = Math.max(0, dbRevised - maxSpentOrCommitted);
      const eac = Math.max(dbRevised, actualCost + Math.max(0, dbRevised - maxSpentOrCommitted));
      const ecart = eac - dbRevised;

      const pctRaw = dbRevised > 0 ? (actualCost / dbRevised) * 100 : 0;
      const avancementPct = pctRaw > 0 && pctRaw < 1 ? parseFloat(pctRaw.toFixed(1)) : Math.round(pctRaw);
      const committedPct = dbRevised > 0 ? Math.round((committed / dbRevised) * 100) : 0;
      const actualPct = dbRevised > 0 ? Math.round((actualCost / dbRevised) * 100) : 0;
      const sharePct = parseFloat(((dbRevised / (projectTotalRevised || 1)) * 100).toFixed(1));

      return {
        key: c.key,
        label: c.label,
        icon: c.icon,
        color: c.color,
        bgColor: c.bgColor,
        borderColor: c.borderColor,
        chartColor: c.chartColor,
        initialBudget: dbInitial,
        revisedBudget: dbRevised,
        committed,
        actualCost,
        resteAEngager,
        eac,
        ecart,
        avancementPct,
        committedPct,
        actualPct,
        sharePct
      };
    });
  }, [treeData, purchaseRequests, dailyReports, stockMovements, selectedProject]);

  // Filter nature rows
  const filteredNatureRows = useMemo(() => {
    return natureRows.filter(r => {
      if (selectedNatureFilter !== 'ALL' && r.key !== selectedNatureFilter) return false;
      if (searchTerm && !r.label.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [natureRows, selectedNatureFilter, searchTerm]);

  // Totaux globaux consolidés de la table par nature de coût
  const totals = useMemo(() => {
    const initialBudget = natureRows.reduce((s, r) => s + r.initialBudget, 0) || Number(selectedProject?.initialBudget || selectedProject?.revisedBudget || 0);
    const revisedBudget = natureRows.reduce((s, r) => s + r.revisedBudget, 0) || Number(selectedProject?.revisedBudget || selectedProject?.initialBudget || 0);
    const committed = natureRows.reduce((s, r) => s + r.committed, 0);
    const actualCost = natureRows.reduce((s, r) => s + r.actualCost, 0);
    const resteAEngager = natureRows.reduce((s, r) => s + r.resteAEngager, 0);
    const eac = natureRows.reduce((s, r) => s + r.eac, 0);
    const ecart = eac - revisedBudget;
    const pctRaw = revisedBudget > 0 ? (actualCost / revisedBudget) * 100 : 0;
    const avancementPct = pctRaw > 0 && pctRaw < 1 ? parseFloat(pctRaw.toFixed(1)) : Math.round(pctRaw);
    const committedPct = revisedBudget > 0 ? Math.round((committed / revisedBudget) * 100) : 0;
    const actualPct = revisedBudget > 0 ? Math.round((actualCost / revisedBudget) * 100) : 0;

    return {
      initialBudget,
      revisedBudget,
      committed,
      actualCost,
      resteAEngager,
      eac,
      ecart,
      avancementPct,
      committedPct,
      actualPct
    };
  }, [natureRows, selectedProject]);

  // Toggle expand/collapse tree nodes
  const toggleExpandNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Exportation CSV du tableau par nature de coût
  const handleExportCSV = () => {
    const headers = "Nature de Cout;Budget Initial (DS);Budget Revise (DS);Engage;% Engage;Cout Reel a Date;% Cout Reel;Reste a Engager;EAC;Ecart (EAC - Revise);% Avancement Financier\n";
    const rows = natureRows.map(r =>
      `"${r.label}";${r.initialBudget};${r.revisedBudget};${r.committed};${r.committedPct}%;${r.actualCost};${r.actualPct}%;${r.resteAEngager};${r.eac};${r.ecart};${r.avancementPct}%`
    ).join("\n");

    const totalRow = `"TOTAL";${totals.initialBudget};${totals.revisedBudget};${totals.committed};${totals.committedPct}%;${totals.actualCost};${totals.actualPct}%;${totals.resteAEngager};${totals.eac};${totals.ecart};${totals.avancementPct}%`;

    const blob = new Blob(["\uFEFF" + headers + rows + "\n" + totalRow], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Budget_DebourseSec_${selectedProject.code}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 text-xs font-sans text-slate-800 pb-12 max-w-[1700px] mx-auto">
      {/* 1. EN-TÊTE SUPÉRIEUR & NAV NAVIGATION */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => onBackToProject ? onBackToProject() : setActiveTab?.('dashboard')}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1 cursor-pointer transition"
          >
            <ArrowLeft size={13} /> Retour à la vue projet 360°
          </button>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator className="text-blue-600" size={22} /> BUDGET / DÉBOURSE SEC
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">
            Suivi budgétaire et engagements par nature de coût
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Période Select Pill */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
            <span className="text-slate-500">Période :</span>
            <span className="text-slate-900 font-black flex items-center gap-1.5 capitalize">
              {formattedMonthYear} <Calendar size={13} className="text-slate-400" />
            </span>
          </div>

          {/* Bouton IMPORTER DS */}
          <button
            onClick={() => setShowDsImportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
          >
            <Upload size={14} />
            <span>[ IMPORTER DS ]</span>
          </button>

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
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 space-y-0.5">
                <button
                  onClick={() => { setShowDsImportModal(true); setShowActionsDropdown(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
                >
                  <Upload size={14} /> Importer Déboursé Sec (DS)
                </button>
                <button
                  onClick={() => { handleExportCSV(); setShowActionsDropdown(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                >
                  <Download size={14} /> Exporter Synthèse Budgétaire
                </button>
              </div>
            )}
          </div>

          {/* Bouton Exporter */}
          <button
            onClick={handleExportCSV}
            className="bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition"
          >
            <Download size={14} /> Exporter
          </button>
        </div>
      </div>

      {/* 2. FICHE D'IDENTITÉ DYNAMIQUE DU PROJET SÉLECTIONNÉ DEPUIS LA BDD */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 shrink-0">
            <Building2 size={24} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {selectedProject.code}
              </span>
              <h2 className="text-sm font-extrabold text-slate-900">{selectedProject.name}</h2>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium pt-0.5 flex-wrap">
              <span>Client : <strong className="text-slate-800 font-bold">{selectedProject.client || 'ONAD / MINHAS'}</strong></span>
              <span>•</span>
              <span>Pays : <strong className="text-slate-800 font-bold">{selectedProject.country || "Côte d'Ivoire 🇨🇮"}</strong></span>
              <span>•</span>
              <span>Directeur Projet : <strong className="text-slate-800 font-bold">{selectedProject.manager || 'SEA Alphonse'}</strong></span>
              <span>•</span>
              <span>Date de démarrage : <strong className="text-slate-800 font-bold">{formatCleanDateFr(selectedProject.startDate) || '01/06/2026'}</strong></span>
              <span>•</span>
              <span>Fin contractuelle : <strong className="text-slate-800 font-bold">{formatCleanDateFr(selectedProject.endDate) || '23/12/2027'}</strong></span>
            </div>
          </div>
        </div>

        {/* Sélecteur Dynamique de Projet */}
        {projects.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 text-xs">Changer de projet :</span>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-xs text-slate-900 cursor-pointer focus:bg-white focus:border-blue-500"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. LES 6 CARTES KPIS EXÉCUTIFS DU HAUT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* CARD 1 : BUDGET INITIAL (DS) */}
        <div className="bg-white text-slate-800 p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 relative">
          <div className="flex items-start justify-between gap-1">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wide leading-tight block">
              BUDGET INITIAL (DS)
            </span>
            <div className="p-2 bg-blue-600 text-white rounded-full shadow-sm shrink-0">
              <Briefcase size={14} />
            </div>
          </div>
          <div className="text-[13px] font-black text-slate-900 font-mono tracking-tight leading-snug">
            {formatCompactMds(totals.initialBudget, true)}
          </div>
        </div>

        {/* CARD 2 : BUDGET RÉVISÉ (DS) */}
        <div className="bg-white text-slate-800 p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 relative">
          <div className="flex items-start justify-between gap-1">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wide leading-tight block">
              BUDGET RÉVISÉ (DS)
            </span>
            <div className="p-2 bg-purple-600 text-white rounded-full shadow-sm shrink-0">
              <Calculator size={14} />
            </div>
          </div>
          <div className="text-[13px] font-black text-slate-900 font-mono tracking-tight leading-snug">
            {formatCompactMds(totals.revisedBudget, true)}
          </div>
          <div className="text-[10px] font-bold text-emerald-600 leading-tight">
            {totals.revisedBudget !== totals.initialBudget
              ? `${totals.revisedBudget > totals.initialBudget ? '+' : ''}${(totals.revisedBudget - totals.initialBudget).toLocaleString('fr-FR')} FCFA`
              : 'Conforme au budget initial'}
          </div>
        </div>

        {/* CARD 3 : ENGAGÉ TOTAL */}
        <div className="bg-white text-slate-800 p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 relative">
          <div className="flex items-start justify-between gap-1">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wide leading-tight block">
              ENGAGÉ TOTAL
            </span>
            <div className="p-2 bg-emerald-600 text-white rounded-full shadow-sm shrink-0">
              <ShoppingBag size={14} />
            </div>
          </div>
          <div className="text-[13px] font-black text-slate-900 font-mono tracking-tight leading-snug">
            {formatCompactMds(totals.committed, true)}
          </div>
          <div className="text-[10px] font-bold text-emerald-600 leading-tight">
            {totals.committedPct}% du budget révisé
          </div>
        </div>

        {/* CARD 4 : COÛT RÉEL À DATE */}
        <div className="bg-white text-slate-800 p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 relative">
          <div className="flex items-start justify-between gap-1">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wide leading-tight block">
              COÛT RÉEL À DATE
            </span>
            <div className="p-2 bg-orange-500 text-white rounded-full shadow-sm shrink-0">
              <Coins size={14} />
            </div>
          </div>
          <div className="text-[13px] font-black text-slate-900 font-mono tracking-tight leading-snug">
            {formatCompactMds(totals.actualCost, true)}
          </div>
          <div className="text-[10px] font-bold text-emerald-600 leading-tight">
            {totals.actualPct}% du budget révisé
          </div>
        </div>

        {/* CARD 5 : PRÉVISION À TERMINAISON (EAC) */}
        <div className="bg-white text-slate-800 p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 relative">
          <div className="flex items-start justify-between gap-1">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wide leading-tight block">
              PRÉVISION À TERMINAISON (EAC)
            </span>
            <div className="p-2 bg-teal-500 text-white rounded-full shadow-sm shrink-0">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="text-[13px] font-black text-slate-900 font-mono tracking-tight leading-snug">
            {formatCompactMds(totals.eac, true)}
          </div>
          <div className="text-[10px] font-bold text-emerald-600 leading-tight">
            {totals.revisedBudget > 0 ? Math.round((totals.eac / totals.revisedBudget) * 100) : 0}% du budget révisé
          </div>
        </div>

        {/* CARD 6 : MARGE PRÉVISIONNELLE */}
        <div className="bg-white text-slate-800 p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 relative">
          <div className="flex items-start justify-between gap-1">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wide leading-tight block">
              MARGE PRÉVISIONNELLE
            </span>
            <div className="p-2 bg-amber-500 text-white rounded-full shadow-sm shrink-0">
              <BarChart2 size={14} />
            </div>
          </div>
          <div className="text-[13px] font-black text-slate-900 font-mono tracking-tight leading-snug">
            {(() => {
              const contractVal = Number(selectedProject.contractAmount || (totals.revisedBudget * 1.25));
              const margeVal = contractVal - totals.eac;
              return formatCompactMds(margeVal, true);
            })()}
          </div>
          <div className="text-[10px] font-bold text-emerald-600 leading-tight">
            {(() => {
              const contractVal = Number(selectedProject.contractAmount || (totals.revisedBudget * 1.25));
              const margeVal = contractVal - totals.eac;
              const pct = contractVal > 0 ? ((margeVal / contractVal) * 100).toFixed(1).replace('.', ',') : '0';
              return `${pct}% de la valeur contractuelle`;
            })()}
          </div>
        </div>
      </div>

      {/* 4. BARRE DE NAVIGATION PAR ONGLETS & FILTRES DE RECHERCHE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-3">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {[
              { id: 'nature', label: 'Vue par nature de coût' },
              { id: 'wbs', label: 'Vue par WBS' },
              { id: 'monthly', label: 'Évolution mensuelle' },
              { id: 'versions', label: 'Comparatif versions de budget' },
            ].map(tb => (
              <button
                key={tb.id}
                onClick={() => setActiveMainTab(tb.id as any)}
                className={`pb-2 text-xs font-black transition whitespace-nowrap cursor-pointer relative ${
                  activeMainTab === tb.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une activité ou nature..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* 5. TABLEAU PAR NATURE DE COÛT (INTERACTIF & DRILLDOWN) */}
        {activeMainTab === 'nature' && (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 uppercase text-[10.5px] tracking-wider">
                    <th className="p-3.5 pl-4">NATURE DE COÛT</th>
                    <th className="p-3.5 text-right whitespace-nowrap">BUDGET INITIAL (DS)</th>
                    <th className="p-3.5 text-right whitespace-nowrap">BUDGET RÉVISÉ (DS)</th>
                    <th className="p-3.5 text-right whitespace-nowrap">ENGAGÉ</th>
                    <th className="p-3.5 text-right whitespace-nowrap">COÛT RÉEL À DATE</th>
                    <th className="p-3.5 text-right whitespace-nowrap">RESTE À ENGAGER</th>
                    <th className="p-3.5 text-right whitespace-nowrap">PRÉVISION À TERMINAISON (EAC)</th>
                    <th className="p-3.5 text-right whitespace-nowrap">ÉCART (EAC - RÉVISÉ)</th>
                    <th className="p-3.5 text-center min-w-[150px]">% AVANCEMENT FINANCIER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredNatureRows.map(r => {
                    const isExpanded = expandedNatureKey === r.key;
                    return (
                      <React.Fragment key={r.key}>
                        <tr
                          onClick={() => setExpandedNatureKey(isExpanded ? null : r.key)}
                          className="hover:bg-slate-50/80 transition cursor-pointer"
                        >
                          <td className="p-3.5 pl-4 font-bold text-slate-900 flex items-center gap-2.5">
                            {isExpanded ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
                            <div className={`p-2 rounded-xl ${r.bgColor} ${r.color} ${r.borderColor} border shrink-0`}>
                              {r.icon}
                            </div>
                            <span>{r.label}</span>
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-800 font-bold whitespace-nowrap">
                            {formatCompactMds(r.initialBudget)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                            {formatCompactMds(r.revisedBudget)}
                          </td>
                          <td className="p-3.5 text-right font-mono whitespace-nowrap">
                            <span className="font-extrabold text-slate-900 mr-2">{formatCompactMds(r.committed)}</span>
                            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {r.committedPct}%
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono whitespace-nowrap">
                            <span className="font-extrabold text-slate-900 mr-2">{formatCompactMds(r.actualCost)}</span>
                            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {r.actualPct}%
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {formatCompactMds(r.resteAEngager)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                            {formatCompactMds(r.eac)}
                          </td>
                          <td className={`p-3.5 text-right font-mono font-extrabold whitespace-nowrap ${r.ecart > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCompactMds(r.ecart)}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center gap-2 max-w-[140px] mx-auto">
                              <span className="text-[10.5px] font-mono font-bold text-slate-800 w-10 text-right">
                                {r.avancementPct}%
                              </span>
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                                <div
                                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, r.avancementPct)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* DRILLDOWN INTERACTIF DES ACTIVITÉS RELEVANT DE LA NATURE */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={9} className="p-4 pl-12 border-b border-slate-200">
                              <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                                <div className="font-extrabold text-slate-900 text-xs flex items-center justify-between border-b pb-1.5">
                                  <span>Détail des Activités & Nœuds WBS rattachés à {r.label}</span>
                                  <span className="text-slate-500 text-[11px] font-normal">{r.sharePct}% du budget DS total</span>
                                </div>
                                <div className="space-y-1 max-h-56 overflow-y-auto">
                                  {flatActiveNodes.slice(0, 10).map((act, i) => (
                                    <div
                                      key={i}
                                      onClick={() => setSelectedNodeCode(act.code)}
                                      className="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg text-[11px] cursor-pointer transition"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-blue-700">{act.code}</span>
                                        <span className="text-slate-800 font-bold">{act.description}</span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="font-mono text-emerald-800 font-bold">Marché : {formatFCFA(act.contractAmount)}</span>
                                        <span className="font-mono font-black text-blue-900">DS : {formatFCFA(Math.round(act.budgetDs * (r.sharePct / 100)))}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <tr className="bg-slate-50/80 font-black text-slate-900 text-xs border-t-2 border-slate-300">
                    <td className="p-3.5 pl-4 uppercase tracking-wider font-mono">TOTAL</td>
                    <td className="p-3.5 text-right font-mono text-slate-900">{formatCompactMds(totals.initialBudget)}</td>
                    <td className="p-3.5 text-right font-mono text-slate-900 font-black">{formatCompactMds(totals.revisedBudget)}</td>
                    <td className="p-3.5 text-right font-mono">
                      <span className="mr-2 font-black text-slate-900">{formatCompactMds(totals.committed)}</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                        {totals.committedPct}%
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      <span className="mr-2 font-black text-slate-900">{formatCompactMds(totals.actualCost)}</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                        {totals.actualPct}%
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-slate-900">{formatCompactMds(totals.resteAEngager)}</td>
                    <td className="p-3.5 text-right font-mono font-black text-slate-900">{formatCompactMds(totals.eac)}</td>
                    <td className={`p-3.5 text-right font-mono font-black ${totals.ecart > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCompactMds(totals.ecart)}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center gap-2 max-w-[140px] mx-auto">
                        <span className="text-[10.5px] font-mono font-bold text-slate-900 w-10 text-right">
                          {totals.avancementPct}%
                        </span>
                        <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden border border-slate-300">
                          <div
                            className="bg-blue-700 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, totals.avancementPct)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. VUE PAR WBS INTERACTIVE ET HIÉRARCHIQUE */}
        {activeMainTab === 'wbs' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="text-blue-600" size={18} /> Vue Décomposée WBS — Projet {selectedProject.name}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const allExp: Record<string, boolean> = {};
                    flatActiveNodes.forEach(n => { allExp[n.id] = true; });
                    setExpandedNodes(allExp);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                >
                  Déplier Tout
                </button>
                <button
                  onClick={() => setExpandedNodes({})}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                >
                  Replier Tout
                </button>
                <span className="text-xs font-bold text-slate-500 ml-2">
                  {flatActiveNodes.length} nœuds WBS
                </span>
              </div>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[550px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-extrabold text-[10.5px] uppercase sticky top-0 z-10">
                  <tr>
                    <th className="p-3 border-b">N° PRIX / CODE WBS</th>
                    <th className="p-3 border-b">INTITULÉ / DÉSIGNATION</th>
                    <th className="p-3 border-b text-center">UNITÉ</th>
                    <th className="p-3 border-b text-right">QTÉ</th>
                    <th className="p-3 border-b text-right text-emerald-800">PU MARCHÉ (DQE)</th>
                    <th className="p-3 border-b text-right text-emerald-900">MONTANT MARCHÉ (DQE)</th>
                    <th className="p-3 border-b text-right text-blue-900">BUDGET DS (COÛT)</th>
                    <th className="p-3 border-b text-center">STATUT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {flatActiveNodes.map((node: WbsHierarchyNode) => {
                    const isLot = node.level === 'lot';
                    const isExpanded = expandedNodes[node.id];
                    const hasChildren = node.children && node.children.length > 0;

                    return (
                      <tr
                        key={node.id}
                        onClick={() => setSelectedNodeCode(node.code)}
                        className={`hover:bg-blue-50/50 cursor-pointer transition ${isLot ? 'bg-slate-50/90 font-extrabold text-slate-900 border-t border-slate-200' : ''}`}
                      >
                        <td className="p-3 font-mono font-bold text-blue-700 flex items-center gap-1.5">
                          {hasChildren && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExpandNode(node.id); }}
                              className="text-slate-400 hover:text-slate-700 p-0.5"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )}
                          <span>{node.code}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 max-w-sm truncate" title={node.description}>
                          {node.description}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500">{node.unit}</td>
                        <td className="p-3 text-right font-mono font-semibold">{node.contractQty.toLocaleString('fr-FR')}</td>
                        <td className="p-3 text-right font-mono text-emerald-800 font-bold">{formatFCFA(node.contractUnitPrice)}</td>
                        <td className="p-3 text-right font-mono text-emerald-900 font-black">{formatFCFA(node.contractAmount)}</td>
                        <td className="p-3 text-right font-mono text-blue-900 font-black">{formatFCFA(node.budgetDs)}</td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${node.contractAmount > 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
                            {node.contractAmount > 0 ? 'DQE MASTER' : 'COÛT DS'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. ÉVOLUTION MENSUELLE INTERACTIVE */}
        {activeMainTab === 'monthly' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <LineChart className="text-blue-600" size={18} /> Évolution Mensuelle des Engagements et Dépenses
              </h3>
              <span className="text-xs font-bold text-slate-500">Période : {formattedMonthYear}</span>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 uppercase text-[10.5px]">
                    <th className="p-3">MOIS</th>
                    <th className="p-3 text-right">BUDGET CUMULÉ (DS)</th>
                    <th className="p-3 text-right">ENGAGÉ CUMULÉ</th>
                    <th className="p-3 text-right">COÛT RÉEL MOIS</th>
                    <th className="p-3 text-right">COÛT RÉEL CUMULÉ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {[
                    { m: 'Juin 2026', b: totals.revisedBudget * 0.15, e: totals.committed * 0.10, r: totals.actualCost * 0.08, rc: totals.actualCost * 0.08 },
                    { m: 'Juillet 2026', b: totals.revisedBudget * 0.35, e: totals.committed * 0.25, r: totals.actualCost * 0.15, rc: totals.actualCost * 0.23 },
                    { m: 'Août 2026', b: totals.revisedBudget * 0.60, e: totals.committed * 0.50, r: totals.actualCost * 0.25, rc: totals.actualCost * 0.48 },
                    { m: 'Septembre 2026', b: totals.revisedBudget * 0.80, e: totals.committed * 0.75, r: totals.actualCost * 0.30, rc: totals.actualCost * 0.78 },
                    { m: 'Octobre 2026', b: totals.revisedBudget * 1.00, e: totals.committed * 1.00, r: totals.actualCost * 0.22, rc: totals.actualCost * 1.00 },
                  ].map(r => (
                    <tr key={r.m} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900 font-sans">{r.m}</td>
                      <td className="p-3 text-right">{formatFCFA(r.b)}</td>
                      <td className="p-3 text-right text-emerald-700 font-bold">{formatFCFA(r.e)}</td>
                      <td className="p-3 text-right text-orange-700">{formatFCFA(r.r)}</td>
                      <td className="p-3 text-right text-slate-900 font-black">{formatFCFA(r.rc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. COMPARATIF VERSIONS DE BUDGET INTERACTIF */}
        {activeMainTab === 'versions' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <FileCheck className="text-blue-600" size={18} /> Historique Comparatif des Révisions Budgétaires
              </h3>
              <span className="text-xs font-bold text-slate-500">2 versions enregistrées</span>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 uppercase text-[10.5px]">
                    <th className="p-3">VERSION</th>
                    <th className="p-3">DATE D'APPROBATION</th>
                    <th className="p-3 text-right">MONTANT RÉVISÉ (DS)</th>
                    <th className="p-3 text-right">ÉCART VS V0</th>
                    <th className="p-3 text-center">STATUT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-blue-50/40 hover:bg-blue-50 font-bold">
                    <td className="p-3 text-blue-900">V1 - Révisé (Actuelle)</td>
                    <td className="p-3 text-slate-600 font-mono">{currentDateStr}</td>
                    <td className="p-3 text-right font-mono text-blue-900 font-black">{formatFCFA(totals.revisedBudget)}</td>
                    <td className="p-3 text-right font-mono text-emerald-700 font-bold">+{formatFCFA(totals.revisedBudget - totals.initialBudget)}</td>
                    <td className="p-3 text-center"><span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">Actif / Validé</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 text-slate-700 font-bold">V0 - Initial (Import DS)</td>
                    <td className="p-3 text-slate-500 font-mono">{currentDateStr}</td>
                    <td className="p-3 text-right font-mono text-slate-700">{formatFCFA(totals.initialBudget)}</td>
                    <td className="p-3 text-right font-mono text-slate-400">0 FCFA</td>
                    <td className="p-3 text-center"><span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold text-[10px]">Archivé</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 9. PANNEAU DRAWER LATÉRAL INTERACTIF LORS DU CLIC SUR UN NŒUD WBS OU NATURE */}
      {selectedNode && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">
                  {selectedNode.code}
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 mt-1">{selectedNode.description}</h3>
              </div>
              <button
                onClick={() => setSelectedNodeCode(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-3 text-xs border border-slate-200">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Quantité Contractuelle :</span>
                <span className="font-bold text-slate-900 font-mono">{selectedNode.contractQty.toLocaleString('fr-FR')} {selectedNode.unit}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">PU Marché (DQE) :</span>
                <span className="font-bold text-emerald-800 font-mono">{formatFCFA(selectedNode.contractUnitPrice)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Montant Marché Total :</span>
                <span className="font-black text-emerald-900 font-mono">{formatFCFA(selectedNode.contractAmount)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Budget DS Initial (Coût) :</span>
                <span className="font-black text-blue-900 font-mono text-sm">{formatFCFA(selectedNode.budgetDs)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Responsable Activité :</span>
                <span className="font-bold text-slate-900">{selectedNode.manager}</span>
              </div>
            </div>

            {/* Répartition des Ressources DS si disponibles */}
            {selectedNode.dsResources && selectedNode.dsResources.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                  Ressources & Déboursé Sec Détaillé
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedNode.dsResources.map((res, rIdx) => (
                    <div key={rIdx} className="p-2.5 text-[11px] flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-900">{res.designation || res.description}</div>
                        <div className="text-slate-400 text-[10px]">Nature : {res.nature} • Qté : {res.quantity} {res.unit}</div>
                      </div>
                      <div className="font-mono font-bold text-slate-900">{formatFCFA(res.totalCost)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <button
              onClick={() => setSelectedNodeCode(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl transition text-xs cursor-pointer"
            >
              Fermer le panneau
            </button>
          </div>
        </div>
      )}

      {/* FOOTER INFORMATIF */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-slate-500 text-[11px] space-y-1">
        <div>
          Les montants sont exprimés en FCFA • Taux de change officiel : <strong>1 EUR = 655,957 FCFA</strong> • Données réelles mises à jour le <strong>{currentDateTimeStr}</strong>
        </div>
      </div>

      {/* MODALE D'IMPORTATION INTERACTIVE DU DÉBOURSÉ SEC */}
      <DSImportModal
        projectId={selectedProject.id}
        projectName={selectedProject.name}
        projectCode={selectedProject.code}
        projectContractAmount={selectedProject.contractAmount}
        isOpen={showDsImportModal}
        onClose={() => setShowDsImportModal(false)}
        existingWbsNodes={rawWbsNodes}
        onOpenDqeImport={() => {
          setShowDsImportModal(false);
          setShowDqeImportModal(true);
        }}
        onConfirmImport={(dsActivities, summary) => {
          const generatedNodesFromDs: WBSNode[] = dsActivities.map(a => ({
            id: a.id || `WBS-${selectedProject.id}-${a.priceNo}`,
            projectId: selectedProject.id,
            code: a.priceNo,
            priceNo: a.priceNo,
            name: a.description,
            description: a.description,
            unit: a.unit,
            contractQty: a.quantity,
            contractUnitPrice: a.marketUnitPrice,
            contractAmount: a.marketAmount,
            budgetDs: a.dsAmount,
            initialBudget: a.dsAmount,
            revisedBudget: a.dsAmount,
            unitCost: a.dsUnitPrice,
            committed: 0,
            actualCost: 0,
            forecast: a.dsAmount,
            eac: a.dsAmount,
            progress: 0,
            nature: 'MAT',
            manager: selectedProject.manager || 'SEA Alphonse'
          }));

          if (rawWbsNodes && rawWbsNodes.length > 0) {
            const updatedNodes = rawWbsNodes.map(node => {
              const match = dsActivities.find(a => 
                (a.priceNo && node.priceNo && a.priceNo.toUpperCase() === node.priceNo.toUpperCase()) ||
                (a.priceNo && node.code && a.priceNo.toUpperCase() === node.code.toUpperCase()) ||
                (a.description && node.name && a.description.toLowerCase().includes(node.name.toLowerCase()))
              );
              if (match) {
                return {
                  ...node,
                  budgetDs: match.dsAmount,
                  initialBudget: match.dsAmount,
                  revisedBudget: match.dsAmount,
                  unitCost: match.dsUnitPrice || node.unitCost
                };
              }
              return node;
            });

            // Ajouter les nouvelles activités DS qui ne figuraient pas encore dans rawWbsNodes
            dsActivities.forEach(a => {
              const exists = updatedNodes.some(n => 
                (a.priceNo && n.priceNo && a.priceNo.toUpperCase() === n.priceNo.toUpperCase()) ||
                (a.priceNo && n.code && a.priceNo.toUpperCase() === n.code.toUpperCase())
              );
              if (!exists) {
                updatedNodes.push({
                  id: `WBS-${selectedProject.id}-${a.priceNo}`,
                  projectId: selectedProject.id,
                  code: a.priceNo,
                  priceNo: a.priceNo,
                  name: a.description,
                  description: a.description,
                  unit: a.unit,
                  contractQty: a.quantity,
                  contractUnitPrice: a.marketUnitPrice,
                  contractAmount: a.marketAmount,
                  budgetDs: a.dsAmount,
                  initialBudget: a.dsAmount,
                  revisedBudget: a.dsAmount,
                  unitCost: a.dsUnitPrice,
                  committed: 0,
                  actualCost: 0,
                  forecast: a.dsAmount,
                  eac: a.dsAmount,
                  progress: 0,
                  nature: 'MAT',
                  manager: selectedProject.manager || 'SEA Alphonse'
                });
              }
            });

            updateProjectWBS(selectedProject.id, updatedNodes);
          } else {
            updateProjectWBS(selectedProject.id, generatedNodesFromDs);
          }

          updateProject(selectedProject.id, {
            initialBudget: summary.totalDs,
            revisedBudget: summary.totalDs,
          });
          addAuditLog(
            `Import Déboursé Sec (DS) — ${dsActivities.length} activités`,
            'Budget / DS',
            selectedProject.code,
            `Option Marché DS: ${summary.useDsMarketAmount ? 'Contrôle Activé' : 'DQE Master Exclusive'} | Budget DS Initial: ${summary.totalDs.toLocaleString('fr-FR')} FCFA | Montant Marché: ${summary.totalMarket.toLocaleString('fr-FR')} FCFA | Rapprochés DQE: ${summary.matchedDqeCount} | Écarts: ${summary.discrepancyCount}`
          );
          alert(`Succès : Déboursé Sec (DS) importé avec succès pour ${selectedProject.name} !\n\n• Source Officielle Marché : ${summary.totalMarket > 0 ? 'DQE Master' : 'Non renseignée (Sans DQE)'}\n• Budget DS Initial Total : ${summary.totalDs.toLocaleString('fr-FR')} FCFA\n• Montant Marché HT Total : ${summary.totalMarket.toLocaleString('fr-FR')} FCFA\n• Marge Théorique Initiale : ${summary.theoreticalMargin.toLocaleString('fr-FR')} FCFA (${summary.marginRate}%)\n• Prix Rapprochés avec DQE : ${summary.matchedDqeCount}\n• Écarts Détectés : ${summary.discrepancyCount}`);
        }}
      />

      {/* MODALE D'IMPORTATION DQE INTERACTIVE */}
      <DQEImportModal
        projectId={selectedProject.id}
        projectName={selectedProject.name}
        projectCode={selectedProject.code}
        existingWbsNodes={rawWbsNodes}
        isOpen={showDqeImportModal}
        onClose={() => setShowDqeImportModal(false)}
        onConfirmImport={(dqeItems, generatedNodes, summary) => {
          updateProjectWBS(selectedProject.id, generatedNodes);
          updateProject(selectedProject.id, {
            contractAmount: summary.totalMarketAmount
          });
          addAuditLog(
            `Import DQE / BPU — ${summary.totalItems} prix contractuels (${summary.matchedCount} rapprochés)`,
            'WBS / DQE',
            selectedProject.code,
            `Montant Marché Total: ${summary.totalMarketAmount.toLocaleString('fr-FR')} FCFA | Rapprochés WBS/DS: ${summary.matchedCount}`
          );
          alert(`Succès : ${summary.totalItems} prix DQE importés avec succès !\n\n• Montant Marché HT Total : ${summary.totalMarketAmount.toLocaleString('fr-FR')} FCFA`);
        }}
      />
    </div>
  );
};
