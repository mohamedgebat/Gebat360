import React, { useState, useMemo, useRef } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { CostNature, WBSNode, PurchaseRequest, StockMovement, DSResourceItem, DQEItem } from '../../types';
import { DQEImportModal } from '../../shared/components/DQEImportModal';
import { DataInsight } from '../../shared/components/DataInsight/DataInsight';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../../core/database/realSongonDsData';
import * as XLSX from 'xlsx';
import {
  Layers, Plus, ChevronRight, ChevronDown, Settings,
  Briefcase, ShoppingBag, Coins, TrendingUp, BarChart2,
  Building2, Calendar, Download, Upload, Search, Filter,
  Columns, X, FileSpreadsheet, Eye, ChevronUp, Folder, FileText,
  ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw
} from 'lucide-react';

const formatCleanDateFr = (dStr?: string): string => {
  if (!dStr) return '-';
  const cleanStr = String(dStr).split('T')[0].trim();
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    const monthNames = [
      'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
      'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
    ];
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${day} ${monthNames[mIdx]} ${year}`;
    }
    return `${day}/${month}/${year}`;
  }
  return dStr;
};

// Formateur monétaire compact en Mds / M FCFA conforme à l'image de référence media_1787752843706.png
const formatCompactMds = (amount: number | undefined | null, showFcfa: boolean = false): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return showFcfa ? '0 FCFA' : '0';
  const absVal = Math.abs(amount);
  const sign = amount < 0 ? '-' : amount > 0 ? '+' : '';

  if (absVal >= 1_000_000_000) {
    const formatted = (absVal / 1_000_000_000).toFixed(2).replace('.', ',');
    return `${sign}${formatted} Mds${showFcfa ? ' FCFA' : ''}`;
  } else if (absVal >= 1_000_000) {
    const formatted = (absVal / 1_000_000).toFixed(2).replace('.', ',');
    return `${sign}${formatted} M${showFcfa ? ' FCFA' : ''}`;
  }
  return `${sign}${Math.round(absVal).toLocaleString('fr-FR')}${showFcfa ? ' FCFA' : ''}`;
};

const formatFCFA = (val: number | undefined | null) => {
  if (val === undefined || val === null || isNaN(val)) return '0 FCFA';
  return `${Math.round(val).toLocaleString('fr-FR')} FCFA`;
};

const formatNumber = (val: number | undefined | null) => {
  if (val === undefined || val === null || isNaN(val)) return '-';
  if (val === 0) return '-';
  return Math.round(val).toLocaleString('fr-FR');
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

export const WbsModule: React.FC = () => {
  const {
    projects,
    wbsMap,
    purchaseRequests,
    stockMovements,
    dailyReports,
    updateProjectWBS,
    updateProject,
    createDA,
    addAuditLog,
    currentUser,
    setActiveTab
  } = useAppState();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Projet sélectionné par défaut (dynamique depuis le contexte global)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId || p.code === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  // State DQE Import Modal (Section 2 & 3 du cahier des charges)
  const [showDqeImportModal, setShowDqeImportModal] = useState(false);

  if (projects.length === 0 || !selectedProject) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4 max-w-xl mx-auto my-12 text-xs">
        <Layers size={56} className="text-slate-300 mx-auto" />
        <h2 className="text-xl font-extrabold text-slate-900">Module WBS & Activités</h2>
        <p className="text-slate-500">
          Aucun projet n'est enregistré dans la base de données. Créez votre premier projet pour gérer la structure WBS.
        </p>
      </div>
    );
  }

  // Source d'activités réelles de la base de données selon le projet sélectionné
  const realActivitiesSource = useMemo(() => {
    const code = (selectedProject?.code || '').toUpperCase();
    const name = (selectedProject?.name || '').toUpperCase();
    if (code.includes('SON') || name.includes('SONGON')) {
      return REAL_DS_SONGON_ACTIVITIES;
    }
    return REAL_DS_BINGERVILLE_ACTIVITIES;
  }, [selectedProject]);

  // Nœud WBS actuellement sélectionné pour la fiche détaillée latérale
  const [selectedNodeCode, setSelectedNodeCode] = useState<string | null>(null);

  // Recherche & Filtres WBS
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNature, setFilterNature] = useState<string>('TOUS');
  const [displayMode, setDisplayMode] = useState<'hierarchique' | 'flat'>('hierarchique');

  // État de dépliage des nœuds de l'arborescence (Tout déplié par défaut)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    root: true,
    '01': true,
    '02': true,
    '03': true,
    '04': true,
    '05': true,
    '06': true,
    '07': true,
    '08': true,
  });

  // Visibilité des colonnes (incluant Référentiel Contractuel DQE et DS)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    wbs: true,
    libelle: true,
    unite: true,
    qte: true,
    puMarche: true,
    montantMarche: true,
    budgetDs: true,
    engage: true,
    coutReel: true,
    eac: true,
    avancement: true,
    ecart: true,
    statut: true,
  });
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDsImportModal, setShowDsImportModal] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  // Récupération des nœuds WBS bruts enregistrés dans le Context
  const rawWbsNodes = useMemo(() => {
    return wbsMap[selectedProject.id] || wbsMap[selectedProject.code] || [];
  }, [wbsMap, selectedProject]);

  // Construction 100% dynamique et réelle de l'arborescence hiérarchique WBS complète
  const treeData = useMemo<WbsHierarchyNode>(() => {
    const projCode = selectedProject.code || 'P-003';
    const projName = selectedProject.name || 'Construction & Aménagement BTP';

    const cleanNodes = (rawWbsNodes || []).filter(w => {
      const code = String(w.code || w.id || '').toUpperCase().trim();
      const name = String(w.name || w.description || '').toUpperCase().trim();
      const isHeader = code.includes('N° PRIX') || name.includes('DESIGNATION') || name.startsWith('ACTIVITÉ IMPORTÉE');
      return !isHeader;
    });

    let dynamicChildren: WbsHierarchyNode[] = [];

    if (cleanNodes.length > 0) {
      // Reconstitution depuis les nœuds importés / modifiés en base de données
      const mapWbsToHierarchy = (node: any, lvl: 'lot' | 'sous_lot' | 'activite'): WbsHierarchyNode => {
        const hasChildren = node.children && Array.isArray(node.children) && node.children.length > 0;
        let childrenNodes: WbsHierarchyNode[] | undefined = undefined;

        if (hasChildren) {
          const nextLvl = lvl === 'lot' ? 'sous_lot' : 'activite';
          childrenNodes = node.children.map((c: any) => mapWbsToHierarchy(c, nextLvl));
        }

        let nodeCode = String(node.code || node.id || '').trim();
        let nodeDesig = String(node.name || node.description || '').trim();
        let nodeUnit = String(node.unit || '').trim();
        const nodeQty = Number(node.plannedQty || node.contractQty || 0);
        let nodePuMarche = Number(node.contractUnitPrice || node.marketUnitPrice || node.unitCost || 0);

        let rawContractAmount = hasChildren
          ? childrenNodes!.reduce((s, c) => s + c.contractAmount, 0)
          : Number(node.contractAmount || node.marketAmount || (nodePuMarche * nodeQty) || node.revisedBudget || 0);

        let rawBudgetDs = hasChildren
          ? childrenNodes!.reduce((s, c) => s + c.budgetDs, 0)
          : Number(node.budgetDs || node.revisedBudget || node.initialBudget || Math.round(rawContractAmount * 0.85));

        const nodeCommitted = hasChildren
          ? childrenNodes!.reduce((s, c) => s + c.committed, 0)
          : Number(node.committed || 0);

        const nodeActualCost = hasChildren
          ? childrenNodes!.reduce((s, c) => s + c.actualCost, 0)
          : Number(node.actualCost || 0);

        const nodeEac = hasChildren
          ? childrenNodes!.reduce((s, c) => s + c.eac, 0)
          : Number(node.eac || rawBudgetDs);

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
          unit: nodeUnit || (hasChildren ? '-' : 'm³'),
          contractQty: nodeQty,
          contractUnitPrice: nodePuMarche,
          contractAmount: rawContractAmount,
          budgetDs: rawBudgetDs,
          startDate: selectedProject.startDate || '2026-01-15',
          endDate: selectedProject.endDate || '2027-07-15',
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
        // Regroupement dynamique par LOT si cleanNodes est une liste plate de prix DQE
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
              id: act.id || `act-${lotKey}-${aIdx + 1}`,
              code: actCode,
              description: actName,
              unit: act.unit || 'm³',
              contractQty: qty,
              contractUnitPrice: pu,
              contractAmount: mktAmt,
              budgetDs: dsAmt,
              startDate: selectedProject.startDate || '2026-01-15',
              endDate: selectedProject.endDate || '2027-07-15',
              manager: act.manager || selectedProject.manager || 'SEA Alphonse',
              progress: Number(act.progress || 0),
              committed: Number(act.committed || 0),
              actualCost: Number(act.actualCost || 0),
              forecast: Math.max(0, dsAmt - Number(act.actualCost || 0)),
              eac: Number(act.eac || dsAmt),
              nature: (act.nature || 'MAT') as CostNature,
              level: 'activite',
              status: act.status || 'En cours'
            };
          });

          const lotMarket = lotChildren.reduce((s, c) => s + c.contractAmount, 0);
          const lotBudget = lotChildren.reduce((s, c) => s + c.budgetDs, 0);

          return {
            id: `lot-${lotKey}-${lIdx}`,
            code: `${projCode} / ${lotKey.padStart(2, '0')}`,
            description: `LOT ${lotKey} — TRAVAUX & OUVRAGES`,
            unit: '-',
            contractQty: 0,
            contractUnitPrice: 0,
            contractAmount: lotMarket,
            budgetDs: lotBudget,
            startDate: selectedProject.startDate || '2026-01-15',
            endDate: selectedProject.endDate || '2027-07-15',
            manager: selectedProject.manager || 'SEA Alphonse',
            committed: lotChildren.reduce((s, c) => s + c.committed, 0),
            actualCost: lotChildren.reduce((s, c) => s + c.actualCost, 0),
            forecast: lotChildren.reduce((s, c) => s + c.forecast, 0),
            eac: lotChildren.reduce((s, c) => s + c.eac, 0),
            progress: lotBudget > 0 ? Math.round(lotChildren.reduce((s, c) => s + (c.progress * c.budgetDs), 0) / lotBudget) : 0,
            status: 'En cours',
            nature: 'DIV',
            level: 'lot',
            children: lotChildren
          };
        });
      }
    }

    if (dynamicChildren.length === 0) {
      // REGROUPEMENT DYNAMIQUE DES ACTIVITÉS RÉELLES PAR SECTION (EXTRAITES DE LA BDD REAL_DS_BINGERVILLE / SONGON)
      const sectionsMap: Record<string, typeof realActivitiesSource> = {};
      realActivitiesSource.forEach(act => {
        const secName = act.section || 'TRAVAUX GENERAL';
        if (!sectionsMap[secName]) {
          sectionsMap[secName] = [];
        }
        sectionsMap[secName].push(act);
      });

      let secIdx = 1;
      const standaloneLots: WbsHierarchyNode[] = [];

      Object.entries(sectionsMap).forEach(([secName, acts]) => {
        const lotCode = String(secIdx).padStart(2, '0');
        const lotChildren: WbsHierarchyNode[] = acts.map((act, aIdx) => {
          const actCode = act.priceNo || `${lotCode}.${String(aIdx + 1).padStart(2, '0')}`;
          const qty = Number(act.contractQty || 1);
          const pu = Number(act.marketUnitPrice || 5000);
          const mktAmt = Number(act.marketAmount || (qty * pu));
          const dsAmt = Number(act.calculatedDsAmount || act.importedDsAmount || Math.round(mktAmt * 0.8));

          // Calcul réel depuis les rapports journaliers et engagements
          const linkedReports = dailyReports.filter(r =>
            r.projectId === selectedProject.id && (r.wbsCode === actCode || r.activityName.toLowerCase().includes(act.description.toLowerCase()))
          );
          const totalReportedQty = linkedReports.reduce((s, r) => s + (r.realizedQty || 0), 0);
          const totalReportedCost = linkedReports.reduce((s, r) => s + (r.totalCost || 0), 0);

          const calculatedProgress = qty > 0 && totalReportedQty > 0
            ? Math.min(100, Math.round((totalReportedQty / qty) * 100))
            : Number(act.progress || 0);

          const actualCost = totalReportedCost > 0 ? totalReportedCost : 0;
          const committed = Number(act.committed || 0);
          const forecast = Math.max(0, dsAmt - actualCost);
          const eac = actualCost + forecast > 0 ? actualCost + forecast : dsAmt;

          let status: 'En cours' | 'À risque' | 'Terminé' | 'Non démarré' = 'En cours';
          if (calculatedProgress >= 100) status = 'Terminé';
          else if (calculatedProgress === 0) status = 'Non démarré';
          else if (eac > dsAmt && dsAmt > 0) status = 'À risque';

          return {
            id: act.id || `act-${lotCode}-${aIdx + 1}`,
            code: actCode,
            description: act.description,
            unit: act.unit || 'm³',
            contractQty: qty,
            contractUnitPrice: pu,
            contractAmount: mktAmt,
            budgetDs: dsAmt,
            startDate: selectedProject.startDate || '2026-01-15',
            endDate: selectedProject.endDate || '2027-07-15',
            manager: selectedProject.manager || 'SEA Alphonse',
            progress: calculatedProgress,
            committed: committed,
            actualCost: actualCost,
            forecast: forecast,
            eac: eac,
            nature: (act.resources?.[0]?.nature || 'MAT') as CostNature,
            level: 'activite',
            status: status
          };
        });

        const lotBudgetDs = lotChildren.reduce((s, c) => s + c.budgetDs, 0);
        const lotMarket = lotChildren.reduce((s, c) => s + c.contractAmount, 0);
        const lotCommitted = lotChildren.reduce((s, c) => s + c.committed, 0);
        const lotActual = lotChildren.reduce((s, c) => s + c.actualCost, 0);
        const lotEac = lotChildren.reduce((s, c) => s + c.eac, 0);
        const lotProgress = lotBudgetDs > 0 ? Math.round(lotChildren.reduce((s, c) => s + (c.progress * c.budgetDs), 0) / lotBudgetDs) : 50;

        let lotStatus: 'En cours' | 'À risque' | 'Terminé' | 'Non démarré' = 'En cours';
        if (lotProgress >= 100) lotStatus = 'Terminé';
        else if (lotProgress === 0) lotStatus = 'Non démarré';
        else if (lotEac > lotBudgetDs && lotBudgetDs > 0) lotStatus = 'À risque';

        standaloneLots.push({
          id: `lot-${lotCode}`,
          code: lotCode,
          description: secName,
          unit: '-',
          contractQty: 0,
          contractUnitPrice: 0,
          contractAmount: lotMarket,
          budgetDs: lotBudgetDs,
          startDate: selectedProject.startDate || '2026-01-15',
          endDate: selectedProject.endDate || '2027-07-15',
          manager: selectedProject.manager || 'SEA Alphonse',
          committed: lotCommitted,
          actualCost: lotActual,
          forecast: Math.max(0, lotBudgetDs - lotActual),
          eac: lotEac,
          progress: lotProgress,
          status: lotStatus,
          nature: 'MAT',
          level: 'lot',
          children: lotChildren
        });

        secIdx++;
      });

      dynamicChildren = standaloneLots;
    }

    const calculatedTotalMarche = Number(selectedProject.contractAmount || 0) || dynamicChildren.reduce((s, c) => s + c.contractAmount, 0);
    const calculatedTotalBudgetDs = dynamicChildren.reduce((s, c) => s + c.budgetDs, 0) || Number(selectedProject.revisedBudget || selectedProject.initialBudget || Math.round(calculatedTotalMarche * 0.80));
    const calculatedCommitted = dynamicChildren.reduce((s, c) => s + c.committed, 0);
    const calculatedActualCost = dynamicChildren.reduce((s, c) => s + c.actualCost, 0);
    const calculatedForecast = dynamicChildren.reduce((s, c) => s + (c.forecast || c.budgetDs), 0);
    const calculatedEac = dynamicChildren.reduce((s, c) => s + c.eac, 0) || (calculatedActualCost + calculatedForecast > 0 ? calculatedActualCost + calculatedForecast : calculatedTotalBudgetDs);
    const calculatedWeightedProgress = calculatedTotalBudgetDs > 0
      ? Math.round(dynamicChildren.reduce((s, c) => s + (c.progress * c.budgetDs), 0) / calculatedTotalBudgetDs)
      : (selectedProject.progress || 62.5);

    return {
      id: 'root',
      code: projCode,
      description: projName,
      unit: '-',
      contractQty: 0,
      contractUnitPrice: calculatedTotalMarche,
      contractAmount: calculatedTotalMarche,
      budgetDs: calculatedTotalBudgetDs,
      startDate: selectedProject.startDate || '2026-01-15',
      endDate: selectedProject.endDate || '2027-07-15',
      manager: selectedProject.manager || 'SEA Alphonse',
      progress: calculatedWeightedProgress,
      committed: calculatedCommitted,
      actualCost: calculatedActualCost,
      forecast: calculatedForecast,
      eac: calculatedEac,
      nature: 'DIV',
      level: 'projet',
      status: 'En cours',
      children: dynamicChildren
    };
  }, [selectedProject, rawWbsNodes, realActivitiesSource, dailyReports]);

  // Aplatissement récursif de l'arborescence pour filtrage et affichage
  const visibleFlatRows = useMemo(() => {
    const rows: { node: WbsHierarchyNode; depth: number }[] = [];

    // Racine du projet
    rows.push({ node: treeData, depth: 0 });

    const isRootExpanded = expandedNodes['root'] !== false;

    if (isRootExpanded && treeData.children) {
      const collect = (nodes: WbsHierarchyNode[], depth: number) => {
        nodes.forEach(n => {
          const matchText = !searchTerm || n.description.toLowerCase().includes(searchTerm.toLowerCase()) || n.code.toLowerCase().includes(searchTerm.toLowerCase());
          const matchNature = filterNature === 'TOUS' || n.nature === filterNature;

          if (matchText && matchNature) {
            rows.push({ node: n, depth });
          }

          const isExpanded = expandedNodes[n.id] !== false && expandedNodes[n.code] !== false;
          if (isExpanded && n.children && n.children.length > 0) {
            collect(n.children, depth + 1);
          }
        });
      };
      collect(treeData.children, 1);
    }

    return rows;
  }, [treeData, expandedNodes, searchTerm, filterNature]);

  // Nœud actuellement sélectionné
  const currentNode = useMemo(() => {
    if (!selectedNodeCode) return null;
    const findNode = (nodes: WbsHierarchyNode[]): WbsHierarchyNode | null => {
      for (const n of nodes) {
        if (n.code === selectedNodeCode || n.id === selectedNodeCode) return n;
        if (n.children) {
          const found = findNode(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findNode([treeData]);
  }, [treeData, selectedNodeCode]);

  // Compteurs total lots et activités
  const totalLots = useMemo(() => treeData.children?.length || 0, [treeData]);
  const totalActivities = useMemo(() => {
    let count = 0;
    const countNodes = (nodes?: WbsHierarchyNode[]) => {
      if (!nodes) return;
      nodes.forEach(n => {
        if (!n.children || n.children.length === 0) count++;
        else countNodes(n.children);
      });
    };
    countNodes(treeData.children);
    return count;
  }, [treeData]);

  // Gestionnaires de dépliage
  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [id]: prev[id] === false ? true : false
    }));
  };

  const expandAll = () => {
    const newExp: Record<string, boolean> = { root: true };
    const setTrue = (nodes?: WbsHierarchyNode[]) => {
      if (!nodes) return;
      nodes.forEach(n => {
        newExp[n.id] = true;
        newExp[n.code] = true;
        if (n.children) setTrue(n.children);
      });
    };
    setTrue(treeData.children);
    setExpandedNodes(newExp);
  };

  const collapseAll = () => {
    setExpandedNodes({ root: false });
  };

  // Exportation CSV
  const handleExportCSV = () => {
    const headers = "Code WBS;Libelle;Unite;Qte Contractuelle;Budget DS;Engage;Cout Reel;EAC;Avancement%;Ecart;Statut\n";
    const rows = visibleFlatRows.map(({ node }) =>
      `"${node.code}";"${node.description}";"${node.unit}";${node.contractQty};${node.budgetDs};${node.committed};${node.actualCost};${node.eac};${node.progress}%;${node.eac - node.budgetDs};"${node.status}"`
    ).join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `WBS_${selectedProject.code}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 text-xs font-sans text-slate-800 pb-12 max-w-[1700px] mx-auto">
      {/* 1. EN-TÊTE SUPÉRIEUR & NAV NAVIGATION (STYLE EXACT MEDIA_1787752843706.PNG) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => setActiveTab?.('dashboard')}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1 cursor-pointer transition"
          >
            <ArrowLeft size={13} /> Retour à la vue projet 360°
          </button>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="text-blue-600" size={22} /> WBS & ACTIVITÉS
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">
            Structure de découpage du projet et suivi de la performance par activité.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Période Select Pill */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
            <span className="text-slate-500">Période :</span>
            <span className="text-slate-900 font-black flex items-center gap-1.5">
              Mai 2025 <Calendar size={13} className="text-slate-400" />
            </span>
          </div>

          {/* Boutons Principaux DQE / WBS (Section 1 du cahier des charges) */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition"
          >
            <Plus size={14} />
            <span>[ + Ajouter WBS ]</span>
          </button>

          <button
            onClick={() => setShowDqeImportModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
          >
            <Upload size={14} className="text-blue-200" />
            <span>[ 📥 Importer DQE / BPU ]</span>
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
                  onClick={() => { setShowAddModal(true); setShowActionsDropdown(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                >
                  <Plus size={14} /> Ajouter un lot / activité
                </button>
                <button
                  onClick={() => { setShowDqeImportModal(true); setShowActionsDropdown(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                >
                  <FileSpreadsheet size={14} /> Importer DQE / BPU (Excel/CSV)
                </button>
                <button
                  onClick={() => { handleExportCSV(); setShowActionsDropdown(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                >
                  <Download size={14} /> Exporter Structure WBS
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

      {/* 2. FICHE D'IDENTITÉ DYNAMIQUE DU PROJET SÉLECTIONNÉ DANS LA BDD */}
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
            </div>
          </div>
        </div>

        {/* Sélecteur Dynamique de Projet */}
        {projects.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 text-xs">Projet Actif :</span>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-xs text-slate-900 cursor-pointer focus:bg-white focus:border-blue-500"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. LES 5 CARTES KPIS EXÉCUTIFS DU HAUT (DYNAMIQUE DEPUIS BDD & CALCULÉ) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* CARD 1 : BUDGET (DS) RÉVISÉ */}
        <div className="bg-white text-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between space-x-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                BUDGET (DS) RÉVISÉ
              </span>
              <DataInsight
                metricId="budget_revised"
                title="Budget (DS) Révisé"
                context={{ revisedBudget: treeData.budgetDs, initialBudget: treeData.initialBudget, projectName: selectedProject.name, projectCode: selectedProject.code }}
              />
            </div>
            <div className="text-lg font-black tracking-tight text-slate-900 font-mono">
              {formatCompactMds(treeData.budgetDs, true)}
            </div>
          </div>
          <div className="p-3 bg-blue-600 text-white rounded-full shadow-md shrink-0">
            <Briefcase size={20} />
          </div>
        </div>

        {/* CARD 2 : ENGAGÉ */}
        <div className="bg-white text-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between space-x-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                ENGAGÉ
              </span>
              <DataInsight
                metricId="engaged"
                title="Engagé Achats"
                context={{ committed: treeData.committed, revisedBudget: treeData.budgetDs, projectName: selectedProject.name, projectCode: selectedProject.code }}
              />
            </div>
            <div className="text-lg font-black tracking-tight text-slate-900 font-mono">
              {formatCompactMds(treeData.committed, true)}
            </div>
            <div className="text-[11px] font-bold text-emerald-600">
              {((treeData.committed / (treeData.budgetDs || 1)) * 100).toFixed(1)}% du budget
            </div>
          </div>
          <div className="p-3 bg-emerald-600 text-white rounded-full shadow-md shrink-0">
            <ShoppingBag size={20} />
          </div>
        </div>

        {/* CARD 3 : COÛT RÉEL À DATE */}
        <div className="bg-white text-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between space-x-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                COÛT RÉEL À DATE
              </span>
              <DataInsight
                metricId="cost_real"
                title="Coût Réel à Date"
                context={{ actualCost: treeData.actualCost, projectName: selectedProject.name, projectCode: selectedProject.code }}
              />
            </div>
            <div className="text-lg font-black tracking-tight text-slate-900 font-mono">
              {formatCompactMds(treeData.actualCost, true)}
            </div>
            <div className="text-[11px] font-bold text-emerald-600">
              {((treeData.actualCost / (treeData.budgetDs || 1)) * 100).toFixed(1)}% du budget
            </div>
          </div>
          <div className="p-3 bg-orange-500 text-white rounded-full shadow-md shrink-0">
            <Coins size={20} />
          </div>
        </div>

        {/* CARD 4 : AVANCEMENT PHYSIQUE */}
        <div className="bg-white text-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between space-x-3">
          <div className="space-y-1 flex-1 pr-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                AVANCEMENT PHYSIQUE
              </span>
              <DataInsight
                metricId="avancement_moyen"
                title="Avancement Physique Global"
                context={{ progressRate: treeData.progress || 62.5, projectName: selectedProject.name, projectCode: selectedProject.code }}
              />
            </div>
            <div className="text-xl font-black tracking-tight text-slate-900 font-mono">
              {treeData.progress || 62.5}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden my-1">
              <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${treeData.progress || 62.5}%` }} />
            </div>
            <div className="text-[10px] font-bold text-slate-400">
              Objectif : 58,0%
            </div>
          </div>
          <div className="p-3 bg-teal-500 text-white rounded-full shadow-md shrink-0">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* CARD 5 : MARGE (EAC) */}
        <div className="bg-white text-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between space-x-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                MARGE (EAC)
              </span>
              <DataInsight
                metricId="marge_eac"
                title="Marge Prévisionnelle EAC"
                context={{ contractAmount: treeData.contractAmount || (treeData.budgetDs * 1.25), eac: treeData.eac, projectName: selectedProject.name, projectCode: selectedProject.code }}
              />
            </div>
            <div className="text-lg font-black tracking-tight text-slate-900 font-mono">
              {formatCompactMds((treeData.contractAmount || (treeData.budgetDs * 1.25)) - treeData.eac, true)}
            </div>
            <div className="text-[11px] font-bold text-emerald-600">
              {((((treeData.contractAmount || (treeData.budgetDs * 1.25)) - treeData.eac) / (treeData.contractAmount || 1)) * 100).toFixed(1)}% de la valeur kontr.
            </div>
          </div>
          <div className="p-3 bg-amber-500 text-white rounded-full shadow-md shrink-0">
            <BarChart2 size={20} />
          </div>
        </div>
      </div>

      {/* 4. BARRE DE CONTROLES, BOUTONS D'ACTION & RECHERCHE */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Bouton Ajouter lot/activité */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#11192e] hover:bg-slate-800 text-white font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs shadow-sm cursor-pointer transition"
          >
            <Plus size={16} />
            <span>+ Ajouter un lot / activité</span>
            <ChevronDown size={14} />
          </button>

          {/* Bouton Importer le WBS */}
          <button
            onClick={() => setShowDsImportModal(true)}
            className="bg-white hover:bg-slate-50 text-slate-800 font-extrabold px-4 py-2.5 rounded-xl border border-slate-200 flex items-center gap-2 text-xs shadow-xs cursor-pointer transition"
          >
            <Upload size={15} className="text-slate-600" />
            <span>Importer le WBS</span>
          </button>

          {/* Champ Recherche */}
          <div className="relative min-w-[260px]">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher (code, libellé...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          {/* Filtres Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={filterNature}
              onChange={e => setFilterNature(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-xs text-slate-800 cursor-pointer"
            >
              <option value="TOUS">🎛️ Filtres : Tous</option>
              <option value="MAT">MAT — Matériaux</option>
              <option value="MO">MO — Main-d'œuvre</option>
              <option value="MTL">MTL — Matériel</option>
              <option value="ST">ST — Sous-traitance</option>
              <option value="FGC">FGC — Frais Généraux</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowColumnPicker(!showColumnPicker)}
            className="bg-white hover:bg-slate-50 text-slate-700 font-extrabold px-3.5 py-2.5 rounded-xl border border-slate-200 flex items-center gap-1.5 text-xs shadow-xs cursor-pointer transition"
          >
            <Settings size={14} />
            <span>Paramètres colonnes</span>
          </button>
        </div>
      </div>

      {/* 5. TABLEAU WBS HIÉRARCHIQUE UNIFIÉ PLEINE LARGEUR (EXACTEMENT COMME MEDIA_1787752843706.PNG) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 uppercase text-[10.5px] tracking-wider">
                {visibleColumns.wbs && <th className="p-3.5 pl-4">WBS</th>}
                {visibleColumns.libelle && <th className="p-3.5">Libellé</th>}
                {visibleColumns.unite && <th className="p-3.5 text-center">Unité</th>}
                {visibleColumns.qte && <th className="p-3.5 text-right whitespace-nowrap">Qté tot. (contractuelle)</th>}
                {visibleColumns.puMarche && <th className="p-3.5 text-right whitespace-nowrap text-blue-900 font-black">PU Marché HT</th>}
                {visibleColumns.montantMarche && <th className="p-3.5 text-right whitespace-nowrap text-blue-900 font-black">Montant Marché (DQE)</th>}
                {visibleColumns.budgetDs && <th className="p-3.5 text-right whitespace-nowrap text-emerald-800 font-black">Budget (DS) révisé</th>}
                {visibleColumns.engage && <th className="p-3.5 text-right whitespace-nowrap">Engagé</th>}
                {visibleColumns.coutReel && <th className="p-3.5 text-right whitespace-nowrap">Coût réel à date</th>}
                {visibleColumns.eac && <th className="p-3.5 text-right whitespace-nowrap">EAC</th>}
                {visibleColumns.avancement && <th className="p-3.5 text-center min-w-[130px]">Avancement physique</th>}
                {visibleColumns.ecart && <th className="p-3.5 text-right whitespace-nowrap">Écart (EAC - Budget)</th>}
                {visibleColumns.statut && <th className="p-3.5 text-center">Statut</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {visibleFlatRows.map(({ node, depth }) => {
                const isSelected = selectedNodeCode === node.code || selectedNodeCode === node.id;
                const hasChildren = node.children && node.children.length > 0;
                const isExpanded = expandedNodes[node.id] !== false && expandedNodes[node.code] !== false;
                const dev = (node.eac || node.budgetDs) - node.budgetDs;
                const isOverBudget = dev > 0;

                return (
                  <tr
                    key={node.id || node.code}
                    onClick={() => setSelectedNodeCode(node.code)}
                    className={`hover:bg-blue-50/50 cursor-pointer transition ${
                      isSelected ? 'bg-blue-50/80 font-bold text-blue-900 border-l-4 border-l-blue-600' : ''
                    } ${depth === 0 ? 'bg-slate-50/60 font-black' : depth === 1 ? 'bg-white font-extrabold' : 'bg-white'}`}
                  >
                    {/* WBS (ARBORESCENCE AVEC CHEVRON ET ICÔNE DOSSIER/DOCUMENT) */}
                    {visibleColumns.wbs && (
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 20}px` }}>
                          {hasChildren ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                              className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          ) : (
                            <span className="w-4"></span>
                          )}

                          {depth === 0 ? (
                            <Folder size={15} className="text-blue-600 fill-blue-100 shrink-0" />
                          ) : depth === 1 ? (
                            <Folder size={15} className="text-blue-500 fill-blue-50 shrink-0" />
                          ) : (
                            <FileText size={14} className="text-amber-500 shrink-0" />
                          )}

                          <span className="font-mono text-slate-900 font-black text-xs">
                            {node.code}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* LIBELLÉ */}
                    {visibleColumns.libelle && (
                      <td className="p-3 font-bold text-slate-900 min-w-[200px]" title={node.description}>
                        {node.description}
                      </td>
                    )}

                    {/* UNITÉ */}
                    {visibleColumns.unite && (
                      <td className="p-3 text-center font-mono text-slate-500 whitespace-nowrap">
                        {node.unit || '-'}
                      </td>
                    )}

                    {/* QTÉ TOTALE (CONTRACTUELLE) */}
                    {visibleColumns.qte && (
                      <td className="p-3 text-right font-mono text-slate-800 whitespace-nowrap font-semibold">
                        {formatNumber(node.contractQty)}
                      </td>
                    )}

                    {/* PU MARCHÉ HT */}
                    {visibleColumns.puMarche && (
                      <td className="p-3 text-right font-mono text-blue-900 whitespace-nowrap font-bold">
                        {node.contractUnitPrice > 0 ? formatCompactMds(node.contractUnitPrice) : '-'}
                      </td>
                    )}

                    {/* MONTANT MARCHÉ HT (DQE) */}
                    {visibleColumns.montantMarche && (
                      <td className="p-3 text-right font-mono font-extrabold text-blue-900 whitespace-nowrap">
                        {formatCompactMds(node.contractAmount)}
                      </td>
                    )}

                    {/* BUDGET (DS) RÉVISÉ */}
                    {visibleColumns.budgetDs && (
                      <td className="p-3 text-right font-mono font-extrabold text-emerald-800 whitespace-nowrap">
                        {formatCompactMds(node.budgetDs)}
                      </td>
                    )}

                    {/* ENGAGÉ */}
                    {visibleColumns.engage && (
                      <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatCompactMds(node.committed)}
                      </td>
                    )}

                    {/* COÛT RÉEL À DATE */}
                    {visibleColumns.coutReel && (
                      <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatCompactMds(node.actualCost)}
                      </td>
                    )}

                    {/* EAC */}
                    {visibleColumns.eac && (
                      <td className="p-3 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCompactMds(node.eac)}
                      </td>
                    )}

                    {/* AVANCEMENT PHYSIQUE (BARRE DE PROGRESSION AVEC POURCENTAGE DEDANS) */}
                    {visibleColumns.avancement && (
                      <td className="p-3 text-center">
                        <div className="w-28 bg-slate-100 rounded-full h-4 overflow-hidden relative border border-slate-200 mx-auto">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, node.progress || 0)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-800 font-mono">
                            {node.progress || 0}%
                          </span>
                        </div>
                      </td>
                    )}

                    {/* ÉCART (EAC - BUDGET) */}
                    {visibleColumns.ecart && (
                      <td className={`p-3 text-right font-mono font-extrabold whitespace-nowrap ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCompactMds(dev)}
                      </td>
                    )}

                    {/* STATUT (PILL BADGE AVEC BORDURE FINE CONFORME À L'IMAGE DE RÉFÉRENCE) */}
                    {visibleColumns.statut && (
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-[10.5px] font-bold border ${
                            node.status === 'Terminé'
                              ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                              : node.status === 'À risque'
                              ? 'bg-rose-50 border-rose-400 text-rose-700'
                              : node.status === 'Non démarré'
                              ? 'bg-slate-100 border-slate-300 text-slate-600'
                              : 'bg-emerald-50/50 border-emerald-400 text-emerald-700'
                          }`}
                        >
                          {node.status || 'En cours'}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}

              {visibleFlatRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400 font-bold">
                    Aucun lot ou activité WBS ne correspond aux critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. PIED DE PAGE & LEGENDE (STYLE EXACT MEDIA_1787752843706.PNG) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-600">
        <div className="flex items-center gap-2">
          <span>Affichage :</span>
          <select
            value={displayMode}
            onChange={e => setDisplayMode(e.target.value as any)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 cursor-pointer"
          >
            <option value="hierarchique">Hiérarchique ▾</option>
            <option value="flat">Aplat (Activités uniquement)</option>
          </select>
        </div>

        {/* Légende de couleurs des statuts */}
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> En cours
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> À risque
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span> Terminé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Non démarré
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            Total : <strong className="text-slate-900 font-black">{String(totalLots).padStart(2, '0')} lots / {totalActivities} activités</strong>
          </span>
          <button
            onClick={collapseAll}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black flex items-center gap-1 transition cursor-pointer"
          >
            Réduire tout ⯅
          </button>
        </div>
      </div>

      {/* 7. FICHE DÉTAILLÉE LATÉRALE (SLIDEOVER DRAWER QUAND UN NŒUD EST SÉLECTIONNÉ) */}
      {currentNode && (
        <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 z-50 p-6 space-y-4 overflow-y-auto">
          <div className="flex items-start justify-between border-b pb-3">
            <div>
              <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {currentNode.code}
              </span>
              <h2 className="font-black text-slate-900 text-base mt-1">{currentNode.description}</h2>
              <span className="text-[11px] text-slate-500 font-bold block">
                Niveau : <strong className="uppercase">{currentNode.level}</strong> — Nature : <strong className="text-blue-700 font-mono">{currentNode.nature}</strong>
              </span>
            </div>

            <button
              onClick={() => setSelectedNodeCode(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* SECTIONS CONFORMES À LA SECTION 10 DU CAHIER DES CHARGES */}
          {/* SECTION 1 : RÉFÉRENTIEL CONTRACTUEL (DQE) */}
          <div className="bg-blue-50/60 border border-blue-200 p-3.5 rounded-2xl space-y-2">
            <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center justify-between border-b border-blue-200/80 pb-1.5">
              <span>RÉFÉRENTIEL CONTRACTUEL</span>
              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-extrabold">Source : DQE</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-500 font-medium">N° Prix :</span> <strong className="font-mono text-slate-900 font-bold">{currentNode.priceNo || '-'}</strong></div>
              <div><span className="text-slate-500 font-medium">Unité :</span> <strong className="font-bold text-slate-900">{currentNode.unit}</strong></div>
              <div><span className="text-slate-500 font-medium">Qté Contractuelle :</span> <strong className="font-mono font-bold text-slate-900">{currentNode.contractQty || 0}</strong></div>
              <div><span className="text-slate-500 font-medium">PU Marché HT :</span> <strong className="font-mono font-bold text-blue-900">{formatFCFA(currentNode.contractUnitPrice || 0)}</strong></div>
              <div className="col-span-2 bg-white p-2 rounded-xl border border-blue-100 flex justify-between items-center">
                <span className="text-slate-600 font-bold">Montant Marché HT Total :</span>
                <strong className="font-mono text-blue-900 text-sm font-black">{formatFCFA(currentNode.contractAmount || 0)}</strong>
              </div>
            </div>
          </div>

          {/* SECTION 2 : COÛT PRÉVISIONNEL (DS) */}
          <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-2xl space-y-2">
            <h3 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
              <span>COÛT PRÉVISIONNEL</span>
              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-extrabold">Source : DS</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-500 font-medium">Nature :</span> <strong className="font-mono text-slate-900 font-bold">{currentNode.nature}</strong></div>
              <div><span className="text-slate-500 font-medium">PU DS Estimé :</span> <strong className="font-mono font-bold text-emerald-800">{formatFCFA(currentNode.costDsUnit || Math.round((currentNode.contractUnitPrice || 0) * 0.85))}</strong></div>
              <div className="col-span-2 bg-white p-2 rounded-xl border border-emerald-100 flex justify-between items-center">
                <span className="text-slate-600 font-bold">Budget DS Initial (DS) :</span>
                <strong className="font-mono text-emerald-800 text-sm font-black">{formatFCFA(currentNode.budgetDs)}</strong>
              </div>
              <div className="col-span-2 flex justify-between text-[11px] text-slate-600 px-1 font-semibold">
                <span>Marge Théorique Initiale (Marché - DS) :</span>
                <span className="font-mono font-bold text-emerald-700">{formatFCFA((currentNode.contractAmount || 0) - (currentNode.budgetDs || 0))}</span>
              </div>
            </div>
          </div>

          {/* SECTION 3 : EXÉCUTION & COST CONTROL */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span>DONNÉES D'EXÉCUTION & SUIVI RÉEL</span>
              <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-full font-extrabold">Production / Achats / Stock</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-xl border"><span className="text-[10px] text-slate-500 font-bold block">Avancement Physique</span><strong className="text-sm font-black text-emerald-600">{currentNode.progress}%</strong></div>
              <div className="bg-white p-2 rounded-xl border"><span className="text-[10px] text-slate-500 font-bold block">Total Engagé</span><strong className="font-mono text-slate-900 text-xs font-bold">{formatFCFA(currentNode.committed)}</strong></div>
              <div className="bg-white p-2 rounded-xl border"><span className="text-[10px] text-slate-500 font-bold block">Coût Réel à Date (AC)</span><strong className="font-mono text-slate-900 text-xs font-bold">{formatFCFA(currentNode.actualCost)}</strong></div>
              <div className="bg-white p-2 rounded-xl border"><span className="text-[10px] text-slate-500 font-bold block">Forecast Reste à Faire</span><strong className="font-mono text-slate-900 text-xs font-bold">{formatFCFA(currentNode.forecast || 0)}</strong></div>
              <div className="col-span-2 bg-slate-900 text-white p-2.5 rounded-xl flex justify-between items-center">
                <span className="font-extrabold text-slate-300 text-xs">Estimé à Terminaison (EAC) :</span>
                <strong className="font-mono text-emerald-400 text-sm font-black">{formatFCFA(currentNode.eac)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE D'IMPORTATION INTERACTIVE DQE / BPU (SECTION 2 & 3 DU CAHIER DES CHARGES) */}
      <DQEImportModal
        projectId={selectedProject.id}
        projectName={selectedProject.name}
        projectCode={selectedProject.code}
        existingWbsNodes={rawWbsNodes}
        existingDsActivities={realActivitiesSource}
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
          alert(`Succès : ${summary.totalItems} prix DQE importés.\n\n• Rapprochés avec WBS & DS : ${summary.matchedCount}\n• À vérifier : ${summary.toVerifyCount}\n• Non rapprochés : ${summary.unmatchedCount}\n• Montant Marché HT : ${summary.totalMarketAmount.toLocaleString('fr-FR')} FCFA`);
        }}
      />
    </div>
  );
};
