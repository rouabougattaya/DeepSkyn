import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Bell, Sun, Moon, Save } from 'lucide-react';
import { authFetch, getAccessToken, getUser } from '@/lib/authSession';

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

  // Scehduled Notifications State
  const [settings, setSettings] = useState<{ [key: string]: { time: string; message: string; isActive: boolean } }>({
    AM: { time: '08:00', message: 'Time for your morning routine!', isActive: false },
    PM: { time: '20:00', message: 'Time for your evening routine!', isActive: false }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [lastNotification, setLastNotification] = useState<{ title: string; message: string; } | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('FREE');
  const [planResolved, setPlanResolved] = useState(false);

  const canUseScheduledNotifications = ['PRO', 'PREMIUM'].includes((currentPlan || '').toUpperCase());

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      const [, plan] = await Promise.all([checkTwoFAStatus(), fetchCurrentPlan()]);
      const notificationsEnabled = ['PRO', 'PREMIUM'].includes((plan || '').toUpperCase());
      if (notificationsEnabled) {
        await fetchNotificationSettings(notificationsEnabled);
        cleanup = setupNotificationStream(notificationsEnabled);
      }
    };

    void init();
    return () => cleanup && cleanup();
  }, []);

  const fetchCurrentPlan = async () => {
    const currentUser = getUser();
    if (!currentUser?.id) {
      setCurrentPlan('FREE');
      setPlanResolved(true);
      return 'FREE';
    }

    try {
      const res = await authFetch(`/subscription/${currentUser.id}`);
      if (!res.ok) throw new Error(`Subscription API returned ${res.status}`);
      const subData = await res.json();
      const newPlan = subData?.plan || 'FREE';
      setCurrentPlan(newPlan);
      return newPlan;
    } catch {
      setCurrentPlan('FREE');
      return 'FREE';
    } finally {
      setPlanResolved(true);
    }
  };

  const fetchNotificationSettings = async (allowNotifications = canUseScheduledNotifications) => {
    if (!allowNotifications) return;
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await authFetch('/notifications/settings');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(prev => {
          const newSettings = { ...prev };
          data.settings.forEach((s: any) => {
            if (newSettings[s.type]) {
              newSettings[s.type] = { time: s.time, message: s.message, isActive: s.isActive };
            }
          });
          return newSettings;
        });
      }
    } catch(e) {
      console.error('Error fetching settings:', e);
    }
  };

  const saveSetting = async (type: 'AM' | 'PM') => {
    if (!canUseScheduledNotifications) {
      setError('Scheduled notifications are available for PRO/PREMIUM plans only.');
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setError('Please login again to save notification settings.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await authFetch('/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...settings[type] })
      });
      if (!res.ok) {
        setError('Unable to save settings. Please login again.');
        return;
      }

      setSuccessMessage(`Saved ${type} setting successfully.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Request permission if enabling
      if (settings[type].isActive && 'Notification' in window && Notification.permission !== 'granted') {
         Notification.requestPermission();
      }
    } catch (e) {
      setError('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const setupNotificationStream = (allowNotifications = canUseScheduledNotifications) => {
    if (!allowNotifications) return;
    const token = getAccessToken();
    if (!token) return;
    const url = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
    const sse = new EventSource(`${url}/notifications/stream?token=${encodeURIComponent(token)}`);
    sse.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const payload = parsed?.data ?? parsed;
        if (!payload?.title || !payload?.message) return;

        setLastNotification({ title: payload.title, message: payload.message });
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(payload.title, { body: payload.message });
        } else {
          alert(`🔔 ${payload.title}: ${payload.message}`);
        }
      } catch (error) {
        console.error('Invalid SSE notification payload:', event.data, error);
      }
    };
    sse.onerror = () => {
      sse.close();
    };
    return () => sse.close();
  };

  const checkTwoFAStatus = async () => {
    try {
      const accessToken = getAccessToken();
      if (accessToken?.startsWith('google_')) {
        setTwoFAEnabled(false);
        return;
      }

      const res = await authFetch('/auth/2fa/status');
      const data: TwoFAStatus = await res.json();
      if (res.ok) {
        setTwoFAEnabled(data.isTwoFAEnabled);
      }
    } catch (error) {
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
    }
  };

  if (loading) {
    return <div className="text-slate-300">Loading...</div>;
  }

  const renderNotificationSetting = (type: 'AM' | 'PM', icon: React.ReactNode) => {
    const data = settings[type];
    return (
      <div className="border border-slate-200 rounded p-4 mt-4 relative">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
             {icon}
             <h4 className="font-semibold text-slate-800">{type} Routine</h4>
           </div>
           <label className="flex items-center cursor-pointer relative">
              <input type="checkbox" className="sr-only" checked={data.isActive} onChange={e => setSettings({...settings, [type]: {...data, isActive: e.target.checked}})} />
              <div className={`block w-10 h-6 rounded-full transition-colors ${data.isActive ? 'bg-[#0d9488]' : 'bg-slate-300'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${data.isActive ? 'transform translate-x-4' : ''}`}></div>
           </label>
        </div>
        <div className="space-y-3">
           <div>
              <label className="text-sm text-slate-600 block mb-1">Time</label>
              <input type="time" value={data.time} onChange={e => setSettings({...settings, [type]: {...data, time: e.target.value}})} className="w-full sm:w-auto bg-white border border-slate-200 rounded px-3 py-2 focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]" />
           </div>
           <div>
              <label className="text-sm text-slate-600 block mb-1">Message</label>
              <input type="text" value={data.message} onChange={e => setSettings({...settings, [type]: {...data, message: e.target.value}})} className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]" placeholder="Enter custom message..." />
           </div>
           <button disabled={isSaving} onClick={() => saveSetting(type)} className="mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition">
             <Save className="w-4 h-4" /> Save {type} Setting
           </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-[#0d9488]" />
            <h3 className="text-lg font-semibold text-slate-900">Two-Factor Authentication (2FA)</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${twoFAEnabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>
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
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-[#0d9488]" />
            <h3 className="text-lg font-semibold text-slate-900">Scheduled Notifications</h3>
          </div>
          {canUseScheduledNotifications ? (
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-1">
              Real-time Push
            </div>
          ) : (
            <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium flex items-center gap-1">
              PRO/PREMIUM
            </div>
          )}
        </div>
        {planResolved && canUseScheduledNotifications ? (
          <>
            <p className="text-slate-600 mb-4">
              Configure when you want to receive your skincare reminders. Ensure you leave the dashboard/settings open to receive real-time notifications.
            </p>

            {renderNotificationSetting('AM', <Sun className="w-5 h-5 text-yellow-500" />)}
            {renderNotificationSetting('PM', <Moon className="w-5 h-5 text-indigo-500" />)}

            {lastNotification && (
              <div className="mt-6 border border-[#0d9488] bg-teal-50 p-4 rounded-lg flex gap-4 items-start shadow-sm animate-fade-in">
                <div className="mt-1">
                  <Bell className="w-5 h-5 text-[#0d9488] animate-bounce" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{lastNotification.title}</h4>
                  <p className="text-sm text-slate-700 mt-1">{lastNotification.message}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="border border-slate-200 rounded-lg p-4 bg-gradient-to-br from-slate-50 to-teal-50">
            <p className="text-slate-700 text-sm mb-3">
              {planResolved
                ? 'Scheduled notifications are available for PRO and PREMIUM plans only.'
                : 'Checking your plan access...'}
            </p>
            {planResolved && (
              <button
                onClick={() => navigate('/upgrade')}
                className="bg-[#0d9488] hover:bg-[#0a7a70] text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
              >
                Upgrade Plan
              </button>
            )}
          </div>
        )}
        
        {successMessage && (
          <div className="mt-4 text-green-700 bg-green-50 border border-green-200 p-3 rounded text-sm transition-all duration-300">
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
}
