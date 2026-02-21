// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id-here';
const GOOGLE_REDIRECT_URI = process.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback/google';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
}

class GoogleAuthService {
  private clientId: string;
  private redirectUri: string;

  constructor() {
    this.clientId = GOOGLE_CLIENT_ID;
    this.redirectUri = GOOGLE_REDIRECT_URI;
  }

  // Initialize Google OAuth
  initGoogleAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof gapi === 'undefined') {
        // Load Google API script
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/platform.js';
        script.onload = () => {
          gapi.load('auth2', () => {
            gapi.auth2.init({
              client_id: this.clientId,
              redirect_uri: this.redirectUri,
              scope: 'profile email',
            }).then(() => resolve()).catch(reject);
          });
        };
        script.onerror = reject;
        document.head.appendChild(script);
      } else {
        resolve();
      }
    });
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<GoogleUserInfo> {
    try {
      await this.initGoogleAuth();
      
      const auth2 = gapi.auth2.getAuthInstance();
      const googleUser = await auth2.signIn();
      
      const profile = googleUser.getBasicProfile();
      const authResponse = googleUser.getAuthResponse(true);

      return {
        id: profile.getId(),
        email: profile.getEmail(),
        name: profile.getName(),
        picture: profile.getImageUrl(),
        given_name: profile.getGivenName(),
        family_name: profile.getFamilyName(),
      };
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw new Error('Failed to sign in with Google');
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      const auth2 = gapi.auth2.getAuthInstance();
      await auth2.signOut();
    } catch (error) {
      console.error('Google sign-out error:', error);
    }
  }

  // Get current user
  getCurrentUser(): GoogleUserInfo | null {
    try {
      const auth2 = gapi.auth2.getAuthInstance();
      const currentUser = auth2.currentUser.get();
      
      if (currentUser.isSignedIn()) {
        const profile = currentUser.getBasicProfile();
        return {
          id: profile.getId(),
          email: profile.getEmail(),
          name: profile.getName(),
          picture: profile.getImageUrl(),
          given_name: profile.getGivenName(),
          family_name: profile.getFamilyName(),
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
}

export const googleAuthService = new GoogleAuthService();

// Alternative: Using OAuth 2.0 flow with popup
export const signInWithGooglePopup = (): Promise<GoogleUserInfo> => {
  return new Promise((resolve, reject) => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=email profile&` +
      `access_type=offline`;

    const popup = window.open(
      authUrl,
      'google-auth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        reject(new Error('Authentication cancelled'));
      }
    }, 1000);

    const messageHandler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        popup?.close();
        resolve(event.data.user);
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        popup?.close();
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener('message', messageHandler);
  });
};
