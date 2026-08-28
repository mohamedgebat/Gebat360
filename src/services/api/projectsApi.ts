import { httpClient } from './client';

export const projectsApi = {
  getAll: async () => {
    return httpClient<any[]>('/projects');
  },
  getById: async (id: string) => {
    return httpClient<any>(`/projects/${id}`);
  },
  create: async (data: any) => {
    return httpClient<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return httpClient<any>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return httpClient<any>(`/projects/${id}`, {
      method: 'DELETE',
    });
  },
  getDashboardKpis: async (id: string) => {
    return httpClient<{
      projectId: string;
      projectName: string;
      contractAmount: number;
      budget: number;
      actualCost: number;
      committed: number;
      eac: number;
      forecastMargin: number;
      marginPercent: number;
      progress: number;
      healthStatus: string;
    }>(`/dashboard/project/${id}`);
  },
};
