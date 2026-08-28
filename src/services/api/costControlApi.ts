import { httpClient } from './client';

export const costControlApi = {
  getMetrics: async (wbsId: string) => {
    return httpClient<any>(`/wbs/${wbsId}/cost-control`);
  },
  getTransactions: async (wbsId: string) => {
    return httpClient<any[]>(`/wbs/${wbsId}/transactions`);
  },
  getPaginatedTransactions: async (params: {
    projectId?: string;
    page?: number;
    limit?: number;
    costNature?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.costNature) query.append('costNature', params.costNature);
    if (params.search) query.append('search', params.search);

    return httpClient<{
      data: any[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/transactions?${query.toString()}`);
  },
};
