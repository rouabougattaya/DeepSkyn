import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { setSession } from '@/lib/authSession';
import GoogleRealOAuthService from '@/services/googleRealOAuthService';
import { historyService } from '@/services/historyService';
import { aiService } from '@/services/aiService';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);

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

        const idToken = hashParams.get('id_token');
        const accessToken = hashParams.get('access_token');

        if (!idToken && !accessToken) {
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

        // Analyze Google account quality with professional AI service
        const aiVerification = await aiService.verifyIdentity({
          name: googleUserInfo.name,
          email: googleUserInfo.email,
          picture: googleUserInfo.picture,
          googleName: googleUserInfo.name,
        });

        console.log('🎯 REAL Google User Info:', googleUserInfo);
        console.log('🤖 AI Verification:', aiVerification);

        // Create a proper backend session using the Google data
        const backendResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: googleUserInfo.id,
            email: googleUserInfo.email,
            name: googleUserInfo.name,
            picture: googleUserInfo.picture,
            given_name: googleUserInfo.given_name,
            family_name: googleUserInfo.family_name,
            verified_email: googleUserInfo.verified_email,
            aiScore: aiVerification.score,
            photoAnalysis: { quality: aiVerification.details.photoQuality },
            emailAnalysis: { score: aiVerification.details.emailTrust },
          }),
        });

        if (!backendResponse.ok) {
          throw new Error('Backend authentication failed');
        }

        const backendData = await backendResponse.json();

        const backendToken = backendData.accessToken ?? backendData.token;
        if (!backendToken) {
          throw new Error('Backend did not return an access token');
        }

        const accessExp = backendData.accessTokenExpiresAt
          ? new Date(backendData.accessTokenExpiresAt).toISOString()
          : new Date(Date.now() + 3600000).toISOString();
        const refreshExp = backendData.refreshTokenExpiresAt
          ? new Date(backendData.refreshTokenExpiresAt).toISOString()
          : new Date(Date.now() + 7 * 24 * 3600000).toISOString();

        // Use the centralized session management (Nest issueTokens returns accessToken, not token)
        setSession({
          accessToken: backendToken,
          refreshToken: backendData.refreshToken || 'google_refresh_fallback',
          accessTokenExpiresAt: accessExp,
          refreshTokenExpiresAt: refreshExp,
          user: {
            ...backendData.user,
            authMethod: 'google'
          }
        });

        // Enregistrer la tentative de login Google réussie avec les scores IA
        await historyService.recordLoginAttempt({
          loginMethod: 'google',
          status: 'success',
          used2FA: false,
          aiScore: aiVerification.score,
          aiDetails: aiVerification.details,
        });

        const scorePercent = Math.round(aiVerification.score * 100);
        console.log(`✅ Google login successful | Score: ${scorePercent}% | ${aiVerification.message}`);

        setStatus('success');
        setMessage(`Welcome, ${googleUserInfo.name}! Authentication successful. Redirecting...`);

        window.history.replaceState(null, '', window.location.pathname);

        // Rediriger vers /admin si l'utilisateur est admin
        setTimeout(() => {
          const userRole = backendData.user?.role?.toLowerCase()
          if (userRole === 'admin') {
            navigate('/admin', { replace: true })
          } else {
            navigate('/profile', { replace: true })
          }
        }, 1500);

      } catch (error) {
        console.error('Google callback error:', error);

        await historyService.recordLoginAttempt({
          loginMethod: 'google',
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Authentication failed',
          used2FA: false,
        });

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
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-8 w-8 text-green-600" strokeWidth={2} aria-hidden />
            )}
            {status === 'error' && (
              <XCircle className="h-8 w-8 text-red-600" strokeWidth={2} aria-hidden />
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
