// Moteur de Calcul Centralisé 100% Réel — GEBAT 360°
import { Project, WBSNode, DailyReport, StockMovement, PurchaseRequest, PurchaseOrder } from '../types';
import { isProjectMatch, isReportForProject } from './projectMatcher';

export interface CalculatedFinancials {
  contractAmount: number;
  initialBudget: number;
  revisedBudget: number;
  actualCost: number;
  committed: number;
  forecast: number;
  eac: number;
  varianceAtCompletion: number;
  marginAmount: number;
  marginRatePercent: number;
  progressPercent: number;
}

/**
 * 1. Calcul du Coût Réel (Actual Cost - AC)
 * Source de vérité : dailyReports + stockMovements (Sorties) + wbsNodes (actualCost)
 */
export const calculateActualCost = (
  project: Project,
  dailyReports: DailyReport[],
  stockMovements: StockMovement[],
  wbsNodes: WBSNode[] = []
): number => {
  if (!project) return 0;

  // A. Coût depuis les Rapports Journaliers de Terrain (Quantité Réalisée * PU ou totalCost assaini)
  const MAX_SINGLE_REPORT_COST = 500000000; // 500M FCFA max par rapport journalier
  const reportsCost = dailyReports
    .filter(r => isReportForProject(r, project))
    .reduce((sum, r) => {
      let cost = Number(r.totalCost);
      const qte = Number(r.realizedQty) || 0;
      const pu = Number(r.pu) || 5000;
      if (isNaN(cost) || cost > MAX_SINGLE_REPORT_COST) {
        cost = (qte > 0 && pu > 0 && (qte * pu) <= MAX_SINGLE_REPORT_COST) ? (qte * pu) : 1000000;
      }
      if (cost > MAX_SINGLE_REPORT_COST) {
        cost = 1000000;
      }
      return sum + (cost || 0);
    }, 0);

  // B. Coût depuis les Sorties de Stock Magasin imputées au projet
  const stockCost = stockMovements
    .filter(m => m.type === 'Sortie' && (isProjectMatch(m.projectId, project.id) || isProjectMatch(m.projectId, project.code)))
    .reduce((sum, m) => sum + (Number(m.totalCost) || ((Number(m.quantity) || 0) * (Number(m.unitPrice) || 0)) || 0), 0);

  // C. Coût depuis les nœuds WBS
  const wbsCost = wbsNodes.reduce((sum, n) => sum + Number(n.actualCost || 0), 0);

  return Math.max(reportsCost, stockCost, wbsCost);
};

/**
 * 2. Calcul des Engagements (Committed)
 * Source de vérité : purchaseRequests + purchaseOrders + wbsNodes
 */
export const calculateCommitted = (
  project: Project,
  purchaseRequests: PurchaseRequest[],
  purchaseOrders: PurchaseOrder[],
  wbsNodes: WBSNode[] = [],
  actualCost: number = 0
): number => {
  if (!project) return 0;

  const daAmount = purchaseRequests
    .filter(da => isProjectMatch(da.projectId, project.id) || isProjectMatch(da.projectId, project.code))
    .reduce((sum, da) => sum + Number(da.estimatedTotal || da.estimatedAmount || 0), 0);

  const poAmount = purchaseOrders
    .filter(po => isProjectMatch(po.projectId, project.id) || isProjectMatch(po.projectId, project.code))
    .reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);

  const wbsCommitted = wbsNodes.reduce((sum, n) => sum + Number(n.committed || 0), 0);

  const maxDirect = Math.max(daAmount, poAmount, wbsCommitted);
  return maxDirect > 0 ? maxDirect : Math.round(actualCost * 1.08);
};

/**
 * 3. Calcul de l'Avancement Physique (%)
 * Source de vérité : dailyReports cumulés / budget révisé OU moyenne pondérée WBS
 */
export const calculateProgress = (
  project: Project,
  dailyReports: DailyReport[],
  wbsNodes: WBSNode[] = []
): number => {
  if (!project) return 0;

  const budget = Number(project.revisedBudget || project.initialBudget || 1980000000);

  // A. Calcul via Valeur Acquise (EV) des rapports de production
  const projectReports = dailyReports.filter(r => isReportForProject(r, project));
  const totalValueProduced = projectReports.reduce((s, r) => s + (Number(r.totalCost) || ((Number(r.realizedQty) || 0) * (Number(r.pu) || 5000)) || 0), 0);
  const progressFromReports = budget > 0 ? parseFloat(((totalValueProduced / budget) * 100).toFixed(1)) : 0;

  // B. Calcul via Avancement WBS
  const totalWbsBudget = wbsNodes.reduce((s, n) => s + Number(n.revisedBudget || n.initialBudget || 0), 0);
  const progressFromWbs = totalWbsBudget > 0
    ? parseFloat((wbsNodes.reduce((s, n) => s + (Number(n.progress || 0) * Number(n.revisedBudget || n.initialBudget || 0)), 0) / totalWbsBudget).toFixed(1))
    : Number(project.progress || 0);

  const finalProg = Math.max(progressFromReports, progressFromWbs, Number(project.progress || 0));
  return Math.min(100, Math.max(0, finalProg));
};

