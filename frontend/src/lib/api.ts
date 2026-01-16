const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
