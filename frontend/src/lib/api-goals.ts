import { api } from './api-client';

export const goalsApi = {
  getAll: () =>
    api.get<{
      goals: Array<{
        id: string;
        name: string;
        target: number;
        current: number;
        deadline: string | null;
        category: string;
      }>;
    }>('/goals'),

  create: (data: { name: string; target: number; deadline?: string; category?: string }) =>
    api.post<{
      goal: {
        id: string;
        name: string;
        target: number;
        current: number;
        deadline: string | null;
        category: string;
      };
    }>('/goals', data),

  update: (
    id: string,
    data: { name?: string; target?: number; current?: number; deadline?: string; category?: string }
  ) =>
    api.patch<{
      goal: {
        id: string;
        name: string;
        target: number;
        current: number;
        deadline: string | null;
        category: string;
      };
    }>(`/goals/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/goals/${id}`),
};
