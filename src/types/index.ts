export type Role = 
  | 'Super Admin'
  | 'Direction Générale'
  | 'DAF'
  | 'Directeur Technique'
  | 'Directeur Projet'
  | 'Conducteur de Travaux'
  | 'Chef de Chantier'
  | 'Cost Controller'
  | 'Achats'
  | 'Magasinier';

export interface DelegationRule {
  delegateUserId: string;
  delegateUserName: string;
  startDate: string;
  endDate: string;
  reason?: string;
  isActive: boolean;
}

export interface Site {
  id: number;
  code: string;
  name: string;
  description?: string;
  location?: string;
  city?: string;
  region?: string;
  status: 'ACTIF' | 'INACTIF';
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export interface UserSite {
  id: number;
  userId: string;
  siteId: number;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  photoUrl?: string;
  phone?: string;
  employeeCode?: string;
  company?: string;
  defaultPassword?: string;
  mustChangePassword?: boolean;
  projectIds?: string[];
  siteIds?: number[];
  status?: 'ACTIF' | 'INACTIF';
  delegation?: DelegationRule;
  createdAt?: string;
}

export type CostNature = 'MAT' | 'MO' | 'MTL' | 'ST' | 'TRS' | 'FGC' | 'DIV' | string;

export interface CostNatureConfig {
  id: string;
  code: string;
  label: string;
  status: 'Actif' | 'Inactif';
  description?: string;
}

export const DEFAULT_COST_NATURES: CostNatureConfig[] = [
  { id: 'nat-mat', code: 'MAT', label: 'Matériaux', status: 'Actif', description: 'Fournitures, matières premières et matériaux de construction' },
  { id: 'nat-mo', code: 'MO', label: "Main-d'œuvre", status: 'Actif', description: 'Salaires, charges et prestations du personnel de chantier' },
  { id: 'nat-mtl', code: 'MTL', label: 'Matériel', status: 'Actif', description: 'Amortissements, locations d’engins et matériel BTP' },
  { id: 'nat-st', code: 'ST', label: 'Sous-traitance', status: 'Actif', description: 'Contrats et commandes de sous-traitance spécialisée' },
  { id: 'nat-trs', code: 'TRS', label: 'Transport', status: 'Actif', description: 'Logistique, fret, toupies et évacuation des matériaux' },
  { id: 'nat-fgc', code: 'FGC', label: 'Frais généraux chantier', status: 'Actif', description: 'Installation base vie, énergie, essais labo et contrôles' },
  { id: 'nat-div', code: 'DIV', label: 'Divers', status: 'Actif', description: 'Dépenses imprévues et frais d’exploitation divers' },
];

export const COST_NATURE_LABELS: Record<string, string> = {
  MAT: 'Matériaux',
  MO: "Main-d'œuvre",
  MTL: 'Matériel',
  ST: 'Sous-traitance',
  TRS: 'Transport',
  FGC: 'Frais généraux chantier',
  DIV: 'Divers',
};

export type ProjectStatus = 'En étude' | 'En cours' | 'En pause' | 'Livré' | 'Clôturé';
export interface DomainActivity {
  code: string;
  name: string;
  category: 'Hydraulique' | 'Assainissement' | 'Génie Civil' | 'Bâtiment' | 'Infrastructures & VRD';
  description: string;
}

export const GEBAT_DOMAINS: DomainActivity[] = [
  // HYDRAULIQUE
  { code: 'HYD', name: 'HYD — Hydraulique Générale & AEP', category: 'Hydraulique', description: 'Adduction d’Eau Potable (AEP), stations de pompage, conduites forcées' },
  { code: 'FOR', name: 'FOR — Forages & Captage d’Eau', category: 'Hydraulique', description: 'Forages d’eau profonds, châteaux d’eau, réservoirs de stockage' },
  { code: 'TRA', name: 'TRA — Stations de Traitement & Épuration', category: 'Hydraulique', description: 'Usines de potabilisation, stations de déferrisation, filtration' },
  { code: 'IRR', name: 'IRR — Hydraulique Agricole & Irrigation', category: 'Hydraulique', description: 'Périmètres irrigués, canaux d’irrigation, barrages retenues d’eau' },

  // ASSAINISSEMENT
  { code: 'ASS', name: 'ASS — Assainissement Pluvial & Collecteurs', category: 'Assainissement', description: 'Canaux de drainage, dalots béton, collecteurs principaux pluviaux' },
  { code: 'EUS', name: 'EUS — Eaux Usées & Réseaux d’Égouts', category: 'Assainissement', description: 'Réseaux d’assainissement collectif, canalisations DN300 à DN1200' },
  { code: 'STEP', name: 'STEP — Stations d’Épuration Wastewater', category: 'Assainissement', description: 'Lagunage, boues activées, stations de dépollution des eaux usées' },

  // GÉNIE CIVIL & VRD
  { code: 'VRD', name: 'VRD — Voirie & Réseaux Divers', category: 'Infrastructures & VRD', description: 'Aménagement urbain, voiries bitumées, pavage, bordures' },
  { code: 'TER', name: 'TER — Terrassements & Dépôts', category: 'Infrastructures & VRD', description: 'Terrassements généraux, décapage, remblais/déblais grande masse' },
  { code: 'GCI', name: 'GCI — Génie Civil Lourd & Fondations', category: 'Génie Civil', description: 'Pieux profonds, soutènements, radier général, ouvrages en béton armé' },
  { code: 'ART', name: 'ART — Ouvrages d’Art & Ponts', category: 'Génie Civil', description: 'Ponts d’étagement, ponts métalliques/béton, viaducs, passerelles' },

  // BÂTIMENT
  { code: 'BAT', name: 'BAT — Bâtiment Tout Corps d’État (TCE)', category: 'Bâtiment', description: 'Immeubles, cités résidentielles, écoles, hôpitaux, complexes administratifs' },
  { code: 'IND', name: 'IND — Bâtiments Industriels & Logistique', category: 'Bâtiment', description: 'Hangars métalliques, entrepôts frigorifiques, usines' },
];

export type RiskLevel = 'Faible' | 'Modéré' | 'Élevé' | 'Critique';

export interface Project {
  id: string;
  code: string;
  domainCode?: string; // e.g. HYD, ASS, STEP, VRD
  name: string;
  company: string;
  client: string;
  country: string;
  location: string;
  activity: string;
  manager: string;
  contractRef: string;
  contractAmount: number;
  currency: string;
  signatureDate: string;
  startDate: string;
  durationMonths: number;
  endDate: string;
  initialBudget: number;
  revisedBudget: number;
  progress: number; // Percentage 0 - 100
  status: ProjectStatus;
  risk: RiskLevel;
  siteId?: number;
}

export interface DQEItem {
  id: string;
  projectId: string;
  priceNo: string;            // N° Prix contractuel (ex: SEC-7, 03.02.004)
  description: string;        // Désignation contractuelle
  unit: string;               // Unité (m3, m2, ml, ff, u, kg, etc.)
  quantity: number;           // Quantité contractuelle
  marketUnitPrice: number;    // PU Marché
  marketAmount: number;       // Montant Marché = Quantité * PU Marché
  lotCode?: string;           // Code du Lot (ex: 03)
  lotName?: string;           // Intitulé du Lot
  subLotCode?: string;        // Code du Sous-Lot (ex: 03.02)
  subLotName?: string;        // Intitulé du Sous-Lot
  wbsCode?: string;           // Code WBS généré
  status?: 'Conforme' | 'Incomplet' | 'Duplicata' | 'Écart Montant';
  importedAt?: string;
  importSource?: string;
}

export interface DQEImportLog {
  id: string;
  projectId: string;
  fileName: string;
  importedAt: string;
  importedBy: string;
  totalLines: number;
  totalMarketAmount: number;
  status: 'Succès' | 'Avertissements';
}

export type AmendmentStatus = 'Signé' | 'Approuvé non signé' | 'En négociation' | 'Potentiel';

export interface ContractAmendment {
  id: string;
  code: string; // AV-2026-001
  projectId: string;
  wbsCode?: string;
  title: string;
  amount: number;
  status: AmendmentStatus;
  isIncludedInOfficialMargin: boolean; // Si intégré dans la marge officielle
  signedDate?: string;
  justification: string;
}

export interface EVMMetrics {
  pv: number; // Planned Value (Valeur Planifiée)
  ev: number; // Earned Value (Valeur Acquise)
  ac: number; // Actual Cost (Coût Réel)
  cpi: number; // Cost Performance Index = EV / AC
  spi: number; // Schedule Performance Index = EV / PV
  cv: number; // Cost Variance = EV - AC
  sv: number; // Schedule Variance = EV - PV
}

export interface DSResourceItem {
  id: string;
  category: 'Matériaux' | 'Main-d’œuvre' | 'Matériel' | 'Transport' | 'Frais généraux' | 'Divers';
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface WBSNode {
  id: string;
  projectId: string;
  code: string; // e.g. CIV-2026-ASS-001 / 03 / 02 / 004
  priceNo?: string; // N° Prix DQE / BPU contractuel
  name: string;
  description?: string;
  unit?: string;
  plannedQty?: number;
  unitCost?: number;
  costDsUnit?: number;        // Coût DS Unitaire (Déboursé Sec unitaire)
  budgetDs?: number;          // Budget DS Initial (Déboursé Sec prévisionnel)
  contractUnitPrice?: number; // Prix Unitaire Marché Client (DQE/BPU)
  contractAmount?: number;    // Montant Marché Client = Qté contractuelle * PU marché
  
  // 14 INDICATEURS OBLIGATOIRES COST CONTROL & EAC
  initialBudget: number; // Budget Initial (issu du Déboursé Sec)
  revisedBudget: number; // Budget Révisé
  reserved: number; // Réservé
  committed: number; // Engagé
  received: number; // Réceptionné
  invoiced: number; // Facturé Fournisseur
  actualCost: number; // Coût Réel
  remainingToCommit: number; // Reste à Engager = Budget Révisé - Engagé - Réservé
  remainingToProduce: number; // Reste à Produire (Reste à faire)
  forecast: number; // Forecast (Coût Prévisionnel du reste à faire)
  forecastCalculationMode: 'Manuel contrôlé' | 'Calculé' | 'Hybride';
  eac: number; // EAC = Coût Réel à date + Forecast Reste à Faire
  varianceAtCompletion: number; // Écart à Terminaison (VAC) = Budget Révisé - EAC
  initialMargin: number; // Marge Initial = Valeur Contractuelle Réf - Budget Initial
  eacMargin: number; // Marge EAC = Valeur Contractuelle Prévisionnelle - EAC
  
  // OPTION ÉVOLUTIVE EVM (Earned Value Management)
  evm?: EVMMetrics;

  progress: number; // 0 - 100
  nature: CostNature;
  manager: string;
  parentId?: string | null;
  type?: 'PROJET' | 'LOT' | 'SOUS_LOT' | 'ACTIVITE';
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  children?: WBSNode[];
  dsResources?: DSResourceItem[];
}

export interface BudgetVersion {
  id: string;
  projectId: string;
  version: string; // V0, V1, V2
  createdAt: string;
  createdBy: string;
  justification: string;
  status: 'Brouillon' | 'Validé' | 'Rejeté';
  totalInitial: number;
  totalRevised: number;
}

export type DARequestStatus =
  | 'BROUILLON'
  | 'SOUMISE'
  | 'EN_VALIDATION'
  | 'RETOUR_CORRECTION'
  | 'VALIDEE'
  | 'REFUSEE'
  | 'ANNULEE'
  | 'TRANSFORMEE_EN_BC'
  | 'Brouillon'
  | 'En attente validation'
  | 'Approuvé'
  | 'Refusé'
  | 'Retour correction'
  | 'Délégué'
  | 'BC Généré';

export type UrgencyLevel = 'Normale' | 'Urgent' | 'Très urgent' | 'Critique';

export interface WorkflowThresholdConfig {
  minAmount: number;
  maxAmount: number;
  circuitRoles: Role[];
  circuitLabel: string;
}

export interface PurchaseRequestItem {
  id: string;
  article: string;
  articleCode?: string;
  nature: CostNature;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedTotal: number;
  desiredDate?: string;
  justification?: string;
  isOutsideDS?: boolean; // Tag "Ressource hors Déboursé Sec"
  wbsCode?: string;      // Code DS / N° Prix WBS lié
  dsPriceNo?: string;    // N° de Prix Déboursé Sec
  dsBudgetUnitPrice?: number; // Prix Unitaire Budgété au DS
}

export interface PurchaseRequest {
  id: string;
  code: string; // DA-2026-001
  projectId: string;
  projectName: string;
  wbsId: string;
  wbsCode: string;
  wbsName: string;
  nature: CostNature;
  itemDescription: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedTotal: number;
  desiredDate: string;
  urgency: UrgencyLevel;
  justification: string;
  createdBy: string;
  createdAt: string;
  status: DARequestStatus;
  attachments?: string[];
  
