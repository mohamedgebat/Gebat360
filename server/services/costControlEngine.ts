/**
 * GEBAT 360° ERP — MOTEUR COST CONTROL BACKEND
 * Calculs financiers serveur centralisés pour la persistance SQL
 */

export function calculateServerCostControl(input: {
  montantMarche?: number;
  bac?: number;
  actualCost?: number;
  etc?: number;
  progressPhysical?: number;
  progressPlanning?: number;
}) {
  const montantMarche = Number(input.montantMarche) || 0;
  const bac = Number(input.bac) || 0;
  const actualCost = Number(input.actualCost) || 0;
  const etc = Number(input.etc) || 0;
  const progressPhys = (Number(input.progressPhysical) || 0) / 100;
  const progressPlan = (Number(input.progressPlanning) || 50) / 100;

  const eac = actualCost + etc;
  const earnedValue = Math.round(bac * progressPhys);
  const plannedValue = Math.round(bac * progressPlan);

  const costVariance = earnedValue - actualCost;
  const cpi = actualCost > 0 ? Math.round((earnedValue / actualCost) * 100) / 100 : 1.0;
  const spi = plannedValue > 0 ? Math.round((earnedValue / plannedValue) * 100) / 100 : 1.0;

  const varianceBudget = eac - bac;
  const margePrevisionnelle = montantMarche - eac;
  const margePourcentage = montantMarche > 0 ? Math.round(((margePrevisionnelle / montantMarche) * 100) * 10) / 10 : 0;

  return {
    eac,
    earnedValue,
    plannedValue,
    costVariance,
    cpi,
    spi,
    varianceBudget,
    margePrevisionnelle,
    margePourcentage,
  };
}
