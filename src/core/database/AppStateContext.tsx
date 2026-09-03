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
  Site,
  ValidationTask,
  ValidationTaskStatus
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
  validationTasks: ValidationTask[];
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
  updateDailyReportStatus: (reportId: string, status: any, comment?: string) => void;
  createValidationTask: (taskData: Omit<ValidationTask, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateValidationTaskStatus: (taskIdOrReportId: string, status: ValidationTaskStatus, comment?: string) => void;
  requestLockedReportCorrection: (reportId: string, field: string, oldValue: any, newValue: any, reason: string) => void;
  approveLockedReportCorrection: (reportId: string, requestId: string) => void;
  importDailyReportsBulk: (reports: Omit<DailyReport, 'id' | 'createdAt' | 'reportCode'>[]) => void;
  updateProjectWBS: (projectId: string, newNodes: WBSNode[]) => Promise<void>;
  createDA: (daData: Omit<PurchaseRequest, 'id' | 'code' | 'createdAt' | 'status' | 'budgetCheck' | 'approvalChain'>) => PurchaseRequest;
  updateDAStatus: (daId: string, status: any, comment?: string) => void;
  approveDA: (daId: string, comment?: string) => void;
  processGoodsReceipt: (poId: string, receivedQty: number, receivedBy: string) => void;
  consumeStockToWBS: (itemId: string, quantity: number, projectId: string, wbsId: string, activityName: string, user: string) => void;
  createStockMovement: (mvtData: Omit<StockMovement, 'id'>) => StockMovement;
  addStockItem: (itemData: Omit<StockItem, 'id'>) => StockItem;
  updateStockItem: (updatedItem: StockItem) => void;
  deleteStockItem: (itemId: string) => void;
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

    // Écouteur synchrone d'évènement universel pour synchroniser en temps réel multi-onglets / composants / sessions
    const syncStateFromStorage = () => {
      try {
        const savedReports = localStorage.getItem('gebat_daily_reports');
        if (savedReports) {
          const parsed = JSON.parse(savedReports);
          if (Array.isArray(parsed)) setDailyReports(parsed);
        }
        const savedTasks = localStorage.getItem('gebat_validation_tasks');
        if (savedTasks) {
          const parsedTasks = JSON.parse(savedTasks);
          if (Array.isArray(parsedTasks)) setValidationTasks(parsedTasks);
        }
        const savedWbs = localStorage.getItem('gebat_wbs');
        if (savedWbs) {
          const parsedWbs = JSON.parse(savedWbs);
          if (parsedWbs) setWbsMap(parsedWbs);
        }
        const savedDA = localStorage.getItem('gebat_purchase_requests');
        if (savedDA) {
          const parsedDA = JSON.parse(savedDA);
          if (Array.isArray(parsedDA)) setPurchaseRequests(parsedDA);
        }
      } catch (err) {}
    };

    const handleStorageChange = (e: StorageEvent) => {
      syncStateFromStorage();
    };

    const handleCustomStateUpdate = (e: Event) => {
      syncStateFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('gebat_state_updated', handleCustomStateUpdate);

    let bcChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bcChannel = new BroadcastChannel('gebat_360_channel');
        bcChannel.onmessage = () => syncStateFromStorage();
      } catch (e) {}
    }

    // Intervalle de synchronisation synchrone continu (Heartbeat 1s) pour garantir l'identité absolue inter-onglets/fenêtres/profils
    const syncInterval = setInterval(syncStateFromStorage, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gebat_state_updated', handleCustomStateUpdate);
      if (bcChannel) {
        try { bcChannel.close(); } catch (e) {}
      }
      clearInterval(syncInterval);
    };
  }, []);

  // Purge automatique des données obsolètes enregistrées dans local/IndexedDB (DATA_VERSION v381 - Fix LoginPage Form Submission State Persistence Stream)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const DATA_VERSION = 'v2026_09_03_fix_login_form_submission_persistence_v381';
      const savedVer = localStorage.getItem('gebat_data_version');
      if (savedVer !== DATA_VERSION) {
        localStorage.removeItem('gebat_daily_reports');
        localStorage.removeItem('gebat_user_created_reports_backup');
        localStorage.removeItem('gebat_submitted_reports_permanent_lock');
        localStorage.removeItem('gebat_wbs');
        localStorage.removeItem('gebat_projects');
        localStorage.removeItem('gebat_stock_items');
        localStorage.removeItem('gebat_stock_movements');
        localStorage.removeItem('gebat_warehouses');
        localStorage.setItem('gebat_data_version', DATA_VERSION);
      }
    }
  }, []);

  const [currentUser, setCurrentUserRaw] = useState<User>(() => {
    if (typeof window !== 'undefined') {
      // DÉTECTION ET CONNEXION AUTOMATIQUE SSO (Single Sign-On depuis pilot360.gebat-sa.com)
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const ssoUserParam = urlParams.get('sso_user') || urlParams.get('user_email') || urlParams.get('email');
        const ssoNameParam = urlParams.get('sso_name') || urlParams.get('name') || urlParams.get('display_name');
        const ssoRoleParam = urlParams.get('sso_role') || urlParams.get('role');
        const ssoTokenParam = urlParams.get('sso_token');

        let targetEmail = '';
        if (ssoUserParam) {
          targetEmail = decodeURIComponent(ssoUserParam).trim();
        } else if (ssoTokenParam) {
          try {
            const decoded = JSON.parse(atob(decodeURIComponent(ssoTokenParam)));
            if (decoded && decoded.email) targetEmail = decoded.email;
          } catch (e) {}
        }

        const hasSso = urlParams.has('sso_user') || urlParams.has('user_email') || urlParams.has('email') || urlParams.has('sso_token') || urlParams.has('sso');

        if (hasSso) {
          const savedUsersStr = localStorage.getItem('gebat_users');
          const allKnownUsers: User[] = (savedUsersStr && JSON.parse(savedUsersStr).length > 0) ? JSON.parse(savedUsersStr) : INITIAL_USERS;
          const cleanTarget = targetEmail.toLowerCase();
          const targetPrefix = cleanTarget.split('@')[0];
          
          let matchedUser: User | undefined = cleanTarget ? (
            allKnownUsers.find(u => (u.email || '').toLowerCase() === cleanTarget) ||
            allKnownUsers.find(u => (u.email || '').toLowerCase().split('@')[0] === targetPrefix) ||
            INITIAL_USERS.find(u => (u.email || '').toLowerCase() === cleanTarget)
          ) : undefined;

          // Extraire le nom complet et le rôle transmis depuis pilot360
          const formattedName = ssoNameParam ? decodeURIComponent(ssoNameParam).trim() : '';
          const formattedRole = ssoRoleParam ? decodeURIComponent(ssoRoleParam).trim() : '';

          if (matchedUser) {
            matchedUser = {
              ...matchedUser,
              name: formattedName || matchedUser.name,
              role: (formattedRole as any) || matchedUser.role,
              avatar: formattedName ? formattedName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : matchedUser.avatar
            };
          } else if (cleanTarget || formattedName) {
            // Création automatique d'un profil dynamique d'après le compte pilot360
            const displayName = formattedName || cleanTarget.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());
            const userAvatar = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            matchedUser = {
              id: `USR-SSO-${Date.now()}`,
              name: displayName,
              email: cleanTarget || 'compte.groupe@gebat-sa.com',
              role: (formattedRole as any) || 'Super Admin',
              avatar: userAvatar,
              company: 'GEBAT SA',
              status: 'ACTIF'
            };
          } else {
            matchedUser = allKnownUsers[0] || INITIAL_USERS[0];
          }

          if (matchedUser) {
            localStorage.setItem('gebat_current_user', JSON.stringify(matchedUser));
            
            // Garantir que le profil connecté est bien présent dans l'annuaire des utilisateurs
            setUsers(prev => {
              const exists = prev.some(u => u.id === matchedUser!.id || u.email?.toLowerCase() === matchedUser!.email?.toLowerCase());
              if (!exists) {
                const nextUsers = [matchedUser!, ...prev];
                localStorage.setItem('gebat_users', JSON.stringify(nextUsers));
                return nextUsers;
              }
              return prev.map(u => (u.id === matchedUser!.id || u.email?.toLowerCase() === matchedUser!.email?.toLowerCase()) ? { ...u, ...matchedUser } : u);
            });

            // Nettoyage esthétique des paramètres SSO de l'URL sans rechargement
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('🔑 [SSO DYNAMIC SUCCESS] Profil connecté:', matchedUser.name, '| Rôle:', matchedUser.role, '| Email:', matchedUser.email);
            return matchedUser;
          }
        }
      } catch (err) {
        console.warn('⚠️ Erreur traitement SSO URL:', err);
      }

      const saved = localStorage.getItem('gebat_current_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email) return parsed;
        } catch (e) {}
      }
    }
    return null as unknown as User;
  });

  const setCurrentUser = (user: User) => {
    setCurrentUserRaw(user);
    if (typeof window !== 'undefined') {
      try {
        if (user) {
          localStorage.setItem('gebat_current_user', JSON.stringify(user));
        } else {
          localStorage.removeItem('gebat_current_user');
        }
        window.dispatchEvent(new Event('gebat_state_updated'));
      } catch (e) {}
    }
  };

  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gebat_users');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return INITIAL_USERS;
  });

  useEffect(() => {
    async function loadDbUsers() {
      try {
        const dbUsers = await ApiService.getUsers();
        if (Array.isArray(dbUsers) && dbUsers.length > 0) {
          setUsers(prevUsers => {
            const merged = dbUsers.map((dbU: any) => {
              const existing = prevUsers.find(u => u.id === dbU.id || u.email === dbU.email);
              return {
                ...dbU,
                photoUrl: dbU.photoUrl || existing?.photoUrl || (dbU.email === currentUser?.email ? currentUser?.photoUrl : undefined)
              };
            });
            localStorage.setItem('gebat_users', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.warn('⚠️ Impossible de charger la liste des utilisateurs depuis MySQL:', err);
      }
    }
    loadDbUsers();
  }, [isBackendConnected, currentUser]);

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

  // Synchronisation globale et complète en temps réel depuis la base de données MySQL (Railway)
  useEffect(() => {
    async function loadDbData() {
      try {
        const [dbProjects, dbReports, dbDA, dbStock, dbUsers] = await Promise.all([
          ApiService.getProjects(),
          ApiService.getDailyReports(),
          ApiService.getPurchaseRequests(),
          ApiService.getStockItems(),
          ApiService.getUsers()
        ]);

        if (Array.isArray(dbProjects) && dbProjects.length > 0) {
          setProjects(dbProjects);
          localStorage.setItem('gebat_projects', JSON.stringify(dbProjects));
        }
        if (Array.isArray(dbReports) && dbReports.length > 0) {
          setDailyReports(dbReports);
          localStorage.setItem('gebat_daily_reports', JSON.stringify(dbReports));
        }
        if (Array.isArray(dbDA) && dbDA.length > 0) {
          setPurchaseRequests(dbDA);
          localStorage.setItem('gebat_purchase_requests', JSON.stringify(dbDA));
        }
        if (Array.isArray(dbStock) && dbStock.length > 0) {
          setStockItems(dbStock);
          localStorage.setItem('gebat_stock_items', JSON.stringify(dbStock));
        }
        if (Array.isArray(dbUsers) && dbUsers.length > 0) {
          setUsers(dbUsers);
          localStorage.setItem('gebat_users', JSON.stringify(dbUsers));
        }
      } catch (err) {
        console.warn('⚠️ Erreur de synchronisation globale MySQL:', err);
      }
    }

    loadDbData();
    // Synchronisation en tâche de fond ultra-rapide toutes les 5 secondes pour garantir l'uniformité instantanée des données sur tous les profils
    const interval = setInterval(loadDbData, 5000);
    return () => clearInterval(interval);
  }, [isBackendConnected, currentUser]);
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
    const backupRaw = localStorage.getItem('gebat_user_created_reports_backup');
    const permLockRaw = localStorage.getItem('gebat_submitted_reports_permanent_lock');
    let loadedReports: DailyReport[] = [];

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedReports = parsed;
        }
      } catch (e) {}
    }

    if (loadedReports.length === 0 && backupRaw) {
      try {
        const backupParsed = JSON.parse(backupRaw);
        if (Array.isArray(backupParsed) && backupParsed.length > 0) {
          loadedReports = backupParsed;
        }
      } catch (e) {}
    }

    const testSongonReport: DailyReport = {
      id: 'REP-TEST-SONGON-2026-08-31',
      code: 'REP-TEST-SONGON-2026-08-31',
      projectId: 'CIV-2026-ASS-SON-001',
      date: '31/08/2026',
      wbsCode: '03.02.004',
      activityName: 'Béton armé pour voiles et dalles de la station de Songon',
      unit: 'm³',
      plannedQty: 50,
      targetQty: 50,
      realizedQty: 50,
      productivityRate: 100,
      status: 'Validé',
      isAccounted: true,
      accountedAt: '31/08/2026 18:20',
      submittedBy: 'Kouassi Jean',
      submittedAt: '31/08/2026 14:00',
      validatedBy: 'SEA Alphonse (Directeur Projet)',
      validatedAt: '31/08/2026 18:20',
      generalComment: 'Validation officielle de test par le Directeur de Projet. Conforme au DQE.',
      weather: 'Ensoleillé',
      temperature: '31°C',
      workShift: 'Jour',
      locationZone: 'Zone Ouvrage Anoxie',
      teamLeader: 'Kouassi Jean',
      consummations: [
        { article: 'Ciment CPJ 42.5', itemCode: 'CIMENT_CPJ42.5', qty: 25, unit: 'sacs' }
      ],
      historyLogs: [
        { timestamp: '31/08/2026 18:20', user: 'SEA Alphonse', role: 'Directeur Projet', action: "Passage au statut 'Validé'", comment: 'Validation officielle SSOT' },
        { timestamp: '31/08/2026 14:00', user: 'Kouassi Jean', role: 'Chef de Chantier', action: "Passage au statut 'Soumis'", comment: 'Demande de validation' }
      ]
    };

    const loadedIds = new Set(loadedReports.map(r => r.id || r.code));
    const listWithoutDup = loadedReports.filter(r => r.id !== testSongonReport.id && r.code !== testSongonReport.code);
    const historicalRest = INITIAL_DAILY_REPORTS.filter(r => !loadedIds.has(r.id) && !loadedIds.has(r.code));
    return [testSongonReport, ...listWithoutDup, ...historicalRest];
  });

  useEffect(() => {
    if (dailyReports.length > 0) {
      safeSaveToStorage('gebat_daily_reports', dailyReports);
      const userCreated = dailyReports.filter(r => !r.id.startsWith('REP-EXCEL-') && !r.id.startsWith('REAL-RPT-'));
      if (userCreated.length > 0) {
        safeSaveToStorage('gebat_user_created_reports_backup', userCreated);
        safeSaveToStorage('gebat_submitted_reports_permanent_lock', userCreated);
      }
    }
  }, [dailyReports]);

  // Synchronisation dynamique automatique universelle SSOT de l'avancement WBS & Projet au chargement et lors de toute modification de rapports
  useEffect(() => {
    if (!dailyReports || dailyReports.length === 0 || !projects || projects.length === 0) return;

    const validReports = dailyReports.filter(r => {
      const s = (r.status || '').toUpperCase();
      return s.includes('VALID') || s.includes('VERROU') || s.includes('APPROVED') || s.includes('CLOSED');
    });

    if (validReports.length > 0) {
      let calculatedNextWbsMap: Record<string, WBSNode[]> = {};

      setWbsMap(prevMap => {
        const nextMap = { ...prevMap };

        Object.keys(nextMap).forEach(pKey => {
          const tree = nextMap[pKey];
          if (!Array.isArray(tree) || tree.length === 0) return;

          const updateNodeDeterministic = (nodes: WBSNode[]): WBSNode[] => {
            return nodes.map(node => {
              const nodeReports = validReports.filter(r => {
                const rProj = String(r.projectId || r.project_id || '').toUpperCase();
                const pMatch = rProj.includes(pKey.toUpperCase()) || pKey.toUpperCase().includes(rProj) || (pKey.includes('SON') && rProj.includes('SON')) || (pKey.includes('BEN') && rProj.includes('BEN'));
                if (!pMatch) return false;
                const rWbs = String(r.wbsCode || r.wbsId || '').toUpperCase();
                const nCode = String(node.code || node.id || '').toUpperCase();
                return rWbs === nCode || (rWbs && nCode && (rWbs.includes(nCode) || nCode.includes(rWbs)));
              });

              const totalRealizedQty = nodeReports.reduce((sum, r) => sum + Number(r.realizedQty || 0), 0);

              let updatedChildren: WBSNode[] | undefined = undefined;
              if (node.children && node.children.length > 0) {
                updatedChildren = updateNodeDeterministic(node.children);
              }

              const targetP = Number(node.plannedQty || node.contractQty || node.revisedBudget || 1);
              let nodeProgress = node.progress || 0;

              if (updatedChildren && updatedChildren.length > 0) {
                const totalChildBudget = updatedChildren.reduce((acc, c) => acc + Number(c.contractAmount || c.initialBudget || 1), 0);
                const totalChildDone = updatedChildren.reduce((acc, c) => acc + (Number(c.contractAmount || c.initialBudget || 1) * ((c.progress || 0) / 100)), 0);
                nodeProgress = totalChildBudget > 0 ? Math.min(100, Number(((totalChildDone / totalChildBudget) * 100).toFixed(1))) : node.progress;
              } else if (nodeReports.length > 0) {
                nodeProgress = targetP > 0 ? Math.min(100, Number(((totalRealizedQty / targetP) * 100).toFixed(1))) : node.progress;
              }

              return {
                ...node,
                actualQty: totalRealizedQty > 0 ? totalRealizedQty : node.actualQty || node.realizedQty || 0,
                realizedQty: totalRealizedQty > 0 ? totalRealizedQty : node.realizedQty || node.actualQty || 0,
                progress: nodeProgress,
                children: updatedChildren
              };
            });
          };

          nextMap[pKey] = updateNodeDeterministic(tree);
        });

        calculatedNextWbsMap = nextMap;
        return nextMap;
      });

      setProjects(prevProjects => {
        let changed = false;
        const updated = prevProjects.map(proj => {
          const projTree = calculatedNextWbsMap[proj.id] || calculatedNextWbsMap[proj.code] || wbsMap[proj.id] || wbsMap[proj.code] || [];
          if (projTree.length > 0) {
            const getLeaves = (arr: any[]): any[] => {
              let res: any[] = [];
              arr.forEach(n => {
                if (!n.children || n.children.length === 0) {
                  res.push(n);
                } else {
                  res = res.concat(getLeaves(n.children));
                }
              });
              return res;
            };
            const leafNodes = getLeaves(projTree);
            const totalPlanned = leafNodes.reduce((acc, n) => {
              const budget = Number(n.revisedBudget || n.contractAmount || n.initialBudget || n.totalPrice || (Number(n.plannedQty || 0) * Number(n.pu || 5000)) || 1);
              return acc + budget;
            }, 0);
            const totalDone = leafNodes.reduce((acc, n) => {
              const budget = Number(n.revisedBudget || n.contractAmount || n.initialBudget || n.totalPrice || (Number(n.plannedQty || 0) * Number(n.pu || 5000)) || 1);
              const prog = Number(n.progress || 0);
              return acc + (budget * (prog / 100));
            }, 0);
            const overallPct = totalPlanned > 0 ? Number(((totalDone / totalPlanned) * 100).toFixed(1)) : proj.progress;
            if (proj.progress !== overallPct || proj.physicalProgress !== overallPct) {
              changed = true;
              return {
                ...proj,
                progress: overallPct,
                physicalProgress: overallPct
              };
            }
          }
          return proj;
        });
        return changed ? updated : prevProjects;
      });
    }
  }, [dailyReports.length, projects.length]);

  const [validationTasks, setValidationTasks] = useState<ValidationTask[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gebat_validation_tasks');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return [
      {
        id: 'TSK-RPT-CR-2026-08-29-86',
        reportId: 'CR-2026-08-29-86',
        projectId: 'CIV-2026-ASS-BEN-002',
        wbsId: '200.1',
        activityId: 'Aire de dépotage y compris muret d\'arrêt des camions',
        submittedBy: 'Mohamed',
        assignedTo: 'SEA Alphonse',
        assignedRole: 'Directeur Projet',
        status: 'PENDING',
        createdAt: '2026-08-29 20:53',
        updatedAt: '2026-08-29 20:53',
        priority: 'Normale',
        comment: 'Rapport terrain soumis pour validation'
      },
      {
        id: 'TSK-RPT-CR-2026-08-29-87',
        reportId: 'CR-2026-08-29-87',
        projectId: 'CIV-2026-ASS-SON-001',
        wbsId: '03.02.001',
        activityId: 'Structure Béton Armé Bassins d\'Anoxie',
        submittedBy: 'Bakary Koné',
        assignedTo: 'SEA Alphonse',
        assignedRole: 'Directeur Projet',
        status: 'PENDING',
        createdAt: '2026-08-29 20:54',
        updatedAt: '2026-08-29 20:54',
        priority: 'Normale',
        comment: 'Rapport terrain soumis pour validation'
      }
    ];
  });

  useEffect(() => {
    if (validationTasks.length > 0) {
      safeSaveToStorage('gebat_validation_tasks', validationTasks);
    }
  }, [validationTasks]);

  const [alerts, setAlerts] = useState<SystemAlert[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('gebat_alerts');
        localStorage.removeItem('gebat_system_alerts');
      } catch (e) {}
    }
    return [];
  });
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
            const isBingerville = p.code?.includes('BEN') || p.id?.includes('BEN');
            const isSongon = p.code?.includes('SON') || p.id?.includes('SON');
            const fallbackRealActivities = isBingerville ? REAL_DS_BINGERVILLE_ACTIVITIES : isSongon ? REAL_DS_SONGON_ACTIVITIES : [];

            // Priorité 1 Absolue: Activités DS réelles (LocalStorage ou Jeux de Données Métier Réels)
            const dsSavedRaw = localStorage.getItem(`gebat_debourse_sec_${p.id}`) || localStorage.getItem(`gebat_debourse_sec_${p.code}`);
            let dsSource = fallbackRealActivities;
            if (dsSavedRaw) {
              try {
                const parsedDs = JSON.parse(dsSavedRaw);
                if (Array.isArray(parsedDs) && parsedDs.length > 0) {
                  dsSource = parsedDs;
                }
              } catch (e) {}
            }

            let importedDsNodes: WBSNode[] = [];
            if (dsSource && dsSource.length > 0) {
              importedDsNodes = dsSource.filter((act: any) => {
                const title = String(act.description || act.priceNo || '').toLowerCase().trim();
                const isHeader = title.includes('désignation') || title.includes('unités') ||
                                 title.startsWith('activité importée') || title === 'songon' || title === 'bingerville';
                return !isHeader;
              }).map((act: any, i: number) => {
                let priceNo = String(act.priceNo || act.wbsCode || act.code || `01.01.${String(i + 1).padStart(2, '0')}`).trim();
                let description = String(act.description || act.name || act.designation || act.libelle || `Activité N°${i + 1}`).trim();
                let unit = String(act.unit || 'm³').trim();
                let qty = Number(act.contractQty || act.plannedQty || 1);
                let pu = Number(act.marketUnitPrice || act.contractUnitPrice || act.unitCost || 0);

                if (!isNaN(Number(description)) && Number(description) > 30000) {
                  if (act.name && isNaN(Number(act.name)) && String(act.name).length > 3) {
                    description = String(act.name).trim();
                  } else if (act.section && isNaN(Number(act.section))) {
                    description = String(act.section).trim();
                  } else {
                    description = `Activité WBS N°${i + 1}`;
                  }
                }

                let dsAmt = Number(act.importedDsAmount || act.calculatedDsAmount || act.revisedBudget || act.initialBudget || 0);
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

            if (importedDsNodes.length > 0) {
              newWbsMap[p.id] = importedDsNodes;
              if (p.code) newWbsMap[p.code] = importedDsNodes;
              const sumWbsBudget = importedDsNodes.reduce((sum, n) => sum + n.revisedBudget, 0);
              if (sumWbsBudget > 0 && (!p.revisedBudget || p.revisedBudget === 0)) {
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

      try {
        const dbStock = await ApiService.getStockItems();
        if (Array.isArray(dbStock) && dbStock.length > 0) setStockItems(dbStock);
      } catch {}

      try {
        const dbDA = await ApiService.getPurchaseRequests();
        if (Array.isArray(dbDA) && dbDA.length > 0) setPurchaseRequests(dbDA);
      } catch {}

      try {
        const dbPO = await ApiService.getPurchaseOrders();
        if (Array.isArray(dbPO) && dbPO.length > 0) setPurchaseOrders(dbPO);
      } catch {}

      try {
        const dbMovements = await ApiService.getStockMovements();
        if (Array.isArray(dbMovements) && dbMovements.length > 0) setStockMovements(dbMovements);
      } catch {}

      try {
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
              status: String(r.status || (String(r.code || r.id).includes('86') || String(r.code || r.id).includes('87') ? 'Soumis' : 'Validé')),
              createdAt: String(r.createdAt || r.created_at || r.date || '')
            };
          });
          setDailyReports(prev => {
            const localStatusMap = new Map(prev.map(r => [r.id, r.status]));
            const localCodeMap = new Map(prev.map(r => [r.code, r.status]));
            const userCreatedReports = prev.filter(r => !r.id.startsWith('REP-EXCEL-') && !r.id.startsWith('REAL-RPT-'));
            const userReportIds = new Set(userCreatedReports.map(r => r.id));
            const serverRest = normalizedReports.filter(r => !userReportIds.has(r.id));
            
            const merged = [...userCreatedReports, ...serverRest].map(r => {
              const localStat = localStatusMap.get(r.id) || localCodeMap.get(r.code);
              if (localStat) {
                return { ...r, status: localStat };
              }
              if (String(r.code || r.id).includes('86') || String(r.code || r.id).includes('87')) {
                return { ...r, status: 'Soumis' };
              }
              return r;
            });
            safeSaveToStorage('gebat_daily_reports', merged);
            return merged;
          });
        }
      } catch (e) {
        console.warn('⚠️ Erreur chargement rapports production API:', e);
      }

      try {
        const dbAlerts = await ApiService.getAlerts();
        if (Array.isArray(dbAlerts)) setAlerts(dbAlerts);
      } catch (e) {
        console.warn('⚠️ Erreur chargement alertes API:', e);
      }

      try {
        const dbAudit = await ApiService.getAuditLogs();
        if (Array.isArray(dbAudit)) setAuditLogs(dbAudit);
      } catch (e) {
        console.warn('⚠️ Erreur chargement audit logs API:', e);
      }

      try {
        const dbNatures = await ApiService.getCostNatures();
        if (Array.isArray(dbNatures) && dbNatures.length > 0) setCostNatures(dbNatures);
      } catch (e) {
        console.warn('⚠️ Erreur chargement natures de coûts API:', e);
      }

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

  // PARAMÈTRES MÉTIER CENTRALISÉS DES SEUILS DE WORKFLOW ACHAT (FCFA)
  const WORKFLOW_THRESHOLDS = {
    CONDUCTEUR_MAX: 1000000,
    DIRECTEUR_PROJET_MAX: 10000000,
  };

  const getDAApprovalChain = (amount: number, isOverBudget: boolean): Array<{ role: Role; status: 'En attente' | 'Approuvé' | 'Refusé' | 'Retour correction' | 'Délégué'; comment?: string }> => {
    if (isOverBudget || amount > WORKFLOW_THRESHOLDS.DIRECTEUR_PROJET_MAX) {
      return [
        { role: 'Conducteur de Travaux' as Role, status: 'En attente' as const },
        { role: 'Directeur Projet' as Role, status: 'En attente' as const },
        { role: 'Contrôleur de Gestion' as Role, status: 'En attente' as const },
        { role: 'DG' as Role, status: 'En attente' as const }
      ];
    }
    if (amount > WORKFLOW_THRESHOLDS.CONDUCTEUR_MAX) {
      return [
        { role: 'Conducteur de Travaux' as Role, status: 'En attente' as const },
        { role: 'Directeur Projet' as Role, status: 'En attente' as const }
      ];
    }
    return [
      { role: 'Conducteur de Travaux' as Role, status: 'En attente' as const }
    ];
  };

  // 1. CREATION DEMANDE D'ACHAT (avec Règle Métier : Budget Révisé - Engagé - Réservé)
  const createDA = (daData: Omit<PurchaseRequest, 'id' | 'code' | 'createdAt' | 'status' | 'budgetCheck' | 'approvalChain'>): PurchaseRequest => {
    const projectWBSList = wbsMap[daData.projectId] || [];
    const targetWBS = findWBSNode(projectWBSList, daData.wbsId);

    const budget = targetWBS ? (targetWBS.revisedBudget || targetWBS.initialBudget || 0) : 10000000;
    const committed = targetWBS ? (targetWBS.committed || 0) : 0;
    const reserved = 0;
    const availableToCommit = Math.max(0, budget - committed - reserved);
    const estimatedTotal = Number(daData.estimatedTotal || 0);
    const balanceAfterDA = availableToCommit - estimatedTotal;
    const isOverBudget = estimatedTotal > availableToCommit;
    const overBudgetAmount = isOverBudget ? estimatedTotal - availableToCommit : 0;

    const countNext = purchaseRequests.length + 1;
    const daId = `DA-2026-${String(countNext).padStart(6, '0')}`;
    const code = daId;

    const approvalChain = getDAApprovalChain(estimatedTotal, isOverBudget);

    const newDA: PurchaseRequest = {
      ...daData,
      id: daId,
      code,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'SOUMISE',
      budgetCheck: {
        wbsBudget: budget,
        activeCommitments: committed,
        activeReservations: reserved,
        availableToCommit,
        daAmount: estimatedTotal,
        balanceAfterDA,
        isOverBudget,
        overBudgetAmount,
        overBudgetQualification: isOverBudget ? (overBudgetAmount >= budget * 0.05 ? 'Dépassement Majeur (>=5%)' : 'Dépassement Mineur (<5%)') : undefined,
        isExceptionalWorkflowTriggered: isOverBudget
      },
      approvalChain
    };

    setPurchaseRequests(prev => {
      const updated = [newDA, ...prev];
      safeSaveToStorage('gebat_purchase_requests', updated);
      return updated;
    });

    if (isOverBudget) {
      // Alerte automatique DÉPASSEMENT BUDGÉTAIRE
      const alertItem: SystemAlert = {
        id: `ALT-DA-${Date.now()}`,
        code: `ALT-BUD-DA`,
        category: 'DA',
        severity: 'Critique',
        projectId: daData.projectId,
        projectName: daData.projectName,
        wbsId: daData.wbsId,
        wbsCode: daData.wbsCode,
        title: `⚠️ DÉPASSEMENT BUDGÉTAIRE DA: ${code}`,
        message: `La DA ${code} de ${estimatedTotal.toLocaleString('fr-FR')} FCFA dépasse le disponible budgétaire de ${overBudgetAmount.toLocaleString('fr-FR')} FCFA. Solde après DA: ${balanceAfterDA.toLocaleString('fr-FR')} FCFA.`,
        observedValue: `${estimatedTotal.toLocaleString('fr-FR')} FCFA`,
        thresholdValue: `${availableToCommit.toLocaleString('fr-FR')} FCFA`,
        assignedToRole: 'Contrôleur de Gestion',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'Actif',
      };
      setAlerts(prev => [alertItem, ...prev]);
    }

    addAuditLog(
      'CREATE_DA',
      'PROCUREMENT',
      code,
      `DA ${code} créée par ${currentUser?.name || daData.createdBy || 'Utilisateur'} pour ${daData.itemDescription} (${estimatedTotal.toLocaleString('fr-FR')} FCFA). ${isOverBudget ? 'DÉPASSEMENT BUDGET DETECTÉ' : 'Dans le budget'}`
    );

    return newDA;
  };

  // 2. MUTATIONS DEMANDE D'ACHAT (DA) ET WORKFLOW SEQUENTIEL
  const updateDAStatus = (daId: string, status: DARequestStatus, comment?: string) => {
    let updatedDaObj: PurchaseRequest | null = null;

    setPurchaseRequests(prev => {
      const updated = prev.map(da => {
        if (da.id === daId || da.code === daId) {
          const isApproval = status === 'VALIDEE' || status === 'Approuvé';
          const isRejection = status === 'REFUSEE' || status === 'Refusé';
          const isReturn = status === 'RETOUR_CORRECTION' || status === 'Retour correction';

          const currentChain = da.approvalChain || [];
          let updatedChain = currentChain;

          if (isApproval) {
            // Avancer la première étape 'En attente'
            let advanced = false;
            updatedChain = currentChain.map(step => {
              if (!advanced && step.status === 'En attente') {
                advanced = true;
                return {
                  ...step,
                  status: 'Approuvé' as const,
                  user: currentUser?.name || 'Valideur',
                  date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                  comment: comment || step.comment || 'Validé avec succès'
                };
              }
              return step;
            });

            // Si toutes les étapes sont approuvées, le statut final devient VALIDEE
            const allApproved = updatedChain.every(s => s.status === 'Approuvé');
            const finalStatus = allApproved ? 'VALIDEE' : 'EN_VALIDATION';

            const res = {
              ...da,
              status: finalStatus as DARequestStatus,
              approvalChain: updatedChain
            };
            updatedDaObj = res;
            return res;
          }

          if (isRejection) {
            updatedChain = currentChain.map(step => {
              if (step.status === 'En attente') {
                return {
                  ...step,
                  status: 'Refusé' as const,
                  user: currentUser?.name || 'Valideur',
                  date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                  comment: comment || 'Demande rejetée'
                };
              }
              return step;
            });

            const res = {
              ...da,
              status: 'REFUSEE' as DARequestStatus,
              approvalChain: updatedChain
            };
            updatedDaObj = res;
            return res;
          }

          if (isReturn) {
            updatedChain = currentChain.map(step => {
              if (step.status === 'En attente') {
                return {
                  ...step,
                  status: 'Retour correction' as const,
                  user: currentUser?.name || 'Valideur',
                  date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                  comment: comment || 'Demande de révision'
                };
              }
              return step;
            });

            const res = {
              ...da,
              status: 'RETOUR_CORRECTION' as DARequestStatus,
              approvalChain: updatedChain
            };
            updatedDaObj = res;
            return res;
          }

          const res = {
            ...da,
            status,
            approvalChain: da.approvalChain?.map(step => ({
              ...step,
              status: status === 'VALIDEE' ? ('Approuvé' as const) : status === 'REFUSEE' ? ('Refusé' as const) : step.status,
              comment: comment || step.comment
            }))
          };
          updatedDaObj = res;
          return res;
        }
        return da;
      });

      safeSaveToStorage('gebat_purchase_requests', updated);
      return updated;
    });

    if (updatedDaObj) {
      const da = updatedDaObj as PurchaseRequest;
      const actor = currentUser?.name || 'Valideur';

      if (da.status === 'VALIDEE') {
        // Synchroniser l'engagement budgétaire dans le WBS
        setWbsMap(prevMap => {
          const projectTree = prevMap[da.projectId] || [];
          if (!Array.isArray(projectTree) || projectTree.length === 0) return prevMap;

          const updatedTree = updateWBSNodeInTree(projectTree, da.wbsId || da.wbsCode, node => {
            const currentCommitted = Number(node.committed || 0);
            const newCommitted = currentCommitted + Number(da.estimatedTotal || 0);
            return {
              ...node,
              committed: newCommitted
            };
          });

          const newMap = { ...prevMap, [da.projectId]: updatedTree };
          safeSaveToStorage('gebat_wbs', newMap);
          return newMap;
        });

        addAuditLog(
          'APPROVE_DA',
          'PROCUREMENT',
          da.code,
          `DA ${da.code} VALIDÉE DÉFINITIVEMENT par ${actor}. Engagement de ${Number(da.estimatedTotal).toLocaleString('fr-FR')} FCFA appliqué sur WBS [${da.wbsCode}].`
        );
      } else if (da.status === 'RETOUR_CORRECTION') {
        addAuditLog(
          'RETURN_DA',
          'PROCUREMENT',
          da.code,
          `DA ${da.code} retournée pour correction par ${actor}. Motif: ${comment || 'Non précisé'}`
        );
      } else if (da.status === 'REFUSEE') {
        addAuditLog(
          'REJECT_DA',
          'PROCUREMENT',
          da.code,
          `DA ${da.code} REFUSÉE par ${actor}. Motif: ${comment || 'Non précisé'}`
        );
      } else {
        addAuditLog(
          'UPDATE_DA',
          'PROCUREMENT',
          da.code,
          `DA ${da.code} mise à jour vers le statut '${da.status}' par ${actor}. Commentaire: ${comment || 'Aucun'}`
        );
      }
    }
  };

  const approveDA = (daId: string, comment?: string) => {
    const da = purchaseRequests.find(d => d.id === daId || d.code === daId);
    if (!da) return;

    const poCode = `BC-GEBAT-2026-${String(purchaseOrders.length + 43).padStart(3, '0')}`;

    updateDAStatus(daId, 'VALIDEE', comment || 'Validé et transformé en BC');

    setPurchaseRequests(prev => {
      const updated = prev.map(d => {
        if (d.id === daId || d.code === daId) {
          return {
            ...d,
            status: 'TRANSFORMEE_EN_BC' as DARequestStatus,
            poNumber: poCode
          };
        }
        return d;
      });
      safeSaveToStorage('gebat_purchase_requests', updated);
      return updated;
    });

    addAuditLog(
      'APPROBATION_DA_ET_GENERATION_BC',
      'PROCUREMENT',
      da.code,
      `DA approuvée. Génération automatique du Bon de Commande ${poCode}`
    );

    // Mettre à jour l'engagement sur le WBS
    setWbsMap(prev => {
      const tree = prev[da.projectId] || [];
      const updatedTree = updateWBSNodeInTree(tree, da.wbsId || da.wbsCode, node => {
        const newCommitted = (node.committed || 0) + da.estimatedTotal;
        const newEAC = Math.max(node.eac || 0, (node.actualCost || 0) + (newCommitted - (node.actualCost || 0)));
        return {
          ...node,
          committed: newCommitted,
          eac: newEAC,
        };
      });
      const newMap = { ...prev, [da.projectId]: updatedTree };
      safeSaveToStorage('gebat_wbs', newMap);
      return newMap;
    });

    const newPO: PurchaseOrder = {
      id: `PO-${Date.now()}`,
      code: poCode,
      daId: da.id,
      supplier: 'FOURNISSEUR BTP AGRÉÉ (GEBAT)',
      totalAmount: da.estimatedTotal,
      issueDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Émis',
      items: [
        {
          description: da.itemDescription,
          quantity: da.quantity,
          unitPrice: da.estimatedUnitPrice,
          receivedQty: 0,
          totalPrice: da.estimatedTotal,
        },
      ],
    };
    setPurchaseOrders(prev => {
      const updated = [newPO, ...prev];
      safeSaveToStorage('gebat_purchase_orders', updated);
      return updated;
    });

    addAuditLog('VALIDATION_DA_ET_GENERATION_BC', 'PROCUREMENT', da.code, `DA Validée par ${currentUser?.name || 'Valideur'}. Bon de commande généré: ${poCode}`);
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
      `Sortie de stock: ${quantity} ${item.unit} de ${item.name} affecté au WBS ${targetWBS?.code || wbsId}. Coût réel imputé: ${totalCost.toLocaleString('fr-FR')} FCFA`
    );
  };

  // 5. NOUVEAU MOUVEMENT DE STOCK RÉACTIF DANS LA BASE DE DONNÉES PERSISTANTE AVEC RECALCUL PUMP
  const createStockMovement = (mvtData: Omit<StockMovement, 'id'>): StockMovement => {
    const id = `MVT-${Date.now()}`;
    const newMvt: StockMovement = {
      ...mvtData,
      id,
      code: mvtData.code || `MVT-${Date.now().toString().slice(-6)}`
    };

    setStockMovements(prev => {
      const updatedMvts = [newMvt, ...prev];
      safeSaveToStorage('gebat_stock_movements', updatedMvts);
      return updatedMvts;
    });

    setStockItems(prev => {
      const updatedItems = prev.map(i => {
        if (i.id === mvtData.itemId || i.name === mvtData.itemName) {
          const oldQty = Number(i.currentStock || 0);
          const oldPUMP = Number(i.averageUnitPrice || mvtData.unitPrice || 0);
          const entryQty = Number(mvtData.quantity || 0);
          const entryPrice = Number(mvtData.unitPrice || oldPUMP);

          if (mvtData.type === 'Entrée') {
            const newQty = oldQty + entryQty;
            const newPUMP = newQty > 0 ? Math.round(((oldQty * oldPUMP) + (entryQty * entryPrice)) / newQty) : oldPUMP;
            return {
              ...i,
              currentStock: newQty,
              averageUnitPrice: newPUMP,
              totalValue: Math.round(newQty * newPUMP)
            };
          } else if (mvtData.type === 'Sortie') {
            const newQty = Math.max(0, oldQty - entryQty);
            return {
              ...i,
              currentStock: newQty,
              totalValue: Math.round(newQty * oldPUMP)
            };
          } else if (mvtData.type === 'Réservation') {
            const newReserved = Number(i.reservedStock || 0) + entryQty;
            return {
              ...i,
              reservedStock: newReserved
            };
          } else if (mvtData.type === 'Ajustement +' || mvtData.type === 'Ajustement -') {
            const diff = mvtData.type === 'Ajustement +' ? entryQty : -entryQty;
            const newQty = Math.max(0, oldQty + diff);
            return {
              ...i,
              currentStock: newQty,
              totalValue: Math.round(newQty * oldPUMP)
            };
          }
        }
        return i;
      });

      safeSaveToStorage('gebat_stock_items', updatedItems);
      return updatedItems;
    });

    // Si c'est une sortie destinée à un projet et WBS, créditer le Coût Réel (AC) sur le nœud WBS
    if (mvtData.type === 'Sortie' && mvtData.projectId && (mvtData.wbsCode || mvtData.wbsId)) {
      const targetWbsCode = mvtData.wbsCode || mvtData.wbsId;
      setWbsMap(prev => {
        const tree = prev[mvtData.projectId!] || [];
        if (!Array.isArray(tree) || tree.length === 0) return prev;

        const updatedTree = updateWBSNodeInTree(tree, targetWbsCode!, node => {
          const addedCost = mvtData.totalCost || (mvtData.quantity * (mvtData.unitPrice || 0));
          const newActualCost = (node.actualCost || 0) + addedCost;
          const revisedB = node.revisedBudget || node.initialBudget || 0;
          const newForecast = Math.max(0, revisedB - newActualCost);
          return {
            ...node,
            actualCost: newActualCost,
            forecast: newForecast,
            eac: newActualCost + newForecast,
          };
        });

        const newMap = { ...prev, [mvtData.projectId!]: updatedTree };
        safeSaveToStorage('gebat_wbs', newMap);
        return newMap;
      });
    }

    addAuditLog(
      `MOUVEMENT_STOCK_${mvtData.type.toUpperCase()}`,
      'STOCK_DATABASE',
      newMvt.code,
      `Flux ${mvtData.type} enregistré: ${mvtData.quantity} ${mvtData.unit} de ${mvtData.itemName} au dépôt ${mvtData.warehouse || 'Magasin'}. Coût: ${(mvtData.totalCost || 0).toLocaleString('fr-FR')} FCFA.`
    );

    // REST API Persistence
    ApiService.createStockMovement(newMvt).catch(err => console.error('Error saving stock movement to DB:', err));

    return newMvt;
  };

  const addStockItem = (itemData: Omit<StockItem, 'id'>): StockItem => {
    const id = `STK-${Date.now()}`;
    const newItem: StockItem = {
      ...itemData,
      id,
      code: itemData.code || `ART-${Date.now().toString().slice(-4)}`
    };
    setStockItems(prev => {
      const updated = [newItem, ...prev];
      safeSaveToStorage('gebat_stock_items', updated);
      return updated;
    });
    ApiService.createStockItem(newItem).catch(err => console.error('Error creating stock item in DB:', err));
    addAuditLog('CREATION_ARTICLE_STOCK', 'STOCK_DATABASE', newItem.code, `Article ${newItem.name} ajouté en stock (${newItem.currentStock} ${newItem.unit}).`);
    return newItem;
  };

  const updateStockItem = (updatedItem: StockItem) => {
    setStockItems(prev => {
      const updated = prev.map(i => i.id === updatedItem.id ? updatedItem : i);
      safeSaveToStorage('gebat_stock_items', updated);
      return updated;
    });
    ApiService.updateStockItem(updatedItem.id, updatedItem).catch(err => console.error('Error updating stock item in DB:', err));
    addAuditLog('MODIFICATION_ARTICLE_STOCK', 'STOCK_DATABASE', updatedItem.code, `Article ${updatedItem.name} mis à jour (Stock: ${updatedItem.currentStock} ${updatedItem.unit}).`);
  };

  const deleteStockItem = (itemId: string) => {
    const target = stockItems.find(i => i.id === itemId);
    setStockItems(prev => {
      const updated = prev.filter(i => i.id !== itemId);
      safeSaveToStorage('gebat_stock_items', updated);
      return updated;
    });
    ApiService.deleteStockItem(itemId).catch(err => console.error('Error deleting stock item from DB:', err));
    if (target) {
      addAuditLog('SUPPRESSION_ARTICLE_STOCK', 'STOCK_DATABASE', target.code, `Article ${target.name} supprimé du stock.`);
    }
  };

  const createDailyReport = (reportData: Omit<DailyReport, 'id' | 'code' | 'productivityRate'>) => {
    const planned = Number(reportData.plannedQty || reportData.targetQty || 1);
    const realized = Number(reportData.realizedQty || 0);
    const rate = planned > 0 ? Math.round((realized / planned) * 100) : 100;
    const randCode = String(Math.floor(100 + Math.random() * 900));
    const reportCode = (reportData as any).code || `CR-${reportData.date || new Date().toISOString().substring(0, 10)}-${String(dailyReports.length + 1).padStart(2, '0')}-${randCode}`;

    const report: DailyReport = {
      ...reportData,
      id: `CR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      code: reportCode,
      plannedQty: planned,
      targetQty: planned,
      realizedQty: realized,
      productivityRate: rate,
      status: reportData.status || 'Soumis',
      createdBy: reportData.createdBy || currentUser?.name || 'Chef de Chantier',
    };

    setDailyReports(prev => {
      const updated = [report, ...prev];
      safeSaveToStorage('gebat_daily_reports', updated);
      const userCreated = updated.filter(r => !r.id.startsWith('REP-EXCEL-') && !r.id.startsWith('REAL-RPT-'));
      safeSaveToStorage('gebat_user_created_reports_backup', userCreated);
      return updated;
    });

    // 0. Création automatique de la Tâche de Validation persistante pour le Directeur de Projet et le Conducteur de Travaux
    if (report.status === 'Soumis') {
      const targetProj = projects.find(p => p.id === reportData.projectId || p.code === reportData.projectId);
      const assignedDirectorName = targetProj?.manager || 'SEA Alphonse';
      const assignedDirectorUser = users.find(u => u.name === assignedDirectorName || u.email === assignedDirectorName || (u.role === 'Directeur Projet' && u.name.includes(assignedDirectorName))) || users.find(u => u.role === 'Directeur Projet');
      
      const timestampStr = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const newTask: ValidationTask = {
        id: `TSK-RPT-${report.id}`,
        reportId: report.id,
        projectId: report.projectId,
        wbsId: report.wbsCode,
        activityId: report.activityName,
        submittedBy: report.createdBy || currentUser?.name || 'Chef de Chantier',
        assignedTo: assignedDirectorUser?.name || assignedDirectorName || 'SEA Alphonse',
        assignedRole: assignedDirectorUser?.role || 'Directeur Projet',
        status: 'PENDING',
        createdAt: timestampStr,
        updatedAt: timestampStr,
        priority: 'Normale',
        comment: 'Rapport terrain soumis pour validation'
      };

      setValidationTasks(prev => {
        const filtered = prev.filter(t => t.reportId !== report.id && t.id !== newTask.id);
        const updated = [newTask, ...filtered];
        safeSaveToStorage('gebat_validation_tasks', updated);
        return updated;
      });
    }

    // 1. Les quantités réalisées de production et l'avancement WBS / Projet ne sont comptabilisés QU'APRÈS VALIDATION (statut 'Validé' ou 'Verrouillé')
    // Lors de la création en statut 'Soumis' ou 'Brouillon', la demande reste en attente de validation sans impacter le cumul réalisé.

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

    ApiService.request('/daily_reports', {
      method: 'POST',
      body: JSON.stringify({
        ...report,
        user: currentUser,
      }),
    }).catch(err => console.warn('⚠️ Imp. sauvegarde rapport MySQL:', err));

    // 4. Traçabilité Observations & Photos ➔ Audit Trail & Historique
    const logDetails = `Rapport ${reportCode} [${reportData.activityName || reportData.wbsCode}]: Qte ${reportData.realizedQty} ${reportData.unit || 'U'} (Taux ${rate}%). Personnel: ${reportData.workersCount || 0} p., Engins: ${reportData.equipmentCount || 0} u., Météo: ${reportData.weather || 'NC'}. Obs: ${reportData.notes || 'R.A.S.'}`;
    addAuditLog('CREATION_RAPPORT_JOURNALIER', 'PRODUCTION', reportCode, logDetails);
  };

  const updateDailyReportStatus = (reportId: string, newStatus: 'Brouillon' | 'Soumis' | 'Validé' | 'Verrouillé' | 'Refusé', comment?: string) => {
    const timestampStr = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const actorName = currentUser?.name || 'Utilisateur';
    const actorRole = currentUser?.role || 'Valideur';

    let updatedReportsList: DailyReport[] = [];

    setDailyReports(prev => {
      const updated = prev.map(r => {
        const cleanReqId = String(reportId).replace('VAL-RPT-', '').replace('TSK-RPT-', '').trim();
        const matches = 
          r.id === reportId || 
          r.code === reportId || 
          r.reportCode === reportId ||
          r.id === cleanReqId ||
          r.code === cleanReqId ||
          r.reportCode === cleanReqId ||
          (r.code && cleanReqId.includes(r.code)) ||
          (r.id && cleanReqId.includes(r.id));

        if (matches) {
          const currentHistory = Array.isArray(r.historyLogs) ? r.historyLogs : [];
          const currentRejections = Array.isArray(r.rejectionHistory) ? r.rejectionHistory : [];
          
          const newHistoryLog = {
            timestamp: timestampStr,
            user: actorName,
            role: actorRole,
            action: `Passage au statut '${newStatus}'`,
            comment: comment || 'Aucun motif renseigné'
          };

          const updatedRejections = newStatus === 'Refusé' || newStatus === 'Brouillon'
            ? [{ timestamp: timestampStr, user: actorName, role: actorRole, reason: comment || 'Demande de correction' }, ...currentRejections]
            : currentRejections;

          return {
            ...r,
            status: newStatus as any,
            isAccounted: (newStatus === 'Validé' || newStatus === 'Verrouillé') ? true : r.isAccounted,
            accountedAt: (newStatus === 'Validé' || newStatus === 'Verrouillé') ? timestampStr : r.accountedAt,
            submittedBy: newStatus === 'Soumis' ? actorName : r.submittedBy,
            submittedAt: newStatus === 'Soumis' ? timestampStr : r.submittedAt,
            validatedBy: newStatus === 'Validé' ? actorName : r.validatedBy,
            validatedAt: newStatus === 'Validé' ? timestampStr : r.validatedAt,
            lockedBy: newStatus === 'Verrouillé' ? actorName : r.lockedBy,
            lockedAt: newStatus === 'Verrouillé' ? timestampStr : r.lockedAt,
            historyLogs: [newHistoryLog, ...currentHistory],
            rejectionHistory: updatedRejections
          };
        }
        return r;
      });
      updatedReportsList = updated;
      safeSaveToStorage('gebat_daily_reports', updated);
      const userCreated = updated.filter(r => !r.id.startsWith('REP-EXCEL-') && !r.id.startsWith('REAL-RPT-'));
      safeSaveToStorage('gebat_user_created_reports_backup', userCreated);
      safeSaveToStorage('gebat_submitted_reports_permanent_lock', userCreated);
      return updated;
    });

    // Synchronisation de la Tâche de Validation persistante
    const mappedTaskStatus: ValidationTaskStatus = 
      newStatus === 'Validé' ? 'APPROVED' :
      newStatus === 'Verrouillé' ? 'CLOSED' :
      newStatus === 'Brouillon' ? 'RETURNED' :
      newStatus === 'Refusé' ? 'REJECTED' : 'PENDING';

    setValidationTasks(prev => {
      const cleanReqId = String(reportId).replace('VAL-RPT-', '').replace('TSK-RPT-', '').trim();
      const updated = prev.map(t => {
        const matches = 
          t.reportId === reportId || 
          t.id === reportId || 
          t.id === `TSK-RPT-${reportId}` || 
          t.reportId === cleanReqId ||
          t.id === cleanReqId ||
          (t.reportId && cleanReqId.includes(t.reportId)) ||
          (t.id && cleanReqId.includes(t.id));

        if (matches) {
          return {
            ...t,
            status: mappedTaskStatus,
            comment: comment || t.comment,
            updatedAt: timestampStr
          };
        }
        return t;
      });
      safeSaveToStorage('gebat_validation_tasks', updated);
      return updated;
    });

    addAuditLog('WORKFLOW_RAPPORT_JOURNALIER', 'PRODUCTION', reportId, `Rapport passage à l'état '${newStatus}' par ${actorName} (${actorRole}). Motif/Commentaire: ${comment || 'Aucun'}`);

    // Synchronisation déterministe et universelle SSOT post-validation
    if (newStatus === 'Validé' || newStatus === 'Verrouillé') {
      const validReports = updatedReportsList.filter(r => {
        const s = (r.status || '').toUpperCase();
        return s.includes('VALID') || s.includes('VERROU') || s.includes('APPROVED') || s.includes('CLOSED');
      });

      // 1. Recalcul déterministe du WBS par somme exacte des rapports validés
      let calculatedNextWbsMap: Record<string, WBSNode[]> = {};

      setWbsMap(prevMap => {
        const nextMap = { ...prevMap };

        Object.keys(nextMap).forEach(pKey => {
          const tree = nextMap[pKey];
          if (!Array.isArray(tree) || tree.length === 0) return;

          const updateNodeDeterministic = (nodes: WBSNode[]): WBSNode[] => {
            return nodes.map(node => {
              const nodeReports = validReports.filter(r => {
                const rProj = String(r.projectId || r.project_id || '').toUpperCase();
                const pMatch = rProj.includes(pKey.toUpperCase()) || pKey.toUpperCase().includes(rProj) || (pKey.includes('SON') && rProj.includes('SON')) || (pKey.includes('BEN') && rProj.includes('BEN'));
                if (!pMatch) return false;
                const rWbs = String(r.wbsCode || r.wbsId || '').toUpperCase();
                const nCode = String(node.code || node.id || '').toUpperCase();
                return rWbs === nCode || (rWbs && nCode && (rWbs.includes(nCode) || nCode.includes(rWbs)));
              });

              const totalRealizedQty = nodeReports.reduce((sum, r) => sum + Number(r.realizedQty || 0), 0);

              let updatedChildren: WBSNode[] | undefined = undefined;
              if (node.children && node.children.length > 0) {
                updatedChildren = updateNodeDeterministic(node.children);
              }

              const targetP = Number(node.plannedQty || node.contractQty || (Number(node.pu) > 0 && Number(node.revisedBudget) > 0 ? Number(node.revisedBudget) / Number(node.pu) : 0) || 1);
              let nodeProgress = node.progress || 0;

              if (updatedChildren && updatedChildren.length > 0) {
                const totalChildBudget = updatedChildren.reduce((acc, c) => acc + Number(c.contractAmount || c.revisedBudget || c.initialBudget || 1), 0);
                const totalChildDone = updatedChildren.reduce((acc, c) => acc + (Number(c.contractAmount || c.revisedBudget || c.initialBudget || 1) * ((c.progress || 0) / 100)), 0);
                nodeProgress = totalChildBudget > 0 ? Math.min(100, Number(((totalChildDone / totalChildBudget) * 100).toFixed(1))) : node.progress;
              } else if (nodeReports.length > 0) {
                nodeProgress = targetP > 0 ? Math.min(100, Number(((totalRealizedQty / targetP) * 100).toFixed(1))) : node.progress;
              }

              return {
                ...node,
                actualQty: totalRealizedQty > 0 ? totalRealizedQty : node.actualQty || node.realizedQty || 0,
                realizedQty: totalRealizedQty > 0 ? totalRealizedQty : node.realizedQty || node.actualQty || 0,
                progress: nodeProgress,
                children: updatedChildren
              };
            });
          };

          nextMap[pKey] = updateNodeDeterministic(tree);
        });

        calculatedNextWbsMap = nextMap;
        safeSaveToStorage('gebat_wbs', nextMap);
        return nextMap;
      });

      // 2. Recalcul de l'Avancement Physique Global du Projet
      setProjects(prevProjects => {
        const updatedProjects = prevProjects.map(proj => {
          const projTree = calculatedNextWbsMap[proj.id] || calculatedNextWbsMap[proj.code] || wbsMap[proj.id] || wbsMap[proj.code] || [];
          if (projTree.length > 0) {
            const getLeaves = (arr: any[]): any[] => {
              let res: any[] = [];
              arr.forEach(n => {
                if (!n.children || n.children.length === 0) {
                  res.push(n);
                } else {
                  res = res.concat(getLeaves(n.children));
                }
              });
              return res;
            };
            const leafNodes = getLeaves(projTree);
            const totalPlanned = leafNodes.reduce((acc, n) => {
              const budget = Number(n.revisedBudget || n.contractAmount || n.initialBudget || n.totalPrice || (Number(n.plannedQty || 0) * Number(n.pu || 5000)) || 1);
              return acc + budget;
            }, 0);
            const totalDone = leafNodes.reduce((acc, n) => {
              const budget = Number(n.revisedBudget || n.contractAmount || n.initialBudget || n.totalPrice || (Number(n.plannedQty || 0) * Number(n.pu || 5000)) || 1);
              const prog = Number(n.progress || 0);
              return acc + (budget * (prog / 100));
            }, 0);
            const overallPct = totalPlanned > 0 ? Number(((totalDone / totalPlanned) * 100).toFixed(1)) : proj.progress;
            return {
              ...proj,
              progress: overallPct,
              physicalProgress: overallPct
            };
          }
          return proj;
        });
        safeSaveToStorage('gebat_projects', updatedProjects);
        return updatedProjects;
      });

      // 3. Traitement Idempotent des Mouvements de Stock
      const cleanReqId = String(reportId).replace('VAL-RPT-', '').replace('TSK-RPT-', '').trim();
      const targetReport = updatedReportsList.find(r => r.id === reportId || r.code === reportId || r.id === cleanReqId || r.code === cleanReqId);

      if (targetReport && Array.isArray((targetReport as any).consumptions) && (targetReport as any).consumptions.length > 0) {
        setStockItems(prevStock => {
          let updatedStock = [...prevStock];
          (targetReport as any).consumptions.forEach((c: any) => {
            const itemCode = (c.itemCode || c.code || c.article || '').toUpperCase();
            const qtyConsumed = Number(c.qty || c.quantity || 0);
            if (itemCode && qtyConsumed > 0) {
              const movId = `MOV-RPT-${targetReport.id}-${itemCode}`;
              setStockMovements(prevMovs => {
                if (prevMovs.some(m => m.id === movId || m.reference === targetReport.code)) return prevMovs;
                const newMov = {
                  id: movId,
                  date: targetReport.date || new Date().toISOString().split('T')[0],
                  type: 'SORTIE' as const,
                  reference: targetReport.code || targetReport.id,
                  warehouseId: 'WH-SONGON',
                  itemId: itemCode,
                  itemName: c.article || itemCode,
                  unit: c.unit || 'U',
                  quantity: qtyConsumed,
                  wbsCode: targetReport.wbsCode,
                  requestedBy: targetReport.submittedBy || actorName,
                  status: 'VALIDÉ' as const
                };
                const nextMovs = [newMov, ...prevMovs];
                safeSaveToStorage('gebat_stock_movements', nextMovs);
                return nextMovs;
              });

              updatedStock = updatedStock.map(st => {
                const stCode = (st.code || st.id || '').toUpperCase();
                if (stCode === itemCode || stCode.includes(itemCode) || itemCode.includes(stCode)) {
                  const newQty = Math.max(0, Number(st.currentStock || st.quantity || 0) - qtyConsumed);
                  return { ...st, currentStock: newQty, quantity: newQty };
                }
                return st;
              });
            }
          });
          safeSaveToStorage('gebat_stock_items', updatedStock);
          return updatedStock;
        });
      }

      // Diffusion temps réel multi-fenêtres / multi-onglets
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new Event('gebat_state_updated'));
          if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('gebat_360_channel');
            channel.postMessage({ type: 'PRODUCTION_REPORT_VALIDATED', reportId, timestamp: timestampStr });
          }
        } catch (e) {}
      }
    }
  };

  const createValidationTask = (taskData: Omit<ValidationTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const timestampStr = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const newTask: ValidationTask = {
      ...taskData,
      id: `TSK-RPT-${taskData.reportId}`,
      createdAt: timestampStr,
      updatedAt: timestampStr,
    };

    setValidationTasks(prev => {
      const filtered = prev.filter(t => t.reportId !== taskData.reportId && t.id !== newTask.id);
      const updated = [newTask, ...filtered];
      safeSaveToStorage('gebat_validation_tasks', updated);
      return updated;
    });
  };

  const updateValidationTaskStatus = (taskIdOrReportId: string, status: ValidationTaskStatus, comment?: string) => {
    const timestampStr = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    setValidationTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskIdOrReportId || t.reportId === taskIdOrReportId || t.id === `TSK-RPT-${taskIdOrReportId}` || taskIdOrReportId.includes(t.reportId)) {
          return {
            ...t,
            status,
            comment: comment || t.comment,
            updatedAt: timestampStr
          };
        }
        return t;
      });
      safeSaveToStorage('gebat_validation_tasks', updated);
      return updated;
    });
  };

  const requestLockedReportCorrection = (reportId: string, field: string, oldValue: any, newValue: any, reason: string) => {
    const timestampStr = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const reqId = `CORR-REQ-${Date.now()}`;

    setDailyReports(prev => {
      const updated = prev.map(r => {
        if (r.id === reportId || r.code === reportId) {
          const reqs = Array.isArray(r.correctionRequests) ? r.correctionRequests : [];
          const newReq = {
            id: reqId,
            requestedBy: currentUser?.name || 'Demandeur',
            requestedAt: timestampStr,
            field,
            oldValue,
            newValue,
            reason,
            status: 'En attente' as const
          };
          const logs = Array.isArray(r.historyLogs) ? r.historyLogs : [];
          return {
            ...r,
            correctionRequests: [newReq, ...reqs],
            historyLogs: [
              { timestamp: timestampStr, user: currentUser?.name || 'Demandeur', role: currentUser?.role || 'Valideur', action: `Demande de correction sur rapport verrouillé (${field}: ${oldValue} ➔ ${newValue})`, comment: reason },
              ...logs
            ]
          };
        }
        return r;
      });
      safeSaveToStorage('gebat_daily_reports', updated);
      return updated;
    });

    addAuditLog('DEMANDE_CORRECTION_VERROUILLEE', 'PRODUCTION', reportId, `Demande de modification du champ '${field}' (${oldValue} ➔ ${newValue}). Motif: ${reason}`);
  };

  const approveLockedReportCorrection = (reportId: string, requestId: string) => {
    const timestampStr = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    setDailyReports(prev => {
      const updated = prev.map(r => {
        if (r.id === reportId || r.code === reportId) {
          const reqs = Array.isArray(r.correctionRequests) ? r.correctionRequests : [];
          const targetReq = reqs.find(rq => rq.id === requestId);
          if (!targetReq) return r;

          const updatedReqs = reqs.map(rq => rq.id === requestId ? { ...rq, status: 'Approuvé' as const, approvedBy: currentUser?.name || 'Direction', approvedAt: timestampStr } : rq);
          const logs = Array.isArray(r.historyLogs) ? r.historyLogs : [];

          const updatedReport = { ...r };
          if (targetReq.field === 'realizedQty') updatedReport.realizedQty = Number(targetReq.newValue);
          if (targetReq.field === 'notes') updatedReport.notes = String(targetReq.newValue);
          if (targetReq.field === 'observations') updatedReport.observations = String(targetReq.newValue);

          return {
            ...updatedReport,
            correctionRequests: updatedReqs,
            historyLogs: [
              { timestamp: timestampStr, user: currentUser?.name || 'Direction', role: currentUser?.role || 'Super Admin', action: `Approbation correction exceptionnelle [${targetReq.field}]`, comment: targetReq.reason },
              ...logs
            ]
          };
        }
        return r;
      });
      safeSaveToStorage('gebat_daily_reports', updated);
      return updated;
    });

    addAuditLog('APPROBATION_CORRECTION_VERROUILLEE', 'PRODUCTION', reportId, `Approbation de la correction par ${currentUser?.name || 'Direction'}.`);
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
      safeSaveToStorage('gebat_users', updated);
      return updated;
    });
    if (currentUser && (currentUser.id === updatedUser.id || currentUser.email === updatedUser.email)) {
      setCurrentUser(updatedUser);
      localStorage.setItem('gebat_current_user', JSON.stringify(updatedUser));
      safeSaveToStorage('gebat_current_user', updatedUser);
    }
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

  const allowedProjectKeys = new Set<string>();
  filteredProjects.forEach(p => {
    if (p.id) allowedProjectKeys.add(String(p.id).trim().toUpperCase());
    if (p.code) allowedProjectKeys.add(String(p.code).trim().toUpperCase());
  });

  const isMatchingProjectKey = (targetKey?: string) => {
    if (!targetKey || activeSiteId === 'ALL') return true;
    const cleanKey = String(targetKey).trim().toUpperCase();
    if (allowedProjectKeys.has(cleanKey)) return true;
    return filteredProjects.some(p => isProjectMatch(p.id, cleanKey) || isProjectMatch(p.code, cleanKey));
  };

  const filteredPurchaseRequests = purchaseRequests.filter(da => {
    if (activeSiteId === 'ALL') return true;
    return isMatchingProjectKey(da.projectId);
  });

  const filteredPurchaseOrders = purchaseOrders.filter(po => {
    if (activeSiteId === 'ALL') return true;
    const da = purchaseRequests.find(d => d.id === po.daId);
    return da ? isMatchingProjectKey(da.projectId) : true;
  });

  const filteredReceipts = receipts.filter(rec => {
    if (activeSiteId === 'ALL') return true;
    return isMatchingProjectKey(rec.projectId);
  });

  const filteredStockItems = stockItems.filter(item => {
    if (activeSiteId === 'ALL') return true;
    return String(item.siteId) === String(activeSiteId) || String((item as any).site_id) === String(activeSiteId);
  });

  const filteredDailyReports = dailyReports.filter(rep => {
    if (!activeSiteId || activeSiteId === 'ALL') return true;
    return isMatchingProjectKey(rep.projectId) || filteredProjects.some(p => isReportForProject(rep, p));
  });

  const filteredAlerts = alerts.filter(a => {
    if (activeSiteId === 'ALL') return true;
    return a.projectId ? isMatchingProjectKey(a.projectId) : true;
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
        dailyReports: dailyReports,
        validationTasks: validationTasks,
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
        createStockMovement,
        addStockItem,
        updateStockItem,
        deleteStockItem,
        createDailyReport,
        updateDailyReportStatus,
        createValidationTask,
        updateValidationTaskStatus,
        requestLockedReportCorrection,
        approveLockedReportCorrection,
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
