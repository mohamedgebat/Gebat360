import {
  Project,
  WBSNode,
  PurchaseRequest,
  PurchaseOrder,
  GoodsReceipt,
  StockItem,
  StockMovement,
  DailyReport,
  SystemAlert,
  AuditLog,
  BudgetVersion,
  Subcontract,
  SubcontractSituation
} from '../types';

import { REAL_EXCEL_PROJECTS, REAL_EXCEL_WBS, REAL_EXCEL_PRODUCTION } from '../../data/realExcelData';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'CIV-2026-ASS-SON-001',
    code: 'CIV-2026-ASS-SON-001',
    domainCode: 'ASS',
    name: 'Station de traitement des boues de vidange de la ville Abidjan Ouest (Songon)',
    company: 'GEBAT SA',
    client: 'Ministère de l’Hydraulique & Assainissement / ONEP',
    country: 'Côte d’Ivoire',
    location: 'Songon, Abidjan Ouest',
    activity: 'Station de Traitement des Boues',
    manager: 'SEA Alphonse',
    contractRef: 'CTR-GEBAT-2026-ASS-SON-001',
    contractAmount: 2830415055,
    currency: 'XOF',
    signatureDate: '2026-01-15',
    startDate: '2026-07-01',
    durationMonths: 6,
    endDate: '2027-01-31',
    initialBudget: 778028406,
    revisedBudget: 778028406,
    progress: 3.0,
    status: 'En cours',
    risk: 'Modéré'
  },
  {
    id: 'CIV-2026-ASS-BEN-002',
    code: 'CIV-2026-ASS-BEN-002',
    domainCode: 'ASS',
    name: 'Station de traitement des boues de vidange de la ville Abidjan Est commune de Bingerville',
    company: 'GEBAT SA',
    client: 'Ministère de l’Hydraulique & Assainissement / ONEP',
    country: 'Côte d’Ivoire',
    location: 'Bingerville, Abidjan Est',
    activity: 'Station de Traitement des Boues',
    manager: 'KOUASSI Jean',
    contractRef: 'CTR-GEBAT-2026-ASS-BEN-002',
    contractAmount: 3427958972,
    currency: 'XOF',
    signatureDate: '2026-01-15',
    startDate: '2026-06-01',
    durationMonths: 15,
    endDate: '2027-09-01',
    initialBudget: 1890812405,
    revisedBudget: 1890812405,
    progress: 13.0,
    status: 'En cours',
    risk: 'Faible'
  }
];

export const INITIAL_WBS: Record<string, WBSNode[]> = {
  ...REAL_EXCEL_WBS,
};

export const INITIAL_STOCK_ITEMS: StockItem[] = [];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'MAG-01',
    code: 'MAG-ABJ-01',
    name: 'Magasin Central Abidjan (Yopougon)',
    location: 'Zone Industrielle Yopougon',
    manager: 'Kouassi Jean-Philippe',
    siteId: 'ALL'
  },
  {
    id: 'MAG-02',
    code: 'MAG-BEN-02',
    name: 'Magasin Bingerville (Chantier)',
    location: 'Chantier Station Bingerville',
    manager: 'Assistant Logistique Bingerville',
    projectId: 'CIV-2026-ASS-BEN-002',
    siteId: 2
  },
  {
    id: 'MAG-03',
    code: 'MAG-SNG-03',
    name: 'Magasin Songon (Chantier)',
    location: 'Chantier Pompage Songon',
    manager: 'Assistant Logistique Songon',
    projectId: 'CIV-2026-ASS-SON-001',
    siteId: 1
  },
  {
    id: 'MAG-04',
    code: 'MAG-DEP-04',
    name: 'Dépôt Chantier Secondaire',
    location: 'Base Vie Chantier',
    manager: 'Magasinier Chantier',
    siteId: 'ALL'
  }
];

export const INITIAL_PURCHASE_REQUESTS: PurchaseRequest[] = [];
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];
export const INITIAL_RECEIPTS: GoodsReceipt[] = [];
export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];



const REAL_DAILY_REPORTS: DailyReport[] = REAL_EXCEL_PRODUCTION.map((item, idx) => ({
  id: `CR-REAL-${idx + 1}`,
  code: `CR-PROD-${idx + 1}`,
  date: '2026-08-15',
  projectId: item.site === 'BINGERVILLE' ? 'CIV-2026-ST-BING-001' : 'CIV-2026-ST-SONG-002',
  projectName: item.site === 'BINGERVILLE' ? 'Station de Traitement des Boues — Commune Bingerville' : 'Station de Traitement des Boues — Commune Songon',
  wbsId: `WBS-REAL-${idx + 1}`,
  wbsCode: `PRD-${idx + 1}`,
  activityName: `${item.ouvrage} — ${item.designation}`,
  weather: 'Ensoleillé',
  plannedQty: Math.round(item.totalQteProd * 1.05),
  realizedQty: item.totalQteProd,
  unit: item.unit,
  workersCount: 14,
  hoursWorked: 8,
  equipmentCount: 2,
  equipmentHours: 8,
  notes: `Production cumulée mesurée sur le site de ${item.site}.`,
  status: 'Validé',
  createdBy: 'SEA Alphonse',
  productivityRate: item.totalQteProd > 0 ? Number(((item.totalQteProd / (item.totalQteProd * 1.05)) * 100).toFixed(1)) : 95.0
}));

