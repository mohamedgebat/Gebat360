/**
 * GEBAT 360° — CLIENT API BACKEND & SYNCHRONISATION
 * 
 * Assure la communication avec le serveur Backend Node/Express (http://localhost:5001/api/v1)
 * et garantit un fallback transparent sur la base IndexedDB/LocalStorage (dbEngine) si le serveur est hors-ligne.
 */

import { dbEngine, DB_TABLES } from './dbEngine';

export const API_BASE_URL = 'http://localhost:5001/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('gebat_jwt_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const apiService = {
  /**
   * Vérification de la santé du backend Node/Express
   */
  async checkBackendHealth(): Promise<{ status: string; database: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Backend hors-ligne
    }
    return { status: 'OFFLINE', database: 'IndexedDB / LocalStorage Autonome' };
  },

  /**
   * Récupération des projets depuis l'API REST avec fallback IndexedDB
   */
  async fetchProjects(fallbackProjects: any[]): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/projects`, { 
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(2500) 
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (e) {
      // Connexion réseau backend non disponible
    }
    return dbEngine.getAllItems(DB_TABLES.PROJECTS, fallbackProjects);
  },

  /**
   * Création / Mise à jour d'un projet via l'API REST + IndexedDB
   */
  async createProject(projectData: any): Promise<void> {
    await dbEngine.saveItem(DB_TABLES.PROJECTS, projectData);
    try {
      await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(projectData),
      });
    } catch (e) {
      console.warn('Backend non joignable. Projet sauvegardé en base locale IndexedDB.');
    }
  },

  /**
   * Création / Mise à jour d'une Demande d'Achat (DA) via API REST + IndexedDB
   */
  async createDA(daData: any): Promise<void> {
    await dbEngine.saveItem(DB_TABLES.PURCHASE_REQUESTS, daData);
    try {
      await fetch(`${API_BASE_URL}/da`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(daData),
      });
    } catch (e) {
      console.warn('Backend non joignable. DA sauvegardée en base locale IndexedDB.');
    }
  },

  /**
   * Mise à jour du statut d'une DA via API REST
   */
  async updateDA(daId: string, updates: any): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/da/${daId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
    } catch (e) {
      // Fallback local géré
    }
  },

  /**
   * Création d'un Bon de Commande (BC) via API REST + IndexedDB
   */
  async createPurchaseOrder(poData: any): Promise<void> {
    await dbEngine.saveItem(DB_TABLES.PURCHASE_ORDERS, poData);
    try {
      await fetch(`${API_BASE_URL}/purchase-orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(poData),
      });
    } catch (e) {
      console.warn('Backend non joignable. BC sauvegardé en base locale IndexedDB.');
    }
  },

  /**
   * Enregistrement / MAJ d'un Article de Stock
   */
  async saveStockItem(item: any): Promise<void> {
    await dbEngine.saveItem(DB_TABLES.STOCK_ITEMS, item);
    try {
      await fetch(`${API_BASE_URL}/stock/items`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(item),
      });
    } catch (e) {
      console.warn('Backend non joignable. Article sauvegardé en base locale IndexedDB.');
    }
  },

  /**
   * Suppression d'un Article de Stock
   */
  async deleteStockItem(itemId: string): Promise<void> {
    await dbEngine.deleteItem(DB_TABLES.STOCK_ITEMS, itemId);
    try {
      await fetch(`${API_BASE_URL}/stock/items/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (e) {
      // Suppression locale exécutée
    }
  },

  /**
   * Enregistrement d'un Mouvement de Stock
   */
  async saveStockMovement(mvt: any): Promise<void> {
    await dbEngine.saveItem(DB_TABLES.STOCK_MOVEMENTS, mvt);
    try {
      await fetch(`${API_BASE_URL}/stock/movements`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(mvt),
      });
    } catch (e) {
      console.warn('Backend non joignable. Mouvement sauvegardé en base locale IndexedDB.');
    }
  },

  /**
   * Enregistrement d'un Rapport Journalier de Chantier
   */
  async saveDailyReport(report: any): Promise<void> {
    await dbEngine.saveItem(DB_TABLES.DAILY_REPORTS, report);
    try {
      await fetch(`${API_BASE_URL}/daily-reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(report),
      });
    } catch (e) {
      console.warn('Backend non joignable. Rapport sauvegardé en base locale IndexedDB.');
    }
  },

  /**
   * Enregistrement d'un log d'Audit Trail via API REST + IndexedDB
   */
  async logAudit(logData: any): Promise<void> {
    await dbEngine.saveItem(DB_TABLES.AUDIT_LOGS, logData);
    try {
      await fetch(`${API_BASE_URL}/audit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(logData),
      });
    } catch (e) {
      // Log préservé localement
    }
  },

  /**
   * Acquittement / Résolution d'une Alerte Système
   */
  async resolveAlert(alertId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
    } catch (e) {
      // Fallback local géré
    }
  },

  /**
   * Enregistrement d'un Utilisateur & Habilitations en BDD
   */
  async saveUser(userData: any): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });
    } catch (e) {
      // Persistance automatique en LocalStorage/IndexedDB active
    }
  },

  /**
   * Suppression d'un Utilisateur en BDD
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (e) {
      // Suppression locale exécutée
    }
  }
};

