/**
 * GEBAT 360° — CENTRALIZED FINANCIAL & OPERATIONAL FORMULAS
 * Single Source of Truth for all financial and operational metric calculations.
 */

/**
 * Format clean FCFA currency without floating point decimals
 */
export const formatFCFA = (amount?: number | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 FCFA';
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
};

/**
 * Format compact currency in Millions (M FCFA) or Billions (Mds FCFA)
 */
export const formatCompactFCFA = (amount?: number | null, withSuffix: boolean = true): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return `0${withSuffix ? ' FCFA' : ''}`;
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const mds = (abs / 1_000_000_000).toFixed(2).replace('.', ',');
    return `${sign}${mds}${withSuffix ? ' Mds FCFA' : ' Mds'}`;
  } else if (abs >= 1_000_000) {
    const m = (abs / 1_000_000).toFixed(2).replace('.', ',');
    return `${sign}${m}${withSuffix ? ' M FCFA' : ' M'}`;
  }
  return `${sign}${abs.toLocaleString('fr-FR')}${withSuffix ? ' FCFA' : ''}`;
};

/**
 * 1. Available Budget to Commit (Budget Disponibilité à Engager)
 * Formula: Budget Révisé - Engagés Actifs - Réservations Actives
 */
export const calculateAvailableBudget = (
  revisedBudget: number = 0,
  committed: number = 0,
  reserved: number = 0
): number => {
  return Math.max(0, Math.round(revisedBudget - committed - reserved));
};

/**
 * 2. Estimate at Completion (EAC)
 * Formula: Coût Réel à date (AC) + Forecast Reste à faire
 */
export const calculateEAC = (
  actualCost: number = 0,
  forecast: number = 0
): number => {
  return Math.round(actualCost + Math.max(0, forecast));
};

/**
 * 3. Variance at Completion (VAC / Écart à terminaison)
 * Formula: Budget Révisé - EAC
 */
export const calculateVAC = (
  revisedBudget: number = 0,
  eac: number = 0
): number => {
  return Math.round(revisedBudget - eac);
};

/**
 * 4. Initial Margin (Marge Initiale Théorique)
 * Formula: Montant Marché Client (DQE) - Budget DS Initial
 */
export const calculateInitialMargin = (
  contractAmount: number = 0,
  budgetDs: number = 0
): number => {
  return Math.round(contractAmount - budgetDs);
};

/**
 * 5. EAC Margin (Marge Prévisionnelle EAC)
 * Formula: Montant Marché Client (DQE) - EAC
 */
export const calculateEACMargin = (
  contractAmount: number = 0,
  eac: number = 0
): number => {
  return Math.round(contractAmount - eac);
};

/**
 * 6. Margin Percentage
 * Formula: (Marge / Montant Marché) * 100
 */
export const calculateMarginPercentage = (
  marginAmount: number = 0,
  contractAmount: number = 0
): number => {
  if (contractAmount <= 0) return 0;
  return Math.round(((marginAmount / contractAmount) * 100) * 10) / 10;
};

/**
 * 7. Weighted Progress Percentage (Avancement Moyenne Pondérée par le Budget)
 */
export const calculateWeightedProgress = (
  items: Array<{ progress?: number; budgetDs?: number; revisedBudget?: number; contractAmount?: number }>
): number => {
  if (!items || items.length === 0) return 0;
  
  let totalWeight = 0;
  let weightedProgressSum = 0;

  items.forEach(item => {
    const weight = Number(item.budgetDs || item.revisedBudget || item.contractAmount || 0);
    const prog = Number(item.progress || 0);
    if (weight > 0) {
      totalWeight += weight;
      weightedProgressSum += prog * weight;
    }
  });

  if (totalWeight <= 0) {
    const sum = items.reduce((s, i) => s + Number(i.progress || 0), 0);
    return Math.min(100, Math.round(sum / items.length));
  }

  return Math.min(100, Math.round(weightedProgressSum / totalWeight));
};