export const INITIAL_DAILY_REPORTS: DailyReport[] = [];

export const INITIAL_ALERTS: SystemAlert[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-08-15 10:00:00',
    user: 'Yacouba Mohamed',
    role: 'Super Admin',
    action: 'INITIALISATION_SYSTEME',
    module: 'CORE',
    objectRef: 'SYSTEM',
    newValue: 'Initialisation de la base de données GEBAT 360° MVP',
  },
];

export const INITIAL_SUBCONTRACTS: Subcontract[] = [
  {
    id: 'ST-SON-001',
    projectId: 'CIV-2026-ASS-SON-001',
    code: 'CTR-ST-SON-2026-001',
    company: 'SEVRD — SOCIÉTÉ D\'EXCAVATION & VRD DU SUD',
    lotCode: '100.1',
    lotName: 'Terrassements généraux, Déblais & Plateforme STEP',
    manager: 'KOUASSI Roger',
    contactPhone: '+225 07 08 12 34 56',
    contactEmail: 'r.kouassi@sevrd-ci.com',
    contractAmount: 35704026,
    amendments: 0,
    invoiced: 8872450,
    guarantee5: 443623,
    paidAmount: 8428827,
    progress: 25,
    status: 'En cours',
    startDate: '2026-07-05',
    endDate: '2026-10-31',
    notes: 'Marché de terrassements en grande masse et nivellement de la plateforme STEP Songon.',
    createdAt: '2026-07-01 09:00:00',
    situations: [
      {
        id: 'SIT-SON-001-01',
        subcontractId: 'ST-SON-001',
        situationNumber: 1,
        periodMonth: '2026-08',
        submissionDate: '2026-08-25',
        grossAmount: 8872450,
        retentionRate: 5,
        retentionAmount: 443623,
        netAmount: 8428827,
        progressPct: 25,
        status: 'Validé',
        notes: 'Situation mensuelle N°1 validée par le Directeur Projet.',
        validatedBy: 'SEA Alphonse',
        validatedAt: '2026-08-28 14:30'
      }
    ]
  },
  {
    id: 'ST-SON-002',
    projectId: 'CIV-2026-ASS-SON-001',
    code: 'CTR-ST-SON-2026-002',
    company: 'LBTP — LABORATOIRE DU BÂTIMENT & TRAVAUX PUBLICS',
    lotCode: '000.1',
    lotName: 'Reconnaissance géotechnique & Essais de portance des sols',
    manager: 'Dr. OUATTARA Ibrahima',
    contactPhone: '+225 05 45 67 89 01',
    contactEmail: 'i.ouattara@lbtp-ci.org',
    contractAmount: 12241381,
    amendments: 0,
    invoiced: 12241381,
    guarantee5: 612069,
    paidAmount: 11629312,
    progress: 100,
    status: 'Clôturé',
    startDate: '2026-07-01',
    endDate: '2026-08-15',
    notes: 'Campagne de sondages pressiométriques et carottages géotechniques préliminaires.',
    createdAt: '2026-06-25 11:30:00',
    situations: [
      {
        id: 'SIT-SON-002-01',
        subcontractId: 'ST-SON-002',
        situationNumber: 1,
        periodMonth: '2026-07',
        submissionDate: '2026-07-30',
        grossAmount: 12241381,
        retentionRate: 5,
        retentionAmount: 612069,
        netAmount: 11629312,
        progressPct: 100,
        status: 'Validé',
        notes: 'Décompte général et définitif (DGD) validé.',
        validatedBy: 'SEA Alphonse',
        validatedAt: '2026-08-05 10:00'
      }
    ]
  },
  {
    id: 'ST-BEN-001',
    projectId: 'CIV-2026-ASS-BEN-002',
    code: 'CTR-ST-BEN-2026-001',
    company: 'SOGEA-VRD CÔTE D\'IVOIRE',
    lotCode: '02.01',
    lotName: 'Terrassements généraux, Fouilles en grande masse & VRD',
    manager: 'KOUADIO Patrice',
    contactPhone: '+225 07 48 90 12 34',
    contactEmail: 'p.kouadio@sogea-ci.com',
    contractAmount: 42000000,
    amendments: 0,
    invoiced: 12600000,
    guarantee5: 630000,
    paidAmount: 11970000,
    progress: 30,
    status: 'En cours',
    startDate: '2026-06-15',
    endDate: '2026-11-30',
    notes: 'Travaux de terrassement et plateforme station Bingerville.',
    createdAt: '2026-06-10 14:00:00',
    situations: [
      {
        id: 'SIT-BEN-001-01',
        subcontractId: 'ST-BEN-001',
        situationNumber: 1,
        periodMonth: '2026-08',
        submissionDate: '2026-08-28',
        grossAmount: 12600000,
        retentionRate: 5,
        retentionAmount: 630000,
        netAmount: 11970000,
        progressPct: 30,
        status: 'Validé',
        notes: 'Situation N°1 déblais et remblais validée.',
        validatedBy: 'KOUASSI Jean',
        validatedAt: '2026-08-30 16:00'
      }
    ]
  }
];
