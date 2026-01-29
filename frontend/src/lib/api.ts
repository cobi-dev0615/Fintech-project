// Determine API base URL dynamically based on current origin
const getApiBaseUrl = () => {
  // Use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Detect if we're running on localhost or public IP
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // If accessing from localhost, use localhost for API
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'http://localhost:5000/api';
    }
    
    // If accessing from public IP, use same hostname but let Nginx proxy handle /api
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      // Use origin as base, Nginx handles /api -> 5000
      return `${url.protocol}//${hostname}/api`;
    } catch {
      // Fallback to localhost if URL parsing fails
      return 'http://localhost:5000/api';
    }
  }
  
  // Server-side fallback
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

export interface ApiError {
  error: string;
  details?: any;
  statusCode?: number;
  code?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private unauthorizedEventDispatched: boolean = false;
  private lastUnauthorizedTime: number = 0;
  private readonly UNAUTHORIZED_COOLDOWN = 5000; // 5 seconds cooldown
  // Request deduplication: track in-flight requests
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      // Reset unauthorized flag when token is set (user logged in)
      this.unauthorizedEventDispatched = false;
      this.lastUnauthorizedTime = 0;
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isFormData: boolean = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Create a request key for deduplication (only for GET requests)
    const isGet = !options.method || options.method === 'GET';
    const requestKey = isGet ? `${options.method || 'GET'}:${url}` : null;
    
    // Check if there's already a pending request for this endpoint
    if (requestKey && this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    const headers: HeadersInit = { ...options.headers };

    // Don't set Content-Type for FormData, browser will set it with boundary
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: `HTTP ${response.status}: ${response.statusText}`,
          }));
          
          const error: ApiError = {
            ...errorData,
            statusCode: response.status,
          };
      
          // Handle 401 Unauthorized errors globally
          if (response.status === 401 || (errorData && (errorData.statusCode === 401 || errorData.error === 'Unauthorized'))) {
            // Immediately remove token from localStorage to prevent further requests
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_token');
            }
            
            // Clear token and trigger re-authentication
            this.setToken(null);
            
            // Prevent multiple unauthorized events in quick succession (circuit breaker)
            const now = Date.now();
            const timeSinceLastUnauthorized = now - this.lastUnauthorizedTime;
            
            if (!this.unauthorizedEventDispatched || timeSinceLastUnauthorized > this.UNAUTHORIZED_COOLDOWN) {
              this.unauthorizedEventDispatched = true;
              this.lastUnauthorizedTime = now;
              
              // Dispatch a custom event that components can listen to
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:unauthorized', {
                  detail: { message: 'Sua sessão expirou. Por favor, faça login novamente.' }
                }));
              }
              
              // Reset flag after cooldown period
              setTimeout(() => {
                this.unauthorizedEventDispatched = false;
              }, this.UNAUTHORIZED_COOLDOWN);
            }
          }
      
          throw error;
        }

        return response.json();
      } catch (error) {
        throw error;
      }
    })();

    // Store the promise for GET requests to enable deduplication
    if (requestKey) {
      this.pendingRequests.set(requestKey, requestPromise);
      
      // Clean up after request completes (success or error)
      requestPromise
        .finally(() => {
          this.pendingRequests.delete(requestKey);
        });
    }

    return requestPromise;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : JSON.stringify({}),
    });
  }

  async put<T>(endpoint: string, data?: any, isFormData: boolean = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
      },
      isFormData
    );
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);

