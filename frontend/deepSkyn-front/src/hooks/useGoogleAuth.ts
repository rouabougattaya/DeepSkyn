import { useState, useCallback } from 'react';
import { simpleAuthService } from '../services/authService-simple';

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
}

export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load Google API
      await loadGoogleScript();
      
      // Initialize Google Auth
      const googleUser = await signInWithGoogleAPI();
      
      // Authenticate with our backend
const authResponse = await simpleAuthService.loginWithGoogle(googleUser);
      
      return authResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    signInWithGoogle,
    isLoading,
    error,
  };
};

// Load Google API script
const loadGoogleScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/platform.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      window.gapi.load('auth2', resolve);
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Google API'));
    };
    
    document.head.appendChild(script);
  });
};

// Sign in with Google API
const signInWithGoogleAPI = (): Promise<GoogleUserInfo> => {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      reject(new Error('Google Client ID is not configured'));
      return;
    }

    window.gapi.auth2.init({
      client_id: clientId,
      scope: 'profile email',
    }).then(() => {
      const auth2 = window.gapi.auth2.getAuthInstance();
      
      auth2.signIn({
        prompt: 'select_account',
      }).then((googleUser: any) => {
        const profile = googleUser.getBasicProfile();
        
        resolve({
          id: profile.getId(),
          email: profile.getEmail(),
          name: profile.getName(),
          picture: profile.getImageUrl(),
          given_name: profile.getGivenName(),
          family_name: profile.getFamilyName(),
        });
      }).catch((error: any) => {
        reject(new Error(error.error || 'Google sign-in failed'));
      });
    }).catch(() => {
      reject(new Error('Failed to initialize Google Auth'));
    });
  });
};

// Redirect method using implicit+OIDC flow (returns real tokens in URL hash)
// This avoids needing a backend to exchange authorization codes
export const signInWithGoogleRedirect = (): void => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('VITE_GOOGLE_CLIENT_ID is not set');
    throw new Error('Google sign-in is not configured (missing client ID)');
  }
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback/google';
  
  // Generate a cryptographically random nonce for id_token verification
  const nonce = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Store nonce in session storage for id_token verification on callback
  sessionStorage.setItem('google_oauth_nonce', nonce);
  
  // Use implicit + OIDC flow: response_type=token id_token
  // Google returns access_token and id_token directly in the URL hash
  // The id_token is a JWT containing the real user's profile data
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=token%20id_token&` +  // Request BOTH access_token and id_token in hash
    `scope=openid%20email%20profile&` +  // openid scope is required for id_token
    `nonce=${encodeURIComponent(nonce)}&` + // Required for id_token in implicit flow
    `prompt=select_account`;

  console.log('🔐 Redirecting to Google OAuth (implicit+OIDC flow) for REAL user data...');
  window.location.href = authUrl;
};
