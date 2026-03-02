import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { authFetch, getAccessToken } from '@/lib/authSession';

interface TwoFAStatus {
  success: boolean;
  isTwoFAEnabled: boolean;
}

export function SettingsPanel() {
  const navigate = useNavigate();
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    checkTwoFAStatus();
  }, []);

  const checkTwoFAStatus = async () => {
    try {
      // Vérifier si c'est un token Google temporaire
      const accessToken = getAccessToken();
      if (accessToken?.startsWith('google_')) {
        // Mode offline pour Google login
        setTwoFAEnabled(false);
        return;
      }

      const res = await authFetch('/auth/2fa/status');
      const data: TwoFAStatus = await res.json();
      if (res.ok) {
        setTwoFAEnabled(data.isTwoFAEnabled);
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      setTwoFAEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTwoFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!disablePassword) {
      setError('Please enter your password');
      return;
    }

    try {
      const res = await authFetch('/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Error disabling 2FA');
        return;
      }

      setSuccessMessage('2FA disabled successfully');
      setDisablePassword('');
      setShowDisableForm(false);
      setTwoFAEnabled(false);
    } catch (err) {
      setError('Connection error');
      console.error('Disable 2FA error:', err);
    }
  };

  if (loading) {
    return <div className="text-slate-300">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-[#0d9488]" />
            <h3 className="text-lg font-semibold text-slate-900">Two-Factor Authentication (2FA)</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${twoFAEnabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'
            }`}>
            {twoFAEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        <p className="text-slate-600 mb-4">
          Secure your account by enabling two-factor authentication with an Authenticator app.
        </p>

        {twoFAEnabled ? (
          <div className="space-y-3">
            <p className="text-green-700 text-sm bg-green-50 p-3 rounded border border-green-200">
              ✓ Your account is protected by two-factor authentication.
            </p>
            {!showDisableForm ? (
              <button
                onClick={() => setShowDisableForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
              >
                Disable 2FA
              </button>
            ) : (
              <form onSubmit={handleDisableTwoFA} className="space-y-3">
                <div>
                  <label className="text-slate-700 text-sm block mb-2">
                    Please enter your password to disable 2FA
                  </label>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full bg-white text-slate-900 px-3 py-2 rounded-lg border border-slate-200 focus:border-[#0d9488] focus:outline-none focus:ring-1 focus:ring-[#0d9488]"
                  />
                </div>
                {error && (
                  <div className="text-red-700 bg-red-50 border border-red-200 p-2 rounded text-sm">
                    {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                  >
                    Confirm disable
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisableForm(false);
                      setDisablePassword('');
                      setError('');
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-900 px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/settings/2fa')}
            className="bg-[#0d9488] hover:bg-[#0a7a70] text-white px-4 py-2 rounded-lg transition"
          >
            Enable 2FA
          </button>
        )}

        {successMessage && (
          <div className="mt-3 text-green-700 bg-green-50 border border-green-200 p-3 rounded text-sm">
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
}
