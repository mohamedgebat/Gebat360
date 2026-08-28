/**
 * GEBAT 360° — GLOBAL DATA INTEGRITY & SYSTEM CONSISTENCY AUDITOR
 * Implements Section 34 of system directives to audit and detect anomalies across all modules.
 */

import { Project, WBSNode, DailyReport, PurchaseRequest, StockMovement, SystemAlert } from '../../types';

export interface IntegrityAnomaly {
  id: string;
  type: 'WBS_WITHOUT_DQE' | 'DQE_WITHOUT_WBS' | 'DS_WITHOUT_WBS' | 'REPORT_WITHOUT_WBS' | 'STOCK_WITHOUT_PROJECT' | 'DA_WITHOUT_WBS' | 'AMOUNT_DISCREPANCY' | 'ORPHAN_TRANSACTION';
  severity: 'Élevée' | 'Moyenne' | 'Faible';
  module: string;
  projectId: string;
  objectRef: string;
  message: string;
  detectedAt: string;
}

export interface DataIntegrityReport {
  timestamp: string;
  totalProjectsAudited: number;
  totalWbsNodesAudited: number;
  totalAnomaliesCount: number;
  healthScore: number; // 0% - 100%
  anomalies: IntegrityAnomaly[];
}

export const runGlobalDataIntegrityAudit = (
  projects: Project[],
  wbsMap: Record<string, WBSNode[]>,
  dailyReports: DailyReport[],
  purchaseRequests: PurchaseRequest[],
  stockMovements: StockMovement[]
): DataIntegrityReport => {
  const anomalies: IntegrityAnomaly[] = [];
  let totalWbsNodesAudited = 0;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  projects.forEach(project => {
    const projectWbs = wbsMap[project.id] || wbsMap[project.code] || [];
    totalWbsNodesAudited += projectWbs.length;

    // 1. Check if Project contract amount matches sum of DQE items in WBS
    if (projectWbs.length > 0) {
      const sumDqeMarket = projectWbs.reduce((sum, n) => sum + Number(n.contractAmount || 0), 0);
      if (sumDqeMarket > 0 && Math.abs(sumDqeMarket - project.contractAmount) > 1000) {
        anomalies.push({
          id: `ANO-AMT-${project.id}-${Date.now()}`,
          type: 'AMOUNT_DISCREPANCY',
          severity: 'Moyenne',
          module: 'WBS / DQE',
          projectId: project.id,
          objectRef: project.code,
          message: `Écart détecté sur le projet ${project.name}: Montant Marché Projet (${project.contractAmount.toLocaleString('fr-FR')} FCFA) ≠ Somme des Prix DQE WBS (${sumDqeMarket.toLocaleString('fr-FR')} FCFA).`,
          detectedAt: nowStr,
        });
      }
    }

    // 2. Check WBS nodes for missing DQE or DS references
    const checkNodes = (nodes: WBSNode[]) => {
      nodes.forEach(n => {
        if (!n.priceNo && (!n.children || n.children.length === 0)) {
          anomalies.push({
            id: `ANO-DQE-${n.id}`,
            type: 'WBS_WITHOUT_DQE',
            severity: 'Faible',
            module: 'WBS',
            projectId: project.id,
            objectRef: n.code,
            message: `Nœud WBS ${n.code} (${n.name}) sans N° de Prix DQE contractuel assigné.`,
            detectedAt: nowStr,
          });
        }
        if ((!n.budgetDs || n.budgetDs <= 0) && (!n.children || n.children.length === 0)) {
          anomalies.push({
            id: `ANO-DS-${n.id}`,
            type: 'DS_WITHOUT_WBS',
            severity: 'Moyenne',
            module: 'Budget / DS',
            projectId: project.id,
            objectRef: n.code,
            message: `Activité WBS ${n.code} sans Déboursé Sec (DS) prévisionnel renseigné.`,
            detectedAt: nowStr,
          });
        }
        if (n.children && n.children.length > 0) {
          checkNodes(n.children);
        }
      });
    };
    checkNodes(projectWbs);

    // 3. Check Production Daily Reports for valid WBS reference
    const projectReports = dailyReports.filter(r => r.projectId === project.id || r.projectId === project.code);
    projectReports.forEach(r => {
      const hasValidWbs = projectWbs.some(w => w.code === r.wbsCode || w.id === r.wbsId || w.code === r.wbsId);
      if (!hasValidWbs && r.wbsCode) {
        anomalies.push({
          id: `ANO-REP-${r.id}`,
          type: 'REPORT_WITHOUT_WBS',
          severity: 'Moyenne',
          module: 'Production',
          projectId: project.id,
          objectRef: r.reportCode || r.code,
          message: `Rapport de production ${r.reportCode || r.code} réfère à un WBS (${r.wbsCode}) introuvable dans le référentiel du projet.`,
          detectedAt: nowStr,
        });
      }
    });

    // 4. Check Purchase Requests for valid WBS reference
    const projectDAs = purchaseRequests.filter(d => d.projectId === project.id || d.projectId === project.code);
    projectDAs.forEach(d => {
      const hasValidWbs = projectWbs.some(w => w.id === d.wbsId || w.code === d.wbsId || w.code === d.wbsCode);
      if (!hasValidWbs && d.wbsId) {
        anomalies.push({
          id: `ANO-DA-${d.id}`,
          type: 'DA_WITHOUT_WBS',
          severity: 'Élevée',
          module: 'Achats',
          projectId: project.id,
          objectRef: d.code,
          message: `Demande d'Achat ${d.code} affectée à une imputation WBS (${d.wbsId}) non enregistrée.`,
          detectedAt: nowStr,
        });
      }
    });

    // 5. Check Stock Movements for valid Project reference
    const projectStockMovements = stockMovements.filter(m => m.projectId === project.id || m.projectId === project.code);
    projectStockMovements.forEach(m => {
      if (!m.projectId || m.projectId === 'ALL') {
        anomalies.push({
          id: `ANO-MVT-${m.id}`,
          type: 'STOCK_WITHOUT_PROJECT',
          severity: 'Moyenne',
          module: 'Stock',
          projectId: project.id,
          objectRef: m.code,
          message: `Mouvement de stock ${m.code} (${m.itemName}) non rattaché à un projet actif.`,
          detectedAt: nowStr,
        });
      }
    });
  });

  const totalAnomaliesCount = anomalies.length;
  const healthScore = totalWbsNodesAudited > 0
    ? Math.max(0, Math.round(100 - (totalAnomaliesCount / Math.max(1, totalWbsNodesAudited)) * 100))
    : 100;

  return {
    timestamp: nowStr,
    totalProjectsAudited: projects.length,
    totalWbsNodesAudited,
    totalAnomaliesCount,
    healthScore,
    anomalies,
  };
};
