import { api, authApi } from './api';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'customer' | 'consultant' | 'admin';
}

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private currentUser: User | null = null;

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await authApi.login({ email, password });
    api.setToken(response.token);
    this.currentUser = response.user;
    return response;
  }

  async register(
    full_name: string,
    email: string,
    password: string,
    role: 'customer' | 'consultant' | 'admin' = 'customer'
  ): Promise<AuthResponse> {
    const response = await authApi.register({ full_name, email, password, role });
    api.setToken(response.token);
    this.currentUser = response.user;
    return response;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await authApi.me();
      this.currentUser = response.user;
      return response.user;
    } catch (error) {
      this.logout();
      return null;
    }
  }

  logout() {
    api.setToken(null);
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null || (typeof window !== 'undefined' && !!localStorage.getItem('auth_token'));
  }

  getCurrentUserSync(): User | null {
    return this.currentUser;
  }
}

export const authService = new AuthService();
