// Real Backend API for PostgreSQL
// Replace mockApi with real database calls

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Helper function to get CSRF token
async function getCsrfToken(): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
      method: 'GET',
      credentials: 'include'
    });
    if (!response.ok) return '';
    const data = await response.json().catch(() => ({}));
    const token = data?.csrfToken || response.headers.get('X-CSRF-Token');
    return token || '';
  } catch (err) {
    console.debug('[CSRF] Could not pre-fetch token in realApi:', err);
    return '';
  }
}

// Import authFetch for authenticated requests
import { authFetch } from '@/lib/authSession';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  authMethod: 'email' | 'google';
  createdAt: string;
  lastLoginAt: string;
  aiVerified?: boolean;
  aiScore?: number;
  googleId?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  success: boolean;
}

// Real Backend API functions
export const realApi = {
  // Email/Password login
  async login(email: string, password: string): Promise<AuthResponse> {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  },

  // Check if user exists
  async checkUser(email: string): Promise<User | null> {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${API_BASE_URL}/auth/check-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to check user');
      }

      const result = await response.json();
      return result.user || null;
    } catch (error) {
      console.error('Check user error:', error);
      return null;
    }
  },

  // Create Google user
  async createGoogleUser(googleUser: any): Promise<AuthResponse> {
    const response = await authFetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleUser),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Google login failed');
    }

    return response.json();
  },

  // Link Google account to existing user
  async linkGoogleAccount(_userId: string, googleUser: any): Promise<AuthResponse> {
    // Le backend gère automatiquement le linking lors du login Google
    const response = await authFetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleUser),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Google account linking failed');
    }

    return response.json();
  },

  // Update AI score
  async updateAIScore(userId: string, aiVerified: boolean, aiScore: number, photoAnalysis: any = {}, emailAnalysis: any = {}): Promise<User> {
    const response = await authFetch(`${API_BASE_URL}/auth/update-ai-score`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        aiVerified,
        aiScore: aiScore.toString(), // Send as string to match old DTO if needed
        photoAnalysis,
        emailAnalysis
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update AI score');
    }

    const result = await response.json();
    return result.user;
  },

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await authFetch(`${API_BASE_URL}/auth/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },

  // Generic Get
  async get<T>(path: string): Promise<T> {
    const response = await authFetch(`${API_BASE_URL}${path}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `GET ${path} failed`);
    }
    return response.json();
  },

  // Generic Post
  async post<T>(path: string, body: any): Promise<T> {
    const response = await authFetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `POST ${path} failed`);
    }
    return response.json();
  }
};

export default realApi;
