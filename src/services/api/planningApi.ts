import { httpClient } from './client';

export const planningApi = {
  getTasks: async () => {
    return httpClient<any[]>('/planning');
  },
  createTask: async (data: any) => {
    return httpClient<any>('/planning', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