  // Section 20 : Contrôle Budgétaire & Réservations
  budgetCheck: {
    wbsBudget: number; // Budget Révisé WBS
    activeCommitments: number; // Engagements actifs
    activeReservations: number; // Réservations budgétaires actives
    availableToCommit: number; // Disponible à engager = Budget révisé - engagements - réservations
    daAmount: number; // Montant de la DA
    balanceAfterDA: number; // Solde après DA
    isOverBudget: boolean; // Si DA > Disponible
    overBudgetAmount: number; // Écart / Dépassement
    overBudgetQualification?: 'Dépassement Mineur (<5%)' | 'Dépassement Majeur (>=5%)' | 'Hors Budget';
    isExceptionalWorkflowTriggered: boolean; // Déclenchement workflow exceptionnel
  };

  // Section 21 : Workflow Engine & Circuit Paramétrable
  approvalChain: {
    role: Role;
    user?: string;
    date?: string;
    status: 'En attente' | 'Approuvé' | 'Refusé' | 'Retour correction' | 'Délégué';
    comment?: string;
    delegatedTo?: string;
    escalatedTo?: string;
    deadline?: string;
  }[];
  poNumber?: string;
}

export interface PurchaseOrder {
  id: string;
  code: string; // BC-GEBAT-2026-042
  daId: string;
  supplier: string;
  totalAmount: number;
  issueDate: string;
  status: 'Émis' | 'Partiellement Livré' | 'Totalement Livré' | 'Payé';
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    receivedQty: number;
  }[];
}

export interface GoodsReceipt {
  id: string;
  code: string; // REC-2026-089
  poId: string;
  poCode: string;
  projectId: string;
  wbsId: string;
  supplier: string;
  receiptDate: string;
  receivedBy: string;
  items: {
    description: string;
    qtyReceived: number;
    unitPrice: number;
    totalCost: number;
  }[];
  status: 'Validé';
}

export type ValidationCategory =
  | 'DA'
  | 'BC'
  | 'Dépassement'
  | 'Rapport Journalier'
  | 'Budget'
  | 'Avenant'
  | 'Facture'
  | 'Paiement'
  | 'Autre';

export interface ValidationItem {
  id: string;
  category: ValidationCategory;
  object: string; // Objet de l'opération
  amount: number; // Montant en FCFA
  projectId: string;
  projectName: string;
  wbsCode: string;
  initiator: string; // Initiateur
  date: string;
  urgency: UrgencyLevel;
  budgetImpact: 'Dans le budget' | 'Dépassement Mineur (<5%)' | 'Dépassement Majeur (>=5%)' | 'Hors Budget';
  attachments: string[];
  status: 'En attente' | 'Validé' | 'Refusé' | 'Retourné';
  comment?: string;
}

export interface ThreeWayMatchConfig {
  qtyTolerancePct: number; // e.g. 2%
  priceTolerancePct: number; // e.g. 1%
  taxTolerancePct: number; // e.g. 0%
  amountTolerancePct: number; // e.g. 1%
  actionOnExceeding: 'Alerte' | 'Justification' | 'Validation Exceptionnelle' | 'Blocage';
}

export interface ThreeWayMatchCheck {
  id: string;
  invoiceCode: string;
  poCode: string;
  receiptCode: string;
  supplier: string;
  article: string;
  
