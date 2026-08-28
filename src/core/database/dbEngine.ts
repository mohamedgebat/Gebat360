/**
 * GEBAT 360° — MOTEUR DE BASE DE DONNÉES RELATIONNELLE ET PERSISTANTE (IndexedDB & LocalStorage)
 * 
 * Définit et gère les 11 tables relationnelles centrales de l'application GEBAT 360° :
 * 1. tbl_projects           : Table des Projets (Entité Centrale)
 * 2. tbl_wbs_nodes          : Structure Arborescente WBS (Projet -> Lot -> Sous-lot -> Activité)
 * 3. tbl_purchase_requests  : Demandes d'Achat (DA) & Contrôle Budgétaire
 * 4. tbl_purchase_orders    : Bons de Commande (BC) Fournisseurs
 * 5. tbl_goods_receipts     : Réceptions Marchandises & Three-Way Match (BC ↔ RÉCEPTION ↔ FACTURE)
 * 6. tbl_stock_items        : Articles, Magasins & Stocks Disponibles
 * 7. tbl_stock_movements    : Mouvements de Stock & Imputation Activités WBS
 * 8. tbl_daily_reports      : Rapports Journaliers de Production & Rendements
 * 9. tbl_system_alerts      : Alertes Système & Métier (Planning, Budget, QHSE, Stock)
 * 10. tbl_audit_logs        : Audit Trail Inaltérable & Traçabilité
 * 11. tbl_cost_natures      : Référentiel Paramétrable des Natures de Coût (MAT, MO, MTL, ST, TRS, FGC, DIV)
 */

import {
  Project, WBSNode, PurchaseRequest, PurchaseOrder, GoodsReceipt,
  StockItem, StockMovement, DailyReport, SystemAlert, AuditLog, CostNature
} from '../../types';

export const DB_NAME = 'GEBAT360_DATABASE_V1';
export const DB_VERSION = 1;

export const DB_TABLES = {
  PROJECTS: 'tbl_projects',
  WBS_NODES: 'tbl_wbs_nodes',
  PURCHASE_REQUESTS: 'tbl_purchase_requests',
  PURCHASE_ORDERS: 'tbl_purchase_orders',
  GOODS_RECEIPTS: 'tbl_goods_receipts',
  STOCK_ITEMS: 'tbl_stock_items',
  STOCK_MOVEMENTS: 'tbl_stock_movements',
  DAILY_REPORTS: 'tbl_daily_reports',
  SYSTEM_ALERTS: 'tbl_system_alerts',
  AUDIT_LOGS: 'tbl_audit_logs',
  COST_NATURES: 'tbl_cost_natures',
};

class GebatDatabaseEngine {
  private db: IDBDatabase | null = null;
  private isReady: boolean = false;

  constructor() {
    this.initIndexedDB();
  }

  /**
   * Initialisation de la Base de Données IndexedDB avec Schéma et Index
   */
  private initIndexedDB(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB non supporté par le navigateur. Fallback sur localStorage.');
        resolve(null);
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('Erreur ouverture IndexedDB GEBAT 360°:', event);
        resolve(null);
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        this.isReady = true;
        resolve(this.db);
      };

