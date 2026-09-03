/**
 * GEBAT 360° ERP — Client API REST
 * Service de communication HTTP entre le Frontend React et le Backend Express/SQL
 */

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 
  'https://gebat360-production.up.railway.app/api/v1'
).replace(/\/$/, '');

export class ApiService {
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('gebat_jwt_token');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (!response.ok) {
        return null as unknown as T;
      }

      return await response.json();
    } catch {
      return null as unknown as T;
    }
  }

  // 1. Authentification Réelle
  static async login(email: string, password: string): Promise<{ accessToken: string; user: any; message: string }> {
    return this.request<{ accessToken: string; user: any; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static async getMe(): Promise<{ user: any }> {
    return this.request<{ user: any }>('/auth/me');
  }

  static async logout(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  // 2. Health Check API Backend
  static async checkHealth(): Promise<{ status: string; system: string; database: string }> {
    return this.request<{ status: string; system: string; database: string }>('/health');
  }

  // 3. Projets
  static async getProjects(): Promise<any[]> {
    const raw = await this.request<any[]>('/projects');
    if (!Array.isArray(raw)) return [];
    return raw.map(p => ({
      ...p,
      contractAmount: Number(p.contractAmount || p.contract_amount || 0),
      initialBudget: Number(p.initialBudget || p.initial_budget || 0),
      revisedBudget: Number(p.revisedBudget || p.revised_budget || 0),
      contractRef: p.contractRef || p.contract_ref,
      startDate: p.startDate || p.start_date,
      endDate: p.endDate || p.end_date,
      durationMonths: Number(p.durationMonths || p.duration_months || 12),
      progress: Number(p.progress || 0)
    }));
  }

  static async createProject(project: any): Promise<any> {
    return this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  // 4. WBS (Work Breakdown Structure)
  static async getProjectWbs(projectId: string): Promise<any[]> {
    return this.request<any[]>(`/projects/${projectId}/wbs`);
  }

  // 5. Demandes d'Achat (DA)
  static async getPurchaseRequests(): Promise<any[]> {
    return this.request<any[]>('/da');
  }

  static async createPurchaseRequest(da: any): Promise<any> {
    return this.request<any>('/da', {
      method: 'POST',
      body: JSON.stringify(da),
    });
  }

  // 6. Stock & Consommations
  static async getStockItems(): Promise<any[]> {
    return this.request<any[]>('/stock/items');
  }

  static async createStockItem(item: any): Promise<any> {
    return this.request<any>('/stock/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  static async updateStockItem(id: string, item: any): Promise<any> {
    return this.request<any>(`/stock/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  static async deleteStockItem(id: string): Promise<any> {
    return this.request<any>(`/stock/items/${id}`, {
      method: 'DELETE',
    });
  }

  static async getStockMovements(): Promise<any[]> {
    return this.request<any[]>('/stock/movements');
  }

  // 7. Audit Trail
  static async getAuditLogs(): Promise<any[]> {
    return this.request<any[]>('/audit');
  }

  static async addAuditLog(log: any): Promise<any> {
    return this.request<any>('/audit', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  // 8. Utilisateurs & Habilitations (Réel)
  static async getUsers(): Promise<any[]> {
    return this.request<any[]>('/users');
  }

  static async createUser(user: any): Promise<any> {
    return this.request<any>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  static async updateUser(userId: string, user: any): Promise<any> {
    return this.request<any>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  static async deleteUser(userId: string): Promise<any> {
    return this.request<any>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // 9. Sites & Chantiers
  static async getSites(): Promise<any[]> {
    return this.request<any[]>('/sites');
  }

  // 10. Bons de Commande & Fournisseurs
  static async getPurchaseOrders(): Promise<any[]> {
    return this.request<any[]>('/purchase-orders');
  }

  static async createPurchaseOrder(po: any): Promise<any> {
    return this.request<any>('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(po),
    });
  }

  // 11. Mouvements de Stock
  static async createStockMovement(mvt: any): Promise<any> {
    return this.request<any>('/stock/movements', {
      method: 'POST',
      body: JSON.stringify(mvt),
    });
  }

  // 12. Rapports Journaliers / Production
  static async getDailyReports(): Promise<any[]> {
    return this.request<any[]>('/daily-reports');
  }

  static async createDailyReport(report: any): Promise<any> {
    return this.request<any>('/daily-reports', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  // 13. Alertes & Risques
  static async getAlerts(): Promise<any[]> {
    return this.request<any[]>('/alerts');
  }

  static async resolveAlert(alertId: string): Promise<any> {
    return this.request<any>(`/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Résolu' }),
    });
  }

  static async updateProject(projectId: string, data: any): Promise<any> {
    return this.request<any>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static async deleteProject(projectId: string): Promise<any> {
    return this.request<any>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  static async updateDailyReport(reportId: string, data: any): Promise<any> {
    return this.request<any>(`/daily-reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static async deleteDailyReport(reportId: string): Promise<any> {
    return this.request<any>(`/daily-reports/${reportId}`, {
      method: 'DELETE',
    });
  }

  static async updatePurchaseRequest(daId: string, data: any): Promise<any> {
    return this.request<any>(`/da/${daId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static async deletePurchaseRequest(daId: string): Promise<any> {
    return this.request<any>(`/da/${daId}`, {
      method: 'DELETE',
    });
  }

  static async getRisks(): Promise<any[]> {
    return this.request<any[]>('/risks');
  }

  static async getCostNatures(): Promise<any[]> {
    return this.request<any[]>('/cost-natures');
  }
}
