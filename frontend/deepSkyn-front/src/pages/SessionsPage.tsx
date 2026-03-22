// frontend/src/pages/SessionsPage.tsx
import React, { useEffect, useState } from 'react';
import { sessionService } from '../services/session.service';
import type { Session } from '../services/session.service';
import { Smartphone, Shield, AlertTriangle, Clock, Monitor, Smartphone as MobileIcon } from 'lucide-react'; // ← AJOUTE LES ICÔNES

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await sessionService.getSessions();
      setSessions(data);
    } catch (error) {
      setError('Error while loading sessions');
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    try {
      await sessionService.revokeSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Revocation error:', error);
    }
  };

  const handleRevokeAll = async () => {
    if (window.confirm('Are you sure you want to revoke all other sessions?')) {
      try {
        await sessionService.revokeAllSessions();
        setSessions(sessions.filter(s => s.isCurrent));
      } catch (error) {
        console.error('Error revoking all sessions:', error);
      }
    }
  };

  const getRiskInfo = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return {
          class: 'bg-red-100 text-red-700 border-red-200',
          icon: <AlertTriangle className="w-4 h-4" />,
          label: 'High risk'
        };
      case 'medium':
        return {
          class: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          icon: <AlertTriangle className="w-4 h-4" />,
          label: 'Medium risk'
        };
      default:
        return {
          class: 'bg-green-100 text-green-700 border-green-200',
          icon: <Shield className="w-4 h-4" />,
          label: 'Low risk'
        };
    }
  };

  const getDeviceIcon = (isMobile: boolean) => {
    return isMobile ?
      <MobileIcon className="w-6 h-6 text-[#0d9488]" /> :
      <Monitor className="w-6 h-6 text-[#0d9488]" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={loadSessions}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header avec titre et bouton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              My active sessions
            </h1>
            <p className="text-slate-500">
              Manage your connected devices with DeepSkyn
            </p>
          </div>

          {sessions.length > 1 && (
            <button
              onClick={handleRevokeAll}
              className="px-6 py-3 bg-white hover:bg-red-50 text-red-600 font-medium rounded-xl border border-red-200 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Revoke all other sessions
            </button>
          )}
        </div>

        {/* Liste des sessions */}
        <div className="grid gap-4">
          {sessions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Smartphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No active sessions found</p>
              <p className="text-slate-400 text-sm mt-2">Log in from another device to see your sessions</p>
            </div>
          ) : (
            sessions.map(session => {
              const riskInfo = getRiskInfo(session.riskLevel);
              return (
                <div
                  key={session.id}
                  className={`bg-white rounded-2xl p-6 border transition-all hover:shadow-md ${session.isCurrent ? 'border-[#0d9488] ring-2 ring-[#0d9488]/20' : 'border-slate-200'
                    }`}
                >
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    {/* Partie gauche : Info appareil */}
                    <div className="flex gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                        {getDeviceIcon(session.fingerprint.isMobile)}
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900">
                            {session.fingerprint.browser || 'Unknown browser'} on {session.fingerprint.os || 'Unknown system'}
                          </h3>
                          {session.isCurrent && (
                            <span className="px-3 py-1 bg-[#0d9488]/10 text-[#0d9488] text-xs font-medium rounded-full border border-[#0d9488]/20">
                              Current session
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>Last activity: {new Date(session.lastActivity).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                              IP: {session.fingerprint.ip}
                            </span>
                          </div>
                        </div>

                        {/* Risk badge */}
                        <div className="mt-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${riskInfo.class}`}>
                            {riskInfo.icon}
                            {riskInfo.label}
                          </span>
                        </div>

                        {/* Warning message */}
                        {session.riskAnalysis?.warning && (
                          <p className="mt-2 flex items-start gap-2 text-sm text-yellow-800 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" aria-hidden />
                            <span>{session.riskAnalysis.warning}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right part: Revoke button */}
                    <div className="flex items-center md:items-start">
                      {!session.isCurrent && (
                        <button
                          onClick={() => handleRevoke(session.id)}
                          className="px-5 py-2.5 bg-white hover:bg-red-50 text-red-600 font-medium rounded-xl border border-red-200 transition-all hover:shadow-md text-sm"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pied de page avec info sécurité */}
        <div className="mt-8 p-4 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#0d9488] flex-shrink-0" />
          <p className="text-sm text-slate-600">
            Sessions are automatically deleted after 7 days of inactivity.
            You can manually revoke any session at any time.
          </p>
        </div>
      </div>
    </div>
  );
};