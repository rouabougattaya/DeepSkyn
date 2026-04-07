import axios from 'axios';
import type { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
  expiresIn: number;
}

/**
 * ✅ FIXED: Unified Authentication Service
 * Consolidates all auth logic in one place
 * Uses memory storage for tokens + HTTP-only cookies from backend
 */
export class AuthService {
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private currentUser: AuthUser | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      withCredentials: true, // ✅ Send cookies with requests
    });

    // ✅ Setup interceptors
    this.setupInterceptors();
    
    // ✅ Restore session on init
    this.restoreSession();
  }

  /**
   * Setup axios interceptors for auth
   */
  private setupInterceptors() {
    // Request interceptor - add auth token
    this.axiosInstance.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Response interceptor - handle 401
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying, try refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            // Refresh failed - logout
            this.logout();
            window.location.href = '/auth/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string, captchaToken: string): Promise<AuthUser> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>('/auth/login', {
        email,
        password,
        captchaToken,
      });

      const { accessToken, user, expiresIn } = response.data;

      this.setAccessToken(accessToken, expiresIn);
      this.currentUser = user;

      // ✅ Store minimal user info only (not tokens)
      localStorage.setItem('user', JSON.stringify(user));

      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<AuthUser> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>('/auth/register', {
        email,
        password,
        name,
      });

      const { accessToken, user, expiresIn } = response.data;

      this.setAccessToken(accessToken, expiresIn);
      this.currentUser = user;

      localStorage.setItem('user', JSON.stringify(user));

      return user;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login with Google OAuth token
   */
  async loginWithGoogle(googleToken: string): Promise<AuthUser> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>('/auth/google', {
        token: googleToken,
      });

      const { accessToken, user, expiresIn } = response.data;

      this.setAccessToken(accessToken, expiresIn);
      this.currentUser = user;

      localStorage.setItem('user', JSON.stringify(user));

      return user;
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  }

  /**
   * ✅ Refresh access token from refresh token cookie
   * Refresh token is stored in HTTP-only cookie by backend
   */
  async refreshAccessToken(): Promise<void> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>('/auth/refresh');

      const { accessToken, expiresIn } = response.data;
      this.setAccessToken(accessToken, expiresIn);
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearSession();
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await this.axiosInstance.get<{ user: AuthUser }>('/auth/me');
      this.currentUser = response.data.user;
      return this.currentUser;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.currentUser;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get current user
   */
  getUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * ✅ Set access token and schedule refresh
   */
  private setAccessToken(token: string, expiresIn: number): void {
    this.accessToken = token;

    // ✅ Schedule token refresh 1 minute before expiry
    this.scheduleTokenRefresh(expiresIn);
  }

  /**
   * ✅ Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresIn: number): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Refresh 1 minute before expiry (or sooner if less than 2 minutes total)
    const refreshTime = Math.max((expiresIn * 1000) - 60000, 0);

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        console.error('Automatic token refresh failed:', error);
        this.logout();
      }
    }, refreshTime);
  }

  /**
   * ✅ Clear all session data
   */
  private clearSession(): void {
    this.accessToken = null;
    this.currentUser = null;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    localStorage.removeItem('user');
    // ❌ REMOVED: localStorage.removeItem('accessToken') - now in memory only!
    // ❌ REMOVED: localStorage.removeItem('refreshToken') - stored in HTTP-only cookie!
  }

  /**
   * ✅ Restore session from localStorage (user info only)
   */
  private restoreSession(): void {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        this.currentUser = JSON.parse(userJson);
      } catch (error) {
        console.error('Failed to restore user session:', error);
        localStorage.removeItem('user');
      }
    }
  }

  /**
   * Verify 2FA token
   */
  async verify2FA(token: string): Promise<AuthUser> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>('/twofactor/verify', {
        token,
      });

      const { accessToken, user, expiresIn } = response.data;

      this.setAccessToken(accessToken, expiresIn);
      this.currentUser = user;

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Initialize 2FA
   */
  async initiate2FA(): Promise<{ secret: string; otpauth_url: string }> {
    try {
      const response = await this.axiosInstance.post('/twofactor/initiate');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/forgot-password', { email });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/reset-password', { token, newPassword });
    } catch (error) {
      throw error;
    }
  }
}

// ✅ Export singleton instance
export const authService = new AuthService();
