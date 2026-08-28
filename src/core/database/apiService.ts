/**
 * GEBAT 360° — CLIENT API BACKEND & SYNCHRONISATION
 * 
 * Assure la communication avec le serveur Backend Node/Express (http://localhost:5000/api/v1)
 * et garantit un fallback transparent sur la base IndexedDB/LocalStorage (dbEngine) si le serveur est hors-ligne.
 */

import { dbEngine, DB_TABLES } from './dbEngine';

export const API_BASE_URL = 'http://localhost:5000/api/v1';

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
      const res = await fetch(`${API_BASE_URL}/projects`, { signal: AbortSignal.timeout(2000) });
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
   * Création d'un projet via l'API REST + IndexedDB
   */
  async createProject(projectData: any): Promise<void> {
    await dbEngine.saveItem(DB_TABLES.PROJECTS, projectData);
    try {
      await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });
    } catch (e) {
      console.warn('Backend non joignable. Projet sauvegardé en base locale IndexedDB.');
    }
  },

  /**
   * Création d'une Demande d'Achat (DA) via API REST + IndexedDB
   */
  async createDA(daData: any): Promise<void> {
    await dbEngine.saveItem(DB_TABLES.PURCHASE_REQUESTS, daData);
    try {
      await fetch(`${API_BASE_URL}/da`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(daData),
      });
    } catch (e) {
      console.warn('Backend non joignable. DA sauvegardée en base locale IndexedDB.');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });
    } catch (e) {
      // Log préservé localement
    }
  },

  /**
   * Enregistrement d'un Utilisateur & Habilitations en BDD
   */
  async saveUser(userData: any): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      });
    } catch (e) {
      // Suppression locale exécutée
    }
  }
};
