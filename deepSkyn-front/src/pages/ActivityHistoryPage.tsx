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
      setError('Impossible de charger les données d\'activité');
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
    return new Date(dateString).toLocaleString('fr-FR', {
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
          <p className="text-slate-600">Chargement des données d'activité...</p>
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
                ← Retour
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Historique d'Activité</h1>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-[#0d9488] text-white rounded-lg hover:bg-[#0a7a70] transition-colors"
            >
              Actualiser
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

        {/* Score de Sécurité */}
        {userScore && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Score de Vigilance IA</h2>
              <div className="group relative">
                <AlertTriangle className="w-4 h-4 text-slate-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-10">
                  Ce score est calculé par notre IA en analysant la cohérence de vos données et vos habitudes de connexion.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Score Total */}
              <div className={`p-5 rounded-xl border-2 transition-all hover:shadow-md ${getScoreBg(userScore.totalScore)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Confiance Globale</span>
                  {userScore.totalScore > 70 ? <TrendingUp className="w-5 h-5 text-green-500" /> : <Activity className="w-5 h-5 text-yellow-500" />}
                </div>
                <div className={`text-3xl font-black ${getScoreColor(userScore.totalScore)}`}>
                  {Math.round(userScore.totalScore)}%
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                  Indice de fiabilité globale de votre compte basé sur l'IA.
                </p>
              </div>

              {/* Cohérence Profil */}
              <div className={`p-5 rounded-xl border-2 transition-all hover:shadow-md ${getScoreBg(userScore.profileConsistency)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Identité</span>
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div className={`text-3xl font-black ${getScoreColor(userScore.profileConsistency)}`}>
                  {Math.round(userScore.profileConsistency)}%
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                  Vérification de la cohérence entre votre nom, photo et compte Google.
                </p>
              </div>

              {/* Score Sécurité */}
              <div className={`p-5 rounded-xl border-2 transition-all hover:shadow-md ${getScoreBg(userScore.securityScore)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Protection</span>
                  <Shield className="w-5 h-5 text-slate-400" />
                </div>
                <div className={`text-3xl font-black ${getScoreColor(userScore.securityScore)}`}>
                  {Math.round(userScore.securityScore)}%
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                  Évaluation de la force de vos méthodes de protection (2FA, Bio).
                </p>
              </div>

              {/* 2FA Usage */}
              <div className={`p-5 rounded-xl border-2 transition-all hover:shadow-md ${getScoreBg(userScore.factors.twoFAUsage)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Utilisation 2FA</span>
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <div className={`text-3xl font-black ${getScoreColor(userScore.factors.twoFAUsage)}`}>
                  {Math.round(userScore.factors.twoFAUsage)}%
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                  Fréquence à laquelle vous utilisez la double authentification.
                </p>
              </div>
            </div>

            {/* Guide d'explication professionnel */}
            <div className="mt-6 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0d9488]" />
                Comment votre score est calculé ?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-sm text-slate-800">
                    <Mail className="w-4 h-4 text-blue-500" /> Vérification Email
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Les comptes utilisant <strong>@gmail.com</strong> reçoivent un bonus de confiance. Les emails temporaires ou inconnus diminuent sévèrement le score.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-sm text-slate-800">
                    <User className="w-4 h-4 text-purple-500" /> Cohérence du Nom
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Si votre nom de profil DeepSkyn diffère de celui de votre compte Google lié, l'IA détecte une incohérence potentielle.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-sm text-slate-800">
                    <Monitor className="w-4 h-4 text-[#0d9488]" /> Analyse Biométrique
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    L'utilisation de la reconnaissance faciale ou de l'empreinte digitale augmente considérablement votre niveau de protection.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500">
                  <strong>Pénalité de Bio :</strong> Une biographie absente ou trop courte (&lt; 10 caractères) entraîne un malus automatique de <strong>-15%</strong> sur votre score d'Identité.
                </p>
              </div>
            </div>

            {/* Facteurs de détail secondaires */}
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-500" /> Noms cohérents: {Math.round(userScore.factors.nameConsistency)}%
              </div>
              <div className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-yellow-500" /> Échecs de login: {Math.round(userScore.factors.failedLogins)}%
              </div>
              <div className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2">
                <MapPin className="w-3 h-3 text-orange-500" /> Zones à risque: {Math.round(userScore.factors.unusualLocations)}%
              </div>
              <div className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2">
                <User className="w-3 h-3 text-[#0d9488]" /> Bio complétée: {Math.round(userScore.factors.bioConsistency)}%
              </div>
            </div>
          </div>
        )}

        {/* Historique des Sessions */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Historique des Sessions</h2>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Méthode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">2FA</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Risque</th>
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
                              <span className="text-green-600">Succès</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span className="text-red-600">Échec</span>
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
                            Oui
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Non
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
                <p className="text-slate-500">Aucune activité enregistrée</p>
                <p className="text-slate-400 text-sm mt-2">Les sessions apparaîtront ici après vos connexions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
