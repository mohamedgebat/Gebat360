import { httpClient } from './client';

export const stockApi = {
  getItems: async () => {
    return httpClient<any[]>('/stock');
  },
  createMovement: async (data: any) => {
    return httpClient<any>('/stock/movements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