// Auth endpoints
export const authApi = {
  register: (data: { full_name: string; email: string; password: string; role?: string }) =>
    api.post<{ user: any; token?: string; requiresApproval?: boolean }>('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post<{ user: any; token: string }>('/auth/login', data),
  
  me: () =>
    api.get<{ user: any }>('/auth/me'),
};

// User endpoints
export const userApi = {
  getProfile: () =>
    api.get<{ user: any }>('/users/profile'),
  
  updateProfile: (data: Partial<{ full_name: string; phone: string; birth_date: string; risk_profile: string }>) =>
    api.patch<{ user: any }>('/users/profile', data),

  getUserCounts: () =>
    api.get<{ totalUsers: number; onlineUsers: number }>('/users/stats/user-counts'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch<{ message: string }>('/users/profile/password', data),
};

// Comments endpoints
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

  delete: (id: string) =>
    api.delete<{ message: string }>(`/comments/${id}`),
};

// Dashboard endpoints
export const dashboardApi = {
  getSummary: () =>
    api.get<{
      netWorth: number;
      cashBalance: number;
      investmentValue: number;
      recentTransactionsCount: number;
      unreadAlertsCount: number;
    }>('/dashboard/summary'),
  
  getNetWorthEvolution: (months?: number) =>
    api.get<{ data: Array<{ month: string; change: number }> }>(
      `/dashboard/net-worth-evolution${months ? `?months=${months}` : ''}`
    ),
};

// Connections endpoints
export const connectionsApi = {
  getAll: () =>
    api.get<{ connections: any[] }>('/connections'),
  
  getInstitutions: (provider?: string) =>
    api.get<{ institutions: any[] }>(
      `/connections/institutions${provider ? `?provider=${provider}` : ''}`
    ),
  
  getConnectToken: () =>
    api.post<{ connectToken: string }>('/connections/connect-token', {}),
  
  create: (data: { itemId: string; institutionId?: string }) =>
    api.post<{ connection: any }>('/connections', data),
  
  sync: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/connections/${id}/sync`),
  
  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/connections/${id}`),
};

// Finance endpoints (Pluggy data)
export const financeApi = {
  getConnections: () =>
    api.get<{ connections: any[] }>('/finance/connections'),
  
  getAccounts: (itemId?: string) =>
    api.get<{ accounts: any[]; grouped: any[]; total: number }>(
      `/finance/accounts${itemId ? `?itemId=${itemId}` : ''}`
    ),
  
  getTransactions: (params?: {
    from?: string;
    to?: string;
    itemId?: string;
    accountId?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);
    if (params?.itemId) queryParams.append('itemId', params.itemId);
    if (params?.accountId) queryParams.append('accountId', params.accountId);
    if (params?.q) queryParams.append('q', params.q);
    // Always send page and limit so backend returns pagination; default page=1, limit=20
    queryParams.append('page', String(params?.page ?? 1));
    queryParams.append('limit', String(params?.limit ?? 20));
    
    return api.get<{
      transactions: any[];
      total?: number;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/finance/transactions?${queryParams.toString()}`);
  },
  
  getInvestments: (itemId?: string) =>
    api.get<{ investments: any[]; total: number; breakdown: any[] }>(
      `/finance/investments${itemId ? `?itemId=${itemId}` : ''}`
    ),
  
  getCards: (itemId?: string) =>
    api.get<{ cards: any[] }>(
      `/finance/cards${itemId ? `?itemId=${itemId}` : ''}`
    ),

  getNetWorthEvolution: (months?: number) =>
    api.get<{ data: Array<{ month: string; value: number }> }>(
      `/finance/net-worth-evolution${months ? `?months=${months}` : ''}`
    ),

  sync: (itemId?: string) =>
    api.post<{ success: boolean; message: string }>('/finance/sync', { itemId }),
};

// Accounts endpoints
export const accountsApi = {
  getAll: () =>
    api.get<{ accounts: any[] }>('/accounts'),
  
  getTransactions: (accountId?: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (accountId) params.append('accountId', accountId);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return api.get<{ 
      transactions: any[];
      pagination: {
        total: number;
        limit: number;
        offset: number;
        totalPages: number;
      };
    }>(
      `/accounts/transactions${params.toString() ? `?${params.toString()}` : ''}`
    );
  },
};

// Cards endpoints
export const cardsApi = {
  getAll: () =>
    api.get<{ cards: any[] }>('/cards'),
  
  getInvoices: (cardId: string) =>
    api.get<{ invoices: any[] }>(`/cards/${cardId}/invoices`),
  
  create: (data: {
    displayName: string;
    brand: string;
    last4: string;
    limitCents?: number;
    institutionId?: string;
    connectionId?: string;
    currency?: string;
  }) =>
    api.post<{ card: any }>('/cards', data),
  
  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/cards/${id}`),
};

// Investments endpoints
export const investmentsApi = {
  getHoldings: () =>
    api.get<{ holdings: any[] }>('/investments/holdings'),
  
  getSummary: () =>
    api.get<{ summary: any }>('/investments/summary'),
};

// Reports endpoints
export const reportsApi = {
  getAll: () =>
    api.get<{
      reports: Array<{
        id: string;
        type: string;
        generatedAt: string;
        status: string;
        downloadUrl: string | null;
      }>;
    }>('/reports'),

  generate: (data: { type: string; dateRange?: string; params?: any }) =>
    api.post<{
      report: {
        id: string;
        type: string;
        generatedAt: string;
        status: string;
      };
      message: string;
    }>('/reports/generate', data),
};

// Goals endpoints
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

  update: (id: string, data: { name?: string; target?: number; current?: number; deadline?: string; category?: string }) =>
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

  delete: (id: string) =>
    api.delete<{ message: string }>(`/goals/${id}`),
};