  // BC
  poQty: number;
  poUnitPrice: number;
  poTaxes: number;
  poTotalAmount: number;

  // RÉCEPTION
  receiptQty: number;
  receiptUnitPrice: number;
  receiptTaxes: number;
  receiptTotalAmount: number;

  // FACTURE
  invoiceQty: number;
  invoiceUnitPrice: number;
  invoiceTaxes: number;
  invoiceTotalAmount: number;

  // ÉCARTS & TOLÉRANCES
  qtyDiffPct: number;
  priceDiffPct: number;
  amountDiffPct: number;
  isWithinTolerance: boolean;
  status: 'Conforme' | 'Écart Détecté' | 'Bloqué';
}

export type StockMovementType =
  | 'Entrée'
  | 'Sortie'
  | 'Transfert'
  | 'Retour'
  | 'Inventaire'
  | 'Ajustement'
  | 'Réservation';

export interface Warehouse {
  id: string;
  code: string; // MAG-ABJ-01
  name: string;
  location: string;
  manager: string;
  projectId?: string;
  siteId?: number | string;
}

export interface StockItem {
  id: string;
  code: string; // ART-CIM-01
  name: string;
  category: string;
  unit: string;
  warehouse: string;
  minThreshold: number;
  currentStock: number;
  reservedStock: number; // Stock réservé
  averageUnitPrice: number;
  totalValue: number;
}

export interface StockMovement {
  id: string;
  code: string;
  type: StockMovementType;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  warehouse: string; // Magasin d'origine ou concerné
  destinationWarehouse?: string; // Pour les transferts inter-magasins
  projectId?: string;
  projectName?: string;
  wbsId?: string;
  wbsCode?: string; // Imputation WBS
  activityName?: string; // Imputation Activité
  sourceDoc: string; // Document source (ex: REC-2026-089, BC-042, BL-12)
  user: string; // Utilisateur initiateur
  date: string; // Date
  notes?: string;
}

export interface StockConsumptionWBSCheck {
  id: string;
  projectId: string;
  projectName: string;
  wbsCode: string;
  activityName: string;
  article: string;
  unit: string;
  unitPrice: number;
  theoreticalQty: number; // Quantité Théorique
  realQty: number; // Quantité Réelle Imputée
  qtyDiff: number; // Écart Quantité
  qtyDiffPct: number; // Écart %
  financialImpact: number; // Impact Financier = Écart Quantité * Prix Unitaire
  status: 'Conforme' | 'Surconsommation' | 'Sous-consommation';
}

export type NonProductiveCategory = 'Attente matière' | 'Panne' | 'Météo' | 'Instructions' | 'Absence' | 'Autres';

export interface DailyReport {
  id: string;
  code: string; // CR-2026-08-18-01
  date: string;
  projectId: string;
  projectName: string;
  wbsId: string;
  wbsCode: string;
  activityName: string;
  weather: 'Ensoleillé' | 'Pluie' | 'Nuageux' | 'Orage';
  plannedQty: number;
  realizedQty: number;
  unit: string;
  workersCount: number;
  hoursWorked: number; // Temps pertinent
  nonProductiveHours: number;
  nonProductiveCategory?: NonProductiveCategory;
  equipmentCount: number;
  equipmentHours: number;
  
