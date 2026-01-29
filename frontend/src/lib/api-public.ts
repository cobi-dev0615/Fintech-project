import { api } from './api-client';

export const publicApi = {
  getPlans: (role?: 'customer' | 'consultant', billingPeriod?: 'monthly' | 'annual') => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
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
      }>;
    }>(`/plans${params.toString() ? `?${params.toString()}` : ''}`);
  },
};
