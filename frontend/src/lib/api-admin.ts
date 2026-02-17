import { api } from './api-client';

export const adminApi = {
  getPlans: () =>
    api.get<{
      plans: Array<{
        id: string;
        code: string;
        name: string;
        priceCents: number;
        monthlyPriceCents: number | null;
        annualPriceCents: number | null;
        connectionLimit: number | null;
        features: string[];
        isActive: boolean;
        role: string | null;
      }>;
    }>('/admin/plans'),

  deletePlan: (id: string) =>
    api.delete<{ message: string }>(`/admin/plans/${id}`),

  getDashboardMetrics: (year?: number) => {
    const params = year ? `?year=${year}` : '';
    return api.get<{
      kpis: { activeUsers: number; newUsers: number; mrr: number; churnRate: number; usersGrowth: number; newUsersGrowth: number; mrrGrowth: number; churnGrowth: number };
      userGrowth: Array<{ month: string; users: number }>;
      revenue: Array<{ month: string; revenue: number }>;
      alerts: Array<{ id: string; type: string; message: string; time: string }>;
    }>(`/admin/dashboard/metrics${params}`);
  },

  getUsers: (params?: { search?: string; role?: string; status?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page != null) queryParams.append('page', params.page.toString());
    if (params?.limit != null) queryParams.append('limit', params.limit.toString());
    return api.get<{
      users: Array<{ id: string; name: string; email: string; role: string; status: string; plan: string | null; createdAt: string }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getCustomerFinance: (userId: string) =>
    api.get<{
      user: { id: string; name: string; email: string };
      summary: { cash: number; investments: number; debt: number; netWorth: number };
      connections: Array<{ id: string; item_id: string; status: string; institution_name?: string; institution_logo?: string }>;
      accounts: Array<{ id: string; name: string; type: string; current_balance: number | string; institution_name?: string }>;
      investments: Array<{ id: string; type: string; name: string; current_value: number | string; quantity: number; institution_name?: string }>;
      breakdown: Array<{ type: string; count: number; total: number }>;
      cards: Array<{ id: string; brand?: string; last4?: string; institution_name?: string; openDebt: number; latestInvoice?: any }>;
      transactions: Array<{ id: string; date: string; amount: number; description?: string; merchant?: string; account_name?: string; institution_name?: string }>;
    }>(`/admin/users/${userId}/finance`),

  getUserInvestments: (userId: string, itemId?: string) => {
    const q = itemId ? `?itemId=${itemId}` : '';
    return api.get<{
      user: { id: string; name: string };
      investments: Array<{
        id: string;
        type: string;
        name: string;
        current_value: number | string;
        quantity: number;
        institution_name?: string;
        institution_logo?: string;
      }>;
      total: number;
      breakdown: Array<{ type: string; count: number; total: number }>;
    }>(`/admin/users/${userId}/investments${q}`);
  },

  getUser: (id: string) =>
    api.get<{
      user: {
        id: string;
        name: string;
        email: string;
        role: string;
        phone: string | null;
        countryCode: string;
        isActive: boolean;
        birthDate: string | null;
        riskProfile: string | null;
        status: string;
        createdAt: string;
        updatedAt: string;
        subscription: { id: string; status: string; currentPeriodStart: string; currentPeriodEnd: string; planName: string; planPrice: number } | null;
        financialSummary: { cash: number; investments: number; debt: number; netWorth: number };
        stats: { connections: number; goals: number; clients: number };
        consultants: Array<{ id: string; name: string; email: string; relationshipStatus: string; relationshipCreatedAt: string }>;
      };
    }>(`/admin/users/${id}`),

  updateUserRole: (id: string, role: string) =>
    api.patch<{ message: string }>(`/admin/users/${id}/role`, { role }),

  updateUserStatus: (id: string, status: 'active' | 'blocked') =>
    api.patch<{ message: string }>(`/admin/users/${id}/status`, { status }),

  approveUser: (id: string) =>
    api.patch<{ message: string; user: any }>(`/admin/users/${id}/approve`, {}),

  rejectUser: (id: string, reason?: string) =>
    api.patch<{ message: string; user: any }>(`/admin/users/${id}/reject`, { reason }),

  deleteUser: (id: string) =>
    api.delete<{ message: string; deletedUser: { id: string; full_name: string; email: string } }>(`/admin/users/${id}`),

  getCustomerWallets: (params?: { page?: number; limit?: number; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page != null) queryParams.append('page', params.page.toString());
    if (params?.limit != null) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    return api.get<{
      wallets: Array<{
        customerId: string;
        name: string;
        email: string;
        createdAt: string;
        summary: { cash: number; investments: number; debt: number; netWorth: number };
        accounts: Array<{ id: string; displayName: string; accountType: string; balanceCents: number; balance: number; currency: string; lastRefreshedAt: string | null }>;
        holdings: Array<{ id: string; marketValueCents: number; marketValue: number; currency: string; quantity: number }>;
        cards: Array<{ id: string; displayName: string; balanceCents: number; openInvoiceCents: number; debt: number; currency: string }>;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/wallets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getSubscriptions: (params?: { search?: string; status?: string; plan?: string; page?: number; limit?: number; startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.plan) queryParams.append('plan', params.plan);
    if (params?.page != null) queryParams.append('page', params.page.toString());
    if (params?.limit != null) queryParams.append('limit', params.limit.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    return api.get<{
      subscriptions: Array<{ id: string; user: string; email: string; plan: string; amount: number; status: string; nextBilling: string; createdAt: string }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/subscriptions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getSubscription: (id: string) =>
    api.get<{
      id: string;
      userId: string;
      planId: string;
      status: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
      canceledAt: string | null;
      createdAt: string;
      updatedAt: string;
      user: { id: string; name: string; email: string; phone: string | null };
      plan: { id: string; name: string; code: string; price: number; connectionLimit: number | null; features: string[] };
    }>(`/admin/subscriptions/${id}`),

  getFinancialReports: (params?: { period?: string; year?: number; dateFrom?: string; dateTo?: string }) => {
    const q = new URLSearchParams();
    if (params?.period) q.append('period', params.period);
    if (params?.year != null) q.append('year', String(params.year));
    if (params?.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params?.dateTo) q.append('dateTo', params.dateTo);
    const query = q.toString();
    return api.get<{
      revenue: Array<{ month: string; revenue: number; subscriptions: number }>;
      mrr: number;
      commissions: Array<{ consultant: string; clients: number; commission: number }>;
      transactions: Array<{ id: string; date: string; type: string; amount: number; client: string }>;
    }>(`/admin/financial/reports${query ? `?${query}` : ''}`);
  },

  getIntegrations: () =>
    api.get<{
      integrations: Array<{ id: string; name: string; provider: string; status: 'healthy' | 'degraded' | 'down'; lastSync: string; uptime: string; errorRate: number; requestsToday: number }>;
      stats: { healthy: number; degraded: number; down: number; total: number; avgUptime: string };
      logs: Array<{ time: string; integration: string; message: string; type: 'success' | 'warning' | 'error' }>;
    }>('/admin/integrations'),

  getProspecting: (params?: { search?: string; stage?: string; potential?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.stage) queryParams.append('stage', params.stage);
    if (params?.potential) queryParams.append('potential', params.potential);
    if (params?.page != null) queryParams.append('page', params.page.toString());
    if (params?.limit != null) queryParams.append('limit', params.limit.toString());
    return api.get<{
      prospects: Array<{ id: string; name: string; email: string; netWorth: number; stage: string; engagement: number; lastActivity: string; potential: 'high' | 'medium' | 'low' }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
      kpis: { highPotential: number; totalNetWorth: number; avgEngagement: number; total: number };
      funnel: { free: number; basic: number; pro: number; consultant: number };
    }>(`/admin/prospecting${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getSettings: () =>
    api.get<{
      plans: Array<{ id: string; code: string; name: string; priceCents: number; connectionLimit: number | null; features: string[]; isActive: boolean }>;
      emailSettings: { welcomeEmail: boolean; monthlyReport: boolean; alerts: boolean; fromEmail: string; fromName: string };
      platformSettings: { maintenanceMode: boolean; allowRegistrations: boolean; requireEmailVerification: boolean; registrationRequiresApproval?: boolean };
      customization: { logo: string | null; primaryColor: string; platformName: string; description: string };
      policies: { termsOfService: string; privacyPolicy: string; cookiePolicy: string };
    }>('/admin/settings'),

  updatePlans: (plans: Array<{ id?: string; code: string; name: string; priceCents: number; monthlyPriceCents?: number | null; annualPriceCents?: number | null; connectionLimit: number | null; features: string[]; isActive: boolean; role?: string | null }>) =>
    api.put<{ message: string }>('/admin/settings/plans', { plans }),

  updateEmailSettings: (settings: { welcomeEmail: boolean; monthlyReport: boolean; alerts: boolean; fromEmail: string; fromName: string }) =>
    api.put<{ message: string }>('/admin/settings/email', settings),

  updatePlatformSettings: (settings: { maintenanceMode: boolean; allowRegistrations: boolean; requireEmailVerification: boolean }) =>
    api.put<{ message: string }>('/admin/settings/platform', settings),

  updateLanguageSettings: (settings: { defaultLanguage: string; availableLanguages: string[] }) =>
    api.put<{ message: string }>('/admin/settings/language', settings),

  updateRegistrationApprovalSetting: (registrationRequiresApproval: boolean) =>
    api.put<{ message: string }>('/admin/settings/registration-approval', { registrationRequiresApproval }),

  updateCustomization: (customization: { primaryColor: string; platformName: string; description: string }) =>
    api.put<{ message: string }>('/admin/settings/customization', customization),

  updatePolicies: (policies: { termsOfService: string; privacyPolicy: string; cookiePolicy: string }) =>
    api.put<{ message: string }>('/admin/settings/policies', policies),

  getPaymentHistory: (params?: { page?: number; limit?: number; status?: string; userId?: string; startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page != null) queryParams.append('page', params.page.toString());
    if (params?.limit != null) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    return api.get<{
      payments: Array<{
        id: string;
        amountCents: number;
        currency: string;
        status: string;
        paidAt: string | null;
        provider: string | null;
        providerPaymentId: string | null;
        createdAt: string;
        user: { id: string; name: string; email: string };
        subscription: { id: string; plan: { name: string; code: string } } | null;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getLoginHistory: (params?: { page?: number; limit?: number; userId?: string; startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page != null) queryParams.append('page', params.page.toString());
    if (params?.limit != null) queryParams.append('limit', params.limit.toString());
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    return api.get<{
      loginHistory: Array<{
        id: string;
        userId: string;
        ipAddress: string | null;
        userAgent: string | null;
        success: boolean;
        createdAt: string;
        user: { id: string; name: string; email: string; role: string };
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/login-history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getSubscriptionHistory: (params?: { page?: number; limit?: number; userId?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page != null) queryParams.append('page', params.page.toString());
    if (params?.limit != null) queryParams.append('limit', params.limit.toString());
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.status) queryParams.append('status', params.status);
    return api.get<{
      history: Array<{
        id: string;
        status: string;
        planName: string;
        planCode: string;
        priceCents: number;
        startedAt: string | null;
        currentPeriodStart: string | null;
        currentPeriodEnd: string | null;
        canceledAt: string | null;
        createdAt: string;
        user: { id: string; name: string; email: string };
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/subscriptions/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  deleteSubscription: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/admin/subscriptions/${id}`),

  deletePayment: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/admin/payments/${id}`),

  deleteLoginHistory: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/admin/login-history/${id}`),

  getInstitutions: (provider?: string) =>
    api.get<{
      institutions: Array<{
        id: string;
        provider: string;
        external_id: string | null;
        name: string;
        logo_url: string | null;
        enabled: boolean;
        created_at: string;
        updated_at: string;
      }>;
    }>(`/admin/institutions${provider ? `?provider=${provider}` : ''}`),

  createInstitution: (data: { provider: string; name: string; logo_url?: string; external_id?: string; enabled?: boolean }) =>
    api.post<{ institution: any }>('/admin/institutions', data),

  updateInstitution: (id: string, data: { enabled?: boolean; name?: string; logo_url?: string }) =>
    api.patch<{ institution: any }>(`/admin/institutions/${id}`, data),

  bulkUpdateInstitutions: (institutions: Array<{ id: string; enabled: boolean }>) =>
    api.patch<{ institutions: any[]; updated: number }>('/admin/institutions', { institutions }),

  getComments: (page?: number, limit?: number) =>
    api.get<{
      comments: Array<{
        id: string;
        title: string | null;
        content: string;
        reply: string | null;
        status: string;
        processed_at: string | null;
        created_at: string;
        user_name: string;
        user_email: string;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/admin/comments${page || limit ? `?page=${page || 1}&limit=${limit || 10}` : ''}`),

  replyToComment: (id: string, reply: string) =>
    api.post<{ comment: any; message: string }>(`/admin/comments/${id}/reply`, { reply }),

  deleteComment: (id: string) =>
    api.delete<{ message: string }>(`/admin/comments/${id}`),
};