      request.onupgradeneeded = (event: any) => {
        const db: IDBDatabase = event.target.result;

        // 1. Table des Projets (tbl_projects)
        if (!db.objectStoreNames.contains(DB_TABLES.PROJECTS)) {
          const store = db.createObjectStore(DB_TABLES.PROJECTS, { keyPath: 'id' });
          store.createIndex('idx_code', 'code', { unique: true });
          store.createIndex('idx_company', 'company', { unique: false });
          store.createIndex('idx_status', 'status', { unique: false });
          store.createIndex('idx_country', 'country', { unique: false });
        }

        // 2. Table des Nœuds WBS (tbl_wbs_nodes)
        if (!db.objectStoreNames.contains(DB_TABLES.WBS_NODES)) {
          const store = db.createObjectStore(DB_TABLES.WBS_NODES, { keyPath: 'id' });
          store.createIndex('idx_project_id', 'projectId', { unique: false });
          store.createIndex('idx_code', 'code', { unique: false });
          store.createIndex('idx_nature', 'nature', { unique: false });
        }

        // 3. Table des Demandes d'Achat (tbl_purchase_requests)
        if (!db.objectStoreNames.contains(DB_TABLES.PURCHASE_REQUESTS)) {
          const store = db.createObjectStore(DB_TABLES.PURCHASE_REQUESTS, { keyPath: 'id' });
          store.createIndex('idx_code', 'code', { unique: true });
          store.createIndex('idx_project_id', 'projectId', { unique: false });
          store.createIndex('idx_wbs_id', 'wbsId', { unique: false });
          store.createIndex('idx_status', 'status', { unique: false });
        }

        // 4. Table des Bons de Commande (tbl_purchase_orders)
        if (!db.objectStoreNames.contains(DB_TABLES.PURCHASE_ORDERS)) {
          const store = db.createObjectStore(DB_TABLES.PURCHASE_ORDERS, { keyPath: 'id' });
          store.createIndex('idx_code', 'code', { unique: true });
          store.createIndex('idx_da_id', 'daId', { unique: false });
        }

        // 5. Table des Réceptions Marchandises (tbl_goods_receipts)
        if (!db.objectStoreNames.contains(DB_TABLES.GOODS_RECEIPTS)) {
          const store = db.createObjectStore(DB_TABLES.GOODS_RECEIPTS, { keyPath: 'id' });
          store.createIndex('idx_code', 'code', { unique: true });
          store.createIndex('idx_po_id', 'poId', { unique: false });
          store.createIndex('idx_project_id', 'projectId', { unique: false });
        }

        // 6. Table du Stock (tbl_stock_items)
        if (!db.objectStoreNames.contains(DB_TABLES.STOCK_ITEMS)) {
          const store = db.createObjectStore(DB_TABLES.STOCK_ITEMS, { keyPath: 'id' });
          store.createIndex('idx_code', 'code', { unique: true });
          store.createIndex('idx_warehouse', 'warehouse', { unique: false });
          store.createIndex('idx_category', 'category', { unique: false });
        }

        // 7. Table des Mouvements de Stock (tbl_stock_movements)
        if (!db.objectStoreNames.contains(DB_TABLES.STOCK_MOVEMENTS)) {
          const store = db.createObjectStore(DB_TABLES.STOCK_MOVEMENTS, { keyPath: 'id' });
          store.createIndex('idx_item_id', 'itemId', { unique: false });
          store.createIndex('idx_project_id', 'projectId', { unique: false });
          store.createIndex('idx_wbs_id', 'wbsId', { unique: false });
        }

        // 8. Table des Rapports Journaliers de Production (tbl_daily_reports)
        if (!db.objectStoreNames.contains(DB_TABLES.DAILY_REPORTS)) {
          const store = db.createObjectStore(DB_TABLES.DAILY_REPORTS, { keyPath: 'id' });
          store.createIndex('idx_code', 'code', { unique: true });
          store.createIndex('idx_project_id', 'projectId', { unique: false });
          store.createIndex('idx_date', 'date', { unique: false });
        }

        // 9. Table des Alertes (tbl_system_alerts)
        if (!db.objectStoreNames.contains(DB_TABLES.SYSTEM_ALERTS)) {
          const store = db.createObjectStore(DB_TABLES.SYSTEM_ALERTS, { keyPath: 'id' });
          store.createIndex('idx_status', 'status', { unique: false });
          store.createIndex('idx_severity', 'severity', { unique: false });
          store.createIndex('idx_project_id', 'projectId', { unique: false });
        }

        // 10. Table d'Audit Trail (tbl_audit_logs)
        if (!db.objectStoreNames.contains(DB_TABLES.AUDIT_LOGS)) {
          const store = db.createObjectStore(DB_TABLES.AUDIT_LOGS, { keyPath: 'id' });
          store.createIndex('idx_timestamp', 'timestamp', { unique: false });
          store.createIndex('idx_module', 'module', { unique: false });
          store.createIndex('idx_object_ref', 'objectRef', { unique: false });
        }

        // 11. Table des Natures de Coût (tbl_cost_natures)
        if (!db.objectStoreNames.contains(DB_TABLES.COST_NATURES)) {
          const store = db.createObjectStore(DB_TABLES.COST_NATURES, { keyPath: 'code' });
        }
      };
    });
  }

  /**
   * Sauvegarde générique d'un enregistrement dans une table IndexedDB avec sync LocalStorage
   */
  public async saveItem<T extends { id?: string; code?: string }>(tableName: string, item: T): Promise<void> {
    if (this.db) {
      try {
        const tx = this.db.transaction(tableName, 'readwrite');
        const store = tx.objectStore(tableName);
        store.put(item);
      } catch (e) {
        console.error(`Erreur écriture dans ${tableName}:`, e);
      }
    }
    // Double écriture LocalStorage pour garantie de réactivité UI
    this.syncToLocalStorage(tableName, item);
  }

  /**
   * Chargement de tous les enregistrements d'une table IndexedDB
   */
  public async getAllItems<T>(tableName: string, fallbackData: T[]): Promise<T[]> {
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction(tableName, 'readonly');
          const store = tx.objectStore(tableName);
          const request = store.getAll();
          request.onsuccess = () => {
            if (request.result && request.result.length > 0) {
              resolve(request.result);
            } else {
              resolve(fallbackData);
            }
          };
          request.onerror = () => resolve(fallbackData);
        } catch (e) {
          resolve(fallbackData);
        }
      });
    }
    return fallbackData;
  }

  /**
   * Synchronisation miroir vers LocalStorage
   */
  private syncToLocalStorage(tableName: string, item: any) {
    try {
      const key = `gebat_db_${tableName}`;
      const existing = localStorage.getItem(key);
      let list: any[] = existing ? JSON.parse(existing) : [];
      const itemKey = item.id || item.code;
      const index = list.findIndex(i => (i.id || i.code) === itemKey);
      if (index >= 0) {
        list[index] = item;
      } else {
        list.push(item);
      }
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.error('Erreur sync LocalStorage:', e);
    }
  }
}

export const dbEngine = new GebatDatabaseEngine();
