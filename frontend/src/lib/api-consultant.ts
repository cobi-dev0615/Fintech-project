import { api } from './api-client';

export const consultantApi = {
  getDashboardMetrics: () =>
    api.get<{
      kpis: {
        totalClients: number;
        newClients: number;
        totalNetWorth: number;
        pendingTasks: number;
        prospects: number;
      };
      pipeline: Array<{ stage: string; count: number }>;
      recentTasks: Array<{
        id: string;
        task: string;
        client: string;
        dueDate: string;
        priority: string;
      }>;
    }>('/consultant/dashboard/metrics'),

  getClients: (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page != null) queryParams.append('page', params.page.toString());
    if (params?.limit != null) queryParams.append('limit', params.limit.toString());
    return api.get<{
      clients: Array<{
        id: string;
        name: string;
        email: string;
        netWorth: number;
        status: string;
        lastContact: string;
        walletShared: boolean;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/consultant/clients${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getClient: (id: string) =>
    api.get<{
      client: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        birthDate: string | null;
        riskProfile: string | null;
        createdAt: string;
      };
      walletShared: boolean;
      financial: { netWorth: number; cash: number; investments: number; debt: number } | null;
      notes: Array<{ id: string; content: string; date: string }>;
      reports: Array<{ id: string; type: string; generatedAt: string; downloadUrl: string | null }>;
    }>(`/consultant/clients/${id}`),

  getClientFinance: (clientId: string) =>
    api.get<{
      user: { id: string; name: string; email: string };
      summary: { cash: number; investments: number; debt: number; netWorth: number };
      connections: Array<{ id: string; item_id: string; status: string; institution_name?: string; institution_logo?: string }>;
      accounts: Array<{ id: string; name: string; type: string; current_balance: number | string; institution_name?: string }>;
      investments: Array<{ id: string; type: string; name: string; current_value: number | string; quantity: number; institution_name?: string }>;
      breakdown: Array<{ type: string; count: number; total: number }>;
      cards: Array<{ id: string; brand?: string; last4?: string; institution_name?: string; openDebt: number; latestInvoice?: any }>;
      transactions: Array<{ id: string; date: string; amount: number; description?: string; merchant?: string; account_name?: string; institution_name?: string }>;
    }>(`/consultant/clients/${clientId}/finance`),

  unlinkClient: (clientId: string) =>
    api.delete<{ message: string }>(`/consultant/clients/${clientId}`),

  addClientNote: (clientId: string, note: string) =>
    api.post<{ note: { id: string; content: string; date: string } }>(
      `/consultant/clients/${clientId}/notes`,
      { note }
    ),

  deleteClientNote: (clientId: string, noteId: string) =>
    api.delete<{ message: string }>(`/consultant/clients/${clientId}/notes/${noteId}`),

  getPipeline: () =>
    api.get<{
      prospects: Array<{
        id: string;
        name: string;
        email: string;
        phone: string;
        stage: string;
        notes: string;
        createdAt: string;
      }>;
    }>('/consultant/pipeline'),

  createProspect: (data: { name?: string; email: string; phone?: string; stage?: string; notes?: string }) =>
    api.post<{ prospect: any }>('/consultant/pipeline/prospects', data),

  updateProspect: (id: string, data: { name?: string; email?: string; phone?: string; stage?: string; notes?: string }) =>
    api.post<{ prospect: any }>('/consultant/pipeline/prospects', { id, ...data }),

  updateProspectStage: (id: string, stage: string) =>
    api.patch<{ prospect: any }>(`/consultant/pipeline/prospects/${id}/stage`, { stage }),

  deleteProspect: (id: string) =>
    api.delete<{ message: string }>(`/consultant/pipeline/prospects/${id}`),

  getAvailableCustomers: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return api.get<{
      customers: Array<{ id: string; email: string; name: string | null }>;
    }>(`/consultant/invitations/available-customers${q}`);
  },

  getInvitations: () =>
    api.get<{
      invitations: Array<{
        id: string;
        email: string;
        name: string | null;
        status: string;
        sentAt: string;
        expiresAt: string | null;
      }>;
    }>('/consultant/invitations'),

  sendInvitation: (data: { email: string; name?: string; message?: string }) =>
    api.post<{
      invitation: {
        id: string;
        email: string;
        name: string | null;
        status: string;
        sentAt: string;
      };
    }>('/consultant/invitations', data),

  deleteInvitation: (id: string) =>
    api.delete<{ message: string }>(`/consultant/invitations/${id}`),

  getConversations: () =>
    api.get<{
      conversations: Array<{
        id: string;
        clientId: string;
        clientName: string;
        lastMessage: string;
        timestamp: string;
        unread: number;
      }>;
    }>('/consultant/messages/conversations'),

  createConversation: (customerId: string) =>
    api.post<{
      conversation: { id: string; clientId: string; clientName: string };
    }>('/consultant/messages/conversations', { customerId }),

  getConversation: (id: string) =>
    api.get<{
      conversation: { id: string; clientId: string; clientName: string };
      messages: Array<{
        id: string;
        sender: 'consultant' | 'client';
        content: string;
        timestamp: string;
        attachmentUrl?: string;
        attachmentName?: string;
      }>;
    }>(`/consultant/messages/conversations/${id}`),

  uploadMessageFile: (file: string, filename: string) =>
    api.post<{ url: string; filename: string }>('/consultant/messages/upload', { file, filename }),

  sendMessage: (
    conversationId: string,
    body: string,
    attachment?: { url: string; filename: string }
  ) =>
    api.post<{
      message: { id: string; sender: 'consultant'; content: string; timestamp: string; attachmentUrl?: string; attachmentName?: string };
    }>(`/consultant/messages/conversations/${conversationId}/messages`, {
      body: body || undefined,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.filename,
    }),

  clearHistory: (conversationId: string) =>
    api.delete<{ message: string }>(`/consultant/messages/conversations/${conversationId}/messages`),

  deleteConversation: (conversationId: string) =>
    api.delete<{ message: string }>(`/consultant/messages/conversations/${conversationId}`),

  getReports: (clientId?: string) => {
    const queryParams = new URLSearchParams();
    if (clientId) queryParams.append('clientId', clientId);
    return api.get<{
      reports: Array<{
        id: string;
        clientName: string;
        type: string;
        generatedAt: string;
        status: string;
        hasWatermark: boolean;
        downloadUrl: string | null;
      }>;
    }>(`/consultant/reports${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  generateReport: (data: { clientId?: string; type: string; includeWatermark?: boolean; customBranding?: boolean }) =>
    api.post<{
      report: { id: string; type: string; generatedAt: string; status: string };
      message: string;
    }>('/consultant/reports/generate', data),

  deleteReport: (id: string) =>
    api.delete<{ message: string }>(`/consultant/reports/${id}`),

  getProfile: () =>
    api.get<{
      user: {
        id: string;
        full_name: string;
        email: string;
        role: string;
        phone: string | null;
        birth_date: string | null;
        risk_profile: string | null;
        created_at: string;
        cref?: string | null;
        specialty?: string | null;
        bio?: string | null;
        calendly_url?: string | null;
      };
    }>('/consultant/profile'),

  updateProfile: (data: {
    full_name?: string;
    phone?: string;
    birth_date?: string;
    cref?: string;
    specialty?: string;
    bio?: string;
    calendly_url?: string;
  }) =>
    api.patch<{
      user: {
        id: string;
        full_name: string;
        email: string;
        role: string;
        phone: string | null;
        birth_date: string | null;
        risk_profile: string | null;
        created_at: string;
        cref?: string | null;
        specialty?: string | null;
        bio?: string | null;
        calendly_url?: string | null;
      };
    }>('/consultant/profile', data),
};
