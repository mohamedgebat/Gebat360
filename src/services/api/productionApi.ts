import { httpClient } from './client';

export const productionApi = {
  getReports: async () => {
    return httpClient<any[]>('/production');
  },
  createReport: async (data: any) => {
    return httpClient<any>('/production', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
