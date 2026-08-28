/**
 * GEBAT 360° ERP — MOTEUR DE COST CONTROL & CALCULS ÉCONOMIQUES (EVM & EAC)
 * Centralisation de l'ensemble des formules financières BTP avec protection contre la division par zéro.
 * Terminologie 100% en Français.
 */

export interface CostControlMetrics {
  // Indicateurs de Base
  montantMarche: number;          // Contract Amount (Montant du marché client HT)
  bac: number;                    // Budget at Completion (Budget Révisé DS à Terminaison)
  actualCost: number;             // AC — Coût Réel engagé/consommé à date
  etc: number;                    // ETC — Prévisionnel Reste à Faire (Estimate to Complete)
  plannedValue: number;           // PV — Valeur Planifiée (Budget × Avancement Prévu %)
  earnedValue: number;            // EV — Valeur Acquise (Budget × Avancement Physique %)
  
  // Indicateurs Calculés
  eac: number;                    // EAC — Estimation à Terminaison (EAC = AC + ETC)
  costVariance: number;           // CV — Écart de Coût (CV = EV - AC)
  cpi: number;                    // CPI — Indice de Performance Coût (CPI = EV / AC)
  spi: number;                    // SPI — Indice de Performance Délais (SPI = EV / PV)
  varianceBudget: number;         // Écart au Budget (EAC - BAC)
  margePrevisionnelle: number;    // Marge Prévisionnelle Net (Montant Marché - EAC)
  margePourcentage: number;       // Marge Prévisionnelle % ((Montant Marché - EAC) / Montant Marché × 100)
  statutSante: 'Conforme' | 'Vigilance' | 'Critique';
}

/**
 * Division sécurisée protégeant contre la division par zéro et NaN.
 */
export function safeDivide(numerator: number, denominator: number, fallback: number = 1.0): number {
  if (!denominator || isNaN(denominator) || Math.abs(denominator) < 0.000001) {
    return fallback;
  }
  const result = numerator / denominator;
  return isNaN(result) || !isFinite(result) ? fallback : Math.round(result * 100) / 100;
}

/**
 * Moteur de calcul centralisé des métriques Cost Control.
 */
export function calculateCostControlMetrics(input: {
  montantMarche?: number;
  bac?: number;                   // Budget Révisé
  actualCost?: number;            // Coût Réel (AC)
  etc?: number;                   // Forecast Reste à Faire (ETC)
  progressPhysical?: number;      // Avancement physique 0-100%
  progressPlanning?: number;      // Avancement planning 0-100%
}): CostControlMetrics {
  const montantMarche = Math.max(0, input.montantMarche || 0);
  const bac = Math.max(0, input.bac || 0);
  const actualCost = Math.max(0, input.actualCost || 0);
  const etc = Math.max(0, input.etc || 0);
  const progressPhys = Math.min(100, Math.max(0, input.progressPhysical || 0)) / 100;
  const progressPlan = Math.min(100, Math.max(0, input.progressPlanning || 50)) / 100;

  // 1. EAC = AC + ETC
  const eac = actualCost + etc;

  // 2. EV & PV (Earned Value & Planned Value)
  const earnedValue = Math.round(bac * progressPhys);
  const plannedValue = Math.round(bac * progressPlan);

  // 3. Écart de Coût CV = EV - AC
  const costVariance = earnedValue - actualCost;

  // 4. CPI = EV / AC
  const cpi = actualCost > 0 ? safeDivide(earnedValue, actualCost, 1.0) : (earnedValue > 0 ? 1.5 : 1.0);

  // 5. SPI = EV / PV
  const spi = plannedValue > 0 ? safeDivide(earnedValue, plannedValue, 1.0) : 1.0;

  // 6. Écart Budgétaire = EAC - BAC
  const varianceBudget = eac - bac;

  // 7. Marge Prévisionnelle Net = Montant Marché - EAC
  const margePrevisionnelle = montantMarche - eac;

  // 8. Marge % = (Montant Marché - EAC) / Montant Marché × 100
  const margePourcentage = safeDivide(margePrevisionnelle * 100, montantMarche, 0.0);

  // 9. Statut Santé Calculé
  let statutSante: 'Conforme' | 'Vigilance' | 'Critique' = 'Conforme';
  if (eac > bac * 1.05 || cpi < 0.9) {
    statutSante = 'Critique';
  } else if (eac > bac || cpi < 1.0 || spi < 0.95) {
    statutSante = 'Vigilance';
  }

  return {
    montantMarche,
    bac,
    actualCost,
    etc,
    plannedValue,
    earnedValue,
    eac,
    costVariance,
    cpi,
    spi,
    varianceBudget,
    margePrevisionnelle,
    margePourcentage: Math.round(margePourcentage * 10) / 10,
    statutSante,
  };
}
