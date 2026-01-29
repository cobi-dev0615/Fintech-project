import { api } from './api-client';

export const connectionsApi = {
  getAll: () => api.get<{ connections: any[] }>('/connections'),

  getInstitutions: (provider?: string) =>
    api.get<{ institutions: any[] }>(
      `/connections/institutions${provider ? `?provider=${provider}` : ''}`
    ),

  getConnectToken: () => api.post<{ connectToken: string }>('/connections/connect-token', {}),

  create: (data: { itemId: string; institutionId?: string }) =>
    api.post<{ connection: any }>('/connections', data),

  sync: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/connections/${id}/sync`),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/connections/${id}`),
};
