import { api } from './api-client';

export interface PlatformStats {
  activeUsers: number;
  consolidatedAssets: number;
  synchronizedTransactions: number;
}

export const publicApi = {
  getPlatformStats: () =>
    api.get<PlatformStats>('/public/stats'),

  getPlans: (billingPeriod?: 'monthly' | 'annual') => {
    const params = new URLSearchParams();
    if (billingPeriod) params.append('billingPeriod', billingPeriod);
    return api.get<{
      plans: Array<{
        id: string;
        code: string;
        name: string;
        monthlyPriceCents: number;
        annualPriceCents: number;
        priceCents: number;
        connectionLimit: number | null;
        features: string[];
        isActive: boolean;
        role: string | null;
        subscriberCount: number;
      }>;
    }>(`/plans${params.toString() ? `?${params.toString()}` : ''}`);
  },
};
