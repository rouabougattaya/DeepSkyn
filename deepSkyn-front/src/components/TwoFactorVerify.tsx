import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authFetch, setSession } from '@/lib/authSession';
import { clearTwoFASession } from '@/lib/twoFASession';
import { Navbar } from '@/components/Navbar';
import { historyService } from '@/services/historyService';

interface TwoFactorVerifyProps {
  user?: { id: string; email: string; firstName: string; lastName: string };
  onSuccess?: (data: any) => void;
}

export function TwoFactorVerify({ user, onSuccess }: TwoFactorVerifyProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Debug logging
  console.log('TwoFactorVerify received user:', user);

  // Si on a pas d'utilisateur en session, rediriger vers login
  if (!user) {
    console.error('No user data in TwoFactorVerify, redirecting to login');
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#f8fafc] flex flex-col items-center pt-24 pb-8 px-4">
          <div className="w-full max-w-[440px] flex flex-col items-center justify-center">
            <p className="text-red-600 text-center mb-6">Session expirée ou invalide. Veuillez vous reconnecter.</p>
            <button
              onClick={() => navigate('/auth/login')}
              className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white py-2 rounded-lg font-semibold transition"
            >
              Retour à la connexion
            </button>
          </div>
        </main>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (code.length !== 6) {
      setError('Code must be 6 digits');
      setLoading(false);
      return;
    }

    try {
      console.log('Sending 2FA code:', code);
      const response = await authFetch('/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, userId: user.id }),
      });

      const data = await response.json();
      console.log('2FA verify response:', { status: response.status, ok: response.ok, data });

      if (!response.ok || !data.success) {
        setError(data.message || 'Incorrect 2FA code');
        setCode('');
        return;
      }

      // Succès - stocker les tokens et rediriger
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
        user: data.user,
      });

      // Enregistrer la tentative réussie avec 2FA
      await historyService.recordLoginAttempt({
        loginMethod: 'email',
        status: 'success',
        used2FA: true,
        aiScore: data.user.aiScore,
      });

      // Nettoyer la session 2FA
      clearTwoFASession();

      if (onSuccess) {
        onSuccess(data);
      }

      // Redirection après un court délai
      setTimeout(() => {
        navigate(location.state?.from || '/');
      }, 500);
    } catch (err) {
      setError('Error verifying code');
      console.error('2FA verify error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#f8fafc] flex flex-col items-center pt-24 pb-8 px-4">
        <div className="w-full max-w-[440px]">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-[32px] font-bold text-slate-900 mb-2">
              Two-Factor Authentication
            </h1>
            <p className="text-slate-500 text-sm">
              Enter the code from your Authenticator app
            </p>
          </div>

          {/* User Info */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg mb-6">
            <p className="text-sm font-medium text-slate-900 mb-2">
              Signed in as:
            </p>
            <p className="text-slate-900 font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-slate-500 text-sm">
              {user.email}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium text-slate-900">
                6-Digit Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full h-12 bg-white text-center text-2xl tracking-widest px-4 py-3 rounded-lg border border-slate-200 focus:border-[#0d9488] focus:outline-none focus:ring-1 focus:ring-[#0d9488]"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] disabled:bg-slate-400 text-white py-2 rounded-lg transition font-semibold"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/auth/login')}
              className="w-full text-[#0d9488] hover:text-[#0a7a70] py-2 text-sm font-medium"
            >
              ← Back to Sign In
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
