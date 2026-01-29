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
};
