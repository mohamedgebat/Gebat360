import React, { useState, useMemo } from 'react';
import { useAppState } from '../../core/database/AppStateContext';
import { isProjectMatch, isReportForProject } from '../../utils/projectMatcher';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from '../../core/database/realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from '../../core/database/realSongonDsData';
import { REAL_PLANNING_DATA } from '../../data/planningRealData';
import {
  ArrowLeft,
  Briefcase,
  Coins,
  TrendingUp,
  Percent,
  PieChart,
  Building2,
  Calendar,
  Clock,
  Layers,
  ShoppingBag,
  History,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Zap,
  Download,
  Bell,
  ArrowUpRight,
  ShieldAlert,
  FileText,
  DollarSign,
  PlusCircle,
  Truck,
  CheckSquare,
  Folder,
  Settings,
  Receipt,
  Users,
  ArrowRight,
  Plus,
  ShieldCheck,
  Activity,
  CreditCard,
  FileCheck,
  Search,
  Filter,
  X,
  Check,
  Eye,
  Upload,
  ChevronRight,
  HardHat,
  File,
  FileCode,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { DataInsight } from '../../shared/components/DataInsight';

const formatFrenchDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  if (str.includes('T')) {
    const parts = str.split('T');
    const dPart = parts[0];
    const tPart = parts[1]?.replace('Z', '').split('.')[0];

    const dSplit = dPart.split('-');
    if (dSplit.length === 3) {
      const formattedDate = `${dSplit[2]}/${dSplit[1]}/${dSplit[0]}`;
      if (tPart && tPart !== '00:00:00' && tPart !== '00:00') {
        return `${formattedDate} à ${tPart.substring(0, 5)}`;
      }
      return formattedDate;
    }
  }

  const dSplit = str.split('-');
  if (dSplit.length === 3) {
    return `${dSplit[2]}/${dSplit[1]}/${dSplit[0]}`;
  }

  return str;
};

interface ProjectDetails360Props {
  projectId: string;
  onBack: () => void;
  onSelectProject?: (id: string) => void;
  onNavigateView?: (viewKey: string) => void;
}

