import { api } from './api-client';

export const notificationsApi = {
  getAll: (page?: number, limit?: number) =>
    api.get<{
      notifications: Array<{
        id: string;
        severity: 'info' | 'warning' | 'critical';
        title: string;
        message: string;
        isRead: boolean;
        linkUrl: string | null;
        metadata: Record<string, any>;
        createdAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/notifications${page || limit ? `?page=${page || 1}&limit=${limit || 50}` : ''}`),

  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),

  markAsRead: (id: string) =>
    api.patch<{ success: boolean }>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch<{ success: boolean }>('/notifications/read-all'),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/notifications/${id}`),

  getPreferences: () =>
    api.get<{
      preferences: Record<string, {
        enabled: boolean;
        emailEnabled: boolean;
        pushEnabled: boolean;
      }>;
    }>('/notifications/preferences'),

  updatePreference: (
    type: string,
    preferences: {
      enabled?: boolean;
      emailEnabled?: boolean;
      pushEnabled?: boolean;
    }
  ) =>
    api.patch<{ success: boolean }>(`/notifications/preferences/${type}`, preferences),
};
