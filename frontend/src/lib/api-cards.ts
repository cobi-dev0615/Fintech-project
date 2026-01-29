import { api } from './api-client';

export const cardsApi = {
  getAll: () => api.get<{ cards: any[] }>('/cards'),

  getInvoices: (cardId: string) =>
    api.get<{ invoices: any[] }>(`/cards/${cardId}/invoices`),

  create: (data: {
    displayName: string;
    brand: string;
    last4: string;
    limitCents?: number;
    institutionId?: string;
    connectionId?: string;
    currency?: string;
  }) => api.post<{ card: any }>('/cards', data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/cards/${id}`),
};
