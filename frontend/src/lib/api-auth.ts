import { api } from './api-client';

export const authApi = {
  register: (data: { full_name: string; email: string; password: string; role?: string }) =>
    api.post<{ user: any; token?: string; requiresApproval?: boolean }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<{ user: any; token: string }>('/auth/login', data),

  me: () => api.get<{ user: any }>('/auth/me'),
};
