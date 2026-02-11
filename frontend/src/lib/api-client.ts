// Determine API base URL dynamically based on current origin (exported for report download URLs, etc.)
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'http://localhost:5000/api';
    }
    try {
      const url = new URL(origin);
      return `${url.protocol}//${url.hostname}/api`;
    } catch {
      return 'http://localhost:5000/api';
    }
  }
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
  private readonly UNAUTHORIZED_COOLDOWN = 5000;
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
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
    const isGet = !options.method || options.method === 'GET';
    const requestKey = isGet ? `${options.method || 'GET'}:${url}` : null;

    if (requestKey && this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    const headers: HeadersInit = { ...options.headers };
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    // Sync token from localStorage in case it was set by login in another flow
    const token = this.token ?? (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const requestPromise = (async () => {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: `HTTP ${response.status}: ${response.statusText}`,
          }));
          const error: ApiError = {
            ...errorData,
            statusCode: response.status,
          };
          if (
            response.status === 401 ||
            (errorData && (errorData.statusCode === 401 || errorData.error === 'Unauthorized'))
          ) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_token');
            }
            this.setToken(null);
            const now = Date.now();
            const timeSinceLastUnauthorized = now - this.lastUnauthorizedTime;
            if (
              !this.unauthorizedEventDispatched ||
              timeSinceLastUnauthorized > this.UNAUTHORIZED_COOLDOWN
            ) {
              this.unauthorizedEventDispatched = true;
              this.lastUnauthorizedTime = now;
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('auth:unauthorized', {
                    detail: { message: 'Sua sessão expirou. Por favor, faça login novamente.' },
                  })
                );
              }
              setTimeout(() => {
                this.unauthorizedEventDispatched = false;
              }, this.UNAUTHORIZED_COOLDOWN);
            }
          }
          throw error;
        }
        return response.json();
      } catch (error: any) {
        clearTimeout(timeoutId);
        // Handle timeout/abort errors
        if (error.name === 'AbortError') {
          const timeoutError: ApiError = {
            error: 'Request timeout - please check your connection and try again',
            statusCode: 408,
            code: 'TIMEOUT',
          };
          throw timeoutError;
        }
        throw error;
      }
    })();

    if (requestKey) {
      this.pendingRequests.set(requestKey, requestPromise);
      requestPromise.finally(() => this.pendingRequests.delete(requestKey));
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
