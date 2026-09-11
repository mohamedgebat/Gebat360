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
import { REAL_ALL_DAILY_REPORTS } from './realExcelProductionData';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from './realBingervilleDsData';
import { REAL_DS_SONGON_ACTIVITIES } from './realSongonDsData';

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
    progress: 12.6,
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
    progress: 13.3,
    status: 'En cours',
    risk: 'Faible'
  }
];

export const INITIAL_WBS: Record<string, WBSNode[]> = {
  'CIV-2026-ASS-BEN-002': REAL_DS_BINGERVILLE_ACTIVITIES,
  'CIV-2026-ASS-SON-001': REAL_DS_SONGON_ACTIVITIES,
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

export const INITIAL_DAILY_REPORTS: DailyReport[] = REAL_ALL_DAILY_REPORTS;

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

export const INITIAL_SUBCONTRACTS: Subcontract[] = [];
