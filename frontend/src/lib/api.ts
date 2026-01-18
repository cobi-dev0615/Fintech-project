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
      return 'http://localhost:3000/api';
    }
    
    // If accessing from public IP, use same IP for API
    // Extract IP and port from origin (e.g., http://167.71.94.65:8081 -> http://167.71.94.65:3000)
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      return `http://${hostname}:3000/api`;
    } catch {
      // Fallback to localhost if URL parsing fails
      return 'http://localhost:3000/api';
    }
  }
  
  // Server-side fallback
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

export interface ApiError {
  error: string;
  details?: any;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

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
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw error;
    }

    return response.json();
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
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);

// Auth endpoints
export const authApi = {
  register: (data: { full_name: string; email: string; password: string; role?: string }) =>
    api.post<{ user: any; token: string }>('/auth/register', data),
  
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
    return api.get<{ transactions: any[] }>(
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

// Admin endpoints
export const adminApi = {
  // Dashboard metrics
  getDashboardMetrics: () =>
    api.get<{
      kpis: {
        activeUsers: number;
        newUsers: number;
        mrr: number;
        churnRate: number;
      };
      userGrowth: Array<{ month: string; users: number }>;
      revenue: Array<{ month: string; revenue: number }>;
      alerts: Array<{ id: string; type: string; message: string; time: string }>;
    }>('/admin/dashboard/metrics'),

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
    }>(`/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`),
  },

  getUser: (id: string) =>
    api.get<{ user: {
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      plan: string | null;
      createdAt: string;
    } }>(`/admin/users/${id}`),

  updateUserRole: (id: string, role: string) =>
    api.patch<{ message: string }>(`/admin/users/${id}/role`, { role }),

  updateUserStatus: (id: string, status: 'active' | 'blocked') =>
    api.patch<{ message: string }>(`/admin/users/${id}/status`, { status }),

  // Subscriptions
  getSubscriptions: (params?: { search?: string; status?: string; plan?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.plan) queryParams.append('plan', params.plan);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
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
    }>(`/admin/subscriptions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`),
  },

  // Financial reports
  getFinancialReports: () =>
    api.get<{
      revenue: Array<{ month: string; revenue: number }>;
      mrr: number;
      commissions: Array<{ consultant: string; clients: number; commission: number }>;
      transactions: Array<{ id: string; date: string; type: string; amount: number; client: string }>;
    }>('/admin/financial/reports'),
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
    }>(`/consultant/clients${queryParams.toString() ? `?${queryParams.toString()}` : ''}`),
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
    }>(`/consultant/reports${queryParams.toString() ? `?${queryParams.toString()}` : ''}`),
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
};
