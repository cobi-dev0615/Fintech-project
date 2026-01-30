import { api } from './api-client';

export const reportsApi = {
  getAll: () =>
    api.get<{
      reports: Array<{
        id: string;
        type: string;
        generatedAt: string;
        status: string;
        downloadUrl: string | null;
      }>;
    }>('/reports'),

  generate: (data: { type: string; dateRange?: string; params?: any }) =>
    api.post<{
      report: {
        id: string;
        type: string;
        generatedAt: string;
        status: string;
      };
      message: string;
    }>('/reports/generate', data),

  delete: (id: string) =>
    api.delete<{ ok: boolean; message: string }>(`/reports/${id}`),
};
