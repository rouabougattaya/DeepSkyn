import mockApi from '@/mocks/backendApi';

// Authentication Service with OAuth + Email/Password
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  authMethod: 'email' | 'google' | 'apple';
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.loadFromStorage();
  }

  // Load auth data from localStorage
  private loadFromStorage(): void {
    try {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      
      if (storedToken) this.token = storedToken;
      if (storedUser) this.user = JSON.parse(storedUser);
    } catch (error) {
      console.error('Error loading auth data:', error);
      this.clearStorage();
    }
  }

  // Save auth data to localStorage
  private saveToStorage(token: string, user: User): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    this.token = token;
    this.user = user;
  }

  // Clear storage
  private clearStorage(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.token = null;
    this.user = null;
  }

  // Email/Password login
  async loginWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      // Use mock API for development
      const response = await mockApi.login(email, password);
      this.saveToStorage(response.token, response.user);
      return response;
    } catch (error) {
      console.error('Email login error:', error);
      throw error;
    }
  }

  // Google OAuth login
  async loginWithGoogle(googleUser: any): Promise<AuthResponse> {
    try {
      // Check if user exists with this email
      const existingUser = await this.checkExistingUser(googleUser.email);
      
      let user: User;
      if (existingUser) {
        // Account linking - Update existing user with Google info
        user = await this.linkGoogleAccount(existingUser.id, googleUser);
      } else {
        // Create new user
        user = await this.createGoogleUser(googleUser);
      }

      // Generate token
      const token = await this.generateToken(user);
      
      this.saveToStorage(token, user);
      return { user, token };
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  // Check if user exists
  private async checkExistingUser(email: string): Promise<User | null> {
    try {
      const user = await mockApi.checkUser(email);
      return user;
    } catch (error) {
      console.error('Error checking existing user:', error);
      return null;
    }
  }

  // Link Google account to existing user
  private async linkGoogleAccount(userId: string, googleUser: any): Promise<User> {
    try {
      const user = await mockApi.linkGoogleAccount(userId, googleUser);
      return user;
    } catch (error) {
      console.error('Error linking Google account:', error);
      throw error;
    }
  }

  // Create new Google user
  private async createGoogleUser(googleUser: any): Promise<User> {
    try {
      const user = await mockApi.createGoogleUser(googleUser);
      return user;
    } catch (error) {
      console.error('Error creating Google user:', error);
      throw error;
    }
  }

  // Generate JWT token
  private async generateToken(user: User): Promise<string> {
    const payload = {
      userId: user.id,
      email: user.email,
      exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };
    
    return btoa(JSON.stringify(payload));
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.user;
  }

  // Get token
  getToken(): string | null {
    return this.token;
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  // Logout
  async logout(): Promise<void> {
    this.clearStorage();
  }

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const updatedUser = { ...this.user, ...updates } as User;
      this.user = updatedUser;
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
