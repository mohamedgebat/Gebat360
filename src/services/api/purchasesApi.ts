import { httpClient } from './client';

export const purchasesApi = {
  getRequests: async () => {
    return httpClient<any[]>('/purchase-requests');
  },
  createRequest: async (data: any) => {
    return httpClient<any>('/purchase-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getOrders: async () => {
    return httpClient<any[]>('/purchase-orders');
  },
  createOrder: async (data: any) => {
    return httpClient<any>('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getSuppliers: async () => {
    return httpClient<any[]>('/suppliers');
  },
  createSupplier: async (data: any) => {
    return httpClient<any>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