// Notifications endpoints
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

  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count'),

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

// Subscription endpoints
export const subscriptionsApi = {
  getMySubscription: () =>
    api.get<{
      subscription: {
        id: string;
        status: string;
        startedAt: string;
        currentPeriodStart: string;
        currentPeriodEnd: string;
        canceledAt: string | null;
        plan: {
          id: string;
          code: string;
          name: string;
          priceCents: number;
        };
      } | null;
    }>('/subscriptions/me'),

  createSubscription: (planId: string, paymentData?: {
    paymentMethod: string;
    cardNumber?: string;
    cardName?: string;
    expiryDate?: string;
    cvv?: string;
    billing: {
      name: string;
      email: string;
      phone: string;
      document: string;
      zipCode: string;
      address: string;
      city: string;
      state: string;
    };
  }, billingPeriod?: 'monthly' | 'annual') =>
    api.post<{
      subscription: {
        id: string;
        status: string;
        startedAt: string;
        currentPeriodStart: string;
        currentPeriodEnd: string;
        plan: {
          id: string;
          code: string;
          name: string;
          priceCents: number;
        };
      };
      payment?: {
        preferenceId: string;
        checkoutUrl: string;
      };
    }>('/subscriptions', { planId, billingPeriod: billingPeriod || 'monthly', ...(paymentData && { payment: paymentData }) }),

  cancelSubscription: () =>
    api.patch<{ message: string }>('/subscriptions/cancel'),

  getHistory: (page?: number, limit?: number) =>
    api.get<{
      history: Array<{
        id: string;
        status: string;
        planName: string;
        priceCents: number;
        startedAt: string;
        currentPeriodStart: string;
        currentPeriodEnd: string;
        canceledAt: string | null;
        createdAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/subscriptions/history${page || limit ? `?page=${page || 1}&limit=${limit || 10}` : ''}`),
};

// Public endpoints (no authentication required)
// Customer endpoints
export const customerApi = {
  // Invitations
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

  // Consultants
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

export const publicApi = {
  getPlans: (role?: 'customer' | 'consultant', billingPeriod?: 'monthly' | 'annual') => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (billingPeriod) params.append('billingPeriod', billingPeriod);
    return api.get<{
      plans: Array<{
        id: string;
        code: string;
        name: string;
        monthlyPriceCents: number;
        annualPriceCents: number;
        priceCents: number;
        connectionLimit: number | null;
        features: string[];
        isActive: boolean;
        role: string | null;
      }>;
    }>(`/plans${params.toString() ? `?${params.toString()}` : ''}`);
  },
};

// Admin endpoints
export const adminApi = {
  // Plans
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

  // Dashboard metrics
  getDashboardMetrics: (year?: number) => {
    const params = year ? `?year=${year}` : '';
    return api.get<{
      kpis: {
        activeUsers: number;
        newUsers: number;
        mrr: number;
        churnRate: number;
      };
      userGrowth: Array<{ month: string; users: number }>;
      revenue: Array<{ month: string; revenue: number }>;
      alerts: Array<{ id: string; type: string; message: string; time: string }>;
    }>(`/admin/dashboard/metrics${params}`);
  },

  // User management
  getUsers: (params?: { search?: string; role?: string; status?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    return api.get<{ 
      users: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        status: string;
        plan: string | null;
        createdAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getUser: (id: string) =>
    api.get<{ user: {
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
      subscription: {
        id: string;
        status: string;
        currentPeriodStart: string;
        currentPeriodEnd: string;
        planName: string;
        planPrice: number;
      } | null;
      financialSummary: {
        cash: number;
        investments: number;
        debt: number;
        netWorth: number;
      };
      stats: {
        connections: number;
        goals: number;
        clients: number;
      };
      consultants: Array<{
        id: string;
        name: string;
        email: string;
        relationshipStatus: string;
        relationshipCreatedAt: string;
      }>;
    } }>(`/admin/users/${id}`),

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

  // Subscriptions
  getSubscriptions: (params?: { search?: string; status?: string; plan?: string; page?: number; limit?: number; startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.plan) queryParams.append('plan', params.plan);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    return api.get<{ 
      subscriptions: Array<{
        id: string;
        user: string;
        email: string;
        plan: string;
        amount: number;
        status: string;
        nextBilling: string;
        createdAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
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
      user: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
      };
      plan: {
        id: string;
        name: string;
        code: string;
        price: number;
        connectionLimit: number | null;
        features: string[];
      };
    }>(`/admin/subscriptions/${id}`),

  // Financial reports
  getFinancialReports: () =>
    api.get<{
      revenue: Array<{ month: string; revenue: number }>;
      mrr: number;
      commissions: Array<{ consultant: string; clients: number; commission: number }>;
      transactions: Array<{ id: string; date: string; type: string; amount: number; client: string }>;
    }>('/admin/financial/reports'),

  // Integrations monitoring
  getIntegrations: () =>
    api.get<{
      integrations: Array<{
        id: string;
        name: string;
        provider: string;
        status: 'healthy' | 'degraded' | 'down';
        lastSync: string;
        uptime: string;
        errorRate: number;
        requestsToday: number;
      }>;
      stats: {
        healthy: number;
        degraded: number;
        down: number;
        total: number;
        avgUptime: string;
      };
      logs: Array<{
        time: string;
        integration: string;
        message: string;
        type: 'success' | 'warning' | 'error';
      }>;
    }>('/admin/integrations'),

  // Prospecting
  getProspecting: (params?: { search?: string; stage?: string; potential?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.stage) queryParams.append('stage', params.stage);
    if (params?.potential) queryParams.append('potential', params.potential);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    return api.get<{
      prospects: Array<{
        id: string;
        name: string;
        email: string;
        netWorth: number;
        stage: string;
        engagement: number;
        lastActivity: string;
        potential: 'high' | 'medium' | 'low';
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      kpis: {
        highPotential: number;
        totalNetWorth: number;
        avgEngagement: number;
        total: number;
      };
      funnel: {
        free: number;
        basic: number;
        pro: number;
        consultant: number;
      };
    }>(`/admin/prospecting${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  // Settings
  getSettings: () =>
    api.get<{
      plans: Array<{
        id: string;
        code: string;
        name: string;
        priceCents: number;
        connectionLimit: number | null;
        features: string[];
        isActive: boolean;
      }>;
      emailSettings: {
        welcomeEmail: boolean;
        monthlyReport: boolean;
        alerts: boolean;
        fromEmail: string;
        fromName: string;
      };
      platformSettings: {
        maintenanceMode: boolean;
        allowRegistrations: boolean;
        requireEmailVerification: boolean;
        registrationRequiresApproval?: boolean;
      };
      customization: {
        logo: string | null;
        primaryColor: string;
        platformName: string;
        description: string;
      };
      policies: {
        termsOfService: string;
        privacyPolicy: string;
        cookiePolicy: string;
      };
    }>('/admin/settings'),

  updatePlans: (plans: Array<{
    id?: string;
    code: string;
    name: string;
    priceCents: number;
    monthlyPriceCents?: number | null;
    annualPriceCents?: number | null;
    connectionLimit: number | null;
    features: string[];
    isActive: boolean;
    role?: string | null;
  }>) =>
    api.put<{ message: string }>('/admin/settings/plans', { plans }),

  updateEmailSettings: (settings: {
    welcomeEmail: boolean;
    monthlyReport: boolean;
    alerts: boolean;
    fromEmail: string;
    fromName: string;
  }) =>
    api.put<{ message: string }>('/admin/settings/email', settings),

  updatePlatformSettings: (settings: {
    maintenanceMode: boolean;
    allowRegistrations: boolean;
    requireEmailVerification: boolean;
  }) =>
    api.put<{ message: string }>('/admin/settings/platform', settings),

  updateRegistrationApprovalSetting: (registrationRequiresApproval: boolean) =>
    api.put<{ message: string }>('/admin/settings/registration-approval', { registrationRequiresApproval }),

  updateCustomization: (customization: {
    primaryColor: string;
    platformName: string;
    description: string;
  }) => {
    // For now, send as JSON. Logo upload can be added later with multipart/form-data support
    return api.put<{ message: string }>('/admin/settings/customization', customization);
  },

  updatePolicies: (policies: {
    termsOfService: string;
    privacyPolicy: string;
    cookiePolicy: string;
  }) =>
    api.put<{ message: string }>('/admin/settings/policies', policies),

  // Payment history
  getPaymentHistory: (params?: { 
    page?: number; 
    limit?: number; 
    status?: string; 
    userId?: string; 
    startDate?: string; 
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
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
        user: {
          id: string;
          name: string;
          email: string;
        };
        subscription: {
          id: string;
          plan: {
            name: string;
            code: string;
          };
        } | null;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/admin/payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  // Login history
  getLoginHistory: (params?: { 
    page?: number; 
    limit?: number; 
    userId?: string; 
    startDate?: string; 
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
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
        user: {
          id: string;
          name: string;
          email: string;
          role: string;
        };
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/admin/login-history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getSubscriptionHistory: (params?: { 
    page?: number; 
    limit?: number; 
    userId?: string; 
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
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
        user: {
          id: string;
          name: string;
          email: string;
        };
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/admin/subscriptions/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  deleteSubscription: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/admin/subscriptions/${id}`),

  deletePayment: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/admin/payments/${id}`),

  deleteLoginHistory: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/admin/login-history/${id}`),
  
  // Institutions
  getInstitutions: (provider?: string) =>
    api.get<{ institutions: Array<{
      id: string;
      provider: string;
      external_id: string | null;
      name: string;
      logo_url: string | null;
      enabled: boolean;
      created_at: string;
      updated_at: string;
    }> }>(`/admin/institutions${provider ? `?provider=${provider}` : ''}`),
  
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
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/admin/comments${page || limit ? `?page=${page || 1}&limit=${limit || 10}` : ''}`),

  replyToComment: (id: string, reply: string) =>
    api.post<{ comment: any; message: string }>(`/admin/comments/${id}/reply`, { reply }),

  deleteComment: (id: string) =>
    api.delete<{ message: string }>(`/admin/comments/${id}`),
};

// Consultant endpoints
export const consultantApi = {
  // Dashboard metrics
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

  // Clients
  getClients: (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    return api.get<{
      clients: Array<{
        id: string;
        name: string;
        email: string;
        netWorth: number;
        status: string;
        lastContact: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
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
      financial: {
        netWorth: number;
        cash: number;
        investments: number;
        debt: number;
      };
      notes: Array<{
        id: string;
        content: string;
        date: string;
      }>;
      reports: Array<{
        id: string;
        type: string;
        generatedAt: string;
        downloadUrl: string | null;
      }>;
    }>(`/consultant/clients/${id}`),

  addClientNote: (clientId: string, note: string) =>
    api.post<{
      note: {
        id: string;
        content: string;
        date: string;
      };
    }>(`/consultant/clients/${clientId}/notes`, { note }),

  // Pipeline
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

  // Invitations
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

  // Messages
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
      conversation: {
        id: string;
        clientId: string;
        clientName: string;
      };
    }>('/consultant/messages/conversations', { customerId }),

  getConversation: (id: string) =>
    api.get<{
      conversation: {
        id: string;
        clientId: string;
        clientName: string;
      };
      messages: Array<{
        id: string;
        sender: 'consultant' | 'client';
        content: string;
        timestamp: string;
      }>;
    }>(`/consultant/messages/conversations/${id}`),

  sendMessage: (conversationId: string, body: string) =>
    api.post<{
      message: {
        id: string;
        sender: 'consultant';
        content: string;
        timestamp: string;
      };
    }>(`/consultant/messages/conversations/${conversationId}/messages`, { body }),

  // Reports
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
      report: {
        id: string;
        type: string;
        generatedAt: string;
        status: string;
      };
      message: string;
    }>('/consultant/reports/generate', data),

  // Profile
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
