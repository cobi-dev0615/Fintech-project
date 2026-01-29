import { api } from './api-client';

export const commentsApi = {
  getAll: (page?: number, limit?: number) =>
    api.get<{
      comments: Array<{
        id: string;
        title: string | null;
        content: string;
        reply: string | null;
        status: string;
        processed_at: string | null;
        created_at: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/comments${page || limit ? `?page=${page || 1}&limit=${limit || 10}` : ''}`),

  create: (data: { title?: string; content: string }) =>
    api.post<{ comment: any; message: string }>('/comments', data),

  delete: (id: string) => api.delete<{ message: string }>(`/comments/${id}`),
};
