import { api } from './api-client';

export const investmentsApi = {
  getHoldings: () => api.get<{ holdings: any[] }>('/investments/holdings'),

  getSummary: () => api.get<{ summary: any }>('/investments/summary'),
};
