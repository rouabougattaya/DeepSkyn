import realApi from '@/services/realApi';
import { aiService } from '@/services/aiService';

// Simple Auth Service sans JWT
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  googleName?: string;
  authMethod: 'email' | 'google' | 'apple';
  createdAt: string;
  lastLoginAt: string;
  aiVerified?: boolean;
  aiScore?: number;
  googleId?: string;
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
  private saveToStorage(user: User, token?: string): void {
    localStorage.setItem('auth_user', JSON.stringify(user));
    if (token) {
      localStorage.setItem('auth_token', token);
    }
    this.user = user;
  }

  // Vider storage
  private clearStorage(): void {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    this.user = null;
  }

  // Email/Password login
  async loginWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await realApi.login(email, password);

      // AI Verification pour email/password
      const aiVerification = await aiService.verifyIdentity({
        name: response.user.name,
        email: response.user.email,
        picture: response.user.picture,
        googleName: (response.user as any).googleName,
        bio: (response.user as any).bio,
      });

      // Mettre à jour l'utilisateur avec les infos AI
      const userWithAI = {
        ...response.user,
        aiVerified: aiVerification.verified,
        aiScore: aiVerification.score,
      };

      console.log(`🤖 AI Verification Score: ${Math.round(aiVerification.score * 100)}% (Verified: ${aiVerification.verified})`);

      // Sauvegarder sur le serveur
      try {
        await realApi.updateAIScore(
          userWithAI.id,
          userWithAI.aiVerified,
          userWithAI.aiScore,
          { quality: aiVerification.details.photoQuality },
          aiVerification.details
        );
        console.log('✅ AI Score synced to backend');
      } catch (err) {
        console.warn('❌ Backend AI score update failed:', err);
      }

      this.saveToStorage(userWithAI, response.token);

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
      // Vérifier si l'utilisateur est actuellement connecté avec email
      const currentUser = this.getCurrentUser();

      let authResponse: any;

      // Si l'utilisateur est déjà connecté avec le même email, lier les comptes
      if (currentUser && currentUser.email === googleUser.email) {
        console.log('Linking Google to existing email account');
        authResponse = await this.linkGoogleAccount(currentUser.id, googleUser);
      } else {
        // Sinon, vérifier si un utilisateur existe avec cet email
        const existingUser = await this.checkExistingUser(googleUser.email);

        if (existingUser) {
          // Si l'utilisateur existe mais n'est pas connecté, créer une nouvelle session Google
          console.log('Creating new Google session for existing email');
          authResponse = await this.createGoogleUser(googleUser);
        } else {
          // Créer un nouvel utilisateur Google
          console.log('Creating new Google user');
          authResponse = await this.createGoogleUser(googleUser);
        }
      }

      const user = authResponse.user;

      // AI Verification pour Google OAuth
      const aiVerification = await aiService.verifyIdentity({
        name: user.name,
        email: user.email,
        picture: user.picture,
        googleName: user.googleName,
        bio: (user as any).bio,
      });

      // Mettre à jour l'utilisateur avec les infos AI
      const userWithAI = {
        ...authResponse.user,
        aiVerified: aiVerification.verified,
        aiScore: aiVerification.score,
      };

      console.log(`🤖 Google AI Verification Score: ${Math.round(aiVerification.score * 100)}%`);

      // Sauvegarder sur le serveur
      try {
        await realApi.updateAIScore(
          userWithAI.id,
          userWithAI.aiVerified,
          userWithAI.aiScore,
          { ...aiVerification.details, source: 'google' },
          aiVerification.details
        );
        console.log('✅ AI Score synced to backend (Google)');
      } catch (err) {
        console.warn('❌ Backend AI score update failed:', err);
      }

      this.saveToStorage(userWithAI, authResponse.token);

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
      const user = await realApi.checkUser(email);
      return user;
    } catch (error) {
      console.error('Error checking existing user:', error);
      return null;
    }
  }

  // Link Google account to existing user
  private async linkGoogleAccount(userId: string, googleUser: any): Promise<any> {
    try {
      return await realApi.linkGoogleAccount(userId, googleUser);
    } catch (error) {
      console.error('Error linking Google account:', error);
      throw error;
    }
  }

  // Create new Google user
  private async createGoogleUser(googleUser: any): Promise<any> {
    try {
      return await realApi.createGoogleUser(googleUser);
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
    // Also clear authSession data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('accessTokenExpiresAt');
    localStorage.removeItem('refreshTokenExpiresAt');
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

    const u = this.user;
    return {
      verified: !!u.aiVerified || (u.aiScore ? Number(u.aiScore) >= 0.7 : false),
      score: u.aiScore ? Number(u.aiScore) : 0,
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
      googleName: this.user.googleName,
      bio: (this.user as any).bio,
    });

    // Mettre à jour l'utilisateur
    const updatedUser = {
      ...this.user,
      aiVerified: aiVerification.verified,
      aiScore: aiVerification.score,
    };

    this.saveToStorage(updatedUser);

    // Synchroniser avec historyService
    try {
      const { historyService } = await import('./historyService');
      const used2FA = await historyService.was2FAUsedRecently();
      historyService.updateUserScoreSimple(
        'success',
        used2FA,
        aiVerification.score,
        aiVerification.details
      );
    } catch (e) {
      console.warn('Could not sync with historyService:', e);
    }

    return {
      verified: aiVerification.verified,
      score: aiVerification.score,
      message: aiVerification.message,
    };
  }

  // Fetch full profile from backend
  async getProfile(): Promise<User> {
    if (!this.user) throw new Error('No user logged in');

    // Check user by email to get full record
    const remoteUser = await realApi.checkUser(this.user.email);
    if (!remoteUser) throw new Error('User record not found');

    // Merge with current data (like authMethod which might be local-only if not in DB)
    const updatedUser = { ...this.user, ...remoteUser };
    this.saveToStorage(updatedUser);
    return updatedUser;
  }

  // Fetch user analyses
  async getUserAnalyses(): Promise<any[]> {
    return realApi.get(`/analysis/user`);
  }
}

export const simpleAuthService = new SimpleAuthService();
