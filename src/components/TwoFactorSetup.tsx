import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authFetch } from '@/lib/authSession';
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
                {(error.includes('Session') || error.includes('expirée') || error.includes('invalide')) && (
                  <Link
                    to="/auth/login"
                    className="inline-block text-sm font-medium text-[#0d9488] hover:text-[#0a7a70]"
                  >
                    → Se reconnecter
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
            {qrCode && (
              <div className="bg-white p-6 rounded-lg border border-slate-200 flex justify-center">
                <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
              </div>
            )}

            {secret && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-900 mb-2">
                  Backup Code (keep it safe):
                </p>
                <p className="text-sm font-mono text-[#0d9488] break-all bg-white p-2 rounded border border-slate-200">
                  {secret}
                </p>
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
