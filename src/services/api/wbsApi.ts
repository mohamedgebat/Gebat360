import { httpClient } from './client';

export const wbsApi = {
  getByProject: async (projectId: string) => {
    return httpClient<any[]>(`/projects/${projectId}/wbs`);
  },
  create: async (data: any) => {
    return httpClient<any>('/wbs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return httpClient<any>(`/wbs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
