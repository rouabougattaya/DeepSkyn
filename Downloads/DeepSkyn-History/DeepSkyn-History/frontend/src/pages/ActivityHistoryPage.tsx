import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  MapPin,
  Monitor,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  User,
  Mail,
  Lock,
  Activity
} from 'lucide-react';
import { historyService } from '@/services/historyService';
import type { SessionHistory, UserScore } from '@/services/historyService';

export default function ActivityHistoryPage() {
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [userScore, setUserScore] = useState<UserScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [sessionHistory, score] = await Promise.all([
        historyService.getSessionHistory(50),
        historyService.getUserScore()
      ]);

      setSessions(sessionHistory);
      setUserScore(score);
    } catch (error) {
      console.error('Error loading activity data:', error);
      setError('Unable to load activity data');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLoginMethodIcon = (method: string) => {
    switch (method) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'google': return <div className="w-4 h-4 bg-blue-500 rounded" />;
      case 'face': return <User className="w-4 h-4" />;
      case 'fingerprint': return <Shield className="w-4 h-4" />;
      default: return <Lock className="w-4 h-4" />;
    }
  };

  const getRiskIcon = (riskScore: number) => {
    if (riskScore >= 70) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (riskScore >= 40) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-[#0d9488] mx-auto mb-4" />
          <p className="text-slate-600">Loading activity data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="text-slate-600 hover:text-slate-900">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Activity History</h1>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-[#0d9488] text-white rounded-lg hover:bg-[#0a7a70] transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Security Score */}
        {userScore && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-slate-900">IA Vigilance Score</h2>
              <div className="group relative">
                <AlertTriangle className="w-4 h-4 text-slate-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-10">
                  This score is calculated by our AI by analyzing your data consistency and login habits.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Score Total */}
              <div className={`p-5 rounded-xl border-2 transition-all hover:shadow-md ${getScoreBg(userScore.totalScore)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Overall Trust</span>
                  {userScore.totalScore > 70 ? <TrendingUp className="w-5 h-5 text-green-500" /> : <Activity className="w-5 h-5 text-yellow-500" />}
                </div>
                <div className={`text-3xl font-black ${getScoreColor(userScore.totalScore)}`}>
                  {Math.round(userScore.totalScore)}%
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                  Global reliability index of your account based on AI.
                </p>
              </div>

              {/* Profile Consistency */}
              <div className={`p-5 rounded-xl border-2 transition-all hover:shadow-md ${getScoreBg(userScore.profileConsistency)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Identity</span>
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div className={`text-3xl font-black ${getScoreColor(userScore.profileConsistency)}`}>
                  {Math.round(userScore.profileConsistency)}%
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                  Consistency check between your name, photo, and linked Google account.
                </p>
              </div>

              {/* Security Score */}
              <div className={`p-5 rounded-xl border-2 transition-all hover:shadow-md ${getScoreBg(userScore.securityScore)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Protection</span>
                  <Shield className="w-5 h-5 text-slate-400" />
                </div>
                <div className={`text-3xl font-black ${getScoreColor(userScore.securityScore)}`}>
                  {Math.round(userScore.securityScore)}%
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                  Evaluation of your protection methods strength (2FA, Bio).
                </p>
              </div>

              {/* 2FA Usage */}
              <div className={`p-5 rounded-xl border-2 transition-all hover:shadow-md ${getScoreBg(userScore.factors.twoFAUsage)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">2FA Usage</span>
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <div className={`text-3xl font-black ${getScoreColor(userScore.factors.twoFAUsage)}`}>
                  {Math.round(userScore.factors.twoFAUsage)}%
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                  How often you use two-factor authentication.
                </p>
              </div>
            </div>

            {/* Professional explanation guide */}
            <div className="mt-6 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0d9488]" />
                How is your score calculated?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-sm text-slate-800">
                    <Mail className="w-4 h-4 text-blue-500" /> Email Verification
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Accounts using <strong>@gmail.com</strong> receive a trust bonus. Temporary or unknown emails severely decrease the score.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-sm text-slate-800">
                    <User className="w-4 h-4 text-purple-500" /> Name Consistency
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    If your DeepSkyn profile name differs from your linked Google account, the AI detects potential inconsistency.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-sm text-slate-800">
                    <Monitor className="w-4 h-4 text-[#0d9488]" /> Biometric Analysis
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Using facial recognition or fingerprint significantly increases your protection level.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500">
                  <strong>Bio Penalty:</strong> A missing or too short biography (&lt; 10 characters) results in an automatic <strong>-15%</strong> penalty on your Identity score.
                </p>
              </div>
            </div>

            {/* Secondary detail factors */}
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-500" /> Consistent names: {Math.round(userScore.factors.nameConsistency)}%
              </div>
              <div className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-yellow-500" /> Login failures: {Math.round(userScore.factors.failedLogins)}%
              </div>
              <div className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2">
                <MapPin className="w-3 h-3 text-orange-500" /> Risk zones: {Math.round(userScore.factors.unusualLocations)}%
              </div>
              <div className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2">
                <User className="w-3 h-3 text-[#0d9488]" /> Bio completed: {Math.round(userScore.factors.bioConsistency)}%
              </div>
            </div>
          </div>
        )}

        {/* Session History */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Session History</h2>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">2FA</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sessions.map((session, index) => (
                    <tr key={session.id || index} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {formatDate(session.loginTime)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {getLoginMethodIcon(session.loginMethod)}
                          <span className="capitalize">{session.loginMethod}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {session.loginStatus === 'success' ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-green-60">Success</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span className="text-red-600">Failed</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>
                            {session.location.city}, {session.location.country}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-slate-400" />
                          <span>{session.device.browser}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {session.used2FA ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {getRiskIcon(session.riskScore)}
                          <span className="text-slate-600">{session.riskScore}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sessions.length === 0 && (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No activity recorded</p>
                <p className="text-slate-400 text-sm mt-2">Sessions will appear here after your logins</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
