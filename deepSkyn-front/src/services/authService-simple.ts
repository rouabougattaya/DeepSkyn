import mockApi from '@/mocks/backendApi';
import { aiService } from '@/services/aiService';

// Simple Auth Service sans JWT
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  authMethod: 'email' | 'google' | 'apple';
  createdAt: string;
  lastLoginAt: string;
  aiVerified?: boolean;
  aiScore?: number;
}

export interface AuthResponse {
  user: User;
  success: boolean;
  aiVerification?: {
    verified: boolean;
    score: number;
    message: string;
  };
}

class SimpleAuthService {
  private user: User | null = null;

  constructor() {
    this.loadFromStorage();
  }

  // Charger depuis localStorage
  private loadFromStorage(): void {
    try {
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        this.user = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
      this.clearStorage();
    }
  }

  // Sauvegarder dans localStorage
  private saveToStorage(user: User): void {
    localStorage.setItem('auth_user', JSON.stringify(user));
    this.user = user;
  }

  // Vider storage
  private clearStorage(): void {
    localStorage.removeItem('auth_user');
    this.user = null;
  }

  // Email/Password login
  async loginWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await mockApi.login(email, password);
      
      // AI Verification pour email/password
      const aiVerification = await aiService.verifyIdentity({
        name: response.user.name,
        email: response.user.email,
        picture: response.user.picture,
      });
      
      // Mettre à jour l'utilisateur avec les infos AI
      const userWithAI = {
        ...response.user,
        aiVerified: aiVerification.verified,
        aiScore: aiVerification.score,
      };
      
      this.saveToStorage(userWithAI);
      
      return {
        user: userWithAI,
        success: true,
        aiVerification,
      };
    } catch (error) {
      console.error('Email login error:', error);
      throw error;
    }
  }

  // Google OAuth login avec AI
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

      // AI Verification pour Google OAuth
      const aiVerification = await aiService.verifyIdentity({
        name: user.name,
        email: user.email,
        picture: user.picture,
      });
      
      // Mettre à jour l'utilisateur avec les infos AI
      const userWithAI = {
        ...user,
        aiVerified: aiVerification.verified,
        aiScore: aiVerification.score,
      };
      
      this.saveToStorage(userWithAI);
      
      return {
        user: userWithAI,
        success: true,
        aiVerification,
      };
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

  // Get current user
  getCurrentUser(): User | null {
    return this.user;
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.user;
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

  // Get AI verification status
  getAIStatus(): { verified: boolean; score: number } {
    if (!this.user) {
      return { verified: false, score: 0 };
    }
    
    return {
      verified: this.user.aiVerified || false,
      score: this.user.aiScore || 0,
    };
  }

  // Refresh AI verification
  async refreshAIVerification(): Promise<{ verified: boolean; score: number; message: string }> {
    if (!this.user) {
      throw new Error('No user logged in');
    }

    const aiVerification = await aiService.verifyIdentity({
      name: this.user.name,
      email: this.user.email,
      picture: this.user.picture,
    });

    // Mettre à jour l'utilisateur
    const updatedUser = {
      ...this.user,
      aiVerified: aiVerification.verified,
      aiScore: aiVerification.score,
    };
    
    this.saveToStorage(updatedUser);
    
    return {
      verified: aiVerification.verified,
      score: aiVerification.score,
      message: aiVerification.message,
    };
  }
}

export const simpleAuthService = new SimpleAuthService();
