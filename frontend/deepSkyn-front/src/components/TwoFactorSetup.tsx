import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authFetch, getAccessToken } from '@/lib/authSession';
import { Navbar } from '@/components/Navbar';

interface TwoFactorSetupProps {
  onSuccess?: () => void;
}

export function TwoFactorSetup({ onSuccess }: TwoFactorSetupProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setError('');

    try {
      // Vérifier si c'est un token Google temporaire
      const accessToken = getAccessToken();
      if (accessToken?.startsWith('google_')) {
        // Mode offline pour Google login - générer un QR code via API externe
        const otpPath = encodeURIComponent('otpauth://totp/DeepSkyn:demo@example.com?secret=JBSWY3DPEHPK3PXP&issuer=DeepSkyn');
        const mockQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${otpPath}`;
        const mockSecret = 'JBSWY3DPEHPK3PXP';

        console.log('🚫 Google token detected - Using mock 2FA setup with rendered QR');
        setQrCode(mockQrCode);
        setSecret(mockSecret);
        setStep('verify');
        return;
      }

      const response = await authFetch('/auth/2fa/setup', {
        method: 'GET',
      });

      const data = await response.json();

      console.log('2FA Setup Response:', { status: response.status, ok: response.ok, data });

      if (!response.ok) {
        setError(data.message || 'Error configuring 2FA');
        return;
      }

      console.log('Setting QR Code:', data.qrCode?.substring(0, 100));
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('verify');
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error('Setup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (verificationCode.length !== 6) {
      setError('Code must be 6 digits');
      setLoading(false);
      return;
    }

    try {
      // Vérifier si c'est un token Google temporaire
      const accessToken = getAccessToken();
      if (accessToken?.startsWith('google_')) {
        // Mode offline pour Google login - accepter n'importe quel code de 6 chiffres
        console.log('🚫 Google token detected - Using mock 2FA verification');

        if (verificationCode === '123456') {
          // Success
          if (onSuccess) {
            onSuccess();
          }
          navigate('/');
        } else {
          setError('Incorrect verification code. Try 123456 for demo.');
          setVerificationCode('');
        }
        return;
      }

      const response = await authFetch('/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationCode,
          secret,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Incorrect verification code');
        setVerificationCode('');
        return;
      }

      // Success
      if (onSuccess) {
        onSuccess();
      }
      navigate('/');
    } catch (err) {
      setError('Error verifying code');
      console.error('Verify error:', err);
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
              Secure your account with 2FA
            </p>
          </div>

          {step === 'setup' ? (
            <div className="space-y-6">
              <p className="text-slate-600 text-center text-sm">
                Protect your account by enabling two-factor authentication
              </p>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-900 mb-3">
                  Instructions:
                </p>
                <ol className="text-sm text-slate-600 space-y-2">
                  <li>1. Download Google Authenticator or Authy on your phone</li>
                  <li>2. Click "Setup 2FA" to generate your QR code</li>
                  <li>3. Scan the QR code with your Authenticator app</li>
                  <li>4. Enter the 6-digit code to confirm</li>
                </ol>
              </div>

              {error && (
                <div className="space-y-2">
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    {error}
                  </p>
                  {error.includes('Session') && (
                    <Link
                      to="/auth/login"
                      className="inline-block text-sm font-medium text-[#0d9488] hover:text-[#0a7a70]"
                    >
                      → Re-login
                    </Link>
                  )}
                </div>
              )}

              <button
                onClick={handleSetup}
                disabled={loading}
                className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] disabled:bg-slate-400 text-white py-2 rounded-lg transition font-semibold"
              >
                {loading ? 'Generating...' : 'Setup 2FA'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-slate-200 flex flex-col items-center justify-center min-h-[240px]">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-teal-100 border-t-[#0d9488] rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500">Generating code...</p>
                  </div>
                ) : qrCode ? (
                  <img
                    src={qrCode}
                    alt="2FA QR Code"
                    className="w-48 h-48 shadow-sm border border-slate-100 rounded-lg p-2"
                    onLoad={() => console.log('✅ QR Code image loaded successfully')}
                    onError={() => setError("Error displaying QR Code")}
                  />
                ) : (
                  <div className="text-center p-4">
                    <p className="text-slate-500 text-sm mb-4">The QR code could not be loaded.</p>
                    <button
                      type="button"
                      onClick={handleSetup}
                      className="text-[#0d9488] font-semibold text-sm hover:underline"
                    >
                      Retry generation
                    </button>
                  </div>
                )}
              </div>

              {secret && !loading && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-slate-900 mb-2">
                    Backup Code (in case phone is lost):
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-sm font-mono text-[#0d9488] break-all bg-white p-2 rounded border border-slate-200">
                      {secret}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium text-slate-900">
                  6-Digit Code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full h-12 bg-white text-center text-2xl tracking-widest px-4 py-2 rounded-lg border border-slate-200 focus:border-[#0d9488] focus:outline-none focus:ring-1 focus:ring-[#0d9488]"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] disabled:bg-slate-400 text-white py-2 rounded-lg transition font-semibold"
              >
                {loading ? 'Verifying...' : 'Activate 2FA'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('setup');
                  setVerificationCode('');
                  setQrCode(null);
                  setSecret(null);
                }}
                className="w-full text-[#0d9488] hover:text-[#0a7a70] py-2 font-medium text-sm"
              >
                ← Back
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
