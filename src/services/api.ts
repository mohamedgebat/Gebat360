/**
 * GEBAT 360° ERP — Client API REST
 * Service de communication HTTP entre le Frontend React et le Backend Express/SQL
 */

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 
  'https://gebat360-production.up.railway.app/api/v1'
).replace(/\/$/, '');

export class ApiService {
  static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || payload?.error || `Erreur HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
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
    const raw = await this.request<any[]>('/da');
    if (!Array.isArray(raw)) return [];
    return raw.map(da => ({
      ...da,
      daNumber: da.daNumber || da.da_number || da.code || da.id,
      projectId: da.projectId || da.project_id,
      wbsCode: da.wbsCode || da.wbs_code || da.wbsId || da.wbs_id,
      requestedBy: da.requestedBy || da.requested_by,
      requestDate: da.requestDate || da.request_date || da.date,
      requiredDate: da.requiredDate || da.required_date,
      estimatedTotal: Number(da.estimatedTotal || da.estimated_total || da.amount || 0),
      items: Array.isArray(da.items) ? da.items : (typeof da.items === 'string' ? JSON.parse(da.items || '[]') : [])
    }));
  }

  static async createPurchaseRequest(da: any): Promise<any> {
    return this.request<any>('/da', {
      method: 'POST',
      body: JSON.stringify(da),
    });
  }

  // 6. Stock & Consommations
  static async getStockItems(): Promise<any[]> {
    const raw = await this.request<any[]>('/stock/items');
    if (!Array.isArray(raw)) return [];
    return raw.map(item => ({
      ...item,
      projectId: item.projectId || item.project_id,
      warehouseId: item.warehouseId || item.warehouse_id,
      currentStock: Number(item.currentStock || item.current_stock || item.quantity || 0),
      minStock: Number(item.minStock || item.min_stock || 0),
      securityStock: Number(item.securityStock || item.security_stock || 0),
      averageUnitPrice: Number(item.averageUnitPrice || item.average_unit_price || item.unitPrice || 0),
      totalValue: Number(item.totalValue || item.total_value || ((item.currentStock || item.current_stock || 0) * (item.averageUnitPrice || item.average_unit_price || 0)))
    }));
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
    const raw = await this.request<any[]>('/stock/movements');
    if (!Array.isArray(raw)) return [];
    return raw.map(m => ({
      ...m,
      itemId: m.itemId || m.item_id,
      itemName: m.itemName || m.item_name,
      projectId: m.projectId || m.project_id,
      wbsCode: m.wbsCode || m.wbs_code,
      performedBy: m.performedBy || m.performed_by,
      costNature: m.costNature || m.cost_nature || 'MAT',
      unitPrice: Number(m.unitPrice || m.unit_price || 0),
      totalCost: Number(m.totalCost || m.total_cost || ((m.unitPrice || m.unit_price || 0) * (m.quantity || 0))),
      quantity: Number(m.quantity || 0)
    }));
  }

  // 7. Audit Trail
  static async getAuditLogs(): Promise<any[]> {
    const raw = await this.request<any[]>('/audit');
    if (!Array.isArray(raw)) return [];
    return raw.map(log => ({
      ...log,
      userName: log.userName || log.user_name || log.user,
      userRole: log.userRole || log.user_role || log.role,
      targetEntity: log.targetEntity || log.target_entity,
      targetId: log.targetId || log.target_id,
      timestamp: log.timestamp || log.created_at || new Date().toISOString()
    }));
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
    const raw = await this.request<any[]>('/purchase-orders');
    if (!Array.isArray(raw)) return [];
    return raw.map(po => ({
      ...po,
      poNumber: po.poNumber || po.po_number || po.code || po.id,
      daId: po.daId || po.da_id,
      projectId: po.projectId || po.project_id,
      supplierName: po.supplierName || po.supplier_name || po.supplier,
      orderDate: po.orderDate || po.order_date || po.date,
      deliveryDate: po.deliveryDate || po.delivery_date,
      totalAmount: Number(po.totalAmount || po.total_amount || po.amount || 0),
      items: Array.isArray(po.items) ? po.items : (typeof po.items === 'string' ? JSON.parse(po.items || '[]') : [])
    }));
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
    const raw = await this.request<any[]>('/daily-reports');
    if (!Array.isArray(raw)) return [];
    return raw.map(r => ({
      ...r,
      code: r.code || r.reportCode || r.report_code || r.id,
      reportCode: r.reportCode || r.report_code || r.code || r.id,
      projectId: r.projectId || r.project_id,
      projectName: r.projectName || r.project_name || '',
      wbsId: r.wbsId || r.wbs_id || '',
      wbsCode: r.wbsCode || r.wbs_code || '',
      activityName: r.activityName || r.activity_name || '',
      plannedQty: Number(r.plannedQty || r.planned_qty || 0),
      targetQty: Number(r.targetQty || r.target_qty || r.plannedQty || r.planned_qty || 0),
      realizedQty: Number(r.realizedQty || r.realized_qty || 0),
      unit: r.unit || 'U',
      workersCount: Number(r.workersCount || r.workers_count || 0),
      hoursWorked: Number(r.hoursWorked || r.hours_worked || 8),
      equipmentCount: Number(r.equipmentCount || r.equipment_count || 0),
      equipmentHours: Number(r.equipmentHours || r.equipment_hours || 0),
      createdBy: r.createdBy || r.created_by || 'Chef de Chantier',
      productivityRate: Number(r.productivityRate || r.productivity_rate || 100),
      consummations: Array.isArray(r.consummations) ? r.consummations : (typeof r.consummations === 'string' ? JSON.parse(r.consummations || '[]') : []),
      historyLogs: Array.isArray(r.historyLogs || r.history_logs) ? (r.historyLogs || r.history_logs) : (typeof (r.historyLogs || r.history_logs) === 'string' ? JSON.parse(r.historyLogs || r.history_logs || '[]') : []),
      rejectionHistory: Array.isArray(r.rejectionHistory || r.rejection_history) ? (r.rejectionHistory || r.rejection_history) : (typeof (r.rejectionHistory || r.rejection_history) === 'string' ? JSON.parse(r.rejectionHistory || r.rejection_history || '[]') : [])
    }));
  }

  static async createDailyReport(report: any): Promise<any> {
    return this.request<any>('/daily-reports', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  // 13. Alertes & Risques
  static async getAlerts(): Promise<any[]> {
    const raw = await this.request<any[]>('/alerts');
    if (!Array.isArray(raw)) return [];
    return raw.map(a => ({
      ...a,
      projectId: a.projectId || a.project_id,
      wbsId: a.wbsId || a.wbs_id,
      wbsCode: a.wbsCode || a.wbs_code,
      observedValue: a.observedValue || a.observed_value,
      thresholdValue: a.thresholdValue || a.threshold_value,
      assignedToRole: a.assignedToRole || a.assigned_to_role,
      createdAt: a.createdAt || a.created_at || new Date().toISOString()
    }));
  }

  static async resolveAlert(alertId: string): Promise<any> {
    return this.request<any>(`/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Résolu' }),
    }).catch(() => null);
  }

  static async deleteAlert(alertId: string): Promise<any> {
    return this.request<any>(`/alerts/${alertId}`, {
      method: 'DELETE',
    }).catch(() => null);
  }

  static async clearTestAlerts(): Promise<any> {
    return this.request<any>(`/alerts/purge/test`, {
      method: 'POST',
    }).catch(() => null);
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
