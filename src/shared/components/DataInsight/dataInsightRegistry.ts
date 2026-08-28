// Registre centralisé des définitions, formules, traçabilités et calculs métier DataInsight
import { DataInsightMetricConfig } from './types';

const formatFCFA = (val: number): string => {
  return Math.round(val).toLocaleString('fr-FR') + ' FCFA';
};

const formatNumber = (val: number): string => {
  return Math.round(val).toLocaleString('fr-FR');
};

export const DATA_INSIGHT_REGISTRY: Record<string, DataInsightMetricConfig> = {
  // =========================================================================
  // 1. COST CONTROL & BUDGÉTAIRE
  // =========================================================================

  budget_initial: {
    id: 'budget_initial',
    title: 'Budget Initial Déboursé Sec (DS V0)',
    unit: 'FCFA',
    category: 'FINANCE',
    definition: 'Coût prévisionnel direct initial d’exécution du chantier établi lors de la signature du contrat (Version V0).',
    formulaDescription: 'Budget Initial = Somme des montants Déboursé Sec d’origine (V0) calculés à l’étude de prix',
    sources: [
      'Étude de Prix initiale & Sous-détails du Déboursé Sec (DS V0)',
      'Fichier Déboursé Sec d’origine (DS_Songon.xlsx / DS_Bingerville.xlsx)',
      'Référentiel Contractuel d’origine'
    ],
    calculateValues: (ctx) => {
      const budget = ctx?.initialBudget || ctx?.budgetDs || 0;
      return {
        currentValue: formatFCFA(budget),
        breakdown: [
          { label: 'Budget Déboursé Initial (DS V0)', value: formatFCFA(budget), isResult: true }
        ],
        isAvailable: budget > 0
      };
    },
    getScope: (ctx) => ({
      projectName: ctx?.projectName || 'Chantier sélectionné',
      projectCode: ctx?.projectCode || ctx?.projectId
    }),
    getLineage: () => [
      'Sous-Détails de Prix d’Origine',
      'Validation Déboursé Sec Initial V0',
      'Base de Référence Budgétaire'
    ],
    getLastUpdated: (ctx) => ctx?.lastUpdateDate || '24/08/2026 10:32',
    getTransactionCount: () => 1
  },

  budget_revised: {
    id: 'budget_revised',
    title: 'Budget Révisé Déboursé Sec (DS)',
    unit: 'FCFA',
    category: 'FINANCE',
    definition: 'Enveloppe budgétaire révisée totale attribuée par la Direction Technique pour couvrir l’intégralité des coûts directs d’exécution du chantier.',
    formulaDescription: 'Budget Révisé = Somme des budgets révisés de toutes les activités WBS du chantier',
    sources: [
      'Fichier Déboursé Sec d’exécution (DS_Songon.xlsx / DS_Bingerville.xlsx)',
      'Avenants au Déboursé Sec validés par la Direction Technique',
      'Table de référence gebat_wbs (Base de données MySQL)'
    ],
    calculateValues: (ctx) => {
      const budget = ctx?.revisedBudget || ctx?.budgetDs || ctx?.totalRevisedBudget || 0;
      return {
        currentValue: formatFCFA(budget),
        breakdown: [
          { label: 'Budget Déboursé Initial (DS V0)', value: formatFCFA(ctx?.initialBudget || budget) },
          { label: 'Ajustements & Avenants DS Validés', value: formatFCFA((ctx?.initialBudget && budget) ? budget - ctx.initialBudget : 0) },
          { label: 'Total Budget Révisé DS', value: formatFCFA(budget), isResult: true }
        ],
        isAvailable: budget > 0,
        missingReason: budget <= 0 ? 'Aucun budget DS révisé n’a encore été saisi sur ce périmètre.' : undefined
      };
    },
    getScope: (ctx) => ({
      projectName: ctx?.projectName || 'Chantier sélectionné',
      projectCode: ctx?.projectCode || ctx?.projectId,
      wbsCode: ctx?.wbsCode || 'GLOBAL',
      period: 'Durée Contractuelle du Chantier'
    }),
    getLineage: () => [
      'Nomenclature Marché Contractuel',
      'Étude de Prix & Sous-Détails du Déboursé Sec',
      'Validation Direction Technique (Version V0/V1)',
      'Cockpit Cost Control & Suivi Budgétaire WBS'
    ],
    getLastUpdated: (ctx) => ctx?.lastUpdateDate || '24/08/2026 10:32',
    getTransactionCount: (ctx) => ctx?.wbsCount || 41,
    getDrillDownActions: (ctx) => [
      { label: 'Inspecter le Déboursé Sec (DS)', targetView: 'debourse' },
      { label: 'Consulter la Structure WBS', targetView: 'wbs' }
    ]
  },

  cost_real: {
    id: 'cost_real',
    title: 'Coût Réel Constaté à Date',
    unit: 'FCFA',
    category: 'FINANCE',
    definition: 'Cumul strict des dépenses réellement consommées et validées sur le terrain au jour J pour exécuter les travaux.',
    formulaDescription: 'Coût Réel = Cumul des Rapports Journaliers (Main-d’œuvre + Matériel) + Cumul des Sorties de Stock Magasin (Matériaux)',
    sources: [
      'Rapports Journaliers de Production validés par le Conducteur de Travaux',
      'Bons de Sortie de Stock validés par le Magasinier',
      'Frais Généraux & Factures Prestataires imputées'
    ],
    calculateValues: (ctx) => {
      const actualCost = ctx?.actualCost || ctx?.totalActualCost || 0;
      const reportCost = ctx?.actualReportCost || Math.round(actualCost * 0.75);
      const stockCost = ctx?.actualStockCost || Math.round(actualCost * 0.25);
      return {
        currentValue: formatFCFA(actualCost),
        breakdown: [
          { label: 'Rapports Journaliers Terrain (MO + Engins)', value: formatFCFA(reportCost) },
          { label: 'Sorties Stock Magasin (Matériaux consommés)', value: formatFCFA(stockCost) },
          { label: 'Coût Réel Total Constaté', value: formatFCFA(actualCost), isResult: true }
        ],
        isAvailable: true
      };
    },
    getScope: (ctx) => ({
      projectName: ctx?.projectName || 'Chantier sélectionné',
      projectCode: ctx?.projectCode || ctx?.projectId,
      wbsCode: ctx?.wbsCode || 'GLOBAL',
      period: 'Du 01/08/2026 à ce jour'
    }),
    getLineage: () => [
      'Saisie Terrain (Chef de Chantier)',
      'Rapports Journaliers & Bons de Sortie Magasin',
      'Validation Conducteur de Travaux',
      'Imputation Comptable WBS & Cost Control'
    ],
    getLastUpdated: (ctx) => ctx?.lastUpdateDate || '24/08/2026 10:32',
    getTransactionCount: (ctx) => ctx?.reportCount || 45,
    getDrillDownActions: () => [
      { label: 'Voir les Rapports Journaliers', targetView: 'daily-reports' },
      { label: 'Voir les Mouvements de Stock', targetView: 'stock' }
    ]
  },

  marge_eac: {
    id: 'marge_eac',
    title: 'Marge Prévisionnelle EAC à Terminaison',
    unit: 'FCFA',
    category: 'FINANCE',
    definition: 'Bénéfice financier net prévisionnel conservé par l’entreprise à l’achèvement du chantier.',
    formulaDescription: 'Marge EAC = Valeur Contractuelle du Marché (avec Avenants) - Coût Total EAC à Terminaison',
    sources: [
      'Contrat de Marché Officiel & Montant Contractuel Signé',
      'Gestion des Avenants Contractuels Validés',
      'Calcul EVM EAC (Coût Réel + Forecast Restant à Produire)'
    ],
    calculateValues: (ctx) => {
      const contractVal = ctx?.contractAmount || ctx?.projectedContractValue || 2193630462;
      const eac = ctx?.eac || ctx?.totalEAC || 2100000000;
      const margin = contractVal - eac;
      const marginPercent = ((margin / contractVal) * 100).toFixed(1);
      return {
        currentValue: `${formatFCFA(margin)} (+${marginPercent}%)`,
        breakdown: [
          { label: 'Valeur Contractuelle du Marché (avec Avenants)', value: formatFCFA(contractVal) },
          { label: 'Coût Total EAC Prévisionnel à Terminaison', value: `- ${formatFCFA(eac)}` },
          { label: 'Marge Prévisionnelle EAC Nette', value: `${formatFCFA(margin)} (${marginPercent}%)`, isResult: true }
        ],
        isAvailable: true
      };
    },
    getScope: (ctx) => ({
      projectName: ctx?.projectName || 'Chantier sélectionné',
      projectCode: ctx?.projectCode || ctx?.projectId,
      period: 'Atterrissage Financier du Chantier'
    }),
    getLineage: () => [
      'Montant Contrat Initial Signé',
      'Enregistrement Avenants Client',
      'Suivi Avancement EVM & Restant à Produire',
      'Calcul Marge EAC Consolidée'
    ],
    getLastUpdated: () => '24/08/2026 10:32',
    getTransactionCount: () => 41,
    getDrillDownActions: () => [
      { label: 'Accéder au Cockpit Financier & Avenants', targetView: 'cost-control' }
    ]
  },

  engaged: {
    id: 'engaged',
    title: 'Engagé (Achats Validés)',
    unit: 'FCFA',
    category: 'ACHATS',
    definition: 'Montant total des commandes et contrats d’achats fermes engagés auprès des fournisseurs et sous-traitants.',
    formulaDescription: 'Engagé = Somme des Demandes d’Achat (DA) validées et des Bons de Commande (BC) notifiés',
    sources: [
      'Demandes d’Achat (DA) approuvées',
      'Bons de Commande (BC) transmis aux Fournisseurs',
      'Contrats de Sous-traitance notifiés'
    ],
    calculateValues: (ctx) => {
      const committed = ctx?.committed || ctx?.totalCommitted || 0;
      const revised = ctx?.revisedBudget || ctx?.totalRevisedBudget || 1;
      const ratio = ((committed / revised) * 100).toFixed(1);
      return {
        currentValue: formatFCFA(committed),
        breakdown: [
          { label: 'Budget Révisé du Périmètre', value: formatFCFA(revised) },
          { label: 'Montant Engagé Valide', value: formatFCFA(committed) },
          { label: 'Taux de Consommation Budgétaire Engagé', value: `${ratio}%`, isResult: true }
        ],
        isAvailable: true
      };
    },
    getScope: (ctx) => ({
      projectName: ctx?.projectName || 'Chantier sélectionné',
      projectCode: ctx?.projectCode || ctx?.projectId,
      wbsCode: ctx?.wbsCode || 'GLOBAL'
    }),
    getLineage: () => [
      'Création Demande d’Achat (DA)',
      'Validation Circuit d’Approbation',
      'Génération Bon de Commande (BC)',
      'Comptabilisation Engagé Achats'
    ],
    getLastUpdated: () => '24/08/2026 10:32',
    getTransactionCount: () => 18,
    getDrillDownActions: () => [
      { label: 'Voir les Demandes d’Achat (DA)', targetView: 'procurement-da' },
      { label: 'Voir le Circuit de Validation', targetView: 'procurement-validation' }
    ]
  },

  eac_total: {
    id: 'eac_total',
    title: 'Coût Total Estimé (Atterrissage)',
    unit: 'FCFA',
    category: 'FINANCE',
    definition: 'Coût total final estimé pour l’achèvement complet des travaux sur le périmètre sélectionné.',
    formulaDescription: 'Coût Total Estimé = Coût Réel Constaté à Date + Forecast Restant à Produire',
    sources: [
      'Comptabilité Coûts Réels constatés',
      'Revue du Restant à Produire par le Conducteur de Travaux',
      'Modèle EVM Hybride Contrôlé'
    ],
    calculateValues: (ctx) => {
      const actual = ctx?.actualCost || ctx?.totalActualCost || 0;
      const forecast = ctx?.forecast || ctx?.totalForecast || 0;
      const eac = actual + forecast;
      return {
        currentValue: formatFCFA(eac),
        breakdown: [
          { label: 'Coût Réel Constaté à Date', value: formatFCFA(actual) },
          { label: 'Forecast Restant à Produire (Reste à faire)', value: formatFCFA(forecast) },
          { label: 'Coût Total Estimé à Terminaison', value: formatFCFA(eac), isResult: true }
        ],
        isAvailable: true
      };
    },
    getScope: (ctx) => ({
      projectName: ctx?.projectName || 'Chantier sélectionné',
      projectCode: ctx?.projectCode || ctx?.projectId
    }),
    getLineage: () => [
      'Relevé de la Production Réalisée',
      'Calcul du Reste à Faire (Forecast)',
      'Agrégation Coût Réel + Forecast',
      'Validation Atterrissage Financier'
    ],
    getLastUpdated: () => '24/08/2026 10:32',
    getTransactionCount: () => 41,
    getDrillDownActions: () => [
      { label: 'Consulter le Cockpit Cost Control', targetView: 'cost-control' }
    ]
  },

  vac_total: {
    id: 'vac_total',
    title: 'Écart (Dépassement Budgétaire)',
    unit: 'FCFA',
    category: 'FINANCE',
    definition: 'Différence prévisionnelle entre le Budget Révisé attribué et le Coût Final Estimé EAC.',
    formulaDescription: 'VAC = Budget Révisé DS - EAC Prévisionnel (Vert si >= 0, Rouge si < 0)',
    sources: [
      'Budget Révisé Déboursé Sec',
      'Atterrissage Financier EAC'
    ],
    calculateValues: (ctx) => {
      const revised = ctx?.revisedBudget || ctx?.totalRevisedBudget || 0;
      const eac = ctx?.eac || ctx?.totalEAC || 0;
      const vac = revised - eac;
      const status = vac >= 0 ? '🟢 Dans le budget (Économie)' : '🔴 Dépassement prévisionnel';
      return {
        currentValue: `${formatFCFA(vac)} — ${status}`,
        breakdown: [
          { label: 'Budget Révisé Déboursé Sec', value: formatFCFA(revised) },
          { label: 'Coût Total EAC à Terminaison', value: `- ${formatFCFA(eac)}` },
          { label: 'Écart à Terminaison (VAC)', value: formatFCFA(vac), isResult: true }
        ],
        isAvailable: true
      };
    },
    getScope: (ctx) => ({
      projectName: ctx?.projectName || 'Chantier sélectionné'
    }),
    getLineage: () => [
      'Budget Cible DS',
      'Prévision d’Atterrissage EAC',
      'Calcul de la Variance VAC'
    ],
    getLastUpdated: () => '24/08/2026 10:32',
    getTransactionCount: () => 41,
    getDrillDownActions: () => [
      { label: 'Inspecter les Dérives & Écarts', targetView: 'alerts-drifts' }
    ]
  },

  // =========================================================================
  // 2. PRODUCTION & AVANCEMENT
  // =========================================================================

  production_day: {
    id: 'production_day',
    title: 'Production Quotidienne Saisie',
    unit: 'Métré',
    category: 'PRODUCTION',
    definition: 'Quantité d’ouvrage physique réellement exécutée sur le chantier pendant la journée de travail.',
    formulaDescription: 'Production = Cumul des métrés réalisés saisis dans le rapport journalier de la date sélectionnée',
    sources: [
      'Rapport Journalier de Production Terrain',
      'Attestation d’Avancement du Chef de Chantier',
      'Pointage des Heures de Main-d’œuvre et d’Engins'
    ],
    calculateValues: (ctx) => {
      const realized = ctx?.realizedQty || 48;
      const planned = ctx?.plannedQty || 50;
      const unit = ctx?.unit || 'm3';
      const gap = realized - planned;
      return {
        currentValue: `${realized} ${unit}`,
        breakdown: [
          { label: 'Objectif de Production Prévu', value: `${planned} ${unit}` },
          { label: 'Quantité Réellement Exécutée', value: `${realized} ${unit}` },
          { label: 'Écart de Production Journalier', value: `${gap >= 0 ? '+' : ''}${gap} ${unit}`, isResult: true }
        ],
        isAvailable: true
      };
    },
    getScope: (ctx) => ({
      projectName: ctx?.projectName || 'Chantier sélectionné',
      wbsCode: ctx?.wbsCode || '01.01.003',
      wbsName: ctx?.wbsName || 'Ouvrage d’exécution',
      period: ctx?.date || 'Aujourd’hui'
    }),
    getLineage: () => [
      'Saisie par le Chef de Chantier',
      'Pointage de l’Équipe & Matériel',
      'Validation Conducteur de Travaux',
      'Mise à jour Avancement WBS'
    ],
    getLastUpdated: () => '24/08/2026 10:32',
    getTransactionCount: () => 1,
    getDrillDownActions: () => [
      { label: 'Saisir / Consulter les Rapports Journaliers', targetView: 'daily-reports' }
    ]
  },

  avancement_moyen: {
    id: 'avancement_moyen',
    title: 'Taux d’Avancement Physique Global',
    unit: '%',
    category: 'PRODUCTION',
    definition: 'Pourcentage d’avancement physique calculé à partir de la somme de la valeur produite rapportée au montant du marché HT.',
    formulaDescription: 'Avancement % = (Somme de la Production / Montant du Marché HT) * 100',
    sources: [
      'Métrés exécutés cumulés des Rapports Journaliers',
      'Valeur monétaire produite au bordereau',
      'Montant du Marché HT (Contract Amount)'
    ],
    calculateValues: (ctx) => {
      const progress = ctx?.progressRate !== undefined ? ctx.progressRate : 13.0;
      return {
        currentValue: `${progress}%`,
        breakdown: [
          { label: 'Somme de la Production Cumulée', value: formatFCFA(ctx?.totalProductionCost || 365800000) },
          { label: 'Montant du Marché HT (Contract Amount)', value: formatFCFA(ctx?.contractAmount || ctx?.totalMarketAmount || 2806375824) },
          { label: 'Taux d’Avancement (% = Prod / Marché * 100)', value: `${progress}%`, isResult: true }
        ],
        isAvailable: true
      };
    },
    getScope: (ctx) => ({
      projectName: ctx?.projectName || 'Portefeuille Global',
      period: 'Au 24/08/2026'
    }),
    getLineage: () => [
      'Pointages Métrés Terrain',
      'Agrégation des Activités WBS',
      'Pondération Budgétaire Consolidée',
      'Calcul Taux de Progression Global'
    ],
    getLastUpdated: () => '24/08/2026 10:32',
    getTransactionCount: () => 85,
    getDrillDownActions: () => [
      { label: 'Consulter la Vue Projet 360°', targetView: 'vue-projet-360' },
      { label: 'Voir le Planning de Gantt', targetView: 'planning' }
    ]
  },

  // =========================================================================
  // 3. TRÉSORERIE & CEO STRATÉGIQUE
  // =========================================================================

  cash_balance: {
    id: 'cash_balance',
    title: 'Trésorerie Disponible (Cash)',
    unit: 'FCFA',
    category: 'PILOTAGE',
    definition: 'Solde bancaire disponible immédiatement en compte pour couvrir les opérations courantes.',
    formulaDescription: 'Cash Disponible = Encaissements Clients Cumulés - Décaissements Réels (Payés)',
    sources: [
      'Relevés Bancaires & Comptes GEBAT SA',
      'Registres d’Encaissements Decomptes Clients',
      'Journal des Règlements Fournisseurs & Paie'
    ],
    calculateValues: (ctx) => {
      const cash = ctx?.cashBalance || 485000000;
      const encaisse = ctx?.encaisse || 720000000;
      const decaisse = ctx?.decaisse || 235000000;
      return {
        currentValue: formatFCFA(cash),
        breakdown: [
          { label: 'Total Encaissements Clients perçus', value: formatFCFA(encaisse) },
          { label: 'Total Décaissements & Règlements effectués', value: `- ${formatFCFA(decaisse)}` },
          { label: 'Solde de Trésorerie Cash Net', value: formatFCFA(cash), isResult: true }
        ],
        isAvailable: true
      };
    },
    getScope: () => ({
      projectName: 'Entreprise GEBAT SA',
      period: 'Situation Instantanée au 24/08/2026'
    }),
    getLineage: () => [
      'Encaissement Décomptes Maître d’Ouvrage',
      'Paiement Factures Fournisseurs & Paie',
      'Rapprochement Bancaire Quotidien',
      'Tableau de Bord Trésorerie CEO'
    ],
    getLastUpdated: () => '24/08/2026 10:32',
    getTransactionCount: () => 142,
    getDrillDownActions: () => [
      { label: 'Accéder au CEO Command Center', targetView: 'ceo-command-center' }
    ]
  }
};
