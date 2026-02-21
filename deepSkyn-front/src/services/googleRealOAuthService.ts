// Real Google OAuth Service - Get ACTUAL user info from REAL Google account
export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  verified_email: boolean;
}

class GoogleRealOAuthService {
  // Parse ID token from OAuth response
  static parseIDToken(idToken: string): GoogleUserInfo | null {
    try {
      console.log('🔑 Parsing real ID token...');

      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid ID token format');
      }

      const payload = JSON.parse(atob(parts[1]));

      const userInfo: GoogleUserInfo = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        given_name: payload.given_name,
        family_name: payload.family_name,
        verified_email: payload.email_verified,
      };

      console.log('✅ Parsed REAL ID token:', userInfo);
      return userInfo;

    } catch (error) {
      console.error('Error parsing ID token:', error);
      return null;
    }
  }

  // Get user info from access token
  static async getUserInfoFromAccessToken(accessToken: string): Promise<GoogleUserInfo | null> {
    try {
      console.log('🔑 Getting user info from access token...');

      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const data = await response.json();

      const userInfo: GoogleUserInfo = {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        given_name: data.given_name,
        family_name: data.family_name,
        verified_email: data.verified_email,
      };

      console.log('✅ Got REAL user info from access token:', userInfo);
      return userInfo;

    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  // Extract tokens from URL (implicit grant flow)
  static extractTokensFromURL(): { accessToken?: string; idToken?: string } | null {
    try {
      console.log('🔍 Extracting tokens from URL...');

      // Check URL hash for tokens
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));

        const accessToken = params.get('access_token');
        const idToken = params.get('id_token');

        if (accessToken || idToken) {
          console.log('✅ Found tokens in URL hash:', { accessToken, idToken });
          return { accessToken: accessToken ?? undefined, idToken: idToken ?? undefined };
        }
      }

      // Check URL search params
      const searchParams = new URLSearchParams(window.location.search);
      const searchAccessToken = searchParams.get('access_token');
      const searchIdToken = searchParams.get('id_token');

      if (searchAccessToken || searchIdToken) {
        console.log('✅ Found tokens in URL search:', { accessToken: searchAccessToken, idToken: searchIdToken });
        return { accessToken: searchAccessToken ?? undefined, idToken: searchIdToken ?? undefined };
      }

      return null;
    } catch (error) {
      console.error('Error extracting tokens from URL:', error);
      return null;
    }
  }

  // Try to get user info from Google JavaScript API
  static async tryGetUserFromGapi(): Promise<GoogleUserInfo | null> {
    return new Promise((resolve) => {
      try {
        if (typeof window !== 'undefined' && (window as any).gapi) {
          console.log('🔍 Using Google JavaScript API...');

          (window as any).gapi.load('auth2', () => {
            (window as any).gapi.auth2.init({
              client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
              scope: 'email profile',
            }).then(() => {
              const auth2 = (window as any).gapi.auth2.getAuthInstance();
              const user = auth2.currentUser.get();

              if (user.isSignedIn()) {
                const profile = user.getBasicProfile();
                const userInfo: GoogleUserInfo = {
                  id: profile.getId(),
                  email: profile.getEmail(),
                  name: profile.getName(),
                  picture: profile.getImageUrl(),
                  given_name: profile.getGivenName(),
                  family_name: profile.getFamilyName(),
                  verified_email: profile.isVerified(),
                };

                console.log('✅ Got REAL user info from gapi:', userInfo);
                resolve(userInfo);
              } else {
                console.log('❌ User not signed in via gapi');
                resolve(null);
              }
            }).catch((error: any) => {
              console.error('Error with gapi auth:', error);
              resolve(null);
            });
          });
        } else {
          console.log('❌ gapi not available');
          resolve(null);
        }
      } catch (error) {
        console.error('Error checking gapi:', error);
        resolve(null);
      }
    });
  }

  // Main method to get REAL Google user info from actual Google account
  static async getRealGoogleUserInfo(): Promise<GoogleUserInfo> {
    try {
      console.log('🎯 Getting REAL Google user info...');

      // Method 1: Extract real tokens from URL hash (implicit + OIDC flow)
      // With response_type=token id_token, Google puts real tokens in the URL hash
      const tokens = this.extractTokensFromURL();
      if (tokens) {
        console.log('✅ Found real OAuth tokens in URL hash');

        // Priority 1: Parse id_token JWT — contains real user data embedded in the token
        if (tokens.idToken) {
          const userInfo = this.parseIDToken(tokens.idToken);
          if (userInfo) {
            console.log('✅ SUCCESS: Got REAL user info from id_token JWT:', userInfo.email);
            return userInfo;
          }
        }

        // Priority 2: Use access_token to call Google's userinfo API
        if (tokens.accessToken) {
          const userInfo = await this.getUserInfoFromAccessToken(tokens.accessToken);
          if (userInfo) {
            console.log('✅ SUCCESS: Got REAL user info from Google userinfo API:', userInfo.email);
            return userInfo;
          }
        }
      }

      // Method 2: Try Google JavaScript API (gapi) if loaded
      const gapiUser = await this.tryGetUserFromGapi();
      if (gapiUser) {
        console.log('✅ SUCCESS: Got REAL user info from gapi:', gapiUser.email);
        return gapiUser;
      }

      // No real tokens found — check if OAuth used authorization code flow by mistake
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code) {
        console.error('❌ OAuth returned an authorization code instead of tokens.');
        console.error('   The app is configured to use implicit+OIDC flow (response_type=token id_token).');
        console.error('   Clear browser cache and try again — the OAuth URL has been updated.');
        throw new Error(
          'OAuth configuration mismatch: received authorization code instead of tokens. ' +
          'Please clear your browser cache and sign in again.'
        );
      }

      // No real OAuth data found at all
      console.error('❌ No real OAuth tokens found. Cannot retrieve user info.');
      throw new Error(
        'No Google OAuth tokens found in the URL. Please try signing in again.'
      );

    } catch (error) {
      console.error('Error in getRealGoogleUserInfo:', error);
      throw error;
    }
  }

  // Store user info
  static storeUserInfo(userInfo: GoogleUserInfo): void {
    try {
      sessionStorage.setItem('google_real_oauth_user_info', JSON.stringify(userInfo));
      localStorage.setItem('google_real_oauth_user_info', JSON.stringify(userInfo));
      console.log('💾 Stored REAL OAuth user info:', userInfo);
    } catch (error) {
      console.error('Error storing user info:', error);
    }
  }

  // Enhanced photo analysis with precise detection
  static analyzePhoto(pictureUrl: string): {
    hasRealPhoto: boolean;
    isDefaultPhoto: boolean;
    quality: number;
    source: string;
    description: string;
  } {
    if (!pictureUrl) {
      return {
        hasRealPhoto: false,
        isDefaultPhoto: true,
        quality: 0.1,
        source: 'none',
        description: 'No photo provided'
      };
    }

    const isGooglePhoto = pictureUrl.includes('googleusercontent.com');
    
    // More precise default photo detection
    const isDefaultPhoto = pictureUrl.includes('default-user') || 
                          pictureUrl.includes('placeholder') ||
                          pictureUrl.includes('silhouette') ||
                          pictureUrl.includes('avatar') ||
                          pictureUrl.includes('=s96-c') && pictureUrl.includes('a/ACg8oc') ||
                          pictureUrl.includes('photo.jpg') ||
                          pictureUrl.includes('profile-icon') ||
                          pictureUrl.includes('user-icon');

    let quality = 0.3;
    let source = 'unknown';
    let description = 'Unknown photo source';

    if (isGooglePhoto && !isDefaultPhoto) {
      // Check if it's a real user photo (not default)
      if (pictureUrl.includes('a/') && !pictureUrl.includes('ACg8oc')) {
        quality = 0.9;
        source = 'google_real';
        description = 'Real Google profile photo';
      } else if (pictureUrl.includes('d/') || pictureUrl.includes('photo/')) {
        quality = 0.8;
        source = 'google_high_quality';
        description = 'High quality Google photo';
      } else {
        quality = 0.6;
        source = 'google_possible';
        description = 'Possible Google photo';
      }
    } else if (isGooglePhoto && isDefaultPhoto) {
      quality = 0.2; // Lower score for default photos
      source = 'google_default';
      description = 'Default Google profile photo (letter/avatar)';
    } else if (pictureUrl.startsWith('https://lh3.googleusercontent.com/a/')) {
      if (pictureUrl.includes('ACg8oc')) {
        quality = 0.2;
        source = 'google_avatar';
        description = 'Google avatar/letter photo';
      } else {
        quality = 0.8;
        source = 'google_high_quality';
        description = 'High quality Google photo';
      }
    } else if (pictureUrl.startsWith('https://')) {
      quality = 0.6;
      source = 'external_https';
      description = 'External HTTPS photo';
    } else {
      quality = 0.3;
      source = 'other';
      description = 'Other photo source';
    }

    return {
      hasRealPhoto: isGooglePhoto && !isDefaultPhoto,
      isDefaultPhoto,
      quality,
      source,
      description,
    };
  }

  // Enhanced email analysis with dynamic scoring
  static analyzeEmail(email: string): {
    domain: string;
    isTrusted: boolean;
    isBusiness: boolean;
    isSuspicious: boolean;
    score: number;
    description: string;
  } {
    if (!email) {
      return {
        domain: '',
        isTrusted: false,
        isBusiness: false,
        isSuspicious: true,
        score: 0.1,
        description: 'No email provided'
      };
    }

    const domain = email.split('@')[1]?.toLowerCase() || '';
    
    const trustedDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'protonmail.com'];
    const businessPatterns = ['company', 'corp', 'tech', 'studio', 'office'];
    const suspiciousPatterns = ['temp', 'fake', '10minutemail', 'guerrillamail', 'mailinator'];

    const isTrusted = trustedDomains.includes(domain);
    const isBusiness = businessPatterns.some(pattern => domain.includes(pattern));
    const isSuspicious = suspiciousPatterns.some(pattern => domain.includes(pattern));

    let score = 0.4; // Base score lowered to allow more variation
    if (isTrusted) score += 0.3;
    if (isBusiness) score += 0.2;
    if (isSuspicious) score -= 0.4;

    // Maximum bonus for real Gmail addresses
    if (domain === 'gmail.com') {
      score += 0.2; // Increased from 0.1 to 0.2
    }

    let description = 'Neutral email domain';
    if (domain === 'gmail.com') {
      description = 'Gmail (highest trust)';
    } else if (isTrusted) {
      description = 'Trusted email provider';
    } else if (isBusiness) {
      description = 'Business email domain';
    } else if (isSuspicious) {
      description = 'Suspicious email domain';
    }

    return {
      domain,
      isTrusted,
      isBusiness,
      isSuspicious,
      score: Math.max(0.1, Math.min(score, 1.0)),
      description,
    };
  }
}

export default GoogleRealOAuthService;
