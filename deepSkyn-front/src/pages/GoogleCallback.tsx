import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { simpleAuthService } from '@/services/authService-simple';
import GoogleRealOAuthService from '@/services/googleRealOAuthService';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // With implicit+OIDC flow, Google returns tokens in the URL hash fragment
        // e.g. /auth/callback/google#access_token=...&id_token=...&token_type=Bearer

        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);

        // Check for OAuth errors first (can be in query params or hash)
        const errorFromQuery = searchParams.get('error');
        const hashParams = hash ? new URLSearchParams(hash.substring(1)) : new URLSearchParams();
        const errorFromHash = hashParams.get('error');
        const oauthError = errorFromQuery || errorFromHash;

        if (oauthError) {
          const errorDesc = searchParams.get('error_description') || hashParams.get('error_description') || oauthError;
          console.error('❌ Google OAuth error:', errorDesc);
          setStatus('error');
          setMessage(`Authentication failed: ${errorDesc}`);
          setTimeout(() => navigate('/auth/login'), 3000);
          return;
        }

        // With implicit+OIDC flow: id_token and access_token are in the URL hash
        const idToken = hashParams.get('id_token');
        const accessToken = hashParams.get('access_token');

        if (!idToken && !accessToken) {
          // Neither token found — check if it's the old code flow (should not happen now)
          const code = searchParams.get('code');
          if (code) {
            console.error('❌ Received authorization code instead of tokens. OAuth flow mismatch.');
            setStatus('error');
            setMessage(
              'Authentication configuration issue: received code instead of tokens. ' +
              'Please clear your browser cache and try again.'
            );
            setTimeout(() => navigate('/auth/login'), 4000);
          } else {
            console.error('❌ No OAuth tokens found in URL hash');
            setStatus('error');
            setMessage('No authentication data received from Google. Please try again.');
            setTimeout(() => navigate('/auth/login'), 3000);
          }
          return;
        }

        console.log('✅ Found real OAuth tokens in URL hash:', {
          hasIdToken: !!idToken,
          hasAccessToken: !!accessToken,
        });

        // Get REAL Google user info from the actual tokens
        const googleUserInfo = await GoogleRealOAuthService.getRealGoogleUserInfo();

        // Store the real user info
        GoogleRealOAuthService.storeUserInfo(googleUserInfo);

        // Analyze Google account quality with real data
        const photoAnalysis = GoogleRealOAuthService.analyzePhoto(googleUserInfo.picture);
        const emailAnalysis = GoogleRealOAuthService.analyzeEmail(googleUserInfo.email);

        console.log('🎯 REAL Google User Info:', googleUserInfo);
        console.log('📸 REAL Photo Analysis:', photoAnalysis);
        console.log('📧 REAL Email Analysis:', emailAnalysis);

        // Use real Google data with AI verification / scoring
        const authData = await simpleAuthService.loginWithGoogle(googleUserInfo);

        // Show detailed AI verification result
        if (authData.aiVerification) {
          const aiStatus = authData.aiVerification.verified ? '✅' : '⚠️';
          const photoStatus = photoAnalysis.hasRealPhoto ? '📸 Photo: OUI' : '📸 Photo: NON';
          const scorePercent = Math.round(authData.aiVerification.score * 100);

          console.log(
            `${aiStatus} ${authData.aiVerification.message} | ${photoStatus} | Score: ${scorePercent}% | ${photoAnalysis.description}`
          );
        }

        setStatus('success');
        setMessage(`Welcome, ${googleUserInfo.name}! Authentication successful. Redirecting...`);

        // Clean the URL hash so tokens are not visible in the address bar
        window.history.replaceState(null, '', window.location.pathname);

        setTimeout(() => {
          navigate('/');
        }, 1500);

      } catch (error) {
        console.error('Google callback error:', error);
        setStatus('error');
        const errMessage = error instanceof Error ? error.message : 'Authentication failed. Please try again.';
        setMessage(errMessage);
        setTimeout(() => navigate('/auth/login'), 4000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${status === 'loading' ? 'bg-blue-100' :
              status === 'success' ? 'bg-green-100' :
                'bg-red-100'
            }`}>
            {status === 'loading' && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            )}
            {status === 'success' && (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'error' && (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {status === 'loading' ? 'Authenticating with Google...' :
            status === 'success' ? 'Success!' :
              'Authentication Failed'}
        </h1>

        <p className="text-slate-600 max-w-sm mx-auto">
          {message}
        </p>

        {status === 'error' && (
          <button
            onClick={() => navigate('/auth/login')}
            className="mt-4 px-4 py-2 bg-[#0d9488] text-white rounded-lg hover:bg-[#0a7a70] transition-colors"
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
};

export default GoogleCallback;
