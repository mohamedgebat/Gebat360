import { Project, WBSNode, DailyReport } from '../../types';
import { getProjectWbsNodes } from '../../utils/projectMatcher';

export interface ActivityProgressMetrics {
  wbsId: string;
  wbsCode: string;
  activityName: string;
  unit: string;
  contractQty: number;          // Quantité contractuelle (DQE)
  plannedQty: number;           // Quantité planifiée (Gantt)
  validatedRealizedQty: number; // Quantité réalisée validée cumulée (Rapports Validé / Verrouillé)
  pendingRealizedQty: number;   // Quantité réalisée en attente (Rapports Soumis)
  contractUnitPrice: number;    // PU Contractuel Marché (DQE)
  contractAmount: number;       // Montant Contractuel = ContractQty * ContractUnitPrice
  debourseBudget: number;       // Budget DS (Déboursé Sec unitaire/total)
  plannedProgress: number;      // % Avancement Planifié (0-100)
  realizedProgress: number;     // % Avancement Réel (0-100)
  overproductionQty: number;    // Quantité excédentaire réalisée (> contractuelle)
  hasOverproductionAlert: boolean; // Vrai si réalisée > contractuelle
}

export interface ProjectProgressSummary {
  projectId: string;
  totalContractAmount: number;  // Σ(Montant contractuel des activités)
  totalEarnedAmount: number;    // Σ(Montant contractuel * Avancement réel / 100)
  totalPlannedAmount: number;   // Σ(Montant contractuel * Avancement planifié / 100)
  overallPhysicalProgress: number; // Avancement physique réel du projet (%)
  overallPlannedProgress: number;  // Avancement planifié du projet (%)
  progressGap: number;          // Écart = Réel - Planifié (points)
  isBehindSchedule: boolean;    // Vrai si Retard
  isAheadOfSchedule: boolean;   // Vrai si Avance
  totalOverproductionAmount: number;
}

export interface SCurvePeriodPoint {
  periodKey: string;           // ex: "2026-01" ou "Janvier 2026"
  periodLabel: string;
  endDate: string;             // Date de fin de période YYYY-MM-DD
  plannedCumulQtyPct: number;  // Avancement contractuel planifié cumulé (%)
  realCumulQtyPct: number;     // Avancement contractuel réel cumulé (%)
  gapPoints: number;           // Écart = Réel - Planifié (points)
  statusLabel: string;         // "Avance +X pts" | "Retard -Y pts" | "Conforme"
  isFuture: boolean;           // Vrai si période non encore échue
}

/**
 * Normalise le statut d'un rapport journalier.
 * Tout rapport saisi et transmis (Soumis, Validé, Verrouillé, etc.) est comptabilisé.
 * Ne sont exclus que les rapports explicitement rejetés (Refusé) ou brouillons purs.
 */
export const isReportValidatedOrLocked = (report: DailyReport | any): boolean => {
  if (!report) return false;
  const status = String(report.status || '').toUpperCase().trim();
  if (status === 'REFUSÉ' || status === 'REFUSE' || status === 'REJECTED' || status === 'BROUILLON' || status === 'DRAFT') {
    return false;
  }
  return true;
};

export const isReportSubmitted = (report: DailyReport | any): boolean => {
  if (!report) return false;
  const status = String(report.status || '').toUpperCase().trim();
  return (
    status === 'SOUMIS' ||
    status === 'SUBMITTED' ||
    status === 'ATTENTE' ||
    status === 'PENDING'
  );
};

const STOP_WORDS = new Set([
  'DE', 'DES', 'DU', 'LA', 'LE', 'LES', 'EN', 'ET', 'A', 'AU', 'AUX', 
  'PAR', 'POUR', 'SUR', 'DANS', 'Y', 'COMPRIS', 'D', 'L', 'UN', 'UNE', 
  'TYPE', 'TOUS', 'TOUTE', 'TOUTES', 'AVEC', 'SANS', 'SOUS'
]);

