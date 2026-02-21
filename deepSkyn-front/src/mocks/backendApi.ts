// Mock Backend API for Development
// In production, replace these calls with real backend endpoints

export interface MockUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  authMethod: 'email' | 'google';
  createdAt: string;
  lastLoginAt: string;
}

export interface MockAuthResponse {
  user: MockUser;
  token: string;
  refreshToken?: string;
}

// Mock database
const mockUsers: MockUser[] = [
  {
    id: '1',
    email: 'demo@deepskyn.com',
    name: 'Demo User',
    authMethod: 'email',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  }
];

// Mock API functions
export const mockApi = {
  // Email/Password login
  async login(email: string, password: string): Promise<MockAuthResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers.find(u => u.email === email);
    
    if (!user || password !== 'demo123') {
      throw new Error('Invalid credentials');
    }
    
    const token = btoa(JSON.stringify({
      userId: user.id,
      email: user.email,
      exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    }));
    
    return {
      user: { ...user, lastLoginAt: new Date().toISOString() },
      token,
    };
  },

  // Check if user exists
  async checkUser(email: string): Promise<MockUser | null> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockUsers.find(u => u.email === email) || null;
  },

  // Create Google user
  async createGoogleUser(googleUser: any): Promise<MockUser> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser: MockUser = {
      id: Date.now().toString(),
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      authMethod: 'google',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    
    mockUsers.push(newUser);
    return newUser;
  },

  // Link Google account
  async linkGoogleAccount(userId: string, googleUser: any): Promise<MockUser> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update user with Google info
    user.picture = googleUser.picture;
    user.lastLoginAt = new Date().toISOString();
    
    return user;
  },

  // Google OAuth callback
  async googleCallback(code: string): Promise<MockAuthResponse> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock Google token exchange
    const mockGoogleUser = {
      id: 'google_' + Date.now(),
      email: 'user@gmail.com', // In real app, get from Google
      name: 'Google User',
      picture: 'https://lh3.googleusercontent.com/a/default-user=photo.jpg',
      given_name: 'Google',
      family_name: 'User',
    };
    
    // Check if user exists
    const existingUser = await mockApi.checkUser(mockGoogleUser.email);
    
    let user: MockUser;
    if (existingUser) {
      // Link to existing account
      user = await mockApi.linkGoogleAccount(existingUser.id, mockGoogleUser);
    } else {
      // Create new user
      user = await mockApi.createGoogleUser(mockGoogleUser);
    }
    
    const token = btoa(JSON.stringify({
      userId: user.id,
      email: user.email,
      exp: Date.now() + (24 * 60 * 60 * 1000),
    }));
    
    return { user, token };
  }
};

// Export for use in auth service
export default mockApi;
