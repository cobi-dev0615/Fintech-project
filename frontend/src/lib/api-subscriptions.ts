import { api } from './api-client';

export type PlanFeatures = Record<string, number | null>;

export interface SubscriptionResponse {
  subscription: {
    id: string;
    status: string;
    startedAt: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    canceledAt: string | null;
    plan: {
      id: string;
      code: string;
      name: string;
      priceCents: number;
    };
    features?: PlanFeatures;
  } | null;
  features?: PlanFeatures;
  planCode?: string;
}

export const subscriptionsApi = {
  getMySubscription: () =>
    api.get<SubscriptionResponse>('/subscriptions/me'),

  createSubscription: (
    planId: string,
    paymentData?: {
      paymentMethod: string;
      cardNumber?: string;
      cardName?: string;
      expiryDate?: string;
      cvv?: string;
      billing: {
        name: string;
        email: string;
        phone: string;
        document: string;
        zipCode: string;
        address: string;
        city: string;
        state: string;
      };
    },
    billingPeriod?: 'monthly' | 'annual'
  ) =>
    api.post<{
      subscription: {
        id: string;
        status: string;
        startedAt: string;
        currentPeriodStart: string;
        currentPeriodEnd: string;
        plan: {
          id: string;
          code: string;
          name: string;
          priceCents: number;
        };
      };
      payment?: {
        preferenceId: string;
        checkoutUrl: string;
      };
    }>('/subscriptions', {
      planId,
      billingPeriod: billingPeriod || 'monthly',
      ...(paymentData && { payment: paymentData }),
    }),

  cancelSubscription: () =>
    api.patch<{ message: string }>('/subscriptions/cancel'),

  getHistory: (page?: number, limit?: number) =>
    api.get<{
      history: Array<{
        id: string;
        status: string;
        planName: string;
        priceCents: number;
        startedAt: string;
        currentPeriodStart: string;
        currentPeriodEnd: string;
        canceledAt: string | null;
        createdAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/subscriptions/history${page || limit ? `?page=${page || 1}&limit=${limit || 10}` : ''}`),
};