export const normalizeBtpString = (s: any): string => {
  return String(s || '')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getBtpTokens = (s: any): string[] => {
  return normalizeBtpString(s).split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
};

/**
 * Vérifie si un rapport correspond à une tâche WBS avec tolérance sur codes, descriptions et sémantique BTP.
 */
export const isReportForWbsNode = (report: DailyReport | any, node: WBSNode | any): boolean => {
  if (!report || !node) return false;
  const norm = (s: any) => String(s || '').trim().toUpperCase();
  const nWbsCode = norm(node.wbsCode);
  const nCode = norm(node.code);
  const nId = norm(node.id);
  const nPriceNo = norm(node.priceNo);
  const nName = norm(node.name || node.description || '');

  const nodeCodes = new Set([nWbsCode, nCode, nId, nPriceNo].filter(Boolean));

  const rWbsCode = norm(report.wbsCode);
  const rWbsId = norm(report.wbsId);
  const rActivityCode = norm(report.activityCode || report.code);
  const rName = norm(report.activityName || report.taskName || report.name || report.description || '');

  // 1. Match code direct
  if (nodeCodes.has(rWbsCode) || nodeCodes.has(rWbsId) || nodeCodes.has(rActivityCode)) {
    return true;
  }

  // 2. Match code préfixe/inclusion (en évitant les marqueurs génériques 04.01.001 / 04.02.001)
  const isGenericCode = (c: string) => c === '04.01.001' || c === '04.02.001' || c === 'PROD' || c.length < 3;
  for (const c of nodeCodes) {
    if (rWbsCode && !isGenericCode(rWbsCode) && (c === rWbsCode || c.startsWith(rWbsCode) || rWbsCode.startsWith(c))) return true;
    if (rWbsId && !isGenericCode(rWbsId) && (c === rWbsId || c.startsWith(rWbsId) || rWbsId.startsWith(c))) return true;
    if (rActivityCode && !isGenericCode(rActivityCode) && (c === rActivityCode || c.startsWith(rActivityCode) || rActivityCode.startsWith(c))) return true;
  }

  // 3. Match nom / désignation d'activité exacte ou sous-chaîne
  if (nName && rName && (nName === rName || nName.includes(rName) || rName.includes(nName))) {
    return true;
  }

  // 4. Correspondance sémantique BTP par mots-clés et sections
  const rTokens = getBtpTokens(rName);
  const nDescTokens = getBtpTokens(node.description || node.name || '');
  const nSecTokens = getBtpTokens(node.section || '');
  const nAllTokens = getBtpTokens((node.section || '') + ' ' + (node.description || node.name || ''));

  const parts = String(report.activityName || report.taskName || '').split('-').map(p => p.trim());
  if (parts.length >= 2) {
    const rSec = parts[0];
    const rTask = parts.slice(1).join(' ');
    const rSecToks = getBtpTokens(rSec);
    const rTaskToks = getBtpTokens(rTask);

    let secCompatible = true;
    if (rSecToks.length > 0 && nSecTokens.length > 0) {
      secCompatible = rSecToks.some(st => nSecTokens.some(nst => nst.includes(st) || st.includes(nst))) ||
                      rSecToks.some(st => nDescTokens.some(ndt => ndt.includes(st) || st.includes(ndt)));
    }

    if (secCompatible && rTaskToks.length > 0) {
      let taskScore = 0;
      for (const tt of rTaskToks) {
        if (nDescTokens.includes(tt)) taskScore += 2;
        else if (nDescTokens.some(ndt => ndt.includes(tt) || tt.includes(ndt))) taskScore += 1;
      }
      if (taskScore >= 2 || (rTaskToks.length === 1 && taskScore >= 1)) {
        return true;
      }
    }
  } else {
    let score = 0;
    for (const rt of rTokens) {
      if (nAllTokens.includes(rt)) score += 2;
      else if (nAllTokens.some(nt => nt.includes(rt) || rt.includes(nt))) score += 1;
    }
    if (score >= 4 || (rTokens.length <= 2 && score >= 2)) {
      return true;
    }
  }

  // 5. Activités multiples enregistrées dans le rapport (recordedActivities)
  if (Array.isArray(report.recordedActivities) && report.recordedActivities.length > 0) {
    return report.recordedActivities.some((act: any) => isReportForWbsNode(act, node));
  }

  return false;
};

/**
 * 1. AVANCEMENT ACTIVITÉ
 * Calcule l'avancement d'une activité WBS à partir des rapports et du DQE.
 */
export const calculateActivityProgress = (
  node: WBSNode | any,
  allReports: (DailyReport | any)[]
): ActivityProgressMetrics => {
  const nodeCode = node.wbsCode || node.code || node.priceNo || '';
  const nodeId = node.id || '';
  const unit = node.unit || 'm3';
  const nName = String(node.name || node.description || '').trim().toUpperCase();

  // DQE : Source de vérité pour la quantité et valeur contractuelles
  const contractQty = Math.max(0, Number(node.contractQty || node.plannedQty || node.quantity || node.targetQty || 0));
  const contractUnitPrice = Math.max(0, Number(node.contractUnitPrice || node.marketUnitPrice || node.priceNoUnit || node.unitCost || node.pu || 0));
  
  let contractAmount = Number(node.contractAmount || node.marketAmount || 0);
  if (!contractAmount || contractAmount === 0) {
    contractAmount = contractQty * contractUnitPrice;
  }
  if (!contractAmount || contractAmount === 0) {
    contractAmount = Number(node.importedDsAmount || node.calculatedDsAmount || node.revisedBudget || node.initialBudget || node.totalPrice || 0);
  }

  // Budget DS (Coûts théoriques de revient)
  const debourseBudget = Number(node.budgetDs || node.importedDsAmount || node.calculatedDsAmount || node.revisedBudget || node.initialBudget || 0);
  const plannedQty = Math.max(0, Number(node.plannedQty || contractQty));

  // Filtrage idempotant des rapports pour cette activité
  const processedReportIds = new Set<string>();
  let validatedRealizedQty = 0;
  let pendingRealizedQty = 0;

  (allReports || []).forEach(rep => {
    if (!rep) return;
    const repId = String(rep.id || rep.code || '').trim();
    if (!repId || processedReportIds.has(repId)) return;

    if (isReportForWbsNode(rep, node)) {
      processedReportIds.add(repId);
      let qty = Math.max(0, Number(rep.realizedQty || 0));

      if (Array.isArray(rep.recordedActivities) && rep.recordedActivities.length > 0) {
        const matched = rep.recordedActivities.find((act: any) => isReportForWbsNode(act, node));
        if (matched && matched.realizedQty !== undefined && !isNaN(Number(matched.realizedQty))) {
          qty = Math.max(0, Number(matched.realizedQty));
        }
      }

      if (isReportValidatedOrLocked(rep)) {
        validatedRealizedQty += qty;
      } else if (isReportSubmitted(rep)) {
        pendingRealizedQty += qty;
      }
    }
  });

  // Calcul du % d'avancement réel
  let realizedProgress = 0;
  if (contractQty > 0) {
    realizedProgress = Math.min(100, Number(((validatedRealizedQty / contractQty) * 100).toFixed(1)));
  } else if (validatedRealizedQty > 0) {
    realizedProgress = 100;
  } else if (node.progress !== undefined && !isNaN(Number(node.progress))) {
    realizedProgress = Math.min(100, Math.max(0, Number(node.progress)));
  }

  // Avancement planifié
  let plannedProgress = 0;
  if (contractQty > 0) {
    plannedProgress = Math.min(100, Number(((plannedQty / contractQty) * 100).toFixed(1)));
  } else {
    plannedProgress = realizedProgress;
  }

  // Surproduction (Non plafonnée sur les quantitatifs)
  const overproductionQty = validatedRealizedQty > contractQty && contractQty > 0 ? validatedRealizedQty - contractQty : 0;
  const hasOverproductionAlert = contractQty > 0 && validatedRealizedQty > contractQty;

  return {
    wbsId: nodeId,
    wbsCode: nodeCode,
    activityName: node.name || node.description || 'Activité WBS',
    unit,
    contractQty,
    plannedQty,
    validatedRealizedQty,
    pendingRealizedQty,
    contractUnitPrice,
    contractAmount,
    debourseBudget,
    plannedProgress,
    realizedProgress,
    overproductionQty,
    hasOverproductionAlert
  };
};

/**
 * Extraction des feuilles terminales d'un arbre WBS
 */
export const getLeavesWBS = (nodes: (WBSNode | any)[]): (WBSNode | any)[] => {
  let list: (WBSNode | any)[] = [];
  (nodes || []).forEach(node => {
    if (!node) return;
    if (!node.children || node.children.length === 0) {
      list.push(node);
    } else {
      list = list.concat(getLeavesWBS(node.children));
    }
  });
  return list;
};

/**
 * 2. CUMUL ET AVANCEMENT GLOBAL DU PROJET
 */
export const calculateProjectOverallProgress = (
  project: Project | any,
  wbsNodes: (WBSNode | any)[],
  allReports: (DailyReport | any)[]
): ProjectProgressSummary => {
  const projectId = project?.id || project?.code || 'PROJ';
  let leaves = getLeavesWBS(wbsNodes || []);

  // Si aucun nœud feuille fourni, récupérer automatiquement les activités SSOT de référence du projet
  if (leaves.length === 0 && project) {
    const fallbackNodes = getProjectWbsNodes(project);
    leaves = getLeavesWBS(fallbackNodes);
  }

  if (leaves.length === 0) {
    const pId = String(project?.id || '').toUpperCase().trim();
    const pCode = String(project?.code || '').toUpperCase().trim();
    const projectValidReports = (allReports || []).filter(r => {
      if (!isReportValidatedOrLocked(r)) return false;
      const rProj = String(r.projectId || r.project_id || '').toUpperCase().trim();
      return rProj === pId || rProj === pCode || (pId && rProj.includes(pId));
    });

    if (projectValidReports.length > 0) {
      const totalRealizedCost = projectValidReports.reduce((s, r) => s + (Number(r.realizedQty || 0) * Number(r.pu || 1000)), 0);
      const projBudget = Number(project?.revisedBudget || project?.initialBudget || project?.contractAmount || 1000000);
      const calculatedProg = Math.min(100, Number(((totalRealizedCost / projBudget) * 100).toFixed(1)));
      return {
        projectId,
        totalContractAmount: projBudget,
        totalEarnedAmount: totalRealizedCost,
        totalPlannedAmount: projBudget,
        overallPhysicalProgress: calculatedProg,
        overallPlannedProgress: calculatedProg,
        progressGap: 0,
        isBehindSchedule: false,
        isAheadOfSchedule: false,
        totalOverproductionAmount: 0
      };
    }

    const fallbackProg = Number(project?.progress || project?.physicalProgress || 0);
    return {
      projectId,
      totalContractAmount: Number(project?.contractAmount || project?.revisedBudget || 0),
      totalEarnedAmount: Number((project?.contractAmount || 0) * (fallbackProg / 100)),
      totalPlannedAmount: Number(project?.contractAmount || 0),
      overallPhysicalProgress: Number(fallbackProg.toFixed(1)),
      overallPlannedProgress: Number(fallbackProg.toFixed(1)),
      progressGap: 0,
      isBehindSchedule: false,
      isAheadOfSchedule: false,
      totalOverproductionAmount: 0
    };
  }

  let totalContractAmount = 0;
  let totalEarnedAmount = 0;
  let totalPlannedAmount = 0;
  let totalOverproductionAmount = 0;

  leaves.forEach(leaf => {
    const metrics = calculateActivityProgress(leaf, allReports);
    const weight = metrics.contractAmount || Number(leaf.revisedBudget || leaf.initialBudget || 1000);

    totalContractAmount += weight;
    totalEarnedAmount += weight * (metrics.realizedProgress / 100);
    totalPlannedAmount += weight * (metrics.plannedProgress / 100);

    if (metrics.overproductionQty > 0 && metrics.contractUnitPrice > 0) {
      totalOverproductionAmount += metrics.overproductionQty * metrics.contractUnitPrice;
    }
  });

  const overallPhysicalProgress = totalContractAmount > 0
    ? Math.min(100, Math.max(0, Number(((totalEarnedAmount / totalContractAmount) * 100).toFixed(1))))
    : Number(project?.progress || 0);

  const overallPlannedProgress = totalContractAmount > 0
    ? Math.min(100, Math.max(0, Number(((totalPlannedAmount / totalContractAmount) * 100).toFixed(1))))
    : overallPhysicalProgress;

  const progressGap = Number((overallPhysicalProgress - overallPlannedProgress).toFixed(1));

  return {
    projectId,
    totalContractAmount,
    totalEarnedAmount,
    totalPlannedAmount,
    overallPhysicalProgress: Number(overallPhysicalProgress.toFixed(1)),
    overallPlannedProgress: Number(overallPlannedProgress.toFixed(1)),
    progressGap,
    isBehindSchedule: progressGap < 0,
    isAheadOfSchedule: progressGap > 0,
    totalOverproductionAmount
  };
};

/**
 * 5. & 6. GÉNÉRATEUR S-CURVE SÉRIES (PLANIFIÉ VS RÉEL)
 */
export const generateSCurveSeries = (
  project: Project | any,
  wbsNodes: (WBSNode | any)[],
  allReports: (DailyReport | any)[],
  periods: { key: string; label: string; endDate: string; plannedQtyByActivity?: Record<string, number> }[]
): SCurvePeriodPoint[] => {
  const leaves = getLeavesWBS(wbsNodes || []);
  const todayIso = new Date().toISOString().split('T')[0];

  return periods.map((period, pIdx) => {
    const isFuture = period.endDate > todayIso;

    // Filtrer les rapports validés jusqu'à la date de fin de cette période
    const periodReports = (allReports || []).filter(r => {
      if (!isReportValidatedOrLocked(r)) return false;
      const rDate = String(r.date || '').split('T')[0];
      return rDate !== '' && rDate <= period.endDate;
    });

    let totalContractAmount = 0;
    let totalRealEarned = 0;
    let totalPlannedEarned = 0;

    leaves.forEach((leaf, leafIdx) => {
      const metrics = calculateActivityProgress(leaf, periodReports);
      const weight = metrics.contractAmount;
      totalContractAmount += weight;

      // Réel cumulé à cette période
      totalRealEarned += weight * (metrics.realizedProgress / 100);

      // Planifié cumulé à cette période (depuis Gantt ou interpolation proportionnelle)
      let periodPlannedPct = 0;
      if (period.plannedQtyByActivity && period.plannedQtyByActivity[leaf.code || leaf.id || leafIdx] !== undefined) {
        const plannedCumul = Number(period.plannedQtyByActivity[leaf.code || leaf.id || leafIdx] || 0);
        periodPlannedPct = metrics.contractQty > 0 ? Math.min(100, (plannedCumul / metrics.contractQty) * 100) : 100;
      } else {
        // Formule de répartition proportionnelle par période
        const ratio = (pIdx + 1) / (periods.length || 1);
        periodPlannedPct = Math.min(100, Math.round(ratio * 100));
      }

      totalPlannedEarned += weight * (periodPlannedPct / 100);
    });

    let realCumulQtyPct = totalContractAmount > 0
      ? Number(((totalRealEarned / totalContractAmount) * 100).toFixed(1))
      : 0;

    // Fallback dynamique si les quantités des feuilles ne sont pas renseignées par période mais le projet a un avancement validé
    if (realCumulQtyPct === 0 && Number(project?.progress || 0) > 0 && !isFuture) {
      const activeMonthCutoff = todayIso.substring(0, 7);
      const projProg = Number(project.progress);
      if (period.key === activeMonthCutoff) {
        realCumulQtyPct = projProg;
      } else if (period.key < activeMonthCutoff) {
        const activeIdx = periods.findIndex(p => p.key === activeMonthCutoff);
        if (activeIdx > 0 && pIdx <= activeIdx) {
          realCumulQtyPct = Number(((pIdx / activeIdx) * projProg).toFixed(1));
        } else {
          realCumulQtyPct = projProg;
        }
      }
    }

    const plannedCumulQtyPct = totalContractAmount > 0
      ? Number(((totalPlannedEarned / totalContractAmount) * 100).toFixed(1))
      : Number(((pIdx + 1) / periods.length * 100).toFixed(1));

    const gapPoints = Number((realCumulQtyPct - plannedCumulQtyPct).toFixed(1));

    let statusLabel = 'Conforme';
    if (gapPoints > 0) statusLabel = `Avance +${gapPoints} pts`;
    else if (gapPoints < 0) statusLabel = `Retard ${gapPoints} pts`;

    return {
      periodKey: period.key,
      periodLabel: period.label,
      endDate: period.endDate,
      plannedCumulQtyPct,
      realCumulQtyPct,
      gapPoints,
      statusLabel,
      isFuture
    };
  });
};
