import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Role,
  Project,
  WBSNode,
  PurchaseRequest,
  PurchaseOrder,
  GoodsReceipt,
  StockItem,
  StockMovement,
  Warehouse,
  DailyReport,
  SystemAlert,
  AuditLog,
  CostNature,
  CostNatureConfig,
  DEFAULT_COST_NATURES,
  Site
} from '../../types';
import { INITIAL_USERS, PERMISSIONS_MATRIX } from '../permissions';
import { REAL_ALL_DAILY_REPORTS } from './realExcelProductionData';
import { REAL_DS_BINGERVILLE_ACTIVITIES } from './realBingervilleDsData';
import { isProjectMatch, isReportForProject } from '../../utils/projectMatcher';
import { safeSaveToStorage } from './indexedDBStorage';
import {
  INITIAL_PROJECTS,
  INITIAL_WBS,
  INITIAL_STOCK_ITEMS,
  INITIAL_WAREHOUSES,
  INITIAL_PURCHASE_REQUESTS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_RECEIPTS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_DAILY_REPORTS,
  INITIAL_ALERTS,
  INITIAL_AUDIT_LOGS
} from './initialData';
import { ApiService } from '../../services/api';

interface AppStateContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
  projects: Project[];
  wbsMap: Record<string, WBSNode[]>;
  stockItems: StockItem[];
  warehouses: Warehouse[];
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  receipts: GoodsReceipt[];
  stockMovements: StockMovement[];
  dailyReports: DailyReport[];
  alerts: SystemAlert[];
  auditLogs: AuditLog[];
  sites: Site[];
  activeSiteId: number | 'ALL';
  setActiveSiteId: (siteId: number | 'ALL') => void;
  // État de connexion au backend & BDD MySQL
  isBackendConnected: boolean | null;
  backendError: string | null;
  retryBackendConnection: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Scénario & Mutations
  createProject: (newProject: Omit<Project, 'id'>, wbsNodes?: WBSNode[]) => void;
  updateProject: (projectId: string, updatedData: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  createDailyReport: (reportData: Omit<DailyReport, 'id' | 'createdAt' | 'reportCode'>) => void;
  importDailyReportsBulk: (reports: Omit<DailyReport, 'id' | 'createdAt' | 'reportCode'>[]) => void;
  updateProjectWBS: (projectId: string, newNodes: WBSNode[]) => Promise<void>;
  createDA: (daData: Omit<PurchaseRequest, 'id' | 'code' | 'createdAt' | 'status' | 'budgetCheck' | 'approvalChain'>) => PurchaseRequest;
  updateDAStatus: (daId: string, status: any, comment?: string) => void;
  approveDA: (daId: string, comment?: string) => void;
  processGoodsReceipt: (poId: string, receivedQty: number, receivedBy: string) => void;
  consumeStockToWBS: (itemId: string, quantity: number, projectId: string, wbsId: string, activityName: string, user: string) => void;
  createStockMovement: (mvtData: Omit<StockMovement, 'id'>) => StockMovement;
  addUser: (newUser: User) => void;
  updateUser: (updatedUser: User) => void;
  deleteUser: (userId: string) => void;
  addCostNature: (nature: Omit<CostNatureConfig, 'id'>) => void;
  updateCostNature: (nature: CostNatureConfig) => void;
  toggleCostNatureStatus: (id: string) => void;
  resolveAlert: (alertId: string, comment?: string) => void;
  addAlert: (alertData: Omit<SystemAlert, 'id' | 'timestamp'>) => void;
  addAuditLog: (action: string, module: string, objectRef: string, newValue?: string, oldValue?: string, justification?: string) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const checkBackendConnection = async () => {
    try {
      const res = await ApiService.checkHealth();
      if (res && res.status === 'OK') {
        setIsBackendConnected(prev => (prev === true ? prev : true));
        setBackendError(prev => (prev === null ? prev : null));
      } else {
        setIsBackendConnected(prev => (prev === false ? prev : false));
        setBackendError(prev => (prev ? prev : 'Le serveur Backend API a retourné un statut non valide.'));
      }
    } catch (err: any) {
      setIsBackendConnected(prev => (prev === false ? prev : false));
      setBackendError(prev => (prev ? prev : (err.message || 'Impossible de se connecter au serveur backend (http://localhost:5001/api/v1).')));
    }
  };

  useEffect(() => {
    checkBackendConnection();
  }, []);

  // Purge automatique des données obsolètes enregistrées dans le localStorage du navigateur (DATA_VERSION v196)
  if (typeof window !== 'undefined') {
    const DATA_VERSION = 'v2026_08_28_pwa_progressive_web_app_full_active_v196';
    const savedVer = localStorage.getItem('gebat_data_version');
    if (savedVer !== DATA_VERSION) {
      localStorage.removeItem('gebat_daily_reports');
      localStorage.removeItem('gebat_wbs');
      localStorage.removeItem('gebat_stock_items');
      localStorage.removeItem('gebat_stock_movements');
      localStorage.removeItem('gebat_warehouses');
      localStorage.setItem('gebat_data_version', DATA_VERSION);
    }
  }

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('gebat_current_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_USERS[0];
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('gebat_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasOutdatedData = Array.isArray(parsed) && parsed.some((u: any) => u.email === 'y.mohamed@gebat-sa.com' || u.employeeCode === 'EMP-2026-084');
        if (hasOutdatedData) {
          localStorage.removeItem('gebat_users');
          return INITIAL_USERS;
        }
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_USERS;
  });

  useEffect(() => {
    async function loadDbUsers() {
      if (isBackendConnected) {
        try {
          const dbUsers = await ApiService.getUsers();
          if (Array.isArray(dbUsers) && dbUsers.length > 0) {
            setUsers(dbUsers);
            localStorage.setItem('gebat_users', JSON.stringify(dbUsers));
          }
        } catch (err) {
          console.warn('⚠️ Impossible de charger la liste des utilisateurs depuis MySQL:', err);
        }
      }
    }
    loadDbUsers();
  }, [isBackendConnected]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('gebat_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('gebat_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<number | 'ALL'>(() => {
    const saved = localStorage.getItem('gebat_active_site_id');
    if (saved) {
      if (saved === 'ALL') return 'ALL';
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 'ALL';
  });

  // Charger les sites autorisés
  useEffect(() => {
    async function loadSites() {
      if (isBackendConnected) {
        try {
          const dbSites = await ApiService.getSites();
          setSites(dbSites);
          
          if (dbSites.length > 0) {
            const hasAccessToActive = activeSiteId === 'ALL' || dbSites.some((s: any) => String(s.id) === String(activeSiteId));
            if (!hasAccessToActive) {
              setActiveSiteId(dbSites[0].id);
            }
          }
        } catch (err) {
          console.warn('⚠️ Impossible de charger les sites autorisés:', err);
        }
      }
    }
    loadSites();
  }, [isBackendConnected, currentUser]);

  useEffect(() => {
    localStorage.setItem('gebat_active_site_id', String(activeSiteId));
  }, [activeSiteId]);

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('gebat_projects') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_PROJECTS;
  });
  const [wbsMap, setWbsMap] = useState<Record<string, WBSNode[]>>(() => {
    const saved = localStorage.getItem('gebat_wbs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_WBS;
  });

  const [stockItems, setStockItems] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('gebat_stock_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_STOCK_ITEMS;
  });

  useEffect(() => {
    if (stockItems.length > 0) {
      localStorage.setItem('gebat_stock_items', JSON.stringify(stockItems));
    }
  }, [stockItems]);

  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    const saved = localStorage.getItem('gebat_warehouses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_WAREHOUSES;
  });

  useEffect(() => {
    if (warehouses.length > 0) {
      localStorage.setItem('gebat_warehouses', JSON.stringify(warehouses));
    }
  }, [warehouses]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('gebat_stock_movements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_STOCK_MOVEMENTS;
  });

  useEffect(() => {
    if (stockMovements.length > 0) {
      localStorage.setItem('gebat_stock_movements', JSON.stringify(stockMovements));
    }
  }, [stockMovements]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>(() => {
    const saved = localStorage.getItem('gebat_daily_reports');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 80) return parsed;
      } catch (e) {}
    }
    return REAL_ALL_DAILY_REPORTS;
  });

  useEffect(() => {
    if (dailyReports.length > 0) {
      localStorage.setItem('gebat_daily_reports', JSON.stringify(dailyReports));
    }
  }, [dailyReports]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [costNatures, setCostNatures] = useState<CostNatureConfig[]>(DEFAULT_COST_NATURES);

  // Synchronisation 100% dynamique depuis la base de données MySQL via REST API
  const loadDatabaseData = async () => {
    try {
      const dbProjects = await ApiService.getProjects();
      if (Array.isArray(dbProjects)) {
        const normalizedProjects: Project[] = dbProjects.map((p: any) => ({
          ...p,
          contractAmount: Number(p.contractAmount ?? p.contract_amount ?? 0),
          contract_amount: Number(p.contract_amount ?? p.contractAmount ?? 0),
          initialBudget: Number(p.initialBudget ?? p.initial_budget ?? 0),
          initial_budget: Number(p.initial_budget ?? p.initialBudget ?? 0),
          revisedBudget: Number(p.revisedBudget ?? p.revised_budget ?? 0),
          revised_budget: Number(p.revised_budget ?? p.revisedBudget ?? 0),
          progress: Number(p.progress ?? 0),
          durationMonths: Number(p.durationMonths ?? p.duration_months ?? 12),
          duration_months: Number(p.duration_months ?? p.durationMonths ?? 12),
          contractRef: p.contractRef || p.contract_ref || '',
          contract_ref: p.contract_ref || p.contractRef || '',
          startDate: p.startDate || p.start_date || '',
          start_date: p.start_date || p.startDate || '',
          endDate: p.endDate || p.end_date || '',
          end_date: p.end_date || p.endDate || '',
          signatureDate: p.signatureDate || p.signature_date || '',
          signature_date: p.signature_date || p.signatureDate || '',
        }));

        setProjects(normalizedProjects);

        // Charger les nœuds WBS réels de chaque projet depuis MySQL (avec fallback localStorage)
        const savedWbsRaw = localStorage.getItem('gebat_wbs');
        let localWbsMap: Record<string, WBSNode[]> = {};
        if (savedWbsRaw) {
          try { localWbsMap = JSON.parse(savedWbsRaw); } catch (e) {}
        }

        const newWbsMap: Record<string, WBSNode[]> = {};
        for (const p of normalizedProjects) {
          try {
            // Priorité 1 Absolue: Activités DS réelles importées dans Déboursé Sec (gebat_debourse_sec)
            const dsSavedRaw = localStorage.getItem(`gebat_debourse_sec_${p.id}`) || localStorage.getItem(`gebat_debourse_sec_${p.code}`) || localStorage.getItem('gebat_debourse_sec');
            let importedDsNodes: WBSNode[] = [];
            if (dsSavedRaw) {
              try {
                const parsedDs = JSON.parse(dsSavedRaw);
                if (Array.isArray(parsedDs) && parsedDs.length > 0) {
                  importedDsNodes = parsedDs.filter((act: any) => {
                    const title = String(act.description || act.priceNo || '').toLowerCase().trim();
                    const isHeader = title.includes('désignation') || title.includes('unités') ||
                                     title.startsWith('activité importée') || title === 'songon' || title === 'bingerville';
                    return !isHeader;
                  }).map((act: any, i: number) => {
                    let priceNo = String(act.priceNo || act.code || `01.01.${String(i + 1).padStart(2, '0')}`).trim();
                    let description = String(act.description || act.name || act.designation || act.libelle || `Activité N°${i + 1}`).trim();
                    let unit = String(act.unit || 'm³').trim();
                    let qty = Number(act.contractQty || act.plannedQty || 1);
                    let pu = Number(act.marketUnitPrice || act.contractUnitPrice || act.unitCost || 0);

                    // If description is an Excel date serial (e.g. 46405, 46235) or numeric code, extract real designation text
                    if (!isNaN(Number(description)) && Number(description) > 30000) {
                      if (act.name && isNaN(Number(act.name)) && String(act.name).length > 3) {
                        description = String(act.name).trim();
                      } else if (act.section && isNaN(Number(act.section))) {
                        description = String(act.section).trim();
                      } else {
                        description = `Activité WBS N°${i + 1}`;
                      }
                    }

                    let dsAmt = Number(act.importedDsAmount || act.calculatedDsAmount || 0);
                    let mktAmt = Number(act.marketAmount || (qty * pu));

                    if (mktAmt <= 0 && pu > 0 && qty > 0) {
                      mktAmt = Math.round(qty * pu);
                    }
                    if (dsAmt <= 0 && mktAmt > 0) {
                      dsAmt = Math.round(mktAmt * 0.80);
                    }

                    return {
                      id: act.id || `WBS-${p.code}-${String(i + 1).padStart(3, '0')}`,
                      projectId: p.id,
                      code: priceNo,
                      name: description,
                      description: description,
                      unit: unit,
                      plannedQty: qty,
                      contractQty: qty,
                      unitCost: act.calculatedDsUnitPrice || (qty > 0 ? Math.round(dsAmt / qty) : dsAmt),
                      contractUnitPrice: pu,
                      marketUnitPrice: pu,
                      contractAmount: mktAmt,
                      marketAmount: mktAmt,
                      initialBudget: dsAmt,
                      revisedBudget: dsAmt,
                      importedDsAmount: dsAmt,
                      committed: 0,
                      actualCost: 0,
                      forecast: dsAmt,
                      eac: dsAmt,
                      progress: 0,
                      nature: 'MAT' as const,
                      manager: p.manager || 'SEA Alphonse'
                    };
                  });
                }
              } catch (e) {}
            }

            if (importedDsNodes.length > 0) {
              newWbsMap[p.id] = importedDsNodes;
              if (p.code) newWbsMap[p.code] = importedDsNodes;
              const sumWbsBudget = importedDsNodes.reduce((sum, n) => sum + n.revisedBudget, 0);
              if (sumWbsBudget > 500000000) {
                p.revisedBudget = sumWbsBudget;
                p.initialBudget = sumWbsBudget;
              }
            } else {
              const nodes = await ApiService.getProjectWbs(p.id);
              if (Array.isArray(nodes) && nodes.length > 0) {
                newWbsMap[p.id] = nodes;
                if (p.code) newWbsMap[p.code] = nodes;

                const sumWbsBudget = nodes.reduce((sum: number, n: any) => sum + Number(n.revisedBudget || n.revised_budget || n.initialBudget || n.initial_budget || 0), 0);
                if (sumWbsBudget > 0 && (!p.revisedBudget || p.revisedBudget === 0)) {
                  p.revisedBudget = sumWbsBudget;
                  p.revised_budget = sumWbsBudget;
                  p.initialBudget = sumWbsBudget;
                  p.initial_budget = sumWbsBudget;
                }
              } else if (localWbsMap[p.id] || localWbsMap[p.code]) {
                const localNodes = localWbsMap[p.id] || localWbsMap[p.code];
                newWbsMap[p.id] = localNodes;
                if (p.code) newWbsMap[p.code] = localNodes;
                const sumWbsBudget = localNodes.reduce((sum: number, n: any) => sum + Number(n.revisedBudget || n.initialBudget || 0), 0);
                if (sumWbsBudget > 0) {
                  p.revisedBudget = sumWbsBudget;
                  p.initialBudget = sumWbsBudget;
                }
              } else {
                const projectBudget = Number(p.revisedBudget || p.initialBudget || p.contractAmount || 1980000000);
                const defaultNodes = [
                  {
                    id: `WBS-${p.id}-01`,
                    projectId: p.id,
                    code: `${p.code} / 01`,
                    name: '01. TRAVAUX PREPARATOIRES & BASE-VIE',
                    initialBudget: Math.round(projectBudget * 0.2),
                    revisedBudget: Math.round(projectBudget * 0.2),
                    committed: 0,
                    actualCost: 0,
                    forecast: Math.round(projectBudget * 0.2),
                    eac: Math.round(projectBudget * 0.2),
                    progress: Number(p.progress || 0),
                    nature: 'FGC',
                    manager: p.manager || 'SEA Alphonse',
                  },
                  {
                    id: `WBS-${p.id}-02`,
                    projectId: p.id,
                    code: `${p.code} / 02`,
                    name: '02. GENIE CIVIL ET INFRASTRUCTURES PRINCIPALES',
                    initialBudget: Math.round(projectBudget * 0.8),
                    revisedBudget: Math.round(projectBudget * 0.8),
                    committed: 0,
                    actualCost: 0,
                    forecast: Math.round(projectBudget * 0.8),
                    eac: Math.round(projectBudget * 0.8),
                    progress: Number(p.progress || 0),
                    nature: 'MAT',
                    manager: p.manager || 'SEA Alphonse',
                  },
                ];
                newWbsMap[p.id] = defaultNodes;
                if (p.code) newWbsMap[p.code] = defaultNodes;
              }
            }
          } catch (e) {
            if (localWbsMap[p.id] || localWbsMap[p.code]) {
              const localNodes = localWbsMap[p.id] || localWbsMap[p.code];
              newWbsMap[p.id] = localNodes;
              if (p.code) newWbsMap[p.code] = localNodes;
            }
          }
        }
        setWbsMap(prev => ({ ...prev, ...newWbsMap }));
      }

      const dbStock = await ApiService.getStockItems();
      if (Array.isArray(dbStock)) setStockItems(dbStock);

      const dbDA = await ApiService.getPurchaseRequests();
      if (Array.isArray(dbDA)) setPurchaseRequests(dbDA);

      const dbPO = await ApiService.getPurchaseOrders();
      if (Array.isArray(dbPO)) setPurchaseOrders(dbPO);

      const dbMovements = await ApiService.getStockMovements();
      if (Array.isArray(dbMovements)) setStockMovements(dbMovements);

      const dbReports = await ApiService.getDailyReports();
      if (Array.isArray(dbReports) && dbReports.length > 0) {
        const normalizedReports: DailyReport[] = dbReports.map((r: any) => {
          const qty = Number(r.realizedQty ?? r.realized_qty ?? 0);
          const pu = Number(r.pu ?? 5000);
          let cost = Number(r.totalCost ?? r.total_cost ?? (qty * pu));
          if (isNaN(cost) || cost <= 0) cost = qty * pu;

          return {
            id: String(r.id),
            code: String(r.code || r.reportCode || r.report_code || `REP-${r.id}`),
            reportCode: String(r.reportCode || r.code || r.report_code || `REP-${r.id}`),
            date: String(r.date || ''),
            projectId: String(r.projectId || r.project_id || 'CIV-2026-ASS-SON-001'),
            project_id: String(r.project_id || r.projectId || 'CIV-2026-ASS-SON-001'),
            wbsCode: String(r.wbsCode || r.wbs_id || r.wbs_code || '04.02.001'),
            wbsId: String(r.wbsId || r.wbs_id || '04.02.001'),
            activityName: String(r.activityName || r.activity_name || r.notes || 'Travaux de production'),
            unit: String(r.unit || 'm3'),
            pu: pu,
            plannedQty: Number(r.plannedQty ?? r.planned_qty ?? qty),
            realizedQty: qty,
            totalCost: cost,
            productivityRate: Number(r.productivityRate ?? r.productivity_rate ?? 100),
            workersCount: Number(r.workersCount ?? r.workers_count ?? 10),
            equipmentCount: Number(r.equipmentCount ?? r.equipment_count ?? 2),
            weather: String(r.weather || 'Ensoleillé'),
            notes: String(r.notes || ''),
            status: String(r.status || 'Validé'),
            createdAt: String(r.createdAt || r.created_at || r.date || '')
          };
        });
        setDailyReports(normalizedReports);
      }

      const dbAlerts = await ApiService.getAlerts();
      if (Array.isArray(dbAlerts)) setAlerts(dbAlerts);

      const dbAudit = await ApiService.getAuditLogs();
      if (Array.isArray(dbAudit)) setAuditLogs(dbAudit);

      const dbNatures = await ApiService.getCostNatures();
      if (Array.isArray(dbNatures) && dbNatures.length > 0) setCostNatures(dbNatures);

    } catch (err) {
      console.error('⚠️ Erreur chargement des données réelles depuis MySQL:', err);
    }
  };

  useEffect(() => {
    if (isBackendConnected && currentUser) {
      loadDatabaseData();
    }
  }, [isBackendConnected, currentUser]);


  const addAuditLog = (action: string, module: string, objectRef: string, newValue?: string, oldValue?: string, justification?: string) => {
    const log: AuditLog = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: currentUser.name,
      role: currentUser.role,
      action,
      module,
      objectRef,
      newValue,
      oldValue,
      justification,
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const createProject = async (newProjectData: Omit<Project, 'id'>, wbsNodes?: WBSNode[]) => {
    const id = newProjectData.code;
    const project: Project = { ...newProjectData, id };
    
    // Détermination du site_id d'imputation (par défaut Site 1 - STBV Bingerville)
    const targetSiteId = activeSiteId !== 'ALL' ? Number(activeSiteId) : (sites[0]?.id || 1);

    setProjects(prev => [project, ...prev]);

    const initialNodes: WBSNode[] = (wbsNodes && wbsNodes.length > 0) ? wbsNodes : [
      {
        id: `WBS-${id}-01`,
        projectId: id,
        code: `${id} / 01`,
        name: '01. TRAVAUX PREPARATOIRES & INSTALLATION BASE-VIE',
        initialBudget: project.initialBudget * 0.2,
        revisedBudget: project.initialBudget * 0.2,
        committed: 0,
        actualCost: 0,
        forecast: project.initialBudget * 0.2,
        eac: project.initialBudget * 0.2,
        progress: 0,
        nature: 'FGC',
        manager: project.manager,
      },
      {
        id: `WBS-${id}-02`,
        projectId: id,
        code: `${id} / 02`,
        name: '02. GENIE CIVIL ET INFRASTRUCTURES PRINCIPALES',
        initialBudget: project.initialBudget * 0.8,
        revisedBudget: project.initialBudget * 0.8,
        committed: 0,
        actualCost: 0,
        forecast: project.initialBudget * 0.8,
        eac: project.initialBudget * 0.8,
        progress: 0,
        nature: 'MAT',
        manager: project.manager,
      },
    ];

    setWbsMap(prev => ({
      ...prev,
      [id]: initialNodes,
      [project.code]: initialNodes,
    }));

    // Créer automatiquement le magasin de chantier rattaché au projet et à son site
    const projectWarehouse: Warehouse = {
      id: `MAG-PROJ-${id}`,
      code: `MAG-${project.code.slice(-6)}`,
      name: `Magasin Chantier ${project.name}`,
      location: project.location || 'Site Chantier',
      manager: project.manager || 'Chef de Chantier / Magasinier',
      projectId: id,
      siteId: targetSiteId,
    };

    setWarehouses(prev => [...prev, projectWarehouse]);

    if (isBackendConnected) {
      try {
        await ApiService.createProject({
          ...project,
          siteId: targetSiteId,
        });
        console.log(`✅ Projet ${id} persisté avec succès dans MySQL (Site ID: ${targetSiteId})`);

        if (initialNodes.length > 0) {
          await ApiService.request(`/projects/${id}/wbs/import`, {
            method: 'POST',
            body: JSON.stringify({
              nodes: initialNodes,
              user: currentUser,
            }),
          });
          console.log(`✅ ${initialNodes.length} nœuds WBS persistés dans MySQL pour le projet ${id}`);
        }

        // Synchronisation immédiate de l'état global depuis MySQL
        await loadDatabaseData();
      } catch (err) {
        console.error(`⚠️ Erreur lors de la persistance MySQL du projet ${id}:`, err);
      }
    }

    addAuditLog('CREATION_PROJET', 'PROJECTS', project.code, `Projet ${project.name} créé avec budget ${project.initialBudget} XOF`);
  };

  const updateProject = async (projectId: string, updatedData: Partial<Project>) => {
    let updatedList: Project[] = [];
    setProjects(prev => {
      updatedList = prev.map(p => (p.id === projectId || p.code === projectId ? { ...p, ...updatedData } : p));
      if (typeof window !== 'undefined') {
        localStorage.setItem('gebat_projects', JSON.stringify(updatedList));
      }
      return updatedList;
    });

    try {
      await ApiService.request(`/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      console.log(`✅ Projet ${projectId} mis à jour dans MySQL`);
    } catch (err) {
      console.error(`⚠️ Erreur mise à jour projet ${projectId}:`, err);
    }
    addAuditLog('MISE_A_JOUR_PROJET', 'PROJETS', projectId, `Projet ${projectId} mis à jour (${Object.keys(updatedData).join(', ')})`);
  };

  const deleteProject = async (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId && p.code !== projectId));
    try {
      await ApiService.request(`/projects/${projectId}`, {
        method: 'DELETE',
      });
      console.log(`✅ Projet ${projectId} supprimé dans MySQL`);
      await loadDatabaseData();
    } catch (err) {
      console.error(`⚠️ Erreur suppression projet ${projectId}:`, err);
    }
    addAuditLog('SUPPRESSION_PROJET', 'PROJETS', projectId, `Projet ${projectId} supprimé`);
  };

  // Helper find WBS Node recursively
  const findWBSNode = (nodes: WBSNode[], targetId: string): WBSNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) return node;
      if (node.children) {
        const found = findWBSNode(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper update WBS Node recursively
  const updateWBSNodeInTree = (nodes: WBSNode[], targetId: string, updateFn: (node: WBSNode) => WBSNode): WBSNode[] => {
    return nodes.map(node => {
      if (node.id === targetId || node.code === targetId) {
        return updateFn(node);
      }
      if (node.children) {
        return {
          ...node,
          children: updateWBSNodeInTree(node.children, targetId, updateFn),
        };
      }
      return node;
    });
  };

  // 1. CREATION DEMANDE D'ACHAT (avec Règle Métier : Budget Révisé - Engagé - Réservé)
  const createDA = (daData: Omit<PurchaseRequest, 'id' | 'code' | 'createdAt' | 'status' | 'budgetCheck' | 'approvalChain'>): PurchaseRequest => {
    const projectWBSList = wbsMap[daData.projectId] || [];
    const targetWBS = findWBSNode(projectWBSList, daData.wbsId);

    const budget = targetWBS ? targetWBS.revisedBudget : 0;
    const committed = targetWBS ? targetWBS.committed : 0;
    const available = budget - committed;
    const isOverBudget = daData.estimatedTotal > available;
    const overBudgetAmount = isOverBudget ? daData.estimatedTotal - available : 0;

    const daId = `DA-2026-${String(purchaseRequests.length + 1).padStart(3, '0')}`;
    const code = daId;

    const newDA: PurchaseRequest = {
      ...daData,
      id: daId,
      code,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'En attente validation',
      budgetCheck: {
        budget,
        committed,
        available,
        isOverBudget,
        overBudgetAmount,
      },
      approvalChain: [
        { role: 'Conducteur de Travaux', status: 'En attente' },
        { role: 'Directeur Projet', status: 'En attente' },
        ...(isOverBudget ? [{ role: 'DAF' as Role, status: 'En attente' as const }] : []),
      ],
    };

    setPurchaseRequests(prev => [newDA, ...prev]);

    if (isOverBudget) {
      // Alerte automatique HORS BUDGET
      const alert: SystemAlert = {
        id: `ALT-DA-${Date.now()}`,
        code: `ALT-BUD-DA`,
        category: 'DA',
        severity: 'Critique',
        projectId: daData.projectId,
        projectName: daData.projectName,
        wbsId: daData.wbsId,
        wbsCode: daData.wbsCode,
        title: `DA HORS BUDGET: ${code}`,
        message: `La DA ${code} de ${daData.estimatedTotal.toLocaleString()} XOF dépasse le disponible budgétaire de ${overBudgetAmount.toLocaleString()} XOF.`,
        observedValue: `${daData.estimatedTotal.toLocaleString()} XOF`,
        thresholdValue: `${available.toLocaleString()} XOF`,
        assignedToRole: 'DAF',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'Actif',
      };
      setAlerts(prev => [alert, ...prev]);
    }

    addAuditLog(
      'CREATION_DEMANDE_ACHAT',
      'PROCUREMENT',
      code,
      `DA créée pour ${daData.itemDescription} (${daData.estimatedTotal} XOF). ${isOverBudget ? 'DÉPASSEMENT BUDGET DETECTE' : 'Dans le budget'}`
    );

    return newDA;
  };

  // 2. MUTAIONS DEMANDE D'ACHAT (DA) ET WORKFLOW
  const updateDAStatus = (daId: string, status: DARequestStatus, comment?: string) => {
    setPurchaseRequests(prev => prev.map(da => {
      if (da.id === daId || da.code === daId) {
        return {
          ...da,
          status,
          approvalChain: da.approvalChain?.map(step => ({
            ...step,
            status: status === 'VALIDEE' || status === 'Approuvé' ? ('Approuvé' as const) : status === 'REFUSEE' || status === 'Refusé' ? ('Refusé' as const) : step.status,
            comment: comment || step.comment
          }))
        };
      }
      return da;
    }));

    addAuditLog(
      `Mise à jour du statut DA (${status})`,
      'Achats & Approvisionnement',
      daId,
      `Nouveau statut: ${status} | Commentaire: ${comment || 'Aucun'}`
    );
  };

  const approveDA = (daId: string, comment?: string) => {
    const da = purchaseRequests.find(d => d.id === daId || d.code === daId);
    if (!da) return;

    const poCode = `BC-GEBAT-2026-${String(purchaseOrders.length + 43).padStart(3, '0')}`;

    setPurchaseRequests(prev =>
      prev.map(d => {
        if (d.id === daId || d.code === daId) {
          return {
            ...d,
            status: 'TRANSFORMEE_EN_BC',
            poNumber: poCode,
            approvalChain: (d.approvalChain || []).map(step => ({
              ...step,
              status: 'Approuvé' as const,
              comment: comment || 'Validé et transformé en BC'
            }))
          };
        }
        return d;
      })
    );

    addAuditLog(
      'APPROBATION_DA_ET_GENERATION_BC',
      'PROCUREMENT',
      da.code,
      `DA approuvée. Génération automatique du Bon de Commande ${poCode}`
    );

    // Mettre à jour l'engagement sur le WBS
    setWbsMap(prev => {
      const tree = prev[da.projectId] || [];
      const updatedTree = updateWBSNodeInTree(tree, da.wbsId, node => {
        const newCommitted = node.committed + da.estimatedTotal;
        const newEAC = Math.max(node.eac, node.actualCost + (newCommitted - node.actualCost));
        return {
          ...node,
          committed: newCommitted,
          eac: newEAC,
        };
      });
      return { ...prev, [da.projectId]: updatedTree };
    });

    // Mettre à jour l'engagement global du projet
    setProjects(prev =>
      prev.map(p => {
        if (p.id === da.projectId) {
          return {
            ...p,
            revisedBudget: p.revisedBudget,
          };
        }
        return p;
      })
    );

    // Générer le Bon de Commande simulé
    const newPO: PurchaseOrder = {
      id: `PO-${Date.now()}`,
      code: poCode,
      daId: da.id,
      supplier: 'FOURNISSEUR BTP AGREE (GEBAT)',
      totalAmount: da.estimatedTotal,
      issueDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Émis',
      items: [
        {
          description: da.itemDescription,
          quantity: da.quantity,
          unitPrice: da.estimatedUnitPrice,
          receivedQty: 0,
        },
      ],
    };
    setPurchaseOrders(prev => [newPO, ...prev]);

    addAuditLog('VALIDATION_DA_ET_GENERATION_BC', 'PROCUREMENT', da.code, `DA Validée par ${currentUser.name}. Bon de commande généré: ${poCode}`);
  };

  // 3. RECEPTION MARCHANDISE ET MISE A JOUR AUTOMATIQUE EN CASCADE
  const processGoodsReceipt = (poId: string, receivedQty: number, receivedBy: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    const da = purchaseRequests.find(d => d.id === po.daId);
    if (!da) return;

    const receiptCode = `REC-2026-${String(receipts.length + 90).padStart(3, '0')}`;
    const totalCost = receivedQty * da.estimatedUnitPrice;

    const receipt: GoodsReceipt = {
      id: `REC-${Date.now()}`,
      code: receiptCode,
      poId: po.id,
      poCode: po.code,
      projectId: da.projectId,
      wbsId: da.wbsId,
      supplier: po.supplier,
      receiptDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      receivedBy,
      items: [
        {
          description: da.itemDescription,
          qtyReceived: receivedQty,
          unitPrice: da.estimatedUnitPrice,
          totalCost,
        },
      ],
      status: 'Validé',
    };

    setReceipts(prev => [receipt, ...prev]);

    // Update PO status
    setPurchaseOrders(prev =>
      prev.map(p => {
        if (p.id === poId) {
          return {
            ...p,
            status: 'Totalement Livré',
            items: p.items.map(item => ({ ...item, receivedQty: receivedQty })),
          };
        }
        return p;
      })
    );

    // Entrée en Stock automatique
    let existingItem = stockItems.find(i => i.name.toLowerCase().includes(da.itemDescription.toLowerCase().split(' ')[0]));
    if (existingItem) {
      setStockItems(prev =>
        prev.map(item => {
          if (item.id === existingItem!.id) {
            const newStock = item.currentStock + receivedQty;
            const newTotalVal = item.totalValue + totalCost;
            return {
              ...item,
              currentStock: newStock,
              totalValue: newTotalVal,
              averageUnitPrice: Math.round(newTotalVal / newStock),
            };
          }
          return item;
        })
      );
    } else {
      existingItem = {
        id: `STK-${Date.now()}`,
        code: `ART-NEW-${Date.now().toString().slice(-4)}`,
        name: da.itemDescription,
        category: 'Matériaux & Fournitures',
        unit: da.unit,
        warehouse: 'Magasin Central Bingerville',
        minThreshold: 50,
        currentStock: receivedQty,
        averageUnitPrice: da.estimatedUnitPrice,
        totalValue: totalCost,
      };
      setStockItems(prev => [...prev, existingItem!]);
    }

    // Mouvement de stock d'entrée
    const mvtIn: StockMovement = {
      id: `MVT-${Date.now()}`,
      code: `MVT-IN-${String(stockMovements.length + 2).padStart(3, '0')}`,
      type: 'Entrée',
      itemId: existingItem.id,
      itemName: existingItem.name,
      quantity: receivedQty,
      unit: da.unit,
      unitPrice: da.estimatedUnitPrice,
      totalCost,
      warehouse: 'Magasin Central Bingerville',
      projectId: da.projectId,
      projectName: da.projectName,
      wbsId: da.wbsId,
      wbsCode: da.wbsCode,
      wbsName: da.wbsName,
      sourceDoc: receiptCode,
      user: receivedBy,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setStockMovements(prev => [mvtIn, ...prev]);

    addAuditLog(
      'RECEPTION_MARCHANDISE',
      'RECEPTION',
      receiptCode,
      `Réception effectuée pour ${po.code}. Quantité: ${receivedQty} ${da.unit}. Entrée en stock et MAJ engagement créées.`
    );
  };

  // 4. CONSOMMATION STOCK VERS WBS ET RECALCUL AUTOMATIQUE DE COST CONTROL
  const consumeStockToWBS = (
    itemId: string,
    quantity: number,
    projectId: string,
    wbsId: string,
    activityName: string,
    user: string
  ) => {
    const item = stockItems.find(i => i.id === itemId);
    if (!item) return;

    if (item.currentStock < quantity) {
      alert(`Stock insuffisant. Disponible: ${item.currentStock} ${item.unit}`);
      return;
    }

    const totalCost = quantity * item.averageUnitPrice;
    const projectWBSList = wbsMap[projectId] || [];
    const targetWBS = findWBSNode(projectWBSList, wbsId);

    // Mouvement de stock de sortie
    const mvtOut: StockMovement = {
      id: `MVT-${Date.now()}`,
      code: `MVT-OUT-${String(stockMovements.length + 10).padStart(3, '0')}`,
      type: 'Sortie',
      itemId: item.id,
      itemName: item.name,
      quantity,
      unit: item.unit,
      unitPrice: item.averageUnitPrice,
      totalCost,
      warehouse: item.warehouse,
      projectId,
      wbsId,
      wbsCode: targetWBS?.code || wbsId,
      wbsName: targetWBS?.name || activityName,
      sourceDoc: `BON-SORTIE-${Date.now().toString().slice(-4)}`,
      user,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setStockMovements(prev => [mvtOut, ...prev]);

    // Mettre à jour la quantité en stock
    setStockItems(prev =>
      prev.map(i => {
        if (i.id === itemId) {
          const newQty = i.currentStock - quantity;
          return {
            ...i,
            currentStock: newQty,
            totalValue: newQty * i.averageUnitPrice,
          };
        }
        return i;
      })
    );

    // Affectation du Coût Réel au WBS et Recalcul Cost Control / EAC
    setWbsMap(prev => {
      const tree = prev[projectId] || [];
      const updatedTree = updateWBSNodeInTree(tree, wbsId, node => {
        const newActualCost = node.actualCost + totalCost;
        const newForecast = Math.max(0, node.revisedBudget - newActualCost);
        const newEAC = newActualCost + newForecast;

        // Dérive si Coût Réel + Forecast > Budget Révisé
        if (newEAC > node.revisedBudget) {
          const over = newEAC - node.revisedBudget;
          const alertItem: SystemAlert = {
            id: `ALT-EAC-${Date.now()}`,
            code: 'ALT-COST-OVERRUN',
            category: 'Budget',
            severity: 'Majored' as any,
            projectId,
            wbsId,
            wbsCode: node.code,
            title: `Dépassement de budget prévisionnel WBS ${node.code}`,
            message: `Consommation de ${item.name} (${totalCost.toLocaleString()} XOF) provoque un dépassement EAC de ${over.toLocaleString()} XOF sur ${node.name}.`,
            observedValue: `${newEAC.toLocaleString()} XOF`,
            thresholdValue: `${node.revisedBudget.toLocaleString()} XOF`,
            assignedToRole: 'Cost Controller',
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            status: 'Actif',
          };
          setAlerts(a => [alertItem, ...a]);
        }

        return {
          ...node,
          actualCost: newActualCost,
          forecast: newForecast,
          eac: newEAC,
        };
      });
      return { ...prev, [projectId]: updatedTree };
    });

    addAuditLog(
      'CONSOMMATION_STOCK_VERS_WBS',
      'STOCK',
      mvtOut.code,
      `Sortie de stock: ${quantity} ${item.unit} de ${item.name} affecté au WBS ${targetWBS?.code || wbsId}. Coût réel imputé: ${totalCost.toLocaleString()} XOF`
    );
  };

  // 5. NOUVEAU MOUVEMENT DE STOCK REACTIF DANS LA BASE DE DONNEES PERSISTANTE
  const createStockMovement = (mvtData: Omit<StockMovement, 'id'>): StockMovement => {
    const id = `MVT-${Date.now()}`;
    const newMvt: StockMovement = {
      ...mvtData,
      id,
    };

    setStockMovements(prev => [newMvt, ...prev]);

    // Si c'est une sortie, mettre à jour la quantité et le coût du WBS dans la base de données
    if (mvtData.type === 'Sortie' && mvtData.itemId) {
      setStockItems(prev =>
        prev.map(i => {
          if (i.id === mvtData.itemId || i.name === mvtData.itemName) {
            const newQty = Math.max(0, i.currentStock - mvtData.quantity);
            return {
              ...i,
              currentStock: newQty,
              totalValue: Math.round(newQty * i.averageUnitPrice),
            };
          }
          return i;
        })
      );

      if (mvtData.projectId && mvtData.wbsCode) {
        setWbsMap(prev => {
          const tree = prev[mvtData.projectId!] || [];
          const updatedTree = updateWBSNodeInTree(tree, mvtData.wbsCode!, node => {
            const addedCost = mvtData.totalCost || (mvtData.quantity * mvtData.unitPrice);
            const newActualCost = (node.actualCost || 0) + addedCost;
            const newForecast = Math.max(0, (node.revisedBudget || node.initialBudget || 0) - newActualCost);
            return {
              ...node,
              actualCost: newActualCost,
              forecast: newForecast,
              eac: newActualCost + newForecast,
            };
          });
          return { ...prev, [mvtData.projectId!]: updatedTree };
        });
      }
    } else if (mvtData.type === 'Entrée' && mvtData.itemId) {
      setStockItems(prev =>
        prev.map(i => {
          if (i.id === mvtData.itemId || i.name === mvtData.itemName) {
            const newQty = i.currentStock + mvtData.quantity;
            return {
              ...i,
              currentStock: newQty,
              totalValue: Math.round(newQty * i.averageUnitPrice),
            };
          }
          return i;
        })
      );
    } else if (mvtData.type === 'Réservation' && mvtData.itemId) {
      setStockItems(prev =>
        prev.map(i => {
          if (i.id === mvtData.itemId || i.name === mvtData.itemName) {
            const newReserved = (i.reservedStock || 0) + mvtData.quantity;
            return {
              ...i,
              reservedStock: newReserved,
            };
          }
          return i;
        })
      );
    } else if ((mvtData.type === 'Ajustement +' || mvtData.type === 'Ajustement -') && mvtData.itemId) {
      setStockItems(prev =>
        prev.map(i => {
          if (i.id === mvtData.itemId || i.name === mvtData.itemName) {
            const diff = mvtData.type === 'Ajustement +' ? mvtData.quantity : -mvtData.quantity;
            const newQty = Math.max(0, i.currentStock + diff);
            return {
              ...i,
              currentStock: newQty,
              totalValue: Math.round(newQty * i.averageUnitPrice),
            };
          }
          return i;
        })
      );
    }

    addAuditLog(
      `MOUVEMENT_STOCK_${mvtData.type.toUpperCase()}`,
      'STOCK_DATABASE',
      newMvt.code,
      `Flux ${mvtData.type} enregistre: ${mvtData.quantity} ${mvtData.unit} de ${mvtData.itemName} au depot ${mvtData.warehouse}`
    );

    return newMvt;
  };

  const createDailyReport = (reportData: Omit<DailyReport, 'id' | 'code' | 'productivityRate'>) => {
    const targetProductivity = 100;
    const rate = Math.round((reportData.realizedQty / reportData.plannedQty) * 100);
    const reportCode = `CR-${reportData.date}-${String(dailyReports.length + 1).padStart(2, '0')}`;

    const report: DailyReport = {
      ...reportData,
      id: `CR-${Date.now()}`,
      code: reportCode,
      productivityRate: rate,
    };

    setDailyReports(prev => [report, ...prev]);

    // 1. Synchronisation du taux d'avancement du projet à partir des données de production du terrain (découplée de setDailyReports)
    const targetProject = projects.find(p => p.id === reportData.projectId || p.code === reportData.projectId);
    if (targetProject) {
      const projectReports = [report, ...dailyReports].filter(r =>
        r.projectId === reportData.projectId ||
        r.projectId === reportData.wbsCode
      );

      if (projectReports.length > 0) {
        const totalValueProduced = projectReports.reduce((s, r) => s + ((r.realizedQty || 0) * (r.pu || 5000) || (r.totalCost || 0)), 0);
        const totalBudget = targetProject.revisedBudget || targetProject.contractAmount || 5000000000;

        const calcProgress = totalBudget > 0
          ? Math.min(100, Math.round((totalValueProduced / totalBudget) * 100))
          : Math.min(100, Math.round((projectReports.reduce((s, r) => s + (r.realizedQty || 0), 0) / (projectReports.reduce((s, r) => s + (r.plannedQty || 0), 0) || 1)) * 100));

        const newProjectProgress = Math.max(1, calcProgress || 15);

        setProjects(pList =>
          pList.map(p => {
            if (p.id === targetProject.id || p.code === targetProject.code) {
              return { ...p, progress: newProjectProgress };
            }
            return p;
          })
        );
      }
    }

    // 2. Synchronisation de l'avancement % et des métrés exécutés sur le nœud WBS cible dans wbsMap (découplée de setDailyReports)
    const targetWbsCode = reportData.wbsCode || reportData.wbsId;
    if (targetWbsCode) {
      setWbsMap(prevMap => {
        const nextMap = { ...prevMap };
        Object.keys(nextMap).forEach(key => {
          const tree = nextMap[key];
          if (Array.isArray(tree)) {
            nextMap[key] = updateWBSNodeInTree(tree, targetWbsCode, node => {
              const planned = Number(node.plannedQty || node.contractQty || reportData.plannedQty || 1);
              const currentRealized = Number(node.actualQty || 0) + Number(reportData.realizedQty || 0);
              const newProgress = planned > 0 ? Math.min(100, Math.round((currentRealized / planned) * 100)) : 50;
              return {
                ...node,
                actualQty: currentRealized,
                progress: newProgress
              };
            });
          }
        });
        return nextMap;
      });
    }

    // 3. Causes d'arrêt & Productivité faible ➔ Génération d'Alertes Critiques
    if (rate < 80 || (reportData.nonProductiveHours && reportData.nonProductiveHours > 0)) {
      const alertItem: SystemAlert = {
        id: `ALT-PROD-${Date.now()}`,
        code: rate < 80 ? 'ALT-PROD-LOW' : 'ALT-PROD-STOP',
        category: 'Production',
        severity: rate < 50 || (reportData.nonProductiveHours || 0) >= 4 ? 'Élevée' : 'Moyenne',
        projectId: reportData.projectId,
        wbsId: reportData.wbsId,
        wbsCode: reportData.wbsCode,
        title: reportData.nonProductiveHours && reportData.nonProductiveHours > 0
          ? `Arrêt de chantier (${reportData.nonProductiveHours}h non productives)`
          : `Productivité faible observée le ${reportData.date}`,
        message: `Rapport ${reportCode}: Taux ${rate}% (Objectif: 100%). Heures arrêt: ${reportData.nonProductiveHours || 0}h. Notes: ${reportData.notes || 'Rien à signaler'}.`,
        observedValue: `${rate}%`,
        thresholdValue: '80%',
        assignedToRole: 'Conducteur de Travaux',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'Actif',
      };
      setAlerts(prev => [alertItem, ...prev]);
    }

    if (isBackendConnected) {
      ApiService.request('/daily_reports', {
        method: 'POST',
        body: JSON.stringify({
          ...report,
          user: currentUser,
        }),
      }).catch(err => console.warn('⚠️ Imp. sauvegarde rapport MySQL:', err));
    }

    // 4. Traçabilité Observations & Photos ➔ Audit Trail & Historique
    const logDetails = `Rapport ${reportCode} [${reportData.activityName || reportData.wbsCode}]: Qte ${reportData.realizedQty} ${reportData.unit || 'U'} (Taux ${rate}%). Personnel: ${reportData.workersCount || 0} p., Engins: ${reportData.equipmentCount || 0} u., Météo: ${reportData.weather || 'NC'}. Obs: ${reportData.notes || 'R.A.S.'}`;
    addAuditLog('CREATION_RAPPORT_JOURNALIER', 'PRODUCTION', reportCode, logDetails);
  };

  const importDailyReportsBulk = (newReports: Omit<DailyReport, 'id' | 'createdAt' | 'reportCode'>[]) => {
    if (!newReports || newReports.length === 0) return;

    const formattedReports: DailyReport[] = newReports.map((repData, idx) => {
      const reportCode = `REP-PROD-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}-${idx + 1}`;
      const planned = Number(repData.plannedQty || 100);
      const realized = Number(repData.realizedQty || 0);
      const rate = planned > 0 ? Math.round((realized / planned) * 100) : 100;

      return {
        ...repData,
        id: `REP-${Date.now()}-${idx}`,
        reportCode,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        productivityRate: rate
      };
    });

    setDailyReports(prev => [...formattedReports, ...prev]);

    // Synchronisation découplée de l'avancement global du projet
    const projectId = newReports[0]?.projectId || newReports[0]?.project_id;
    if (projectId) {
      const targetProject = projects.find(p => p.id === projectId || p.code === projectId);
      if (targetProject) {
        const allReports = [...formattedReports, ...dailyReports];
        const projectReports = allReports.filter(r => r.projectId === projectId || r.projectId === targetProject.code);
        const totalValueProduced = projectReports.reduce((s, r) => s + ((r.realizedQty || 0) * (r.pu || 5000) || (r.totalCost || 0)), 0);
        const contractAmount = targetProject.contractAmount || targetProject.revisedBudget || 5000000000;
        const calcProgress = contractAmount > 0 ? Math.min(100, parseFloat(((totalValueProduced / contractAmount) * 100).toFixed(1))) : 0;

        setProjects(pList => pList.map(p => p.id === targetProject.id ? { ...p, progress: calcProgress } : p));
      }
    }

    if (isBackendConnected) {
      formattedReports.forEach(report => {
        ApiService.request('/daily_reports', {
          method: 'POST',
          body: JSON.stringify({ ...report, user: currentUser }),
        }).catch(err => console.warn('⚠️ Imp. sauvegarde bulk rapport MySQL:', err));
      });
    }
  };

  const updateProjectWBS = async (projectId: string, newNodes: WBSNode[]) => {
    const targetProject = projects.find(p => p.id === projectId || p.code === projectId);
    const targetId = targetProject ? targetProject.id : projectId;
    const targetCode = targetProject ? targetProject.code : projectId;

    setWbsMap(prev => {
      const updated = {
        ...prev,
        [targetId]: newNodes,
        [targetCode]: newNodes
      };
      safeSaveToStorage('gebat_wbs', updated);
      return updated;
    });

    const sumWbsContractAmount = newNodes.reduce((sum, n) => {
      const nodeContract = Number(n.contractAmount || (Number(n.contractUnitPrice || 0) * Number(n.plannedQty || n.contractQty || 0)));
      return sum + nodeContract;
    }, 0);
    const sumWbsBudget = newNodes.reduce((sum, n) => sum + Number(n.revisedBudget || n.budgetDs || n.initialBudget || 0), 0);

    setProjects(prev => {
      const updatedProjects = prev.map(p => {
        if (p.id === projectId || p.code === projectId) {
          const newContract = sumWbsContractAmount > 0 ? sumWbsContractAmount : (p.contractAmount || Math.round(sumWbsBudget * 1.25));
          const newRev = sumWbsBudget > 0 ? sumWbsBudget : (p.revisedBudget || Math.round(newContract * 0.80));
          return {
            ...p,
            contractAmount: newContract,
            contract_amount: newContract,
            revisedBudget: newRev,
            revised_budget: newRev,
            initialBudget: p.initialBudget || newRev,
            initial_budget: p.initialBudget || newRev,
          };
        }
        return p;
      });
      safeSaveToStorage('gebat_projects', updatedProjects);
      return updatedProjects;
    });

    if (isBackendConnected) {
      try {
        await ApiService.request(`/projects/${targetId}/wbs/import`, {
          method: 'POST',
          body: JSON.stringify({
            nodes: newNodes,
            user: currentUser,
          }),
        });
        console.log(`✅ ${newNodes.length} nœuds WBS persistés avec succès dans MySQL pour ${targetId}`);
      } catch (err) {
        console.error(`⚠️ Erreur persistance WBS MySQL:`, err);
      }
    }

    addAuditLog('IMPORT_WBS_EXCEL', 'WBS', targetCode, `WBS du projet ${targetCode} mis à jour via importation Excel (${newNodes.length} nœuds). Budget révisé calculé : ${sumWbsBudget.toLocaleString()} FCFA.`);
  };

  const addUser = (newUser: User) => {
    setUsers(prev => {
      const updated = [newUser, ...prev];
      localStorage.setItem('gebat_users', JSON.stringify(updated));
      return updated;
    });
    ApiService.createUser(newUser).catch(err => console.error('Error saving user to DB:', err));
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => {
      const updated = prev.map(u => u.id === updatedUser.id ? updatedUser : u);
      localStorage.setItem('gebat_users', JSON.stringify(updated));
      return updated;
    });
    ApiService.updateUser(updatedUser.id, updatedUser).catch(err => console.error('Error updating user in DB:', err));
    addAuditLog('MODIFICATION_UTILISATEUR', 'ADMINISTRATION', updatedUser.email, `Fiche utilisateur ${updatedUser.name} mise à jour (Rôle: ${updatedUser.role}, Statut: ${updatedUser.status || 'ACTIF'}).`);
  };

  const deleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    setUsers(prev => {
      const updated = prev.filter(u => u.id !== userId);
      localStorage.setItem('gebat_users', JSON.stringify(updated));
      return updated;
    });
    ApiService.deleteUser(userId).catch(err => console.error('Error deleting user from DB:', err));
    if (target) {
      addAuditLog('SUPPRESSION_UTILISATEUR', 'ADMINISTRATION', target.email, `Utilisateur ${target.name} [${target.employeeCode || target.id}] supprimé.`);
    }
  };

  const resolveAlert = (alertId: string, comment?: string) => {
    setAlerts(prev => {
      const updated = prev.map(a => a.id === alertId ? { ...a, status: 'Résolu' as const } : a);
      localStorage.setItem('gebat_alerts', JSON.stringify(updated));
      return updated;
    });
    addAuditLog(
      'ACQUITTEMENT_ALERTE',
      'ALERTES_RISQUES',
      alertId,
      `Alerte ${alertId} résolue. Justification: ${comment || 'Acquittée en ligne par l\'utilisateur'}`
    );
  };

  const addAlert = (alertData: Omit<SystemAlert, 'id' | 'timestamp'>) => {
    const newAlert: SystemAlert = {
      ...alertData,
      id: `ALT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'Actif',
    };
    setAlerts(prev => {
      const updated = [newAlert, ...prev];
      localStorage.setItem('gebat_alerts', JSON.stringify(updated));
      return updated;
    });
    addAuditLog('CREATION_ALERTE', 'ALERTES_RISQUES', newAlert.id, `Alerte "${newAlert.title}" créée (${newAlert.severity}).`);
  };

  const addCostNature = (natureData: Omit<CostNatureConfig, 'id'>) => {
    const newNat: CostNatureConfig = {
      ...natureData,
      id: `nat-${Date.now()}`,
    };
    setCostNatures(prev => [...prev, newNat]);
    addAuditLog('CREATION_NATURE_COUT', 'PARAMETRES', newNat.code, `Ajout de la nature de coût ${newNat.code} — ${newNat.label}`);
  };

  const updateCostNature = (updatedNature: CostNatureConfig) => {
    setCostNatures(prev => prev.map(n => n.id === updatedNature.id ? updatedNature : n));
    addAuditLog('MODIFICATION_NATURE_COUT', 'PARAMETRES', updatedNature.code, `Mise à jour de la nature ${updatedNature.code}`);
  };

  const toggleCostNatureStatus = (id: string) => {
    setCostNatures(prev => prev.map(n => {
      if (n.id === id) {
        const nextStatus = n.status === 'Actif' ? 'Inactif' as const : 'Actif' as const;
        addAuditLog('STATUT_NATURE_COUT', 'PARAMETRES', n.code, `Statut passe à ${nextStatus}`);
        return { ...n, status: nextStatus };
      }
      return n;
    }));
  };

  // Filtrage automatique par Site Actif / Projet Sélectionné
  const filteredProjects = projects.filter(p => {
    if (!activeSiteId || activeSiteId === 'ALL') return true;
    const strSite = String(activeSiteId);
    return String(p.id) === strSite || 
           String(p.code) === strSite || 
           String(p.siteId) === strSite || 
           String((p as any).site_id) === strSite ||
           isProjectMatch(p.id, strSite) ||
           isProjectMatch(p.code, strSite);
  });

  const allowedProjectIds = filteredProjects.map(p => p.id);

  const filteredPurchaseRequests = purchaseRequests.filter(da => {
    if (activeSiteId === 'ALL') return true;
    return allowedProjectIds.includes(da.projectId);
  });

  const filteredPurchaseOrders = purchaseOrders.filter(po => {
    if (activeSiteId === 'ALL') return true;
    const da = purchaseRequests.find(d => d.id === po.daId);
    return da ? allowedProjectIds.includes(da.projectId) : false;
  });

  const filteredReceipts = receipts.filter(rec => {
    if (activeSiteId === 'ALL') return true;
    return allowedProjectIds.includes(rec.projectId);
  });

  const filteredStockItems = stockItems.filter(item => {
    if (activeSiteId === 'ALL') return true;
    return String(item.siteId) === String(activeSiteId) || String((item as any).site_id) === String(activeSiteId);
  });

  const filteredDailyReports = dailyReports.filter(rep => {
    if (activeSiteId === 'ALL') return true;
    return allowedProjectIds.includes(rep.projectId);
  });

  const filteredAlerts = alerts.filter(a => {
    if (activeSiteId === 'ALL') return true;
    return a.projectId ? allowedProjectIds.includes(a.projectId) : true;
  });

  return (
    <AppStateContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        sites,
        activeSiteId,
        setActiveSiteId,
        projects: projects,
        wbsMap,
        stockItems: filteredStockItems,
        warehouses,
        purchaseRequests: filteredPurchaseRequests,
        purchaseOrders: filteredPurchaseOrders,
        receipts: filteredReceipts,
        stockMovements,
        dailyReports: filteredDailyReports,
        alerts: filteredAlerts,
        auditLogs,
        costNatures,
        isBackendConnected,
        backendError,
        retryBackendConnection: checkBackendConnection,
        theme,
        toggleTheme,
        createProject,
        updateProject,
        deleteProject,
        createDA,
        updateDAStatus,
        approveDA,
        processGoodsReceipt,
        consumeStockToWBS,
        createDailyReport,
        importDailyReportsBulk,
        updateProjectWBS,
        addUser,
        updateUser,
        deleteUser,
        addCostNature,
        updateCostNature,
        toggleCostNatureStatus,
        resolveAlert,
        addAlert,
        addAuditLog,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
