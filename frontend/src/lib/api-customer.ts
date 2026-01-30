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
};