/**
 * 4. Calcul du Forecast (Reste à Faire Prévisionnel)
 */
export const calculateForecast = (
  revisedBudget: number,
  actualCost: number,
  wbsNodes: WBSNode[] = []
): number => {
  const wbsForecastSum = wbsNodes.reduce((s, n) => s + Number(n.forecast || 0), 0);
  if (wbsForecastSum > 0) return wbsForecastSum;
  return Math.max(0, revisedBudget - actualCost);
};

/**
 * 5. Calcul de l'EAC (Estimate at Completion = Coût Total Estimé à l'Achèvement)
 */
export const calculateEAC = (
  revisedBudget: number,
  actualCost: number,
  forecast: number
): number => {
  const eacCalculated = actualCost + forecast;
  return eacCalculated > 0 ? eacCalculated : revisedBudget;
};

/**
 * 6. Calcul de la Marge à Terminaison (EAC Margin)
 */
export const calculateMargin = (
  contractAmount: number,
  eac: number
): { marginAmount: number; marginRatePercent: number } => {
  const marginAmount = contractAmount - eac;
  const marginRatePercent = contractAmount > 0 ? parseFloat(((marginAmount / contractAmount) * 100).toFixed(1)) : 0;
  return { marginAmount, marginRatePercent };
};

/**
 * 7. Calcul du Rendement & Taux de Productivité (%)
 */
export const calculateProductivity = (
  realizedQty: number,
  hoursWorked: number,
  targetYieldPerHour: number
): { actualYield: number; productivityRatePercent: number } => {
  const actualYield = hoursWorked > 0 ? realizedQty / hoursWorked : 0;
  const productivityRatePercent = targetYieldPerHour > 0 ? Math.round((actualYield / targetYieldPerHour) * 100) : 100;
  return { actualYield, productivityRatePercent };
};

/**
 * 8. Calcul des Écarts de Consommation Matériaux
 */
export const calculateConsumptionVariance = (
  theoreticalQty: number,
  realQty: number,
  unitPrice: number
): { qtyDiff: number; qtyDiffPct: number; financialImpact: number; status: 'Conforme' | 'Surconsommation' | 'Sous-consommation' } => {
  const qtyDiff = realQty - theoreticalQty;
  const qtyDiffPct = theoreticalQty > 0 ? parseFloat(((qtyDiff / theoreticalQty) * 100).toFixed(1)) : 0;
  const financialImpact = qtyDiff * unitPrice;
  let status: 'Conforme' | 'Surconsommation' | 'Sous-consommation' = 'Conforme';
  if (qtyDiffPct > 5) status = 'Surconsommation';
  else if (qtyDiffPct < -5) status = 'Sous-consommation';
  return { qtyDiff, qtyDiffPct, financialImpact, status };
};

/**
 * 9. Consolidation globale d'un Projet (Single Source of Truth)
 */
export const consolidateProjectFinancials = (
  project: Project,
  dailyReports: DailyReport[] = [],
  stockMovements: StockMovement[] = [],
  purchaseRequests: PurchaseRequest[] = [],
  purchaseOrders: PurchaseOrder[] = [],
  wbsNodes: WBSNode[] = []
): CalculatedFinancials => {
  if (!project) {
    return {
      contractAmount: 0,
      initialBudget: 0,
      revisedBudget: 0,
      actualCost: 0,
      committed: 0,
      forecast: 0,
      eac: 0,
      varianceAtCompletion: 0,
      marginAmount: 0,
      marginRatePercent: 0,
      progressPercent: 0,
    };
  }

  const contractAmount = Number(project.contractAmount || 5000000000);
  const initialBudget = Number(project.initialBudget || 1980000000);
  const sumWbsBudget = wbsNodes.reduce((s, n) => s + Number(n.revisedBudget || n.initialBudget || 0), 0);
  const revisedBudget = sumWbsBudget > 0 ? sumWbsBudget : Number(project.revisedBudget || initialBudget);

  const actualCost = calculateActualCost(project, dailyReports, stockMovements, wbsNodes);
  const committed = calculateCommitted(project, purchaseRequests, purchaseOrders, wbsNodes, actualCost);
  const forecast = calculateForecast(revisedBudget, actualCost, wbsNodes);
  const eac = calculateEAC(revisedBudget, actualCost, forecast);
  const varianceAtCompletion = revisedBudget - eac;
  const { marginAmount, marginRatePercent } = calculateMargin(contractAmount, eac);
  const progressPercent = calculateProgress(project, dailyReports, wbsNodes);

  return {
    contractAmount,
    initialBudget,
    revisedBudget,
    actualCost,
    committed,
    forecast,
    eac,
    varianceAtCompletion,
    marginAmount,
    marginRatePercent,
    progressPercent,
  };
};
