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
    }>(`/customer/invitations/${id}/accept`),

  declineInvitation: (id: string) =>
    api.post<{ message: string }>(`/customer/invitations/${id}/decline`),

  getConsultants: () =>
    api.get<{
      consultants: Array<{
        id: string;
        consultantId: string;
        name: string;
        email: string;
        isPrimary: boolean;
        status: string;
      }>;
    }>('/customer/consultants'),
};
