import { api } from './api-client';

export const accountsApi = {
  getAll: () => api.get<{ accounts: any[] }>('/accounts'),

  getTransactions: (accountId?: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (accountId) params.append('accountId', accountId);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return api.get<{
      transactions: any[];
      pagination: {
        total: number;
        limit: number;
        offset: number;
        totalPages: number;
      };
    }>(`/accounts/transactions${params.toString() ? `?${params.toString()}` : ''}`);
  },
};
