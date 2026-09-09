import { Project, WBSNode, DailyReport } from '../../types';

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
 * Normalise le statut d'un rapport journalier
 */
export const isReportValidatedOrLocked = (report: DailyReport | any): boolean => {
  if (!report) return false;
  const status = String(report.status || '').toUpperCase().trim();
  return (
    status === 'VALIDÉ' ||
    status === 'VALIDE' ||
    status === 'VALIDATED' ||
    status === 'VERROUILLÉ' ||
    status === 'VERROUILLE' ||
    status === 'LOCKED' ||
    status === 'APPROVED' ||
    status === 'CLOSED'
  );
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

/**
 * Vérifie si un rapport correspond à une tâche WBS
 */
export const isReportForWbsNode = (report: DailyReport | any, node: WBSNode | any): boolean => {
  if (!report || !node) return false;
  const rWbsCode = String(report.wbsCode || '').trim();
  const rWbsId = String(report.wbsId || '').trim();
  const nCode = String(node.code || '').trim();
  const nId = String(node.id || '').trim();
  const nPriceNo = String(node.priceNo || '').trim();

  return (
    (rWbsCode !== '' && (rWbsCode === nCode || rWbsCode === nPriceNo)) ||
    (rWbsId !== '' && (rWbsId === nId || rWbsId === nCode || rWbsId === nPriceNo))
  );
};

/**
 * 1. AVANCEMENT ACTIVITÉ
 * Calcule l'avancement d'une activité WBS à partir des rapports validés et du DQE.
 */
export const calculateActivityProgress = (
  node: WBSNode | any,
  allReports: (DailyReport | any)[]
): ActivityProgressMetrics => {
  const nodeCode = node.code || node.priceNo || '';
  const nodeId = node.id || '';
  const unit = node.unit || 'm3';

  // DQE : Source de vérité pour la quantité et valeur contractuelles
  const contractQty = Math.max(0, Number(node.contractQty || node.plannedQty || node.quantity || 0));
  const contractUnitPrice = Math.max(0, Number(node.contractUnitPrice || node.priceNoUnit || node.unitCost || node.pu || 0));
  
  let contractAmount = Number(node.contractAmount || 0);
  if (!contractAmount || contractAmount === 0) {
    contractAmount = contractQty * contractUnitPrice;
  }
  if (!contractAmount || contractAmount === 0) {
    contractAmount = Number(node.revisedBudget || node.initialBudget || node.totalPrice || 0);
  }

  // Budget DS (Coûts théoriques de revient)
  const debourseBudget = Number(node.budgetDs || node.revisedBudget || node.initialBudget || 0);
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
      const qty = Math.max(0, Number(rep.realizedQty || 0));

      if (isReportValidatedOrLocked(rep)) {
        validatedRealizedQty += qty;
      } else if (isReportSubmitted(rep)) {
        pendingRealizedQty += qty;
      }
    }
  });

  // Calcul du % d'avancement réel (plafonné à 100% pour le calcul officiel)
  let realizedProgress = 0;
  if (contractQty > 0) {
    realizedProgress = Math.min(100, (validatedRealizedQty / contractQty) * 100);
  } else if (node.progress !== undefined) {
    realizedProgress = Math.min(100, Math.max(0, Number(node.progress)));
  }

  // Avancement planifié
  let plannedProgress = 0;
  if (contractQty > 0) {
    plannedProgress = Math.min(100, (plannedQty / contractQty) * 100);
  } else {
    plannedProgress = realizedProgress;
  }

  // Surproduction (Non plafonnée sur les quantitatifs)
  const overproductionQty = validatedRealizedQty > contractQty ? validatedRealizedQty - contractQty : 0;
  const hasOverproductionAlert = validatedRealizedQty > contractQty;

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
    plannedProgress: Number(plannedProgress.toFixed(1)),
    realizedProgress: Number(realizedProgress.toFixed(1)),
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
 * 3. AVANCEMENT PROJET GLOBAL (PONDÉRÉ PAR LE MARCHÉ CONTRACTUEL DQE)
 */
export const calculateProjectOverallProgress = (
  project: Project | any,
  wbsNodes: (WBSNode | any)[],
  allReports: (DailyReport | any)[]
): ProjectProgressSummary => {
  const projectId = project?.id || project?.code || 'PROJ';
  const leaves = getLeavesWBS(wbsNodes || []);

  if (leaves.length === 0) {
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
    const weight = metrics.contractAmount;

    totalContractAmount += weight;
    totalEarnedAmount += weight * (metrics.realizedProgress / 100);
    totalPlannedAmount += weight * (metrics.plannedProgress / 100);

    if (metrics.overproductionQty > 0 && metrics.contractUnitPrice > 0) {
      totalOverproductionAmount += metrics.overproductionQty * metrics.contractUnitPrice;
    }
  });

  const overallPhysicalProgress = totalContractAmount > 0
    ? Math.min(100, Math.max(0, (totalEarnedAmount / totalContractAmount) * 100))
    : Number(project?.progress || 0);

  const overallPlannedProgress = totalContractAmount > 0
    ? Math.min(100, Math.max(0, (totalPlannedAmount / totalContractAmount) * 100))
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

    const realCumulQtyPct = totalContractAmount > 0
      ? Number(((totalRealEarned / totalContractAmount) * 100).toFixed(1))
      : 0;

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
      realCumulQtyPct: isFuture && realCumulQtyPct === 0 ? realCumulQtyPct : realCumulQtyPct,
      gapPoints,
      statusLabel,
      isFuture
    };
  });
};