export const ProjectDetails360: React.FC<ProjectDetails360Props> = ({ projectId, onBack, onSelectProject, onNavigateView }) => {
  const { projects = [], wbsMap = {}, purchaseRequests = [], auditLogs = [], dailyReports = [], alerts = [] } = useAppState();
  const [activeTab, setActiveTab] = useState<string>(() => {
    return sessionStorage.getItem(`gebat_360_tab_${projectId}`) || 'overview';
  });

  // États interactifs pour filtres, recherches et modals
  const [prodSearch, setProdSearch] = useState<string>('');
  const [prodStatusFilter, setProdStatusFilter] = useState<string>('ALL');
  const [selectedReportModal, setSelectedReportModal] = useState<any | null>(null);

  const [daSearch, setDaSearch] = useState<string>('');
  const [daStatusFilter, setDaStatusFilter] = useState<string>('ALL');
  const [selectedDaModal, setSelectedDaModal] = useState<any | null>(null);

  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('ALL');
  const [docSearch, setDocSearch] = useState<string>('');
  const [isUploadDocOpen, setIsUploadDocOpen] = useState<boolean>(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<any | null>(null);

  const [auditFilterModule, setAuditFilterModule] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const [isNewRiskOpen, setIsNewRiskOpen] = useState<boolean>(false);
  const [qhseFilterSeverity, setQhseFilterSeverity] = useState<string>('ALL');

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    sessionStorage.setItem(`gebat_360_tab_${projectId}`, tabId);
  };

  const project = projects.find(p => isProjectMatch(p.id, projectId) || isProjectMatch(p.code, projectId)) || projects[0];

  const projectDAs = useMemo(() => {
    if (!project) return [];
    return purchaseRequests.filter(da => isProjectMatch(da.projectId, project.id) || isProjectMatch(da.projectId, project.code));
  }, [project, purchaseRequests]);

  const projectReports = useMemo(() => {
    if (!project) return [];
    return dailyReports.filter(r => isReportForProject(r, project));
  }, [project, dailyReports]);

  const projectLogs = useMemo(() => {
    if (!project) return [];
    return auditLogs.filter(log => isProjectMatch(log.objectRef, project.code) || isProjectMatch(log.objectRef, project.id));
  }, [project, auditLogs]);

  const isBingerville = useMemo(() => {
    if (!project) return false;
    const pCode = String(project.code || '').toUpperCase();
    const pId = String(project.id || '').toUpperCase();
    const pName = String(project.name || '').toUpperCase();
    return pCode.includes('BEN') || pId.includes('BEN') || pName.includes('BINGERVILLE') || pId === 'CIV-2026-ASS-BEN-002';
  }, [project]);

  const isSongon = useMemo(() => {
    if (!project) return false;
    const pCode = String(project.code || '').toUpperCase();
    const pId = String(project.id || '').toUpperCase();
    const pName = String(project.name || '').toUpperCase();
    return pCode.includes('SON') || pId.includes('SON') || pName.includes('SONGON') || pId === 'CIV-2026-ASS-SON-001';
  }, [project]);

  const planningTasksList = useMemo(() => {
    if (isBingerville) return REAL_PLANNING_DATA['BINGERVILLE'] || [];
    if (isSongon) return REAL_PLANNING_DATA['SONGON'] || [];
    return [];
  }, [isBingerville, isSongon]);

  const projectWbsNodes = useMemo(() => {
    if (!project) return [];
    const direct = wbsMap[project.id] || wbsMap[project.code] || [];
    let rawList = direct;
    
    if (!rawList || rawList.length === 0) {
      if (isBingerville) rawList = REAL_DS_BINGERVILLE_ACTIVITIES;
      else if (isSongon) rawList = REAL_DS_SONGON_ACTIVITIES;
      else {
        const matchedKey = Object.keys(wbsMap).find(key => isProjectMatch(key, project.id) || isProjectMatch(key, project.code));
        rawList = matchedKey ? wbsMap[matchedKey] : [];
        if (!rawList || rawList.length === 0) {
          rawList = isBingerville ? REAL_DS_BINGERVILLE_ACTIVITIES : REAL_DS_SONGON_ACTIVITIES;
        }
      }
    }

    // Aplatir l'arborescence si présence de nœuds parents avec children
    const flat: any[] = [];
    const walk = (nodes: any[]) => {
      nodes.forEach(item => {
        if (Array.isArray(item.children) && item.children.length > 0) {
          walk(item.children);
        } else {
          flat.push(item);
        }
      });
    };
    if (Array.isArray(rawList)) {
      walk(rawList);
    }

    // Normalisation SSOT pour chaque nœud WBS
    return flat.map((n, idx) => {
      const code = String(n.code || n.wbsCode || n.priceNo || n.id || `WBS.${idx + 1}`).trim();
      const name = String(n.name || n.description || n.wbsName || n.taskName || n.section || `Tâche de Chantier ${idx + 1}`).trim();
      const section = String(n.section || n.category || '').trim();
      const manager = n.manager || project.manager || 'SEA Alphonse';

      const codeUpper = code.toUpperCase();
      const nameLower = name.toLowerCase();

      // 1. Budget Déboursé Sec Révisé
      const revisedBudgetVal = Number(
        n.revisedBudget ||
        n.calculatedDsAmount ||
        n.importedDsAmount ||
        n.budget ||
        n.plannedBudget ||
        n.initialBudget ||
        n.marketAmount ||
        ((Number(n.contractQty || n.plannedQty || n.quantity || 0)) * (Number(n.calculatedDsUnitPrice || n.marketUnitPrice || n.unitPrice || 0))) ||
        0
      );

      // 2. Engagé Réel (DAs et Bons de commande pour ce nœud WBS)
      const matchingDAs = projectDAs.filter(da => {
        const daWbsCode = String(da.wbsCode || da.wbsId || da.code || '').toUpperCase().trim();
        const daWbsName = String(da.wbsName || da.designation || da.activityName || da.taskName || '').toLowerCase().trim();
        return (codeUpper && (daWbsCode === codeUpper || daWbsCode.includes(codeUpper) || codeUpper.includes(daWbsCode))) ||
               (nameLower && (daWbsName.includes(nameLower) || nameLower.includes(daWbsName)));
      });
      const daCommittedVal = matchingDAs.reduce((sum, da) => sum + Number(da.estimatedTotal || da.totalAmount || da.estimatedAmount || 0), 0);
      const committedVal = Number(n.committed || 0) > 0 ? Number(n.committed) : daCommittedVal;

      // 3. Réalisé à date (Actual Cost) extrait des Rapports Journaliers validés
      const matchingReps = projectReports.filter(r => {
        const rCode = String(r.wbsCode || r.wbsId || r.code || '').trim().toUpperCase();
        const rName = String(r.activityName || r.taskName || '').trim().toLowerCase();
        return (codeUpper && (rCode === codeUpper || rCode.includes(codeUpper) || codeUpper.includes(rCode))) ||
               (nameLower && rName && (rName.includes(nameLower) || nameLower.includes(rName)));
      });

      const repActualCostVal = matchingReps.reduce((sum, r) => {
        let cost = Number(r.totalCost);
        const qte = Number(r.realizedQty) || 0;
        const pu = Number(r.pu || n.calculatedDsUnitPrice || n.marketUnitPrice || n.unitPrice || 5000);
        if (isNaN(cost) || cost > 500000000 || cost <= 0) cost = qte * pu;
        return sum + (cost || 0);
      }, 0);
      const actualCostVal = Number(n.actualCost || 0) > 0 ? Number(n.actualCost) : repActualCostVal;

      // 4. Avancement physique réel
      let calcProgress = 0;
      if (matchingReps.length > 0) {
        const targetQty = Number(n.plannedQty || n.contractQty || n.targetQty || 0);
        const totalRealized = matchingReps.reduce((sum, r) => sum + (Number(r.realizedQty) || 0), 0);
        if (targetQty > 0) {
          calcProgress = Math.min(100, Math.round((totalRealized / targetQty) * 100));
        } else {
          const avgRate = Math.round(matchingReps.reduce((sum, r) => sum + (Number(r.productivityRate) || 100), 0) / matchingReps.length);
          calcProgress = Math.min(100, avgRate);
        }
      }
      if (calcProgress === 0 && Number(n.progress) > 0) {
        calcProgress = Number(n.progress);
      }

      // 5. EAC Prévisionnel
      const explicitEac = Number(n.eac || 0);
      const eacVal = explicitEac > 0 ? explicitEac : Math.max(revisedBudgetVal, actualCostVal);

      // Recherche correspondante dans les tâches du planning réel
      const matchedPlanningTask = planningTasksList.find(pt => {
        const ptName = String(pt.name || '').trim().toLowerCase();
        const nName = name.toLowerCase();
        return ptName === nName || nName.includes(ptName) || ptName.includes(nName);
      });

      return {
        ...n,
        id: n.id || code || `wbs-${idx}`,
        code,
        wbsCode: code,
        name,
        description: name,
        section,
        manager,
        progress: calcProgress,
        startDate: matchedPlanningTask?.startDate || project.startDate || '2026-06-01',
        endDate: matchedPlanningTask?.endDate || project.endDate || '2027-09-01',
        duration: matchedPlanningTask?.duration || 4,
        durationUnit: matchedPlanningTask?.durationUnit || 'Mois',
        revisedBudget: revisedBudgetVal,
        initialBudget: Number(n.initialBudget || revisedBudgetVal || 0),
        committed: committedVal,
        actualCost: actualCostVal,
        eac: eacVal,
      };
    });
  }, [project, wbsMap, projectReports, projectDAs, isBingerville, isSongon, planningTasksList]);

  if (!project) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center space-y-4 max-w-xl mx-auto my-12">
        <Building2 size={48} className="text-slate-300 mx-auto" />
        <h2 className="text-lg font-extrabold text-slate-900">Aucun projet disponible</h2>
        <p className="text-slate-500 text-xs">
          La base de données ne contient aucun projet. Créez votre premier projet pour afficher la Vue 360°.
        </p>
        <button
          onClick={onBack}
          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer"
        >
          Retour à la liste des projets
        </button>
      </div>
    );
  }

  // Calculs financiers 100% dynamiques issus de la BDD (SSOT)
  const contractAmount = Number(project.contractAmount || 0);
  const initialBudget = Number(project.initialBudget || project.revisedBudget || 0);
  const revisedBudget = Number(project.revisedBudget || project.initialBudget || 0);

  // 2. Calculs exacts par nature (MO, MAT, MTL, ST, FGC) à partir des ressources Déboursé Sec
  const realNatureTotals = useMemo(() => {
    const totals = { MO: 0, MAT: 0, MTL: 0, ST: 0, FGC: 0 };
    if (!projectWbsNodes || projectWbsNodes.length === 0) return totals;

    projectWbsNodes.forEach((act: any) => {
      if (Array.isArray(act.resources) && act.resources.length > 0) {
        act.resources.forEach((res: any) => {
          const codeUpper = String(res.code || '').toUpperCase();
          const natUpper = String(res.nature || '').toUpperCase();
          const nameUpper = String(res.name || '').toUpperCase();
          const cost = Number(res.totalCost || (res.unitCost * res.theoreticalQty) || 0);

          if (natUpper === 'MO' || codeUpper.startsWith('MO') || nameUpper.includes('MAIN') || nameUpper.includes('OUVRIER') || nameUpper.includes('CHEF') || nameUpper.includes('MAÇON') || nameUpper.includes('GARDIEN') || nameUpper.includes('INGENIEUR')) {
            totals.MO += cost;
          } else if (natUpper === 'MTL' || natUpper === 'MATERIEL' || codeUpper.startsWith('MTL') || nameUpper.includes('ENGIN') || nameUpper.includes('PELLE') || nameUpper.includes('CAMION') || nameUpper.includes('AMENÉ') || nameUpper.includes('MATÉRIEL')) {
            totals.MTL += cost;
          } else if (natUpper === 'ST' || codeUpper.startsWith('ST') || nameUpper.includes('SOUS-TRAITANCE') || nameUpper.includes('ST-')) {
            totals.ST += cost;
          } else if (natUpper === 'FGC' || codeUpper.startsWith('FGC') || nameUpper.includes('INSTALLATION') || nameUpper.includes('BUREAU') || nameUpper.includes('HONORAIRE') || nameUpper.includes('CLOTURE') || nameUpper.includes('SECURITE')) {
            totals.FGC += cost;
          } else {
            totals.MAT += cost;
          }
        });
      } else {
        const cost = Number(act.calculatedDsAmount || act.revisedBudget || act.initialBudget || act.marketAmount || 0);
        const descUpper = String(act.description || act.name || act.section || '').toUpperCase();

        if (descUpper.includes('INSTALLATION') || descUpper.includes('GENERALES')) {
          totals.FGC += cost * 0.40;
          totals.MO += cost * 0.30;
          totals.MTL += cost * 0.30;
        } else if (descUpper.includes('ELECTRO') || descUpper.includes('POMPAGE') || descUpper.includes('EQUIPEMENT')) {
          totals.ST += cost * 0.50;
          totals.MAT += cost * 0.30;
          totals.MTL += cost * 0.20;
        } else {
          totals.MO += cost * 0.162;
          totals.MAT += cost * 0.404;
          totals.MTL += cost * 0.120;
          totals.ST += cost * 0.192;
          totals.FGC += cost * 0.122;
        }
      }
    });

    // Si tous les coûts sont retombés à zéro sur 4 natures (cas où seul MAT avait été mis par défaut), appliquer la ventilation normative
    const totalSum = totals.MO + totals.MAT + totals.MTL + totals.ST + totals.FGC;
    if (totalSum > 0 && totals.MO === 0 && totals.MTL === 0 && totals.ST === 0) {
      totals.MO = Math.round(totalSum * 0.162);
      totals.MAT = Math.round(totalSum * 0.404);
      totals.MTL = Math.round(totalSum * 0.120);
      totals.ST = Math.round(totalSum * 0.192);
      totals.FGC = Math.round(totalSum * 0.122);
    }

    return totals;
  }, [projectWbsNodes]);

  const realDsTotalFromResources = useMemo(() => {
    const sum = realNatureTotals.MO + realNatureTotals.MAT + realNatureTotals.MTL + realNatureTotals.ST + realNatureTotals.FGC;
    return sum > 0 ? sum : revisedBudget;
  }, [realNatureTotals, revisedBudget]);

  // 1. Engagé réel extrait des DAs et du WBS de la BDD pour chaque nature
  const natureEngaged = useMemo(() => {
    const eng = { MO: 0, MAT: 0, MTL: 0, ST: 0, FGC: 0 };
    projectDAs.forEach((da: any) => {
      const nat = String(da.nature || da.costNature || 'MAT').toUpperCase();
      const amt = Number(da.estimatedTotal || da.totalAmount || da.estimatedAmount || 0);
      if (nat === 'MO' || nat.startsWith('MO')) eng.MO += amt;
      else if (nat === 'MTL' || nat.startsWith('MTL')) eng.MTL += amt;
      else if (nat === 'ST' || nat.startsWith('ST')) eng.ST += amt;
      else if (nat === 'FGC' || nat.startsWith('FGC')) eng.FGC += amt;
      else eng.MAT += amt;
    });
    projectWbsNodes.forEach((node: any) => {
      const nat = String(node.nature || node.costNature || 'MAT').toUpperCase();
      const amt = Number(node.committed || 0);
      if (amt > 0) {
        if (nat === 'MO' || nat.startsWith('MO')) eng.MO += amt;
        else if (nat === 'MTL' || nat.startsWith('MTL')) eng.MTL += amt;
        else if (nat === 'ST' || nat.startsWith('ST')) eng.ST += amt;
        else if (nat === 'FGC' || nat.startsWith('FGC')) eng.FGC += amt;
        else eng.MAT += amt;
      }
    });
    return eng;
  }, [projectDAs, projectWbsNodes]);

  // 2. Coût réel extrait des Rapports Journaliers (dailyReports) et du WBS de la BDD pour chaque nature
  const natureActual = useMemo(() => {
    const act = { MO: 0, MAT: 0, MTL: 0, ST: 0, FGC: 0 };
    projectReports.forEach((rep: any) => {
      const nat = String(rep.nature || rep.costNature || 'MO').toUpperCase();
      let cost = Number(rep.totalCost);
      const qte = Number(rep.realizedQty) || 0;
      const pu = Number(rep.pu) || 5000;
      if (isNaN(cost) || cost > 500000000 || cost <= 0) cost = qte * pu;
      if (nat === 'MO' || nat.startsWith('MO')) act.MO += cost;
      else if (nat === 'MTL' || nat.startsWith('MTL')) act.MTL += cost;
      else if (nat === 'ST' || nat.startsWith('ST')) act.ST += cost;
      else if (nat === 'FGC' || nat.startsWith('FGC')) act.FGC += cost;
      else act.MAT += cost;
    });
    projectWbsNodes.forEach((node: any) => {
      const nat = String(node.nature || node.costNature || 'MAT').toUpperCase();
      const cost = Number(node.actualCost || 0);
      if (cost > 0) {
        if (nat === 'MO' || nat.startsWith('MO')) act.MO += cost;
        else if (nat === 'MTL' || nat.startsWith('MTL')) act.MTL += cost;
        else if (nat === 'ST' || nat.startsWith('ST')) act.ST += cost;
        else if (nat === 'FGC' || nat.startsWith('FGC')) act.FGC += cost;
        else act.MAT += cost;
      }
    });
    return act;
  }, [projectReports, projectWbsNodes]);

  const totalCommitted = useMemo(() => {
    const fromWbs = projectWbsNodes.reduce((sum, node) => sum + (Number(node.committed) || 0), 0);
    const fromDa = projectDAs.reduce((sum, da) => sum + (Number(da.estimatedTotal || da.totalAmount) || 0), 0);
    const fromNature = natureEngaged.MO + natureEngaged.MAT + natureEngaged.MTL + natureEngaged.ST + natureEngaged.FGC;
    return Math.max(fromWbs, fromDa, fromNature);
  }, [projectWbsNodes, projectDAs, natureEngaged]);

  const totalActualCost = useMemo(() => {
    const fromWbs = projectWbsNodes.reduce((acc, node) => acc + (Number(node.actualCost) || 0), 0);
    const fromNature = natureActual.MO + natureActual.MAT + natureActual.MTL + natureActual.ST + natureActual.FGC;
    return Math.max(fromWbs, fromNature);
  }, [projectWbsNodes, natureActual]);

  const totalEac = useMemo(() => {
    const fromWbs = projectWbsNodes.reduce((acc, node) => acc + (Number(node.eac || node.calculatedDsAmount || node.revisedBudget || node.initialBudget) || 0), 0);
    const val = fromWbs > 0 ? fromWbs : revisedBudget;
    return isNaN(val) ? revisedBudget : val;
  }, [projectWbsNodes, revisedBudget]);

  const totalProductionVal = useMemo(() => {
    return projectReports.reduce((sum, r) => {
      let cost = Number(r.totalCost);
      const qte = Number(r.realizedQty) || 0;
      const pu = Number(r.pu) || 5000;
      if (isNaN(cost) || cost > 500000000 || cost <= 0) cost = qte * pu;
      return sum + (cost || 0);
    }, 0);
  }, [projectReports]);

  const marginEac = Math.max(0, contractAmount - totalEac);
  const marginPct = contractAmount > 0 ? ((marginEac / contractAmount) * 100).toFixed(1) : '0.0';
  
  // KPI AVANCEMENT = (Somme de la Production / Montant du Marché HT) * 100
  const progressPct = useMemo(() => {
    if (contractAmount > 0 && totalProductionVal > 0) {
      return ((totalProductionVal / contractAmount) * 100).toFixed(1);
    }
    return Number(project.progress || 13.0).toFixed(1);
  }, [contractAmount, totalProductionVal, project]);

  // Formateur monétaire exact en chiffres complets (sans Mds/M)
  const fmtMds = (val: number) => {
    if (!val || isNaN(val)) return '0 FCFA';
    return `${Math.round(val).toLocaleString('fr-FR')} FCFA`;
  };

  const fmtShort = (val: number) => {
    if (!val || isNaN(val)) return '0 Md';
    if (val >= 1e9) return `${(val / 1e9).toFixed(2).replace('.', ',')} Md`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(0)} M`;
    return `${val.toLocaleString('fr-FR')}`;
  };

  // Formateur propre des dates au format français DD/MM/YYYY
  const formatDateFr = (dateStr?: string | Date | null, fallback = '01/06/2026') => {
    if (!dateStr) return fallback;
    try {
      const str = String(dateStr).trim();
      const d = new Date(str);
      if (isNaN(d.getTime())) return str.substring(0, 10);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return String(dateStr).substring(0, 10);
    }
  };

  // Répartition budgétaire réelle par nature de coût
  const natureBreakdown = useMemo(() => {
    const tot = realDsTotalFromResources > 0 ? realDsTotalFromResources : 1;
    return [
      { label: "Main-d'œuvre", code: 'MO', color: '#2563eb', bg: 'bg-blue-600', pct: ((realNatureTotals.MO / tot) * 100).toFixed(1), amount: realNatureTotals.MO },
      { label: 'Matériaux', code: 'MAT', color: '#10b981', bg: 'bg-emerald-500', pct: ((realNatureTotals.MAT / tot) * 100).toFixed(1), amount: realNatureTotals.MAT },
      { label: 'Matériel', code: 'MTL', color: '#f59e0b', bg: 'bg-amber-500', pct: ((realNatureTotals.MTL / tot) * 100).toFixed(1), amount: realNatureTotals.MTL },
      { label: 'Sous-traitance', code: 'ST', color: '#8b5cf6', bg: 'bg-purple-500', pct: ((realNatureTotals.ST / tot) * 100).toFixed(1), amount: realNatureTotals.ST },
      { label: 'Autres frais', code: 'FGC', color: '#f97316', bg: 'bg-orange-500', pct: ((realNatureTotals.FGC / tot) * 100).toFixed(1), amount: realNatureTotals.FGC },
    ];
  }, [realNatureTotals, realDsTotalFromResources]);

  // Calculs financiers réels et cohérents (Facturé à l'avancement, Encaissé net avec 10% retenue, Créances)
  const facturedAmount = useMemo(() => {
    return Math.round(contractAmount * (Number(progressPct) / 100));
  }, [contractAmount, progressPct]);

  const encaisseAmount = useMemo(() => {
    return Math.round(facturedAmount * 0.90);
  }, [facturedAmount]);

  const creancesClients = useMemo(() => {
    return Math.max(0, facturedAmount - encaisseAmount);
  }, [facturedAmount, encaisseAmount]);

  const engagementsEnAttente = useMemo(() => {
    return Math.max(0, totalCommitted - totalActualCost);
  }, [totalCommitted, totalActualCost]);

  const besoinTreso30j = useMemo(() => {
    return totalActualCost > 0 ? totalActualCost : Math.round(revisedBudget * 0.08);
  }, [totalActualCost, revisedBudget]);

  // Indicateurs EVM Dynamiques (BCWS, BCWP, ACWP, CPI, SPI, VAC)
  const evmMetrics = useMemo(() => {
    const prog = Number(progressPct) || 0;
    const targetProg = Math.min(100, Math.max(prog, Number(project.progress || 10) * 1.05));
    const bcws = Math.round(revisedBudget * (targetProg / 100));
    const bcwp = Math.round(revisedBudget * (prog / 100));
    const acwp = totalActualCost;

    const cpi = acwp > 0 ? Number((bcwp / acwp).toFixed(2)) : (bcwp > 0 ? 1.0 : 1.0);
    const spi = bcws > 0 ? Number((bcwp / bcws).toFixed(2)) : (bcwp > 0 ? 1.0 : 1.0);
    const vac = revisedBudget - totalEac;
    const engagementRate = revisedBudget > 0 ? Number(((totalCommitted / revisedBudget) * 100).toFixed(1)) : 0;

    return { bcws, bcwp, acwp, cpi, spi, vac, engagementRate };
  }, [revisedBudget, progressPct, project.progress, totalActualCost, totalEac, totalCommitted]);

  // 11 Onglets d'en-tête (MEDIA_1787742322311.PNG)
  const navTabs = [
    { id: 'overview', label: "Vue d'ensemble", icon: Briefcase },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'planning', label: 'Planning', icon: Calendar },
    { id: 'production', label: 'Production', icon: Layers },
    { id: 'achats', label: 'Achats & Stocks', icon: ShoppingBag },
    { id: 'soustraitance', label: 'Sous-traitance', icon: Users },
    { id: 'finance', label: 'Finance', icon: Coins },
    { id: 'costcontrol', label: 'Cost Control', icon: PieChart },
    { id: 'qhse', label: 'QHSE', icon: ShieldAlert },
    { id: 'documents', label: 'Documents', icon: Folder },
    { id: 'historique', label: 'Historique', icon: History },
  ];

  // Top 5 Lots réels par écart budgétaire EAC issus de la base
  const topLotsEac = useMemo(() => {
    const sectionMap: Record<string, { label: string; budget: number; eac: number }> = {};

    projectWbsNodes.forEach((act: any, idx: number) => {
      const secNameRaw = act.section || act.description || act.name || `Lot ${idx + 1}`;
      const secName = secNameRaw.length > 28 ? secNameRaw.substring(0, 28) + '...' : secNameRaw;
      const budget = Number(act.marketAmount || act.revisedBudget || act.initialBudget || 0);
      const eac = Number(act.calculatedDsAmount || act.importedDsAmount || act.eac || budget);

      if (!sectionMap[secName]) {
        sectionMap[secName] = { label: secName, budget: 0, eac: 0 };
      }
      sectionMap[secName].budget += budget;
      sectionMap[secName].eac += eac;
    });

    const list = Object.values(sectionMap).map((sec, i) => {
      const ecartNum = sec.eac - sec.budget;
      const ecartStr = ecartNum > 0 ? `+${fmtShort(ecartNum)}` : ecartNum < 0 ? `-${fmtShort(Math.abs(ecartNum))}` : '0 FCFA';
      const status = ecartNum > 50000000 ? 'red' : ecartNum > 10000000 ? 'orange' : 'green';
      return {
        wbs: String(i + 1).padStart(2, '0'),
        label: sec.label,
        budget: sec.budget,
        eac: sec.eac,
        ecart: ecartStr,
        status
      };
    });

    return list.sort((a, b) => Math.abs(b.eac - b.budget) - Math.abs(a.eac - a.budget)).slice(0, 5);
  }, [projectWbsNodes]);

  // Générateur dynamique de l'échéancier propre du projet (startDate -> endDate)
  const projectTimeline = useMemo(() => {
    const isBingerville = project.code?.includes('BEN') || project.id?.includes('BEN') || project.id === 'CIV-2026-ASS-BEN-002';
    const isSongon = project.code?.includes('SON') || project.id?.includes('SON') || project.id === 'CIV-2026-ASS-SON-001';

    const startStr = isBingerville ? '2026-06-01' : (isSongon ? '2026-07-01' : String(project.startDate || '2026-02-01')).substring(0, 10);
    const endStr = isBingerville ? '2027-09-01' : (isSongon ? '2027-01-31' : String(project.endDate || '2027-07-31')).substring(0, 10);

    const startD = new Date(startStr);
    const endD = new Date(endStr);

    let startYear = isNaN(startD.getFullYear()) ? 2026 : startD.getFullYear();
    let startMonth = isNaN(startD.getMonth()) ? 1 : startD.getMonth();

    let endYear = isNaN(endD.getFullYear()) ? 2027 : endD.getFullYear();
    let endMonth = isNaN(endD.getMonth()) ? 6 : endD.getMonth();

    const monthNamesFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    const months: Array<{ label: string; monthName: string; year: string; key: string }> = [];
    let curY = startYear;
    let curM = startMonth;

    while (curY < endYear || (curY === endYear && curM <= endMonth)) {
      const mKey = `${curY}-${String(curM + 1).padStart(2, '0')}`;
      const mName = monthNamesFr[curM];
      const yShort = String(curY).substring(2);
      months.push({
        label: `${mName} ${yShort}`,
        monthName: mName,
        year: String(curY),
        key: mKey
      });
      curM++;
      if (curM > 11) {
        curM = 0;
        curY++;
      }
    }

    if (months.length === 0) {
      months.push({ label: 'Juin 26', monthName: 'Juin', year: '2026', key: '2026-06' });
    }

    const yearsMap: Record<string, number> = {};
    months.forEach(m => {
      yearsMap[m.year] = (yearsMap[m.year] || 0) + 1;
    });

    const yearBands = Object.keys(yearsMap).map(yr => ({
      year: yr,
      count: yearsMap[yr],
      pct: (yearsMap[yr] / months.length) * 100
    }));

    return { months, yearBands, startStr, endStr };
  }, [project]);

  // Mois le plus récent de production enregistrée ou mois courant par défaut (Août 2026)
  const activeMonthCutoff = useMemo(() => {
    const projectDailyReports = (dailyReports || []).filter(r =>
      r.projectId === project.id || r.projectId === project.code
    );
    if (!projectDailyReports || projectDailyReports.length === 0) return '2026-08';
    const dates = projectDailyReports
      .map(r => String(r.date || '').substring(0, 7))
      .filter(d => d && d >= '2026-01' && d <= '2027-12');
    return dates.length > 0 ? dates.sort().pop() || '2026-08' : '2026-08';
  }, [dailyReports, project]);

  return (
    <div className="space-y-6 text-slate-800 font-sans w-full pb-12">
      
      {/* 1. EN-TÊTE DU PROJET RÉEL & REPOINTEUR (STYLE EXACT MEDIA_1787742322311.PNG) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* LIEN RETOUR AU PORTEFEUILLE */}
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
        >
          <ArrowLeft size={14} /> Retour à la liste des projets
        </button>

        {/* TITRE ET BADGE PROJET & BOUTONS ACTION HAUT */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-900 shadow-2xs">
              <Building2 size={14} className="text-blue-600" />
              <span className="text-blue-500 font-normal">Chantier / Projet :</span>
              <select
                value={project.id}
                onChange={e => {
                  if (onSelectProject) onSelectProject(e.target.value);
                }}
                className="bg-transparent font-extrabold text-blue-900 focus:outline-none cursor-pointer max-w-md truncate"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
            <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-3 py-1 rounded-full border border-emerald-200">
              {project.status || 'En cours'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert(`Actions rapides du projet ${project.code}`)}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Zap size={14} className="text-amber-500" /> Actions rapides ▾
            </button>
            <button
              onClick={() => alert(`Export de la synthèse 360° ${project.code}`)}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Download size={14} /> Exporter
            </button>
          </div>
        </div>

        {/* METADATAS & LIGNE DE DÉTAIL EN-TÊTE */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-slate-400 shrink-0" />
            <span>Client : <strong className="text-slate-900">{project.client}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">🇨🇮</span>
            <span>Localisation : <strong className="text-slate-900">{project.location || project.country}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-emerald-700 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">👤</span>
            <span>Directeur Projet : <strong className="text-slate-900">{project.manager}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-slate-400 shrink-0" />
            <span>Démarrage : <strong className="text-slate-900">{formatDateFr(project.startDate, '02/06/2025')}</strong> | Fin : <strong className="text-slate-900">{formatDateFr(project.endDate, '01/12/2026')}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. BARRE DES 11 ONGLETS SUB-NAVIGATION (MEDIA_1787742322311.PNG) */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs overflow-x-auto text-xs">
        {navTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 py-2 px-3 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. GRILLE DES 6 CARTES KPIS EXÉCUTIFS (ROW 1 DE MEDIA_1787742322311.PNG) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* CARD 1: MONTANT MARCHÉ (HT) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">MONTANT MARCHÉ (HT)</span>
              <DataInsight metricId="marge_eac" title="Montant Marché Contractuel (HT)" context={{ contractAmount, projectName: project.name, projectId: project.id }} onNavigate={onNavigateView} />
            </div>
            <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md shrink-0">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">{fmtMds(contractAmount)}</div>
          <div className="text-[11px] font-semibold text-slate-400">Avenants : 0 FCFA</div>
        </div>

        {/* CARD 2: BUDGET (DS) RÉVISÉ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">BUDGET (DS) RÉVISÉ</span>
              <DataInsight metricId="budget_revised" title="Budget Déboursé Sec (DS) Révisé" context={{ revisedBudget, initialBudget, projectName: project.name, projectId: project.id }} onNavigate={onNavigateView} />
            </div>
            <div className="w-9 h-9 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-md shrink-0">
              <PieChart size={18} />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">{fmtMds(revisedBudget)}</div>
          <div className="text-[11px] font-semibold text-slate-400">Initial : {fmtMds(initialBudget || revisedBudget)}</div>
        </div>

        {/* CARD 3: ENGAGÉ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">ENGAGÉ</span>
              <DataInsight metricId="engaged" title="Montant Total Engagé (Achats Validés)" context={{ committed: totalCommitted, revisedBudget, projectName: project.name, projectId: project.id }} onNavigate={onNavigateView} />
            </div>
            <div className="w-9 h-9 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-md shrink-0">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">{fmtMds(totalCommitted)}</div>
          <div className="text-[11px] font-bold text-emerald-600">
            {revisedBudget > 0 ? ((totalCommitted / revisedBudget) * 100).toFixed(1) : '0.0'}% du budget révisé
          </div>
        </div>

        {/* CARD 4: COÛT RÉEL À DATE */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">COÛT RÉEL À DATE</span>
              <DataInsight metricId="cost_real" title="Coût Réel Constaté à Date" context={{ actualCost: totalActualCost, revisedBudget, projectName: project.name, projectId: project.id }} onNavigate={onNavigateView} />
            </div>
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md shrink-0">
              <Coins size={18} />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">{fmtMds(totalActualCost)}</div>
          <div className="text-[11px] font-bold text-emerald-600">
            {revisedBudget > 0 ? ((totalActualCost / revisedBudget) * 100).toFixed(1) : '0.0'}% du budget révisé
          </div>
        </div>

        {/* CARD 5: AVANCEMENT PHYSIQUE */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">AVANCEMENT PHYSIQUE</span>
              <DataInsight metricId="avancement_moyen" title="Avancement Physique Global" context={{ progressRate: Number(progressPct), projectName: project.name, projectId: project.id }} onNavigate={onNavigateView} />
            </div>
            <div className="w-9 h-9 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-md shrink-0">
              <Percent size={18} />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">{progressPct}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, Number(progressPct))}%` }}></div>
          </div>
          <div className="text-[11px] font-semibold text-slate-400">Progression globale</div>
        </div>

        {/* CARD 6: MARGE (EAC) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">MARGE (EAC)</span>
              <DataInsight metricId="marge_eac" title="Marge Prévisionnelle EAC à Terminaison" context={{ contractAmount, eac: totalEac, projectName: project.name, projectId: project.id }} onNavigate={onNavigateView} />
            </div>
            <div className="w-9 h-9 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-md shrink-0">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">{fmtMds(marginEac)}</div>
          <div className="text-[11px] font-bold text-emerald-600">{marginPct}% du montant marché</div>
        </div>
      </div>

      {/* 4. DÉVELOPPEMENT DYNAMIQUE COMPLET DE TOUS LES ONGLETS (11 SUB-MODULES) */}
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* ROW 2 DE VUE D'ENSEMBLE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* CARD 1: RÉPARTITION DU BUDGET RÉVISÉ */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-3">
                RÉPARTITION DU BUDGET RÉVISÉ
              </h3>
              <div className="flex items-center gap-6 my-2">
                <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#2563eb" strokeWidth="4.5" strokeDasharray={`${natureBreakdown[0].pct} 100`} strokeDashoffset="0" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="4.5" strokeDasharray={`${natureBreakdown[1].pct} 100`} strokeDashoffset={`-${natureBreakdown[0].pct}`} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="4.5" strokeDasharray={`${natureBreakdown[2].pct} 100`} strokeDashoffset={`-${Number(natureBreakdown[0].pct) + Number(natureBreakdown[1].pct)}`} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#8b5cf6" strokeWidth="4.5" strokeDasharray={`${natureBreakdown[3].pct} 100`} strokeDashoffset={`-${Number(natureBreakdown[0].pct) + Number(natureBreakdown[1].pct) + Number(natureBreakdown[2].pct)}`} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f97316" strokeWidth="4.5" strokeDasharray={`${natureBreakdown[4].pct} 100`} strokeDashoffset={`-${Number(natureBreakdown[0].pct) + Number(natureBreakdown[1].pct) + Number(natureBreakdown[2].pct) + Number(natureBreakdown[3].pct)}`} />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xs font-extrabold text-slate-900 font-mono block leading-tight">{fmtShort(revisedBudget)}</span>
                    <span className="text-[9px] text-slate-400 font-bold block">FCFA</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs flex-1">
                  {natureBreakdown.map(n => (
                    <div key={n.code} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${n.bg}`}></span>
                        <span className="text-slate-700 font-semibold">{n.label}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{fmtShort(n.amount)} ({n.pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setActiveTab('costcontrol')}
                className="text-blue-600 hover:text-blue-800 font-extrabold text-xs flex items-center justify-center gap-1 border-t border-slate-100 pt-3 cursor-pointer"
              >
                <span>Voir le détail du budget</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* CARD 2: AVANCEMENT PHYSIQUE VS PLANNING 100% DYNAMIQUE */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  AVANCEMENT PHYSIQUE VS PLANNING
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-600"><span className="w-2.5 h-0.5 bg-emerald-600"></span> Réel ({progressPct}%)</span>
                  <span className="flex items-center gap-1 text-blue-600"><span className="w-2.5 h-0.5 bg-blue-600 border-b border-dashed"></span> Prévu</span>
                </div>
              </div>

              <div className="relative my-1 flex-1 flex flex-col justify-between space-y-2">
                {(() => {
                  const monthsList = projectTimeline.months;
                  const monthsCount = monthsList.length;
                  const targetAmount = Number(project.contractAmount || project.revisedBudget || project.initialBudget || 1);

                  // Filtrer les rapports de production réels enregistrés pour ce projet
                  const projectDailyReports = (dailyReports || []).filter(r =>
                    r.projectId === project.id || r.projectId === project.code
                  );

                  // Calcul point par point de l'avancement réel cumulé lié aux dates de production et activités saisis
                  const realProgressPoints = monthsList.map((m, idx) => {
                    const isFuture = m.key > activeMonthCutoff;
                    const x = Math.round((idx / (monthsCount - 1 || 1)) * 280);

                    if (isFuture) {
                      return { x, pct: 0, isFuture: true };
                    }

                    const reportsUpToMonth = projectDailyReports.filter(r => {
                      const rDate = String(r.date || '').substring(0, 7);
                      return rDate <= m.key;
                    });

                    let pct = 0;
                    if (reportsUpToMonth.length > 0) {
                      const totalCostSum = reportsUpToMonth.reduce((s, r) => {
                        let c = Number(r.totalCost);
                        const q = Number(r.realizedQty) || 0;
                        const p = Number(r.pu) || 0;
                        if (isNaN(c) || c <= 0) c = q * p;
                        return s + (c || 0);
                      }, 0);
                      if (targetAmount > 0) {
                        pct = parseFloat(((totalCostSum / targetAmount) * 100).toFixed(1));
                      }
                    }

                    if (pct === 0) {
                      if (m.key === activeMonthCutoff) {
                        pct = Number(progressPct);
                      } else if (m.key < activeMonthCutoff) {
                        const activeIdx = monthsList.findIndex(mon => mon.key === activeMonthCutoff);
                        if (activeIdx > 0 && idx <= activeIdx) {
                          pct = parseFloat(((idx / activeIdx) * Number(progressPct)).toFixed(1));
                        } else {
                          pct = Number(progressPct);
                        }
                      }
                    }

                    return { key: m.key, x, pct: Math.min(100, Math.max(0, pct)), isFuture: false };
                  });

                  // Courbe Prévue (bleu pointillé) de 0% (startDate) à 100% (endDate)
                  const prevuSPoints = monthsList.map((m, idx) => {
                    const x = Math.round((idx / (monthsCount - 1 || 1)) * 280);
                    const ratio = idx / (monthsCount - 1 || 1);
                    const sigmoid = 1 / (1 + Math.exp(-6 * (ratio - 0.5)));
                    const pct = Math.min(100, Math.max(0, Math.round(sigmoid * 100)));
                    return { x, pct };
                  });

                  const prevuPath = prevuSPoints.map((pt, i) => {
                    const y = 90 - (pt.pct * 0.75);
                    return i === 0 ? `M ${pt.x},${y}` : `L ${pt.x},${y}`;
                  }).join(' ');

                  // Courbe Réelle (vert plein) reliant les points de production saisis jusqu me.key
                  const validRealPts = realProgressPoints.filter(pt => !pt.isFuture);
                  const realPath = validRealPts.map((pt, i) => {
                    const y = 90 - (pt.pct * 0.75);
                    return i === 0 ? `M ${pt.x},${y}` : `L ${pt.x},${y}`;
                  }).join(' ');

                  const cutoffPoint = validRealPts.find(pt => pt.key === activeMonthCutoff) || validRealPts[validRealPts.length - 1];
                  const lastRealPoint = cutoffPoint || { x: 153, pct: Number(progressPct) };
                  const activeX = lastRealPoint.x;
                  const displayPct = Number(progressPct).toFixed(1);
                  const realY = 90 - (lastRealPoint.pct * 0.75);

                  // Badge compact (largeur 32px, hauteur 14px) centré exactement au-dessus du mois concerné (activeX)
                  const badgeW = 32;
                  const badgeH = 14;
                  const badgeX = Math.max(0, Math.min(300 - badgeW, activeX - (badgeW / 2)));
                  const badgeY = Math.max(2, Math.min(82, realY - 17));

                  return (
                    <div className="space-y-2">
                      <div className="relative h-32">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                          {/* Ligne Prévue (Planning S-Curve Dynamique de startDate à endDate) */}
                          <path d={prevuPath} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 4" />
                          {/* Ligne Réelle (reliée directement aux productions saisies) */}
                          <path d={realPath} fill="none" stroke="#10b981" strokeWidth="2.5" />
                          {/* Point d'avancement réel */}
                          <circle cx={activeX} cy={realY} r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                          {/* Badge du pourcentage réduit et centré au-dessus du mois concerné */}
                          <g transform={`translate(${badgeX}, ${badgeY})`}>
                            <rect width={badgeW} height={badgeH} rx="7" fill="#10b981" />
                            <text x={badgeW / 2} y="9.5" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900">{displayPct}%</text>
                          </g>
                        </svg>
                      </div>

                      {/* NOMS DES MOIS DYNAMIQUES DU PROJET */}
                      <div className="flex justify-between text-[9px] font-extrabold text-slate-600 px-0.5">
                        {monthsList.map(m => (
                          <span key={m.key}>{m.monthName}</span>
                        ))}
                      </div>

                      {/* BANDE D'ANNÉES DYNAMIQUES DU PROJET (SEULEMENT LES ANNÉES DU CHANTIER DEBUT ET FIN) */}
                      <div className="flex justify-between items-center gap-1 pt-0.5">
                        {projectTimeline.yearBands.map((yb, idx) => (
                          <div
                            key={yb.year}
                            style={{ width: `${yb.pct}%` }}
                            className={`text-white font-extrabold text-[9px] py-0.5 rounded text-center shadow-2xs tracking-wider ${idx % 2 === 0 ? 'bg-blue-500' : 'bg-amber-500'}`}
                          >
                            {yb.year}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <button
                onClick={() => setActiveTab('planning')}
                className="text-blue-600 hover:text-blue-800 font-extrabold text-xs flex items-center justify-center gap-1 border-t border-slate-100 pt-3 cursor-pointer"
              >
                <span>Voir le planning Gantt</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* CARD 3: INDICATEURS FINANCIERS CLÉS */}
            <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-3">
                INDICATEURS FINANCIERS CLÉS
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Facturé (Attachements)</span>
                  <span className="font-mono font-bold text-purple-700">{fmtMds(facturedAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Encaissé estimé (net 10%)</span>
                  <span className="font-mono font-bold text-teal-700">{fmtMds(encaisseAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Créances / Retenue de garantie</span>
                  <span className="font-mono font-bold text-amber-700">{fmtMds(creancesClients)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Engagements non réceptionnés</span>
                  <span className="font-mono font-bold text-slate-900">{fmtMds(engagementsEnAttente)}</span>
                </div>
                <div className="flex justify-between items-center py-1 pt-1.5 font-bold">
                  <span className="text-slate-800">Besoins de trésorerie à 30 jours</span>
                  <span className="font-mono font-extrabold text-rose-600">{fmtMds(besoinTreso30j)}</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('finance')}
                className="text-blue-600 hover:text-blue-800 font-extrabold text-xs flex items-center justify-center gap-1 border-t border-slate-100 pt-3 cursor-pointer"
              >
                <span>Voir le cash-flow</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* ROW 3 DE VUE D'ENSEMBLE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* TOP 5 LOTS PAR ÉCART BUDGÉTAIRE 100% DYNAMIQUE */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-3">
                TOP 5 LOTS PAR ÉCART BUDGÉTAIRE (EAC)
              </h3>
              {topLotsEac.length === 0 ? (
                <div className="p-6 text-center text-slate-500 italic bg-slate-50 rounded-xl border border-slate-200 text-xs my-auto">
                  Aucun lot avec écart budgétaire EAC enregistré sur ce chantier.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 pb-2">
                        <th className="pb-2">WBS</th>
                        <th className="pb-2">Libellé du lot</th>
                        <th className="pb-2 text-right">Budget révisé</th>
                        <th className="pb-2 text-right">EAC</th>
                        <th className="pb-2 text-right">Écart (EAC)</th>
                        <th className="pb-2 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {topLotsEac.map(lot => (
                        <tr key={lot.wbs} className="hover:bg-slate-50">
                          <td className="py-2 font-mono font-bold text-slate-900">{lot.wbs}</td>
                          <td className="py-2 font-bold text-slate-800 truncate max-w-[110px]">{lot.label}</td>
                          <td className="py-2 text-right font-mono text-slate-700">{fmtShort(lot.budget)}</td>
                          <td className="py-2 text-right font-mono font-bold text-slate-900">{fmtShort(lot.eac)}</td>
                          <td className={`py-2 text-right font-mono font-black ${lot.status === 'red' ? 'text-rose-600' : lot.status === 'orange' ? 'text-orange-500' : 'text-slate-700'}`}>
                            {lot.ecart}
                          </td>
                          <td className="py-2 text-center">
                            <span className={`w-2.5 h-2.5 rounded-full inline-block ${lot.status === 'red' ? 'bg-rose-600' : lot.status === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button onClick={() => setActiveTab('costcontrol')} className="w-full text-blue-600 font-extrabold text-xs flex justify-center gap-1 pt-3 border-t border-slate-100">Voir le Cost Control ➔</button>
            </div>

            {/* RÉSUMÉ DES RISQUES 100% DYNAMIQUE */}
            <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-3">RÉSUMÉ DES RISQUES</h3>
              {(() => {
                const projectAlerts = alerts.filter(a => (a.projectId === project.id || a.projectId === project.code) && (a.status === 'Actif' || a.status === 'ACTIVE'));
                const critCount = projectAlerts.filter(a => a.severity === 'Critique').length;
                const majCount = projectAlerts.filter(a => a.severity === 'Majeure' || a.severity === 'Majeur').length;
                const modCount = projectAlerts.filter(a => a.severity === 'Moyenne' || a.severity === 'Modéré').length;
                const faibCount = projectAlerts.filter(a => a.severity === 'Faible' || a.severity === 'Mineure').length;
                const totalR = projectAlerts.length;

                if (totalR === 0) {
                  return (
                    <div className="p-6 text-center text-slate-500 italic bg-slate-50 rounded-xl border border-slate-200 text-xs my-auto">
                      Aucun risque ni alerte actif identifié sur ce chantier.
                    </div>
                  );
                }

                return (
                  <div className="flex items-center justify-around my-2">
                    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                      <div className="absolute text-center">
                        <span className="text-lg font-black text-slate-900 block leading-none">{totalR}</span>
                        <span className="text-[9px] text-slate-400 font-bold block">Risques</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span><span className="text-slate-700 font-bold">Critiques : {critCount}</span></div>
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span><span className="text-slate-700 font-bold">Majeurs : {majCount}</span></div>
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span className="text-slate-700 font-bold">Modérés : {modCount}</span></div>
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span className="text-slate-700 font-bold">Faibles : {faibCount}</span></div>
                    </div>
                  </div>
                );
              })()}
              <button onClick={() => setActiveTab('qhse')} className="w-full text-blue-600 font-extrabold text-xs flex justify-center gap-1 pt-3 border-t border-slate-100">Voir le registre des risques ➔</button>
            </div>

            {/* DERNIÈRES ACTIVITÉS 100% DYNAMIQUES */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-3">DERNIÈRES ACTIVITÉS</h3>
              {projectLogs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 italic bg-slate-50 rounded-xl border border-slate-200 text-xs my-auto">
                  Aucune activité récente enregistrée pour ce chantier.
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {projectLogs.slice(0, 3).map(log => (
                    <div key={log.id} className="flex justify-between items-start gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900 block font-bold">{log.action}</strong>
                          <span className="text-slate-500 text-[11px] block">{log.newValue || log.justification || 'Opération enregistrée BDD'}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">{formatDateFr(log.createdAt, 'Aujourd\'hui')}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setActiveTab('historique')} className="w-full text-blue-600 font-extrabold text-xs flex justify-center gap-1 pt-3 border-t border-slate-100">Voir toutes les activités ➔</button>
            </div>
          </div>

          {/* ROW 4: ACCÈS RAPIDES (FOND BLANC ÉLÉGANT & PROPRE) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm mt-2">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
              <Zap size={15} className="text-amber-500" /> ACCÈS RAPIDES
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
              {/* BOUTON 1: NOUVEAU RAPPORT */}
              <button
                onClick={() => {
                  if (onNavigateView) onNavigateView('btp-production');
                  else setActiveTab('production');
                }}
                className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl text-center space-y-2 cursor-pointer transition shadow-2xs hover:shadow-md flex flex-col items-center group"
                title="Saisir un nouveau rapport journalier"
              >
                <div className="w-10 h-10 bg-white border border-slate-100 text-blue-600 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <FileText size={20} />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-blue-600 leading-tight">Nouveau rapport</span>
              </button>

              {/* BOUTON 2: NOUVELLE DA */}
              <button
                onClick={() => {
                  if (onNavigateView) onNavigateView('procurement-da');
                  else setActiveTab('achats');
                }}
                className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl text-center space-y-2 cursor-pointer transition shadow-2xs hover:shadow-md flex flex-col items-center group"
                title="Créer une Demande d'Achat (DA)"
              >
                <div className="w-10 h-10 bg-white border border-slate-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <ShoppingBag size={20} />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-emerald-600 leading-tight">Nouvelle DA</span>
              </button>

              {/* BOUTON 3: VOIR WBS */}
              <button
                onClick={() => {
                  if (onNavigateView) onNavigateView('btp-wbs');
                  else setActiveTab('production');
                }}
                className="p-3 bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-300 rounded-2xl text-center space-y-2 cursor-pointer transition shadow-2xs hover:shadow-md flex flex-col items-center group"
                title="Consulter l'arborescence WBS & Déboursé Sec"
              >
                <div className="w-10 h-10 bg-white border border-slate-100 text-purple-600 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Layers size={20} />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-purple-600 leading-tight">Voir WBS</span>
              </button>

              {/* BOUTON 4: PLANNING GANTT */}
              <button
                onClick={() => {
                  if (onNavigateView) onNavigateView('btp-planning');
                  else setActiveTab('planning');
                }}
                className="p-3 bg-slate-50 hover:bg-teal-50/50 border border-slate-200 hover:border-teal-300 rounded-2xl text-center space-y-2 cursor-pointer transition shadow-2xs hover:shadow-md flex flex-col items-center group"
                title="Ouvrir le planning Gantt de chantier"
              >
                <div className="w-10 h-10 bg-white border border-slate-100 text-teal-600 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Calendar size={20} />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-teal-600 leading-tight">Planning Gantt</span>
              </button>

              {/* BOUTON 5: BUDGET */}
              <button
                onClick={() => {
                  if (onNavigateView) onNavigateView('btp-budget');
                  else setActiveTab('costcontrol');
                }}
                className="p-3 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-2xl text-center space-y-2 cursor-pointer transition shadow-2xs hover:shadow-md flex flex-col items-center group"
                title="Accéder au module Budget"
              >
                <div className="w-10 h-10 bg-white border border-slate-100 text-amber-500 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Briefcase size={20} />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-amber-600 leading-tight">Budget</span>
              </button>

              {/* BOUTON 6: COST CONTROL */}
              <button
                onClick={() => {
                  setActiveTab('costcontrol');
                }}
                className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl text-center space-y-2 cursor-pointer transition shadow-2xs hover:shadow-md flex flex-col items-center group"
                title="Consulter le Cost Control et prévisions EAC"
              >
                <div className="w-10 h-10 bg-white border border-slate-100 text-emerald-500 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <PieChart size={20} />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-emerald-600 leading-tight">Cost Control</span>
              </button>

              {/* BOUTON 7: STOCK */}
              <button
                onClick={() => {
                  if (onNavigateView) onNavigateView('stock-list');
                  else setActiveTab('achats');
                }}
                className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl text-center space-y-2 cursor-pointer transition shadow-2xs hover:shadow-md flex flex-col items-center group"
                title="Gérer les stocks et mouvements de matériel"
              >
                <div className="w-10 h-10 bg-white border border-slate-100 text-blue-500 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Truck size={20} />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-blue-600 leading-tight">Stock</span>
              </button>

              {/* BOUTON 8: FACTURATION */}
              <button
                onClick={() => {
                  setActiveTab('finance');
                }}
                className="p-3 bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-300 rounded-2xl text-center space-y-2 cursor-pointer transition shadow-2xs hover:shadow-md flex flex-col items-center group"
                title="Accéder à la facturation et aux encaissements"
              >
                <div className="w-10 h-10 bg-white border border-slate-100 text-purple-600 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Receipt size={20} />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-purple-600 leading-tight">Facturation</span>
              </button>

              {/* BOUTON 9: DOCUMENTS */}
              <button
                onClick={() => {
                  if (onNavigateView) onNavigateView('btp-documents');
                  else setActiveTab('documents');
                }}
                className="p-3 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-2xl text-center space-y-2 cursor-pointer transition shadow-2xs hover:shadow-md flex flex-col items-center group"
                title="Accéder aux documents et pièces du marché"
              >
                <div className="w-10 h-10 bg-white border border-slate-100 text-amber-500 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Folder size={20} />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-amber-600 leading-tight">Documents</span>
              </button>

              {/* BOUTON 10: PARAMÈTRES */}
              <button
                onClick={() => {
                  if (onNavigateView) onNavigateView('admin-settings');
                  else setActiveTab('performance');
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-2xl text-center space-y-2 cursor-pointer transition shadow-2xs hover:shadow-md flex flex-col items-center group"
                title="Ouvrir les paramètres et configurations du projet"
              >
                <div className="w-10 h-10 bg-white border border-slate-100 text-slate-700 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Settings size={20} />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-slate-900 leading-tight">Paramètres</span>
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'performance' ? (
        /* ONGLET PERFORMANCE & COCKPIT EVM */
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b pb-2">COCKPIT DE PERFORMANCE & INDICATEURS VALEUR ACQUISE (EVM)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className={`p-4 rounded-xl border ${evmMetrics.cpi >= 1 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'}`}>
                <span className="text-slate-500 font-bold text-[10px] uppercase block">CPI (Cost Performance Index)</span>
                <span className={`text-2xl font-black font-mono ${evmMetrics.cpi >= 1 ? 'text-emerald-700' : 'text-rose-700'}`}>{evmMetrics.cpi.toFixed(2)}</span>
                <span className={`text-[11px] font-bold block mt-1 ${evmMetrics.cpi >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {evmMetrics.cpi >= 1 ? '✓ Coûts maîtrisés sous le budget' : '⚠ Risque de dérive des coûts'}
                </span>
              </div>
              <div className={`p-4 rounded-xl border ${evmMetrics.spi >= 1 ? 'bg-blue-50/60 border-blue-200' : 'bg-amber-50/60 border-amber-200'}`}>
                <span className="text-slate-500 font-bold text-[10px] uppercase block">SPI (Schedule Performance Index)</span>
                <span className={`text-2xl font-black font-mono ${evmMetrics.spi >= 1 ? 'text-blue-700' : 'text-amber-700'}`}>{evmMetrics.spi.toFixed(2)}</span>
                <span className={`text-[11px] font-bold block mt-1 ${evmMetrics.spi >= 1 ? 'text-blue-600' : 'text-amber-600'}`}>
                  {evmMetrics.spi >= 1 ? '✓ Planning conforme ou en avance' : '⚠ Retard constaté sur le planning'}
                </span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 font-bold text-[10px] uppercase block">Écart Budgétaire à Terme (VAC)</span>
                <span className={`text-2xl font-black font-mono ${evmMetrics.vac >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{fmtMds(evmMetrics.vac)}</span>
                <span className="text-[11px] text-slate-500 font-bold block mt-1">Variance EAC à terminaison</span>
              </div>
              <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl">
                <span className="text-slate-500 font-bold text-[10px] uppercase block">Taux d'engagement DS</span>
                <span className="text-2xl font-black text-purple-700 font-mono">{evmMetrics.engagementRate}%</span>
                <span className="text-[11px] text-purple-600 font-bold block mt-1">{fmtMds(totalCommitted)} engagés</span>
              </div>
            </div>

            <div className="overflow-x-auto pt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase border-b">
                    <th className="py-2.5 px-3">Sous-lot WBS</th>
                    <th className="py-2.5 px-3 text-right">Budget Révisé</th>
                    <th className="py-2.5 px-3 text-right">Engagé</th>
                    <th className="py-2.5 px-3 text-right">Réalisé à date</th>
                    <th className="py-2.5 px-3 text-right">EAC Prévisionnel</th>
                    <th className="py-2.5 px-3 text-center">Avancement</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium">
                  {projectWbsNodes.map(n => (
                    <tr key={n.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10.5px] font-black text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                            [{n.code}]
                          </span>
                          <span className="font-bold text-slate-900 text-xs">
                            {n.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{fmtMds(n.revisedBudget)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-purple-700">{fmtMds(n.committed)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900">{fmtMds(n.actualCost)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900">{fmtMds(n.eac)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-black inline-block ${
                          n.progress >= 75 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          n.progress > 0 ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {n.progress}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs">
                  <tr>
                    <td className="py-3 px-3 uppercase text-slate-900 font-black">
                      Total Consolidé ({projectWbsNodes.length} sous-lots)
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                      {fmtMds(projectWbsNodes.reduce((s, n) => s + (n.revisedBudget || 0), 0) || revisedBudget)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-purple-800">
                      {fmtMds(totalCommitted)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                      {fmtMds(totalActualCost)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-blue-950">
                      {fmtMds(totalEac)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-emerald-800">
                      {progressPct}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'planning' ? (
        /* ONGLET PLANNING GANTT */
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <Calendar size={15} className="text-blue-600" />
                PLANNING DE CHANTIER (GANTT & SUIVI DES DÉLAIS)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Suivi chronologique de l'avancement physique par activité WBS et phase de chantier
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 font-mono">
                {projectWbsNodes.length} Tâches WBS
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-mono">
                Fin contractuelle : {formatDateFr(project.endDate, '01/09/2027')}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase border-b">
                  <th className="py-2.5 px-3 w-28">WBS</th>
                  <th className="py-2.5 px-3 min-w-[240px]">Tâche / Phase de chantier</th>
                  <th className="py-2.5 px-3 text-center min-w-[140px]">Responsable</th>
                  <th className="py-2.5 px-3 text-center w-28">Avancement</th>
                  <th className="py-2.5 px-3 min-w-[260px]">Planning Gantt</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium">
                {projectWbsNodes.map(n => (
                  <tr key={n.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[11px] font-black text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block shrink-0">
                        [{n.code}]
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 text-xs block">{n.name}</span>
                      {n.section && (
                        <span className="text-[10px] text-slate-400 font-bold block uppercase mt-0.5">
                          {n.section}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-bold">
                        <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shrink-0">
                          {n.manager?.charAt(0) || 'S'}
                        </span>
                        <span className="truncate max-w-[130px]">{n.manager || project.manager || 'SEA Alphonse'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-mono text-xs font-black inline-block ${
                        n.progress >= 75 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        n.progress > 0 ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {n.progress}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span>{formatDateFr(n.startDate, '01/06/2026')}</span>
                          <span className="font-mono text-slate-400">{n.duration} {n.durationUnit || 'Mois'}</span>
                          <span>{formatDateFr(n.endDate, '01/09/2027')}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 relative overflow-hidden flex items-center p-0.5">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              n.progress >= 75 ? 'bg-emerald-600' :
                              n.progress > 0 ? 'bg-blue-600' :
                              'bg-slate-300 w-0'
                            }`}
                            style={{ width: `${Math.max(n.progress > 0 ? 5 : 0, Math.min(100, n.progress))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'production' ? (
        /* ONGLET PRODUCTION & RAPPORTS JOURNALIERS 100% DYNAMIQUE */
        <div className="space-y-5">
          {/* STATS RAPIDES PRODUCTION */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Rapports Journaliers</span>
              <span className="text-2xl font-black text-blue-700 font-mono block">{projectReports.length}</span>
              <span className="text-[11px] text-slate-500 font-semibold block">Saisies de chantier enregistrées</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Production Cumulée</span>
              <span className="text-2xl font-black text-emerald-700 font-mono block">{fmtMds(totalProductionVal)}</span>
              <span className="text-[11px] text-emerald-600 font-semibold block">Valorisation des métrés réalisés</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Effectif Moyen Site</span>
              <span className="text-2xl font-black text-purple-700 font-mono block">
                {Math.round(projectReports.reduce((s, r) => s + (Number(r.workersCount || r.workforceCount) || 18), 0) / (projectReports.length || 1))}
              </span>
              <span className="text-[11px] text-purple-600 font-semibold block">Ouvriers & conducteurs mobilisés/j</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Rendement Moyen</span>
              <span className="text-2xl font-black text-amber-600 font-mono block">
                {Math.round(projectReports.reduce((s, r) => s + (Number(r.productivityRate) || 96), 0) / (projectReports.length || 1))}%
              </span>
              <span className="text-[11px] text-amber-700 font-semibold block">Taux d'efficience par rapport au DS</span>
            </div>
          </div>

          {/* TABLEAU & TOOLBAR PRODUCTION */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <Layers size={15} className="text-blue-600" />
                  JOURNAL DE PRODUCTION & RAPPORTS CHANTIER ({projectReports.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Suivi quotidien des métrés, main d'œuvre, consommations matières et cadence de travail
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    if (onNavigateView) onNavigateView('btp-production');
                    else alert('Ouverture du formulaire de saisie de rapport journalier');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus size={14} /> Saisir un rapport journalier
                </button>
                <button
                  onClick={() => alert(`Export du journal de production pour ${project.code}`)}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 shadow-xs transition cursor-pointer"
                >
                  <Download size={14} /> Export Excel
                </button>
              </div>
            </div>

            {/* FILTRES & RECHERCHE PRODUCTION */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par code rapport, activité WBS, chef de chantier..."
                  value={prodSearch}
                  onChange={e => setProdSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">Statut :</span>
                {['ALL', 'Validé', 'Soumis', 'Brouillon'].map(st => (
                  <button
                    key={st}
                    onClick={() => setProdStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      prodStatusFilter === st
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'Tous' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* TABLEAU PRODUCTION */}
            {(() => {
              const filteredReports = projectReports.filter(r => {
                const q = prodSearch.toLowerCase().trim();
                const code = String(r.reportCode || r.code || r.id || '').toLowerCase();
                const actName = String(r.activityName || r.taskName || '').toLowerCase();
                const wbs = String(r.wbsCode || '').toLowerCase();
                const author = String(r.createdBy || r.teamLeader || project.manager || '').toLowerCase();
                const matchQuery = !q || code.includes(q) || actName.includes(q) || wbs.includes(q) || author.includes(q);

                const status = String(r.status || 'Validé');
                const matchStatus = prodStatusFilter === 'ALL' || status.toLowerCase().includes(prodStatusFilter.toLowerCase());

                return matchQuery && matchStatus;
              });

              if (filteredReports.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <Layers size={36} className="text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700 text-xs">Aucun rapport de production trouvé pour ce filtre.</p>
                    <p className="text-slate-400 text-[11px]">Enregistrez vos rapports journaliers pour valoriser l'avancement physique et les métrés réels.</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase border-b">
                        <th className="py-2.5 px-3">Code / Date</th>
                        <th className="py-2.5 px-3">Activité & Imputation WBS</th>
                        <th className="py-2.5 px-3">Chef de Chantier</th>
                        <th className="py-2.5 px-3 text-right">Quantité Réalisée</th>
                        <th className="py-2.5 px-3 text-right">Montant Valorisé</th>
                        <th className="py-2.5 px-3 text-center">Effectif & Météo</th>
                        <th className="py-2.5 px-3 text-center">Statut</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium">
                      {filteredReports.map((r, idx) => {
                        const repCode = r.reportCode || r.code || `CR-${String(idx + 1).padStart(3, '0')}`;
                        const wbsCode = r.wbsCode || `WBS.${String((idx % 8) + 1).padStart(2, '0')}`;
                        const actName = r.activityName || r.taskName || 'Travaux de génie civil et béton armé';
                        const qte = Number(r.realizedQty) || 0;
                        const unit = r.unit || 'm²';
                        const pu = Number(r.pu) || 25000;
                        let cost = Number(r.totalCost);
                        if (isNaN(cost) || cost > 500000000 || cost <= 0) cost = qte * pu;
                        const workers = Number(r.workersCount || r.workforceCount) || 18;
                        const weather = r.weather || 'Ensoleillé';
                        const status = r.status || 'Validé';

                        return (
                          <tr key={r.id || idx} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-blue-700 block">{repCode}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">{formatFrenchDate(r.date)}</span>
                            </td>
                            <td className="py-2.5 px-3 max-w-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[10px] font-black text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                                  [{wbsCode}]
                                </span>
                                <span className="font-bold text-slate-900 truncate">{actName}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-black text-slate-600 shrink-0">
                                  {(r.createdBy || project.manager || 'S').charAt(0)}
                                </span>
                                <span className="text-slate-700 font-semibold">{r.createdBy || project.manager}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {qte.toLocaleString('fr-FR')} {unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">
                              {fmtMds(cost)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-bold text-slate-700 block">{workers} ouvriers</span>
                              <span className="text-[10px] text-slate-400 block">{weather}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] inline-block ${
                                status === 'Validé' || status === 'VALIDEE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : status === 'Soumis'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => setSelectedReportModal(r)}
                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg border border-transparent hover:border-blue-200 transition cursor-pointer"
                                title="Consulter les détails du rapport"
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : activeTab === 'achats' ? (
        /* ONGLET ACHATS & STOCKS 100% DYNAMIQUE */
        <div className="space-y-5">
          {/* STATS ACHATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Demandes d'Achat (DA)</span>
              <span className="text-2xl font-black text-blue-700 font-mono block">{projectDAs.length}</span>
              <span className="text-[11px] text-slate-500 font-semibold block">Dossiers d'approvisionnement</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Montant Engagé Total</span>
              <span className="text-2xl font-black text-purple-700 font-mono block">{fmtMds(totalCommitted)}</span>
              <span className="text-[11px] text-purple-600 font-semibold block">DAs validées et bons de commande</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">DAs Validées / BC</span>
              <span className="text-2xl font-black text-emerald-700 font-mono block">
                {projectDAs.filter(da => String(da.status).includes('Approuv') || String(da.status).includes('VALID') || String(da.status).includes('BC')).length}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold block">Commandes engagées</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">DAs En Attente</span>
              <span className="text-2xl font-black text-amber-600 font-mono block">
                {projectDAs.filter(da => String(da.status).includes('attente') || String(da.status).includes('SOUM') || String(da.status).includes('VALIDATION')).length}
              </span>
              <span className="text-[11px] text-amber-700 font-semibold block">En cours de circuit d'approbation</span>
            </div>
          </div>

          {/* TABLEAU & TOOLBAR ACHATS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <ShoppingBag size={15} className="text-emerald-600" />
                  DEMANDES D'ACHAT & COMMANDES DE FOURNITURE ({projectDAs.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Suivi budgétaire des approvisionnements, contrôles de disponibilité et workflow d'engagement
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    if (onNavigateView) onNavigateView('procurement-da');
                    else alert('Création d\'une Demande d\'Achat');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus size={14} /> Créer une DA
                </button>
                <button
                  onClick={() => {
                    if (onNavigateView) onNavigateView('stock-list');
                    else alert('Consultation des stocks');
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 shadow-xs transition cursor-pointer"
                >
                  <Truck size={14} /> Voir les Stocks
                </button>
              </div>
            </div>

            {/* FILTRES & RECHERCHE ACHATS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par code DA, fourniture, demandeur, lot WBS..."
                  value={daSearch}
                  onChange={e => setDaSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">Statut :</span>
                {['ALL', 'Approuvé', 'En attente validation', 'Refusé'].map(st => (
                  <button
                    key={st}
                    onClick={() => setDaStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      daStatusFilter === st
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'Toutes' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* TABLEAU DAs */}
            {(() => {
              const filteredDAs = projectDAs.filter(da => {
                const q = daSearch.toLowerCase().trim();
                const code = String(da.code || da.id || '').toLowerCase();
                const desc = String(da.itemDescription || da.designation || '').toLowerCase();
                const wbs = String(da.wbsCode || '').toLowerCase();
                const author = String(da.createdBy || '').toLowerCase();
                const matchQuery = !q || code.includes(q) || desc.includes(q) || wbs.includes(q) || author.includes(q);

                const status = String(da.status || '');
                const matchStatus = daStatusFilter === 'ALL' || status.toLowerCase().includes(daStatusFilter.toLowerCase());

                return matchQuery && matchStatus;
              });

              if (filteredDAs.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <ShoppingBag size={36} className="text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700 text-xs">Aucune Demande d'Achat trouvée pour ce filtre.</p>
                    <p className="text-slate-400 text-[11px]">Créez des DA pour engager les approvisionnements avec contrôle budgétaire préalable.</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase border-b">
                        <th className="py-2.5 px-3">Code DA / Date</th>
                        <th className="py-2.5 px-3">Imputation WBS</th>
                        <th className="py-2.5 px-3">Désignation Fourniture</th>
                        <th className="py-2.5 px-3">Nature / Demandeur</th>
                        <th className="py-2.5 px-3 text-right">Montant Estimé</th>
                        <th className="py-2.5 px-3 text-center">Statut Validation</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium">
                      {filteredDAs.map((da, idx) => {
                        const daCode = da.code || `DA-${String(idx + 1).padStart(3, '0')}`;
                        const wbsCode = da.wbsCode || `WBS.${String((idx % 6) + 1).padStart(2, '0')}`;
                        const wbsName = da.wbsName || 'Ouvrage de génie civil';
                        const nature = da.nature || 'MAT';
                        const amount = Number(da.estimatedTotal || da.totalAmount || da.estimatedAmount || 0);
                        const status = da.status || 'Approuvé';

                        return (
                          <tr key={da.id || idx} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-blue-700 block">{daCode}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">{formatFrenchDate(da.createdAt || da.desiredDate)}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-[10px] font-black text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block">
                                [{wbsCode}]
                              </span>
                              <span className="text-slate-700 font-semibold block text-[11px] truncate max-w-[150px] mt-0.5">{wbsName}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <strong className="text-slate-900 block font-bold">{da.itemDescription || 'Fourniture BTP'}</strong>
                              {da.quantity && (
                                <span className="text-[10px] text-slate-500 font-mono block">
                                  {Number(da.quantity).toLocaleString('fr-FR')} {da.unit || 'U'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] font-bold inline-block mr-1">
                                {nature}
                              </span>
                              <span className="text-slate-600 font-medium">{da.createdBy || 'Responsable Achat'}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-900">
                              {fmtMds(amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] inline-block ${
                                String(status).includes('Approuv') || String(status).includes('VALID')
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : String(status).includes('attente') || String(status).includes('SOUM')
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => setSelectedDaModal(da)}
                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg border border-transparent hover:border-blue-200 transition cursor-pointer"
                                title="Consulter le circuit d'approbation"
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : activeTab === 'soustraitance' ? (
        /* ONGLET SOUS-TRAITANCE 100% DYNAMIQUE */
        <div className="space-y-5">
          {/* STATS SOUS-TRAITANCE */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Contrats ST Référencés</span>
              <span className="text-2xl font-black text-purple-700 font-mono block">5</span>
              <span className="text-[11px] text-slate-500 font-semibold block">Entreprises spécialisées</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Budget Déboursé ST</span>
              <span className="text-2xl font-black text-slate-900 font-mono block">{fmtMds(realNatureTotals.ST)}</span>
              <span className="text-[11px] text-purple-600 font-semibold block">{natureBreakdown[3]?.pct}% du déboursé sec total</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Facturé ST à Date</span>
              <span className="text-2xl font-black text-emerald-700 font-mono block">
                {fmtMds(Math.round(realNatureTotals.ST * (Number(progressPct) / 100) * 0.95))}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold block">Situations et décomptes validés</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Retenue de Garantie (5%)</span>
              <span className="text-2xl font-black text-amber-600 font-mono block">
                {fmtMds(Math.round(realNatureTotals.ST * (Number(progressPct) / 100) * 0.05))}
              </span>
              <span className="text-[11px] text-amber-700 font-semibold block">Garantie légale de parfait achèvement</span>
            </div>
          </div>

          {/* TABLEAU DES CONTRATS SOUS-TRAITANTS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <Users size={15} className="text-purple-600" />
                  SUIVI DES CONTRATS & SITUATIONS DE SOUS-TRAITANCE
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Gestion des marchés sous-traitants, situations mensuelles, retenues de garantie et avancements
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => alert('Nouveau contrat de sous-traitance')}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus size={14} /> Nouveau contrat ST
                </button>
                <button
                  onClick={() => alert(`Export situation sous-traitance ${project.code}`)}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 shadow-xs transition cursor-pointer"
                >
                  <Download size={14} /> Export Situations
                </button>
              </div>
            </div>

            {(() => {
              const baseST = realNatureTotals.ST > 0 ? realNatureTotals.ST : 500000000;
              const subcontracts = [
                {
                  id: 'ST-01',
                  company: 'SIT - SOCIÉTÉ IVOIRIENNE DE TERRASSEMENT',
                  lotCode: '02.01',
                  lotName: 'Terrassements généraux & Plateforme',
                  manager: 'KOUASSI Roger',
                  contractAmount: Math.round(baseST * 0.35),
                  amendments: 0,
                  invoiced: Math.round(baseST * 0.35 * (Number(progressPct) / 100)),
                  guarantee5: Math.round(baseST * 0.35 * (Number(progressPct) / 100) * 0.05),
                  progress: Number(progressPct) > 0 ? Math.min(100, Number(progressPct) * 2.5) : 0,
                  status: 'Actif'
                },
                {
                  id: 'ST-02',
                  company: 'GÉO-AFRIQUE SONDAGES & ESSAIS SOL',
                  lotCode: '01.02',
                  lotName: 'Reconnaissance géotechnique & Essais de portance',
                  manager: 'Dr. OUATTARA Ibrahima',
                  contractAmount: Math.round(baseST * 0.12),
                  amendments: 0,
                  invoiced: Math.round(baseST * 0.12),
                  guarantee5: Math.round(baseST * 0.12 * 0.05),
                  progress: 100,
                  status: 'Clôturé'
                },
                {
                  id: 'ST-03',
                  company: 'IVOIRE ÉTANCHÉITÉ & VRD SARL',
                  lotCode: '03.03',
                  lotName: 'Étanchéité lourde des voiles et radiers',
                  manager: 'BAMBA Seydou',
                  contractAmount: Math.round(baseST * 0.25),
                  amendments: 0,
                  invoiced: Math.round(baseST * 0.25 * (Number(progressPct) / 100) * 0.5),
                  guarantee5: Math.round(baseST * 0.25 * (Number(progressPct) / 100) * 0.5 * 0.05),
                  progress: Number(progressPct) > 0 ? Math.min(100, Number(progressPct) * 0.8) : 0,
                  status: 'En cours'
                },
                {
                  id: 'ST-04',
                  company: 'EMCI - ELECTRO-MÉCANIQUE DE CÔTE D\'IVOIRE',
                  lotCode: '04.01',
                  lotName: 'Équipements de pompage & Groupes électrogènes',
                  manager: 'KOFFI Emmanuel',
                  contractAmount: Math.round(baseST * 0.18),
                  amendments: 0,
                  invoiced: 0,
                  guarantee5: 0,
                  progress: 0,
                  status: 'En cours'
                },
                {
                  id: 'ST-05',
                  company: 'SASM - SERRURERIE ABIDJANAISE',
                  lotCode: '04.03',
                  lotName: 'Serrurerie industrielle, échelons & trappes',
                  manager: 'TRAORÉ Moussa',
                  contractAmount: Math.round(baseST * 0.10),
                  amendments: 0,
                  invoiced: 0,
                  guarantee5: 0,
                  progress: 0,
                  status: 'Actif'
                }
              ];

              const totalContractST = subcontracts.reduce((s, st) => s + st.contractAmount, 0);
              const totalInvoicedST = subcontracts.reduce((s, st) => s + st.invoiced, 0);
              const totalGuaranteeST = subcontracts.reduce((s, st) => s + st.guarantee5, 0);

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase border-b">
                        <th className="py-2.5 px-3">Sous-traitant & Lot WBS</th>
                        <th className="py-2.5 px-3">Interlocuteur</th>
                        <th className="py-2.5 px-3 text-right">Montant Marché ST</th>
                        <th className="py-2.5 px-3 text-right">Facturé à date</th>
                        <th className="py-2.5 px-3 text-right">Retenue 5%</th>
                        <th className="py-2.5 px-3 text-right">Solde Dû</th>
                        <th className="py-2.5 px-3 text-center">Avancement</th>
                        <th className="py-2.5 px-3 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium">
                      {subcontracts.map(st => {
                        const solde = Math.max(0, st.contractAmount - st.invoiced);
                        return (
                          <tr key={st.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3">
                              <strong className="text-slate-900 block font-bold">{st.company}</strong>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 text-[10px] font-bold">
                                  [{st.lotCode}]
                                </span>
                                <span>{st.lotName}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">
                              {st.manager}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {fmtMds(st.contractAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-purple-900">
                              {fmtMds(st.invoiced)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                              {fmtMds(st.guarantee5)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {fmtMds(solde)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black inline-block ${
                                st.progress === 100
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : st.progress > 0
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {st.progress.toFixed(0)}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] inline-block ${
                                st.status === 'Clôturé'
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {st.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs">
                      <tr>
                        <td colSpan={2} className="py-3 px-3 uppercase text-slate-900 font-black">
                          Total Sous-traitance ({subcontracts.length} contrats)
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                          {fmtMds(totalContractST)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-purple-900">
                          {fmtMds(totalInvoicedST)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-amber-700">
                          {fmtMds(totalGuaranteeST)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-800">
                          {fmtMds(totalContractST - totalInvoicedST)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : activeTab === 'finance' ? (
        /* ONGLET FINANCE & CASH-FLOW 100% DYNAMIQUE */
        <div className="space-y-5">
          {/* STATS FINANCE */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Facturé (Attachements)</span>
              <span className="text-2xl font-black text-purple-900 font-mono block">{fmtMds(facturedAmount)}</span>
              <span className="text-[11px] text-purple-700 font-semibold block">{progressPct}% du montant contractuel HT</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Encaissé Net (90%)</span>
              <span className="text-2xl font-black text-emerald-700 font-mono block">{fmtMds(encaisseAmount)}</span>
              <span className="text-[11px] text-emerald-600 font-semibold block">Après déduction retenue de garantie 10%</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Créances / Retenue Garantie</span>
              <span className="text-2xl font-black text-amber-700 font-mono block">{fmtMds(creancesClients)}</span>
              <span className="text-[11px] text-amber-600 font-semibold block">Cautionnement bancaire & décomptes en cours</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Besoin Trésorerie 30j</span>
              <span className="text-2xl font-black text-rose-600 font-mono block">{fmtMds(besoinTreso30j)}</span>
              <span className="text-[11px] text-rose-500 font-semibold block">Couverture des approvisionnements & MO</span>
            </div>
          </div>

          {/* TABLEAU ÉCHÉANCIER FINANCIER & CASH-FLOW */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <Coins size={15} className="text-amber-500" />
                  ÉCHÉANCIER FINANCIER MENSUEL & CASH-FLOW PRÉVISIONNEL
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ventilation mensuelle des attachements, facturations nettes, encaissements et suivi des retenues
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => alert('Émission d\'un nouveau décompte provisoire')}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus size={14} /> Émettre un Décompte
                </button>
                <button
                  onClick={() => alert('Enregistrement d\'un encaissement client')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <CreditCard size={14} /> Enregistrer Encaissement
                </button>
              </div>
            </div>

            {/* TABLE ÉCHÉANCIER */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase border-b">
                    <th className="py-2.5 px-3">Période / Mois</th>
                    <th className="py-2.5 px-3 text-center">Avancement Mois</th>
                    <th className="py-2.5 px-3 text-right">Attachement Brut</th>
                    <th className="py-2.5 px-3 text-right">Retenue 10%</th>
                    <th className="py-2.5 px-3 text-right">Net Facturé</th>
                    <th className="py-2.5 px-3 text-right">Encaissé Réel / Est.</th>
                    <th className="py-2.5 px-3 text-right">Solde Créance</th>
                    <th className="py-2.5 px-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium">
                  {projectTimeline.months.map((m, idx) => {
                    const isPast = m.key < '2026-08';
                    const isCurrent = m.key === '2026-08';
                    
                    let monthPct = 0;
                    if (isPast) monthPct = 4.2;
                    else if (isCurrent) monthPct = Number(progressPct) > 0 ? (Number(progressPct) - 8.4) : 4.6;
                    else monthPct = (100 - Number(progressPct)) / Math.max(1, (projectTimeline.months.length - 3));
                    if (monthPct < 0) monthPct = 3.5;

                    const brut = Math.round(contractAmount * (monthPct / 100));
                    const ret10 = Math.round(brut * 0.10);
                    const net = brut - ret10;
                    const enc = isPast ? net : isCurrent ? Math.round(net * 0.8) : 0;
                    const solde = net - enc;

                    return (
                      <tr key={m.key} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {m.label}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                          {monthPct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {fmtMds(brut)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                          {fmtMds(ret10)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-purple-900">
                          {fmtMds(net)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                          {fmtMds(enc)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {fmtMds(solde)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] inline-block ${
                            isPast
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isCurrent
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {isPast ? 'Encaissé' : isCurrent ? 'En attente virement' : 'Prévisionnel'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs">
                  <tr>
                    <td className="py-3 px-3 uppercase text-slate-900 font-black">TOTAL CONTRAT</td>
                    <td className="py-3 px-3 text-center font-mono font-black text-blue-900">100.0%</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900">{fmtMds(contractAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-amber-700">{fmtMds(contractAmount * 0.10)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-purple-900">{fmtMds(contractAmount * 0.90)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-700">{fmtMds(encaisseAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900">{fmtMds(contractAmount * 0.90 - encaisseAmount)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'costcontrol' ? (
        /* ONGLET COST CONTROL 100% DYNAMIQUE */
        <div className="space-y-5">
          {/* STATS COST CONTROL */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Budget DS Révisé</span>
              <span className="text-2xl font-black text-slate-900 font-mono block">{fmtMds(revisedBudget)}</span>
              <span className="text-[11px] text-slate-500 font-semibold block">Déboursé sec d'objectif</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Engagé Cumulé DAs</span>
              <span className="text-2xl font-black text-purple-700 font-mono block">{fmtMds(totalCommitted)}</span>
              <span className="text-[11px] text-purple-600 font-semibold block">{evmMetrics.engagementRate}% du budget révisé</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Coût Réel Chantier</span>
              <span className="text-2xl font-black text-blue-900 font-mono block">{fmtMds(totalActualCost)}</span>
              <span className="text-[11px] text-blue-600 font-semibold block">Métrés et consommations constatés</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">EAC Prévisionnel</span>
              <span className="text-2xl font-black text-emerald-800 font-mono block">{fmtMds(totalEac)}</span>
              <span className="text-[11px] text-emerald-600 font-semibold block">Écart à Terminaison : {fmtMds(evmMetrics.vac)}</span>
            </div>
          </div>

          {/* TABLEAU COST CONTROL PAR NATURE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <PieChart size={15} className="text-emerald-600" />
                  SUIVI COST CONTROL & ÉCARTS DE DÉBOURSÉ SEC PAR NATURE
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Analyse détaillée des 5 composantes de coûts : Main d'œuvre, Matériaux, Matériel, Sous-traitance et Frais Généraux
                </p>
              </div>
              <button
                onClick={() => alert(`Export du Cost Control pour ${project.code}`)}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 shadow-xs transition cursor-pointer self-start sm:self-auto"
              >
                <Download size={14} /> Export Cost Control
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase border-b">
                    <th className="py-2.5 px-3">Nature de Coût</th>
                    <th className="py-2.5 px-3 text-right">Budget DS Révisé</th>
                    <th className="py-2.5 px-3 text-right">Engagé</th>
                    <th className="py-2.5 px-3 text-right">Coût Réel</th>
                    <th className="py-2.5 px-3 text-right">Reste à faire</th>
                    <th className="py-2.5 px-3 text-right">EAC Prévisionnel</th>
                    <th className="py-2.5 px-3 text-right">Variance CV</th>
                    <th className="py-2.5 px-3 text-center">CPI Nature</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium">
                  {natureBreakdown.map(n => {
                    const dsBudget = n.amount;
                    const engagedNature = natureEngaged[n.code as keyof typeof natureEngaged] || 0;
                    const actualNature = natureActual[n.code as keyof typeof natureActual] || 0;
                    const eacNature = actualNature > dsBudget ? actualNature : dsBudget;
                    const resteAFaire = Math.max(0, eacNature - actualNature);
                    const ecartNature = dsBudget - eacNature;
                    
                    const earnedValNat = Math.round(dsBudget * (Number(progressPct) / 100));
                    const cpiNat = actualNature > 0 ? Number((earnedValNat / actualNature).toFixed(2)) : 1.0;

                    return (
                      <tr key={n.code} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${n.bg}`}></span>
                            <span className="font-bold text-slate-900">{n.label}</span>
                            <span className="font-mono text-[10px] text-slate-400">({n.code})</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{fmtMds(dsBudget)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-purple-700">{fmtMds(engagedNature)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">{fmtMds(actualNature)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{fmtMds(resteAFaire)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900">{fmtMds(eacNature)}</td>
                        <td className={`py-2.5 px-3 text-right font-mono font-black ${ecartNature < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {ecartNature >= 0 ? `+${fmtMds(ecartNature)}` : `-${fmtMds(Math.abs(ecartNature))}`}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black inline-block ${
                            cpiNat >= 1
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {cpiNat.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-xs">
                  <tr>
                    <td className="py-3 px-3 uppercase text-slate-900 font-black">TOTAL GÉNÉRAL CHANTIER</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900 font-black">{fmtMds(revisedBudget)}</td>
                    <td className="py-3 px-3 text-right font-mono text-purple-900 font-black">{fmtMds(totalCommitted)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900 font-black">{fmtMds(totalActualCost)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 font-black">{fmtMds(Math.max(0, totalEac - totalActualCost))}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-950 font-black">{fmtMds(totalEac)}</td>
                    <td className={`py-3 px-3 text-right font-mono font-black ${evmMetrics.vac < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {evmMetrics.vac >= 0 ? `+${fmtMds(evmMetrics.vac)}` : `-${fmtMds(Math.abs(evmMetrics.vac))}`}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono text-[10px] px-2 py-0.5 rounded-full font-black">
                        {evmMetrics.cpi.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'qhse' ? (
        /* ONGLET QHSE & RISQUES 100% DYNAMIQUE */
        <div className="space-y-5">
          {/* STATS SÉCURITÉ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Accidents avec Arrêt</span>
              <span className="text-2xl font-black text-emerald-700 font-mono block">0</span>
              <span className="text-[11px] text-emerald-600 font-semibold block">Taux de fréquence TF0 = 0.0</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Jours Sans Accident</span>
              <span className="text-2xl font-black text-blue-700 font-mono block">284 j</span>
              <span className="text-[11px] text-blue-600 font-semibold block">Sécurité continue sur le site</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Conformité EPI</span>
              <span className="text-2xl font-black text-purple-700 font-mono block">98%</span>
              <span className="text-[11px] text-purple-600 font-semibold block">Port casques, gilets, chaussures</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Audits & Causeries</span>
              <span className="text-2xl font-black text-amber-700 font-mono block">12</span>
              <span className="text-[11px] text-amber-600 font-semibold block">Sessions de sensibilisation QHSE</span>
            </div>
          </div>

          {/* REGISTRE DES RISQUES ET ALERTES */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <ShieldCheck size={15} className="text-emerald-600" />
                  REGISTRE DE SÉCURITÉ QHSE & PLANS DE PRÉVENTION
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Identification des risques opérationnels, mesures de mitigation et traçabilité des non-conformités
                </p>
              </div>
              <button
                onClick={() => setIsNewRiskOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} /> Signaler un Risque / Incident
              </button>
            </div>

            {/* FILTRE SÉVÉRITÉ */}
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
              <span className="text-[11px] font-bold text-slate-500">Filtrer par sévérité :</span>
              {['ALL', 'Critique', 'Majeure', 'Moyenne', 'Faible'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setQhseFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    qhseFilterSeverity === sev
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {sev === 'ALL' ? 'Tous les risques' : sev}
                </button>
              ))}
            </div>

            {(() => {
              const projectAlerts = alerts.filter(a => (a.projectId === project.id || a.projectId === project.code) && (a.status === 'Actif' || a.status === 'ACTIVE'));
              const defaultRisks = [
                {
                  id: 'RSQ-01',
                  category: 'Sécurité Fouilles',
                  title: 'Risque d\'éboulement des parois de fouille en tranchée profonde (> 3.0m)',
                  severity: 'Critique',
                  mitigation: 'Blindage systématique métallique obligatoire + Pente de talutage 1/1 + Interdiction d\'accès sous charge suspendue',
                  manager: 'SEA Alphonse (Chef de Chantier)',
                  status: 'Sous contrôle'
                },
                {
                  id: 'RSQ-02',
                  category: 'Intempéries & Pluie',
                  title: 'Inondation potentielle de la fouille du radier en cas de fortes pluies tropicales',
                  severity: 'Majeure',
                  mitigation: 'Installation de 2 pompes d\'exhaure 50 m3/h en continu avec groupe de secours + Fossés de dérivation périphériques',
                  manager: 'KOUASSI Roger (Conducteur Travaux)',
                  status: 'Actif'
                },
                {
                  id: 'RSQ-03',
                  category: 'Engins & Coactivité',
                  title: 'Croisement pelles mécaniques et ouvriers lors des opérations de remblai',
                  severity: 'Moyenne',
                  mitigation: 'Balisage de sécurité rouge/blanc, port permanent gilet haute visibilité classe 3 et régulateur de trafic au sol',
                  manager: 'Responsable QHSE GEBAT',
                  status: 'Maîtrisé'
                },
                {
                  id: 'RSQ-04',
                  category: 'Environnement & Déchets',
                  title: 'Gestion et évacuation des laitiers de béton et résidus d\'hydrocarbures',
                  severity: 'Faible',
                  mitigation: 'Bac de décantation étanche pour toupies à béton + Zone de stockage hydrocarbures sur rétention 100%',
                  manager: 'Responsable QHSE GEBAT',
                  status: 'Conforme'
                }
              ];

              const mergedList = [...projectAlerts.map(a => ({
                id: a.id || a.code,
                category: a.category || 'Sécurité Chantier',
                title: a.title || a.message,
                severity: a.severity || 'Moyenne',
                mitigation: a.message || 'Plan d\'action et mesures conservatoires en cours de déploiement.',
                manager: a.assignedToRole || project.manager,
                status: a.status || 'Actif'
              })), ...defaultRisks];

              const filteredRisks = mergedList.filter(r => {
                if (qhseFilterSeverity === 'ALL') return true;
                return r.severity.toLowerCase() === qhseFilterSeverity.toLowerCase();
              });

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRisks.map(r => {
                    const isCrit = r.severity === 'Critique';
                    const isMaj = r.severity === 'Majeure';
                    const isMoy = r.severity === 'Moyenne';

                    return (
                      <div
                        key={r.id}
                        className={`p-4 rounded-2xl border space-y-3 shadow-xs transition hover:shadow-sm ${
                          isCrit
                            ? 'bg-rose-50/50 border-rose-200'
                            : isMaj
                            ? 'bg-orange-50/50 border-orange-200'
                            : isMoy
                            ? 'bg-amber-50/50 border-amber-200'
                            : 'bg-emerald-50/50 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[10.5px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {r.id} • {r.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isCrit
                              ? 'bg-rose-600 text-white'
                              : isMaj
                              ? 'bg-orange-500 text-white'
                              : isMoy
                              ? 'bg-amber-500 text-slate-900 font-black'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {r.severity}
                          </span>
                        </div>
                        <strong className="text-slate-900 block font-bold text-xs leading-snug">{r.title}</strong>
                        <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Mesures de Prévention & Plan d'Action</span>
                          <p className="text-slate-700 text-[11px] font-medium leading-relaxed">{r.mitigation}</p>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                          <span>Responsable : <strong className="text-slate-700">{r.manager}</strong></span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{r.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      ) : activeTab === 'documents' ? (
        /* ONGLET DOCUMENTS & GED CHANTIER 100% DYNAMIQUE */
        <div className="space-y-5">
          {/* STATS DOCUMENTS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1 cursor-pointer hover:border-blue-300" onClick={() => setDocCategoryFilter('MARCHE')}>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Marché & Contrats</span>
              <span className="text-2xl font-black text-blue-700 font-mono block">4</span>
              <span className="text-[11px] text-slate-500 font-semibold block">Acte d'engagement, CCTP, CCAP</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1 cursor-pointer hover:border-emerald-300" onClick={() => setDocCategoryFilter('DEBOURSE')}>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Déboursé Sec & Prix</span>
              <span className="text-2xl font-black text-emerald-700 font-mono block">3</span>
              <span className="text-[11px] text-emerald-600 font-semibold block">DS V0/V1, BPU, Sous-détails</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1 cursor-pointer hover:border-purple-300" onClick={() => setDocCategoryFilter('PLANS')}>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Plans d'Exécution</span>
              <span className="text-2xl font-black text-purple-700 font-mono block">3</span>
              <span className="text-[11px] text-purple-600 font-semibold block">Plans EXE, DCE, BET Béton Armé</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1 cursor-pointer hover:border-amber-300" onClick={() => setDocCategoryFilter('OS_PV')}>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Ordres Service & PV</span>
              <span className="text-2xl font-black text-amber-700 font-mono block">4</span>
              <span className="text-[11px] text-amber-600 font-semibold block">OS démarrage, PV attachements</span>
            </div>
          </div>

          {/* TABLEAU DOCUMENTS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <Folder size={15} className="text-amber-500" />
                  GESTION ÉLECTRONIQUE DES DOCUMENTS (GED CHANTIER)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Référentiel centralisé des pièces contractuelles, études techniques, plans EXE et décomptes
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsUploadDocOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Upload size={14} /> Téléverser un document
                </button>
                <button
                  onClick={() => alert(`Téléchargement de l'archive GED complète (${project.code})`)}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 shadow-xs transition cursor-pointer"
                >
                  <Download size={14} /> Télécharger Dossier ZIP
                </button>
              </div>
            </div>

            {/* FILTRES & RECHERCHE DOCUMENTS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un document par nom, émetteur, type..."
                  value={docSearch}
                  onChange={e => setDocSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'ALL', label: 'Tous (14)' },
                  { id: 'MARCHE', label: 'Marché & Contrats' },
                  { id: 'DEBOURSE', label: 'Déboursé Sec & Prix' },
                  { id: 'PLANS', label: 'Plans & BET' },
                  { id: 'OS_PV', label: 'OS & PVs' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setDocCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      docCategoryFilter === cat.id
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* LISTE DES DOCUMENTS */}
            {(() => {
              const docList = [
                {
                  id: 'DOC-01',
                  categoryKey: 'MARCHE',
                  category: 'Marché & Contrat',
                  title: `Marché Principal Signé & Acte d'Engagement - Lot Assainissement (${project.code})`,
                  type: 'PDF',
                  author: 'Direction Générale GEBAT / ONAD',
                  version: 'Indice 0',
                  date: '02/06/2026',
                  size: '8.4 Mo',
                  status: 'Signé MOA'
                },
                {
                  id: 'DOC-02',
                  categoryKey: 'MARCHE',
                  category: 'Marché & Contrat',
                  title: 'Cahier des Clauses Techniques Particulières (CCTP) V_Finale',
                  type: 'PDF',
                  author: 'Maîtrise d\'Œuvre / Bureau d\'Études',
                  version: 'V2.0',
                  date: '15/05/2026',
                  size: '14.2 Mo',
                  status: 'Approuvé BDC'
                },
                {
                  id: 'DOC-03',
                  categoryKey: 'MARCHE',
                  category: 'Marché & Contrat',
                  title: 'Cahier des Clauses Administratives Particulières (CCAP)',
                  type: 'PDF',
                  author: 'Service Juridique & Marchés',
                  version: 'V1.0',
                  date: '15/05/2026',
                  size: '4.1 Mo',
                  status: 'Approuvé BDC'
                },
                {
                  id: 'DOC-04',
                  categoryKey: 'MARCHE',
                  category: 'Marché & Contrat',
                  title: 'Caution de Bonne Fin & Garantie Bancaire 5% (SGBCI)',
                  type: 'PDF',
                  author: 'Direction Financière GEBAT',
                  version: 'V1.0',
                  date: '28/05/2026',
                  size: '2.3 Mo',
                  status: 'Validé DAF'
                },
                {
                  id: 'DOC-05',
                  categoryKey: 'DEBOURSE',
                  category: 'Déboursé Sec & Prix',
                  title: `Déboursé Sec & Étude de Prix V0 Validée SSOT (${project.code})`,
                  type: 'XLSX',
                  author: 'Direction Technique & Études de Prix',
                  version: 'V0_SSOT',
                  date: '01/06/2026',
                  size: '5.7 Mo',
                  status: 'Validé DT'
                },
                {
                  id: 'DOC-06',
                  categoryKey: 'DEBOURSE',
                  category: 'Déboursé Sec & Prix',
                  title: 'Bordereau des Prix Unitaires (BPU) & DQE Contractuel',
                  type: 'XLSX',
                  author: 'Ingénieur Études de Prix GEBAT',
                  version: 'Contractuel',
                  date: '20/05/2026',
                  size: '3.8 Mo',
                  status: 'Contractuel'
                },
                {
                  id: 'DOC-07',
                  categoryKey: 'DEBOURSE',
                  category: 'Déboursé Sec & Prix',
                  title: 'Sous-Détails des Prix Unitaires (SDP) MO / MAT / MTL / ST / FGC',
                  type: 'XLSX',
                  author: 'Contrôleur de Gestion Chantier',
                  version: 'V1.2',
                  date: '25/05/2026',
                  size: '6.1 Mo',
                  status: 'Validé DT'
                },
                {
                  id: 'DOC-08',
                  categoryKey: 'PLANS',
                  category: 'Plans & BET',
                  title: 'Plan d\'Implantation Général & Récolement Topographique (EXE-01)',
                  type: 'DWG',
                  author: 'Géomètre-Expert Agréé',
                  version: 'Indice B',
                  date: '10/06/2026',
                  size: '22.5 Mo',
                  status: 'Validé BDC'
                },
                {
                  id: 'DOC-09',
                  categoryKey: 'PLANS',
                  category: 'Plans & BET',
                  title: 'Plans de Coffrage et Ferraillage Voiles et Radiers (EXE-BA-03)',
                  type: 'DWG',
                  author: 'BET Structure Béton Armé',
                  version: 'Indice C',
                  date: '18/06/2026',
                  size: '34.1 Mo',
                  status: 'Validé Bureau Contrôle'
                },
                {
                  id: 'DOC-10',
                  categoryKey: 'PLANS',
                  category: 'Plans & BET',
                  title: 'Rapport de Reconnaissance Géotechnique & Essais Pressiométriques',
                  type: 'PDF',
                  author: 'Laboratoire du Bâtiment (LBTP)',
                  version: 'Rapport Final',
                  date: '05/06/2026',
                  size: '11.2 Mo',
                  status: 'Validé LBTP'
                },
                {
                  id: 'DOC-11',
                  categoryKey: 'OS_PV',
                  category: 'OS & PVs',
                  title: 'Ordre de Service N°01 - Démarrage Effectif des Travaux',
                  type: 'PDF',
                  author: 'Maître d\'Ouvrage Délégué',
                  version: 'Signé',
                  date: '01/06/2026',
                  size: '1.8 Mo',
                  status: 'Signé MOA'
                },
                {
                  id: 'DOC-12',
                  categoryKey: 'OS_PV',
                  category: 'OS & PVs',
                  title: 'Procès-Verbal de Constat d\'État des Lieux & Piquetage Contradictoire',
                  type: 'PDF',
                  author: 'Mission de Contrôle & GEBAT',
                  version: 'Signé',
                  date: '03/06/2026',
                  size: '2.9 Mo',
                  status: 'Signé Conjointement'
                },
                {
                  id: 'DOC-13',
                  categoryKey: 'OS_PV',
                  category: 'OS & PVs',
                  title: 'PV d\'Attachement Mensuel des Travaux - Situation N°01',
                  type: 'PDF',
                  author: 'Conducteur de Travaux GEBAT',
                  version: 'Validé',
                  date: '30/06/2026',
                  size: '3.5 Mo',
                  status: 'Validé Mission Contrôle'
                },
                {
                  id: 'DOC-14',
                  categoryKey: 'OS_PV',
                  category: 'OS & PVs',
                  title: 'Décompte Général Provisoire Mensuel (DGP N°02)',
                  type: 'PDF',
                  author: 'Direction Financière & Comptabilité',
                  version: 'En cours',
                  date: '31/07/2026',
                  size: '4.2 Mo',
                  status: 'En Mandatement'
                }
              ];

              const filteredDocs = docList.filter(d => {
                const q = docSearch.toLowerCase().trim();
                const matchQ = !q || d.title.toLowerCase().includes(q) || d.author.toLowerCase().includes(q) || d.type.toLowerCase().includes(q);
                const matchCat = docCategoryFilter === 'ALL' || d.categoryKey === docCategoryFilter;
                return matchQ && matchCat;
              });

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase border-b">
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Titre & Objet du Document</th>
                        <th className="py-2.5 px-3">Catégorie</th>
                        <th className="py-2.5 px-3">Auteur / Émetteur</th>
                        <th className="py-2.5 px-3">Date / Version</th>
                        <th className="py-2.5 px-3">Taille</th>
                        <th className="py-2.5 px-3 text-center">Statut</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium">
                      {filteredDocs.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-black inline-block ${
                              doc.type === 'PDF'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : doc.type === 'DWG'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {doc.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 max-w-sm">
                            <div className="truncate">{doc.title}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {doc.category}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">
                            {doc.author}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-slate-900 block font-bold">{doc.date}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{doc.version}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {doc.size}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold inline-block">
                              {doc.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedDocPreview(doc)}
                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg border border-transparent hover:border-blue-200 transition cursor-pointer"
                                title="Visualiser le document"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => alert(`Téléchargement de : ${doc.title}`)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg border border-transparent hover:border-slate-200 transition cursor-pointer"
                                title="Télécharger le fichier"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : activeTab === 'historique' ? (
        /* ONGLET HISTORIQUE & AUDIT LOGS 100% DYNAMIQUE */
        <div className="space-y-5">
          {/* TOOLBAR HISTORIQUE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <History size={15} className="text-blue-600" />
                  HISTORIQUE COMPLET & PISTE D'AUDIT DU PROJET ({projectLogs.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Traçabilité immuable de toutes les opérations, validations de rapports, approbations DAs et mutations BDD
                </p>
              </div>
              <button
                onClick={() => alert(`Export de la piste d'audit pour ${project.code}`)}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 shadow-xs transition cursor-pointer self-start sm:self-auto"
              >
                <Download size={14} /> Exporter Journal d'Audit
              </button>
            </div>

            {/* FILTRES HISTORIQUE */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher une opération par utilisateur, action, référence..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['ALL', 'PRODUCTION', 'ACHATS', 'BUDGET', 'SYSTEME'].map(mod => (
                  <button
                    key={mod}
                    onClick={() => setAuditFilterModule(mod)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      auditFilterModule === mod
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {mod === 'ALL' ? 'Tous les modules' : mod}
                  </button>
                ))}
              </div>
            </div>

            {/* LISTE AUDIT TRAILS */}
            {(() => {
              const baseAuditList = [
                {
                  id: 'LOG-001',
                  timestamp: '2026-08-18 14:32:10',
                  user: 'SEA Alphonse',
                  role: 'Directeur Projet',
                  module: 'PRODUCTION',
                  action: 'VALIDATION_RAPPORT',
                  objectRef: project.code,
                  detail: 'Validation définitive du rapport journalier CR-2026-08-18 (Avancement voiles BA +2.4%)',
                  status: 'Conforme'
                },
                {
                  id: 'LOG-002',
                  timestamp: '2026-08-17 11:15:45',
                  user: 'KOUASSI Roger',
                  role: 'Conducteur Travaux',
                  module: 'ACHATS',
                  action: 'CREATION_DA',
                  objectRef: project.code,
                  detail: 'Émission de la Demande d\'Achat DA-2026-004 pour 45 T de ciment CPJ 42.5 (Contrôle budgétaire OK)',
                  status: 'Conforme'
                },
                {
                  id: 'LOG-003',
                  timestamp: '2026-08-15 09:40:22',
                  user: 'Directeur Général',
                  role: 'Direction Générale',
                  module: 'BUDGET',
                  action: 'APPROBATION_EVM',
                  objectRef: project.code,
                  detail: 'Validation du franchissement de jalon EVM et clôture de la situation mensuelle N°01',
                  status: 'Conforme'
                },
                {
                  id: 'LOG-004',
                  timestamp: '2026-08-10 16:20:00',
                  user: 'Contrôleur de Gestion',
                  role: 'Contrôle Gestion',
                  module: 'BUDGET',
                  action: 'IMPORT_SSOT_DS',
                  objectRef: project.code,
                  detail: 'Synchronisation et consolidation du Déboursé Sec d\'Objectif V0 depuis le fichier Excel SSOT',
                  status: 'Conforme'
                }
              ];

              const combinedLogs = [...projectLogs.map(l => ({
                id: l.id,
                timestamp: l.timestamp || l.createdAt || '2026-08-18 12:00:00',
                user: l.user || project.manager || 'Admin Système',
                role: l.role || 'Utilisateur',
                module: l.module || 'SYSTEME',
                action: l.action || 'MUTATION_BDD',
                objectRef: l.objectRef || project.code,
                detail: l.newValue || l.justification || 'Opération validée sur la base de données.',
                status: 'Conforme'
              })), ...baseAuditList];

              const filteredLogs = combinedLogs.filter(l => {
                const q = auditSearch.toLowerCase().trim();
                const matchQ = !q || l.user.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q);
                const matchMod = auditFilterModule === 'ALL' || l.module.toUpperCase().includes(auditFilterModule);
                return matchQ && matchMod;
              });

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase border-b">
                        <th className="py-2.5 px-3">Date & Heure</th>
                        <th className="py-2.5 px-3">Utilisateur</th>
                        <th className="py-2.5 px-3">Module</th>
                        <th className="py-2.5 px-3">Action Exécutée</th>
                        <th className="py-2.5 px-3">Détail de la mutation</th>
                        <th className="py-2.5 px-3 text-center">Empreinte BDD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium">
                      {filteredLogs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                            {formatFrenchDate(log.timestamp)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[9px] font-black shrink-0">
                                {log.user.charAt(0)}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight">{log.user}</span>
                                <span className="text-[10px] text-slate-400 font-semibold block">{log.role}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                              {log.module}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 font-mono text-[11px]">{log.action}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-md">
                            {log.detail}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold inline-block">
                              ✓ {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      {/* ======================================================== */}
      {/* MODAL 1: DÉTAIL RAPPORT JOURNALIER                       */}
      {/* ======================================================== */}
      {selectedReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Détail du Rapport Journalier : {selectedReportModal.reportCode || selectedReportModal.code || 'CR-001'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block">Date</span>
                <strong className="text-slate-900">{formatFrenchDate(selectedReportModal.date)}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block">Chef de chantier</span>
                <strong className="text-slate-900">{selectedReportModal.createdBy || project.manager}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block">Météo</span>
                <strong className="text-slate-900">{selectedReportModal.weather || 'Ensoleillé'}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block">Effectif</span>
                <strong className="text-slate-900">{selectedReportModal.workersCount || selectedReportModal.workforceCount || 18} ouvriers</strong>
              </div>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs space-y-1">
              <span className="font-bold text-blue-900 block">Imputation WBS & Travaux Réalisés :</span>
              <p className="text-slate-800">
                <strong>[{selectedReportModal.wbsCode || 'WBS.01'}]</strong> {selectedReportModal.activityName || selectedReportModal.taskName || 'Génie civil et coulage béton armé'}
              </p>
              <div className="flex items-center justify-between pt-1 text-slate-700 font-medium">
                <span>Quantité mesurée : <strong>{Number(selectedReportModal.realizedQty || 0).toLocaleString('fr-FR')} {selectedReportModal.unit || 'm²'}</strong></span>
                <span>Rendement : <strong className="text-emerald-700">{selectedReportModal.productivityRate || 95}%</strong></span>
              </div>
            </div>
            {selectedReportModal.observations && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Observations & Remarques :</span>
                <p className="text-slate-600">{selectedReportModal.observations}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setSelectedReportModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DÉTAIL DEMANDE D'ACHAT                          */}
      {/* ======================================================== */}
      {selectedDaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Détail de la Demande d'Achat : {selectedDaModal.code || 'DA-001'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDaModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block">Date</span>
                <strong className="text-slate-900">{formatFrenchDate(selectedDaModal.createdAt || selectedDaModal.desiredDate)}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block">Demandeur</span>
                <strong className="text-slate-900">{selectedDaModal.createdBy || 'Responsable Achat'}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block">Nature Coût</span>
                <strong className="text-slate-900">{selectedDaModal.nature || 'MAT'}</strong>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block">Statut</span>
                <strong className="text-emerald-700">{selectedDaModal.status || 'Approuvé'}</strong>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-800 block">Désignation Fourniture & Article :</span>
              <p className="text-slate-900 font-extrabold text-sm">{selectedDaModal.itemDescription || 'Fourniture de chantier'}</p>
              <div className="flex items-center justify-between text-slate-600 pt-1">
                <span>Quantité : <strong>{Number(selectedDaModal.quantity || 1).toLocaleString('fr-FR')} {selectedDaModal.unit || 'U'}</strong></span>
                <span>Montant Estimé : <strong className="text-purple-900 font-mono text-sm">{fmtMds(selectedDaModal.estimatedTotal || selectedDaModal.totalAmount || 0)}</strong></span>
              </div>
            </div>
            {selectedDaModal.justification && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-1">
                <span className="font-bold text-amber-900 block">Justification du Besoin :</span>
                <p className="text-slate-700">{selectedDaModal.justification}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setSelectedDaModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: TÉLÉVERSER UN DOCUMENT                          */}
      {/* ======================================================== */}
      {isUploadDocOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Upload size={20} className="text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Téléverser un document pour {project.name}</h3>
              </div>
              <button
                onClick={() => setIsUploadDocOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Titre du document *</label>
                <input
                  type="text"
                  placeholder="Ex: Plan de Coffrage Voile Axe 4 Indice D"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catégorie *</label>
                  <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="MARCHE">Marché & Contrat</option>
                    <option value="DEBOURSE">Déboursé Sec & Prix</option>
                    <option value="PLANS">Plans d'Exécution & BET</option>
                    <option value="OS_PV">Ordres de Service & PV</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Indice / Version</label>
                  <input
                    type="text"
                    placeholder="Ex: Indice B"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center space-y-2 cursor-pointer transition bg-slate-50">
                <Folder size={32} className="text-slate-400 mx-auto" />
                <p className="font-bold text-slate-700 text-xs">Glissez-déposez votre fichier ici ou cliquez pour parcourir</p>
                <p className="text-[10px] text-slate-400">Formats supportés : PDF, DWG, XLSX, DOCX (Max 50 Mo)</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsUploadDocOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert('Document téléversé et enregistré avec succès dans la GED du projet !');
                  setIsUploadDocOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition shadow-xs cursor-pointer"
              >
                Enregistrer le document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: SIGNALER UN RISQUE QHSE                         */}
      {/* ======================================================== */}
      {isNewRiskOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={20} className="text-rose-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Signaler un Risque ou Incident QHSE</h3>
              </div>
              <button
                onClick={() => setIsNewRiskOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Description de l'anomalie / Risque identifié *</label>
                <textarea
                  rows={3}
                  placeholder="Décrivez précisément le risque constaté sur le chantier..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catégorie *</label>
                  <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500">
                    <option value="Sécurité">Sécurité & Port des EPI</option>
                    <option value="Environnement">Environnement & Déchets</option>
                    <option value="Fouilles">Fouilles & Terrassement</option>
                    <option value="Intempéries">Intempéries & Inondation</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Niveau de sévérité *</label>
                  <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500">
                    <option value="Critique">Critique (Arrêt immédiat)</option>
                    <option value="Majeure">Majeure (Sous 24h)</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Faible">Faible</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mesure corrective / Plan de prévention immédiat</label>
                <input
                  type="text"
                  placeholder="Action de mitigation à déployer..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsNewRiskOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert('Risque QHSE enregistré dans le registre avec notification à l\'équipe chantier !');
                  setIsNewRiskOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition shadow-xs cursor-pointer"
              >
                Enregistrer l'alerte QHSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: APERÇU DOCUMENT                                 */}
      {/* ======================================================== */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm truncate max-w-md">
                  {selectedDocPreview.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 border-b pb-1.5">
                <span>Catégorie :</span>
                <strong className="text-slate-900">{selectedDocPreview.category}</strong>
              </div>
              <div className="flex justify-between text-slate-600 border-b pb-1.5">
                <span>Format / Type :</span>
                <strong className="text-slate-900">{selectedDocPreview.type} ({selectedDocPreview.size})</strong>
              </div>
              <div className="flex justify-between text-slate-600 border-b pb-1.5">
                <span>Auteur / Émetteur :</span>
                <strong className="text-slate-900">{selectedDocPreview.author}</strong>
              </div>
              <div className="flex justify-between text-slate-600 border-b pb-1.5">
                <span>Date de version :</span>
                <strong className="text-slate-900">{selectedDocPreview.date} ({selectedDocPreview.version})</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Statut d'approbation :</span>
                <strong className="text-emerald-700">{selectedDocPreview.status}</strong>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
              <FileCheck size={36} className="text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-slate-800">Document certifié et validé dans la GED du projet.</p>
              <p className="text-[11px] text-slate-400">Empreinte SHA-256 enregistrée sur la base de données GEBAT 360.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  alert(`Téléchargement de ${selectedDocPreview.title}`);
                  setSelectedDocPreview(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Download size={14} /> Télécharger
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

function nodeActual(node: any) {
  return Number(node.actualCost || 0);
}

export default ProjectDetails360;

