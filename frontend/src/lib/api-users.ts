import { api } from './api-client';

export const userApi = {
  getProfile: () => api.get<{ user: any }>('/users/profile'),

  updateProfile: (
    data: Partial<{ full_name: string; phone: string; birth_date: string; risk_profile: string }>
  ) => api.patch<{ user: any }>('/users/profile', data),

  getUserCounts: () =>
    api.get<{ totalUsers: number; onlineUsers: number }>('/users/stats/user-counts'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch<{ message: string }>('/users/profile/password', data),
};
