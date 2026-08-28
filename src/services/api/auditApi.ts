import { httpClient } from './client';

export const auditApi = {
  getLogs: async () => {
    return httpClient<any[]>('/audit-logs');
  },
};
