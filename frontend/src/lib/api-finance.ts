import { api } from './api-client';

export const financeApi = {
  getConnections: () => api.get<{ connections: any[] }>('/finance/connections'),

  getAccounts: (itemId?: string) =>
    api.get<{ accounts: any[]; grouped: any[]; total: number }>(
      `/finance/accounts${itemId ? `?itemId=${itemId}` : ''}`
    ),

  getTransactions: (params?: {
    from?: string;
    to?: string;
    itemId?: string;
    accountId?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);
    if (params?.itemId) queryParams.append('itemId', params.itemId);
    if (params?.accountId) queryParams.append('accountId', params.accountId);
    if (params?.q) queryParams.append('q', params.q);
    queryParams.append('page', String(params?.page ?? 1));
    queryParams.append('limit', String(params?.limit ?? 20));
    return api.get<{
      transactions: any[];
      total?: number;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/finance/transactions?${queryParams.toString()}`);
  },

  getInvestments: (itemId?: string) =>
    api.get<{ investments: any[]; total: number; breakdown: any[] }>(
      `/finance/investments${itemId ? `?itemId=${itemId}` : ''}`
    ),

  getCards: (itemId?: string) =>
    api.get<{ cards: any[] }>(`/finance/cards${itemId ? `?itemId=${itemId}` : ''}`),

  getNetWorthEvolution: (months?: number) =>
    api.get<{ data: Array<{ month: string; value: number }> }>(
      `/finance/net-worth-evolution${months ? `?months=${months}` : ''}`
    ),

  sync: (itemId?: string) =>
    api.post<{ success: boolean; message: string }>('/finance/sync', { itemId }),
};
