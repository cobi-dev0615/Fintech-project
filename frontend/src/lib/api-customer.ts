import { api } from './api-client';

export const customerApi = {
  getInvitations: () =>
    api.get<{
      invitations: Array<{
        id: string;
        consultantId: string;
        consultantName: string;
        consultantEmail: string;
        status: string;
        sentAt: string;
        expiresAt: string | null;
      }>;
    }>('/customer/invitations'),

  acceptInvitation: (id: string) =>
    api.post<{
      invitation: {
        id: string;
        consultantId: string;
        status: string;
      };
    }>(`/customer/invitations/${id}/accept`, {}),

  declineInvitation: (id: string) =>
    api.post<{ message: string }>(`/customer/invitations/${id}/decline`, {}),

  getConsultants: () =>
    api.get<{
      consultants: Array<{
        id: string;
        consultantId: string;
        name: string;
        email: string;
        isPrimary: boolean;
        status: string;
        canViewAll?: boolean;
      }>;
    }>('/customer/consultants'),

  disconnectConsultant: (linkId: string) =>
    api.post<{ message: string }>(`/customer/consultants/${linkId}/disconnect`, {}),

  updateConsultantWalletShare: (linkId: string, canViewAll: boolean) =>
    api.patch<{ id: string; canViewAll: boolean; message: string }>(`/customer/consultants/${linkId}`, { can_view_all: canViewAll }),

  getReferralLink: () =>
    api.get<{ link: string; token: string }>('/customer/referral-link'),

  getInvitedUsers: () =>
    api.get<{
      invitedUsers: Array<{
        id: string;
        name: string;
        email: string;
        status: string;
        registeredAt: string;
      }>;
      invitedCount: number;
    }>('/customer/invited-users'),

  getConversations: () =>
    api.get<{
      conversations: Array<{
        id: string;
        consultantId: string;
        consultantName: string;
        lastMessage: string;
        timestamp: string;
        unread: number;
      }>;
    }>('/customer/messages/conversations'),

  getConversation: (id: string) =>
    api.get<{
      conversation: { id: string; consultantId: string; consultantName: string };
      messages: Array<{
        id: string;
        sender: 'consultant' | 'client';
        content: string;
        timestamp: string;
        attachmentUrl?: string;
        attachmentName?: string;
      }>;
    }>(`/customer/messages/conversations/${id}`),

  uploadMessageFile: (file: string, filename: string) =>
    api.post<{ url: string; filename: string }>('/customer/messages/upload', { file, filename }),

  sendMessage: (
    conversationId: string,
    body: string,
    attachment?: { url: string; filename: string }
  ) =>
    api.post<{
      message: { id: string; sender: string; content: string; timestamp: string; attachmentUrl?: string; attachmentName?: string };
    }>(`/customer/messages/conversations/${conversationId}/messages`, {
      body: body || undefined,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.filename,
    }),

  clearHistory: (conversationId: string) =>
    api.delete<{ message: string }>(`/customer/messages/conversations/${conversationId}/messages`),

  deleteConversation: (conversationId: string) =>
    api.delete<{ message: string }>(`/customer/messages/conversations/${conversationId}`),
};