/**
 * 8. Productivity Rate (Taux de Productivité)
 * Formula: (Quantité Réalisée / Quantité Objectif) * 100
 */
export const calculateProductivityRate = (
  realizedQty: number = 0,
  plannedQty: number = 1
): number => {
  if (plannedQty <= 0) return 100;
  return Math.min(200, Math.round((realizedQty / plannedQty) * 100));
};

export interface ProjectFinancialSummary {
  contractAmount: number;
  initialBudget: number;
  revisedBudget: number;
  committed: number;
  actualCost: number;
  resteAEngager: number;
  eac: number;
  initialMargin: number;
  eacMargin: number;
  initialMarginPct: number;
  eacMarginPct: number;
  progressPct: number;
}

/**
 * 9. Unified Project Financial Summary (SSOT)
 * Single Source of Truth helper function ensuring identical financial metrics across all views.
 */
export const getProjectFinancialSummary = (
  project?: any | null,
  wbsNodes: any[] = [],
  dsActivities: any[] = [],
  purchaseRequests: any[] = [],
  dailyReports: any[] = []
): ProjectFinancialSummary => {
  if (!project) {
    return {
      contractAmount: 0,
      initialBudget: 0,
      revisedBudget: 0,
      committed: 0,
      actualCost: 0,
      resteAEngager: 0,
      eac: 0,
      initialMargin: 0,
      eacMargin: 0,
      initialMarginPct: 0,
      eacMarginPct: 0,
      progressPct: 0
    };
  }

  const pId = String(project.id || '').toUpperCase().trim();
  const pCode = String(project.code || '').toUpperCase().trim();

  // 1. Official Contract Amount (Montant Marché HT)
  const contractAmount = Number(project.contractAmount || project.contract_amount || 0);

  // 2. Official Déboursé Sec (DS Initial & Révisé)
  const revisedBudget = Number(project.revisedBudget || project.initialBudget || Math.round(contractAmount * 0.80));
  const initialBudget = Number(project.initialBudget || project.revisedBudget || Math.round(contractAmount * 0.80));

  // 3. Total Committed (Engagé Achats / DAs)
  let committed = 0;
  if (Array.isArray(purchaseRequests) && purchaseRequests.length > 0) {
    const pDAs = purchaseRequests.filter(da => {
      const daProj = String(da.projectId || da.project_id || '').toUpperCase();
      return daProj === pId || daProj === pCode || daProj.includes(pId) || pId.includes(daProj);
    });
    committed = pDAs.reduce((s, da) => s + Number(da.estimatedTotal || da.totalAmount || da.amount || 0), 0);
  }

  // 4. Total Actual Cost (Coût Réel à Date / Rapports de Production Validés + WBS)
  let actualCost = 0;
  if (Array.isArray(dailyReports) && dailyReports.length > 0) {
    const validReports = dailyReports.filter(r => {
      const rProj = String(r.projectId || r.project_id || '').toUpperCase();
      const rCode = String(r.code || r.id || r.reportCode || '').toUpperCase();
      const s = (r.status || '').toUpperCase();
      const isValidated = s.includes('VALID') || s.includes('VERROU') || s.includes('APPROVED') || s.includes('CLOSED');
      if (!isValidated) return false;
      const isSongon = pId.includes('SON') || pCode.includes('SON');
      const isBingerville = pId.includes('BEN') || pCode.includes('BEN');
      if (isSongon && (rCode.startsWith('REP-BEN-') || rProj.includes('BEN'))) return false;
      if (isBingerville && (rCode.startsWith('REP-SON-') || rProj.includes('SON'))) return false;
      return rProj === pId || rProj === pCode || rProj.includes(pId) || pId.includes(rProj) || (isSongon && rProj.includes('SON')) || (isBingerville && rProj.includes('BEN'));
    });
    actualCost = validReports.reduce((s, r) => {
      let cost = Number(r.totalCost);
      const qte = Number(r.realizedQty || 0);
      let unitPrice = Number(r.pu);
      if (!unitPrice || isNaN(unitPrice) || unitPrice <= 0) {
        const wbsCode = String(r.wbsCode || r.wbsId || '').toUpperCase();
        const node = wbsNodes.find((n: any) => String(n.code || n.id || '').toUpperCase() === wbsCode);
        if (node) {
          const planned = Number(node.plannedQty || node.contractQty || 1);
          const nodeBudget = Number(node.revisedBudget || node.contractAmount || node.initialBudget || 0);
          unitPrice = Number(node.pu || node.marketUnitPrice || (nodeBudget > 0 && planned > 0 ? nodeBudget / planned : 500000));
        } else {
          unitPrice = 500000;
        }
      }

      // Si le coût est aberrant (> 500M FCFA ou > Montant Marché), utiliser le calcul déterministe qte * pu
      if (isNaN(cost) || cost <= 0 || cost > 500000000 || cost > (contractAmount || 500000000)) {
        cost = qte * unitPrice;
      }
      return s + cost;
    }, 0);
  }

  if (actualCost <= 0 && Array.isArray(wbsNodes) && wbsNodes.length > 0) {
    actualCost = wbsNodes.reduce((s, n) => s + Number(n.actualCost || n.actualCostAmount || 0), 0);
  }

  // 5. Reste à Engager
  const maxSpentOrCommitted = Math.max(committed, actualCost);
  const resteAEngager = Math.max(0, revisedBudget - maxSpentOrCommitted);

  // 6. EAC (Prévision à Terminaison) : Plafonné au budget révisé sauf dépassement réel avéré
  const eac = (actualCost > revisedBudget) ? Math.max(revisedBudget, actualCost) : revisedBudget;

  // 7. Marges et Taux
  const initialMargin = calculateInitialMargin(contractAmount, revisedBudget);
  const eacMargin = calculateEACMargin(contractAmount, eac);
  const initialMarginPct = calculateMarginPercentage(initialMargin, contractAmount);
  const eacMarginPct = calculateMarginPercentage(eacMargin, contractAmount);

  // 8. Progress (Harmonisé et Unifié 100% SSOT entre Cartes KPI, Graphiques et Portefeuille)
  let progressPct = 0;
  if (contractAmount > 0 && actualCost > 0) {
    progressPct = Number(((actualCost / contractAmount) * 100).toFixed(1));
  }

  if (progressPct === 0 && Array.isArray(wbsNodes) && wbsNodes.length > 0) {
    const getLeaves = (arr: any[]): any[] => {
      let res: any[] = [];
      arr.forEach(n => {
        if (!n.children || n.children.length === 0) res.push(n);
        else res = res.concat(getLeaves(n.children));
      });
      return res;
    };
    const leafNodes = getLeaves(wbsNodes);
    const totalPlanned = leafNodes.reduce((acc, n) => acc + Number(n.revisedBudget || n.contractAmount || n.initialBudget || 1), 0);
    const totalDone = leafNodes.reduce((acc, n) => acc + (Number(n.revisedBudget || n.contractAmount || n.initialBudget || 1) * (Number(n.progress || 0) / 100)), 0);
    if (totalPlanned > 0 && totalDone > 0) {
      progressPct = Number(((totalDone / totalPlanned) * 100).toFixed(1));
    }
  }

  if (progressPct === 0) {
    progressPct = Number(project?.progress || project?.physicalProgress || 0);
  }

  progressPct = Math.min(100, Math.max(0, progressPct));

  return {
    contractAmount,
    initialBudget,
    revisedBudget,
    committed,
    actualCost,
    resteAEngager,
    eac,
    initialMargin,
    eacMargin,
    initialMarginPct,
    eacMarginPct,
    progressPct
  };
};
