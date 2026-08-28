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
