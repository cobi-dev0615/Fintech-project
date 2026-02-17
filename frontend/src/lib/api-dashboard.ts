import { api } from './api-client';

export const dashboardApi = {
  getSummary: () =>
    api.get<{
      netWorth: number;
      cashBalance: number;
      investmentValue: number;
      recentTransactionsCount: number;
      unreadAlertsCount: number;
    }>('/dashboard/summary'),

  getNetWorthEvolution: (months?: number) =>
    api.get<{ data: Array<{ month: string; change: number }> }>(
      `/dashboard/net-worth-evolution${months ? `?months=${months}` : ''}`
    ),

  getFinance: () =>
    api.get<{
      summary: { cash: number; investments: number; debt: number; netWorth: number };
      accounts: Array<{ id: string; name: string; type: string; current_balance: number; institution_name?: string }>;
      investments: Array<{ id: string; type: string; name: string; current_value: number; quantity?: number; institution_name?: string }>;
      breakdown: Array<{ type: string; count: number; total: number }>;
      cards: Array<{ id: string; brand?: string; last4?: string; institution_name?: string; openDebt: number }>;
      transactions: Array<{ id: string; date: string; amount: number; description?: string; merchant?: string; account_name?: string; institution_name?: string }>;
    }>('/dashboard/finance'),
};