  // CONNEXION DÉBOURSÉ SEC (DS) & PRODUCTIVITÉ THÉORIQUE VS RÉELLE
  dsTargetYield?: number;         // Rendement objectif prévu au DS (ex: 5 m3/jour)
  dsTargetUnitPrice?: number;     // Coût unitaire théorique DS (ex: 83 000 FCFA/m3)
  dsTargetTotalCost?: number;     // Coût théorique prévu = Quantité Réalisée * PU DS
  realizedUnitCost?: number;      // Coût réel unitaire constaté
  realizedTotalCost?: number;     // Coût réel total constaté
  yieldVariancePercent?: number;  // Écart de Rendement % = ((Rendement Réel - Rendement DS) / Rendement DS) * 100
  costVariance?: number;          // Écart Financier = Coût Réel - Coût Théorique DS

  consumptions?: { article: string; unit: string; planned: number; consumed: number }[];
  deliveries?: { supplier: string; article: string; qty: number; unit: string }[];
  subcontractors?: { name: string; task: string; workers: number; status: string }[];
  qhseNotes?: string;
  photos?: string[];
  problems?: string;
  stopReason?: string;
  notes?: string;
  status: 'Brouillon' | 'Soumis' | 'Validé' | 'Verrouillé';
  createdBy: string;
  productivityRate: number; // Taux = (Rendement Réel / Rendement Objectif) * 100
}

export type AlertSeverity = 'Information' | 'Mineure' | 'Moyenne' | 'Majeure' | 'Critique';
export type AlertCategory = 'Budget' | 'DA' | 'Planning' | 'Production' | 'Stock' | 'Réception';

export interface SystemAlert {
  id: string;
  code: string;
  category: AlertCategory;
  severity: AlertSeverity;
  projectId?: string;
  projectName?: string;
  wbsId?: string;
  wbsCode?: string;
  title: string;
  message: string;
  observedValue: string;
  thresholdValue: string;
  assignedToRole: Role;
  createdAt: string;
  status: 'Actif' | 'Traité' | 'Ignoré';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: Role;
  action: string;
  module: string;
  objectRef: string;
  oldValue?: string;
  newValue?: string;
  justification?: string;
}

// ==================================================
// MODULE DÉBOURSÉ SEC (DS) — TYPES & INTERFACES
// ==================================================

export type YieldType =
  | 'direct'           // Utilisation directe
  | 'qty_per_unit'     // Quantité par unité produite
  | 'prod_per_hour'    // Production par heure
  | 'prod_per_day'     // Production par jour
  | 'time_per_unit';   // Temps nécessaire par unité

export type PriceSource =
  | 'Fournisseur'
  | 'Historique achat'
  | 'Catalogue'
  | 'Marché'
  | 'Estimation'
  | 'Saisie manuelle';

export interface DSResource {
  id: string;
  code: string;
  name: string;
  nature: CostNature;
  unit: string;
  theoreticalQty: number;      // Quantité théorique par unité d'activité
  lossRatePercent: number;     // Coefficient de perte (%) ex: 3 pour 3%
  yieldType: YieldType;        // Type de rendement
  yieldValue?: number;         // Valeur du rendement ex: 5 m3/jour pour maçon
  unitPrice: number;           // Prix unitaire ressource
  correctedQty: number;        // Quantité corrigée = theoreticalQty * (1 + lossRate/100)
  unitCost: number;            // Coût unitaire par unité d'activité
  totalCost: number;           // Coût total pour toute la quantité de l'activité
  actualQty?: number;          // Quantité réelle consommée sur chantier
  actualCost?: number;         // Coût réel constaté sur chantier
  priceSource: PriceSource;    // Source du prix
  lastUpdateDate: string;      // Date de mise à jour ISO
  priceStatus: 'À jour' | 'À vérifier' | 'Ancien';
}

export interface DebourseSecActivity {
  id: string;
  wbsCode: string;             // ex: 03.02.004 ou CIV-2026-ASS-001 / 03 / 02 / 004
  priceNo: string;              // ex: 03.02.004 ou 01
  description: string;          // ex: Béton armé pour Voiles & Radiers
  unit: string;                 // ex: m³
  contractQty: number;          // ex: 500
  marketUnitPrice: number;      // ex: 100 000 FCFA
  marketAmount: number;         // ex: 50 000 000 FCFA (Qté * PU Marché)
  importedDsAmount: number;     // ex: 40 000 000 FCFA (Budget DS du fichier Excel)
  calculatedDsAmount: number;   // Somme des coûts totaux de toutes les ressources
  calculatedDsUnitPrice: number;// calculatedDsAmount / contractQty
  theoreticalMargin: number;    // marketAmount - calculatedDsAmount
  marginRatePercent: number;    // (theoreticalMargin / marketAmount) * 100
  status: 'Complet' | 'En cours' | 'Incomplet' | 'Écart détecté';
  version: string;              // ex: V1
  resources: DSResource[];
}

export interface DSVersionHistory {
  version: string;             // V0, V1, V2
  date: string;
  author: string;
  status: string;
  justification: string;
  totalAmount: number;
}
