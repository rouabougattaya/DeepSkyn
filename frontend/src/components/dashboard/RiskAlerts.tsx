import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, TrendingUp, Shield, Zap, Droplets, Sun, Wind, Settings2, X, Check, Volume2, Square } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { dashboardService } from '../../services/dashboardService';
import { analysisService } from '../../services/analysisService';
import { digitalTwinService } from '../../services/digitalTwinService';

interface Risk {
  type: 'acne' | 'dryness' | 'aging' | 'sensitivity' | 'pigmentation' | 'redness';
  risk_score: number;
  cause: string;
  prevention: string[];
  urgency?: 'low' | 'medium' | 'high';
  timeline?: 'weeks' | 'months' | 'long-term';
}

interface UserHabits {
  sleepHours: number;
  waterIntake: number;
  sunProtection: string;
  Exercise: string;
  stressLevel: string;
  diet: string;
  skincarRoutine: string;
}

const DEFAULT_HABITS: UserHabits = {
  sleepHours: 7,
  waterIntake: 2,
  sunProtection: 'occasional',
  Exercise: 'moderate',
  stressLevel: 'moderate',
  diet: 'average',
  skincarRoutine: 'basic',
};

interface RiskAlertsProps {
  onRefresh?: () => void;
  className?: string;
}

export const RiskAlerts: React.FC<RiskAlertsProps> = ({ onRefresh, className }) => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [overallRiskScore, setOverallRiskScore] = useState<number>(0);
  const [immediateActions, setImmediateActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const lastAnalysisIdRef = useRef<string | null>(null);
  const lastDigitalTwinIdRef = useRef<string | null>(null);

  // Custom user habits state
  const [showHabitsForm, setShowHabitsForm] = useState(false);
  const [isSpeakingAlerts, setIsSpeakingAlerts] = useState(false);
  const [habits, setHabits] = useState<UserHabits>(() => {
    const saved = localStorage.getItem('userHabits');
    return saved ? JSON.parse(saved) : DEFAULT_HABITS;
  });

  useEffect(() => {
    fetchRiskPrediction();
  }, []);

  useEffect(() => {
    const refreshOnFocus = () => {
      void fetchRiskPrediction(true);
    };

    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchRiskPrediction(true);
      }
    };

    const interval = window.setInterval(() => {
      void fetchRiskPrediction(true);
    }, 60000);

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const buildRiskSpeechText = () => {
    const risksArr = risks || [];
    const header = `Skin Risk Alerts. Overall risk score is ${overallRiskScore || 0} out of 100.`;

    const risksText = risksArr.length === 0
      ? 'No significant skin risks detected.'
      : risksArr
        .slice(0, 5)
        .map((risk, index) => {
          const tips = (risk.prevention || []).slice(0, 2).join('. ');
          return `Risk ${index + 1}. ${risk.type || 'unknown'}. Score ${risk.risk_score || 0}. Urgency ${risk.urgency || 'medium'}. ${risk.cause || ''}. Prevention tips: ${tips}.`;
        })
        .join(' ');

    const actionsArr = immediateActions || [];
    const actions = (actionsArr.length > 0 ? actionsArr : [
      'Apply daily SPF 30 plus sunscreen',
      'Maintain a consistent skincare routine',
      'Drink at least two liters of water daily',
    ]).slice(0, 4);

    const formattedActions = actions.map((a, i) => `Action ${i + 1}. ${a}`).join(' ');
    const actionsText = `Recommended actions. ${formattedActions}`;

    return `${header} ${risksText} ${actionsText}`;
  };

  const handleSpeakAlerts = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(buildRiskSpeechText());
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeakingAlerts(false);
    utterance.onerror = () => setIsSpeakingAlerts(false);

    setIsSpeakingAlerts(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopAlerts = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeakingAlerts(false);
  };

  const handleSaveHabits = () => {
    localStorage.setItem('userHabits', JSON.stringify(habits));
    setShowHabitsForm(false);
    fetchRiskPrediction(); // Refresh prediction explicitly with new habits
  };

  const checkIfRefreshNeeded = (silent: boolean, latestId: string | null, twinId: string | null) => {
    if (!silent) return true;
    const analysisChanged = Boolean(latestId && latestId !== lastAnalysisIdRef.current);
    const twinChanged = Boolean(twinId && twinId !== lastDigitalTwinIdRef.current);
    return analysisChanged || twinChanged;
  };

  const prepareRiskInput = (analysisData: any, digitalTwinData: any) => {
    const currentAnalysis = {
      ...(JSON.parse(localStorage.getItem('currentAnalysis') || '{}')),
      ...analysisData,
      ...digitalTwinData,
    };

    return {
      acneScore: currentAnalysis.acneScore,
      drynessScore: currentAnalysis.drynessScore,
      wrinklesScore: currentAnalysis.wrinklesScore,
      sensitivityScore: currentAnalysis.sensitivityScore,
      pigmentationScore: currentAnalysis.pigmentationScore,
      poresScore: currentAnalysis.poresScore,
      age: currentAnalysis.age,
      skinType: currentAnalysis.skinType,
      fitzpatrickSkin: currentAnalysis.fitzpatrickSkin,
      environment: {
        humidity: 60,
        temperature: 24,
        uvIndex: 6,
        pollution: 'moderate',
      },
      habits,
    };
  };

  const fetchRiskPrediction = async (silentRefresh = false) => {
    if (!silentRefresh) {
      setLoading(true);
      setError(null);
    }

    try {
      const { analysisData, latestAnalysisId } = await fetchAnalysisData();
      const { digitalTwinData, latestDigitalTwinId } = await fetchDigitalTwinData();

      if (silentRefresh && !checkIfRefreshNeeded(silentRefresh, latestAnalysisId, latestDigitalTwinId)) {
        return;
      }

      lastAnalysisIdRef.current = latestAnalysisId || null;
      lastDigitalTwinIdRef.current = latestDigitalTwinId || null;

      const riskInput = prepareRiskInput(analysisData, digitalTwinData);
      const response = await apiClient.post('/ai/skin-risk', riskInput) as any;

      if (response.data?.success && response.data?.data) {
        setRisks(response.data.data.risks || []);
        setOverallRiskScore(response.data.data.overall_risk_score || 0);
        setImmediateActions(response.data.data.immediate_actions || []);
      }
    } catch (err: any) {
      console.error('Error fetching risk prediction:', err);
      if (!silentRefresh) {
        setError(err.message || 'Failed to load risk prediction');
        setFallbackRisks();
      }
    } finally {
      if (!silentRefresh) setLoading(false);
    }
  };

  const setFallbackRisks = () => {
    const fallbackRisks: Risk[] = [
      {
        type: 'acne',
        risk_score: 65,
        cause: 'High humidity combined with occasional sun exposure increases sebum production and clogged pores.',
        prevention: [
          'Use oil-control cleanser twice daily',
          'Apply salicylic acid serum 3x weekly',
          'Avoid touching face',
          'Change pillowcase every 3 days',
        ],
        urgency: 'high',
        timeline: 'weeks',
      },
      {
        type: 'aging',
        risk_score: 45,
        cause: 'Natural collagen decline combined with moderate UV exposure accelerates fine lines and wrinkles.',
        prevention: [
          'Apply SPF 30+ daily',
          'Start retinol treatment 2-3x weekly',
          'Use vitamin C serum',
          'Maintain 7-8 hours sleep',
        ],
        urgency: 'medium',
        timeline: 'months',
      },
      {
        type: 'dryness',
        risk_score: 35,
        cause: 'Insufficient hydration and potential under-moisturizing during seasonal changes.',
        prevention: [
          'Increase water intake to 2.5L daily',
          'Use hyaluronic acid serum',
          'Apply rich moisturizer at night',
          'Use humidifier indoors',
        ],
        urgency: 'low',
        timeline: 'months',
      },
    ];

    const fallbackActions: string[] = [];
    if (habits.sunProtection !== 'regular') {
      fallbackActions.push('Use SPF 30+ daily and reapply when exposed to sun');
    }
    if (habits.waterIntake < 2) {
      fallbackActions.push('Increase hydration to at least 2L of water per day');
    }
    if (habits.sleepHours < 7) {
      fallbackActions.push('Aim for 7-8 hours of sleep to support skin repair');
    }
    if (habits.stressLevel === 'high') {
      fallbackActions.push('Add a short daily stress-reduction habit to limit flare-ups');
    }
    if (habits.skincarRoutine === 'basic') {
      fallbackActions.push('Keep your skincare routine consistent morning and night');
    }

    setRisks(fallbackRisks);
    setOverallRiskScore(48);
    setImmediateActions(fallbackActions.length > 0 ? fallbackActions.slice(0, 4) : [
      'Keep your skincare routine consistent morning and night',
    ]);
  };

  return (
    <div className={`${className || ''}`}>
      <div className="space-y-4">
        <OverallRiskSection 
          overallRiskScore={overallRiskScore} 
          isSpeakingAlerts={isSpeakingAlerts}
          setIsSpeakingAlerts={setIsSpeakingAlerts}
          handleStopAlerts={handleStopAlerts}
          handleSpeakAlerts={handleSpeakAlerts}
          setShowHabitsForm={setShowHabitsForm}
          showHabitsForm={showHabitsForm}
          loading={loading}
          fetchRiskPrediction={fetchRiskPrediction}
          onRefresh={onRefresh}
          error={error}
        />

        {/* Habits Settings Form */}
        {showHabitsForm && (
          <HabitsForm 
            habits={habits} 
            setHabits={setHabits} 
            onSave={handleSaveHabits} 
            onClose={() => setShowHabitsForm(false)} 
          />
        )}

        {/* Individual Risks */}
        <div className="space-y-3">
          {loading && !risks.length ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-pulse">Loading risk analysis...</div>
            </div>
          ) : risks.length === 0 ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-medium">✓ No significant skin risks detected</p>
            </div>
          ) : (
            risks.map((risk) => (
              <RiskItem
                key={risk.type}
                risk={risk}
                isExpanded={expandedRisk === risk.type}
                onToggle={() => setExpandedRisk(expandedRisk === risk.type ? null : risk.type)}
              />
            ))
          )}
        </div>

        {/* Immediate Actions */}
        {risks.length > 0 && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <h4 className="text-sm font-semibold text-indigo-900 mb-2">Recommended Actions</h4>
            <ul className="space-y-1">
              {(immediateActions.length > 0 ? immediateActions : [
                'Apply daily SPF 30+ sunscreen',
                'Maintain a consistent skincare routine',
                'Drink at least 2L of water daily',
              ]).slice(0, 4).map((action) => (
                <li key={action} className="text-sm text-indigo-800 flex gap-2">
                  <span>✓</span> {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub-components ---

const OverallRiskSection = ({ 
  overallRiskScore, 
  isSpeakingAlerts, 
  handleStopAlerts, 
  handleSpeakAlerts, 
  setShowHabitsForm, 
  showHabitsForm, 
  loading, 
  fetchRiskPrediction, 
  onRefresh,
  error
}: any) => (
  <>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-900">Skin Risk Alerts</h2>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={isSpeakingAlerts ? handleStopAlerts : handleSpeakAlerts}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
          title={isSpeakingAlerts ? 'Stop audio summary' : 'Listen to risk alerts'}
        >
          {isSpeakingAlerts ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          {isSpeakingAlerts ? 'Arreter' : 'Ecouter'}
        </button>
        <button
          onClick={() => setShowHabitsForm(!showHabitsForm)}
          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          title="Ajustez votre rythme de vie"
        >
          <Settings2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            fetchRiskPrediction();
            onRefresh?.();
          }}
          disabled={loading}
          className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    </div>

    {error && (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {error}
      </div>
    )}

    <div className={`p-4 rounded-lg border ${getOverallRiskBg(overallRiskScore)}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">Overall Skin Risk Score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-bold ${getRiskScoreColor(overallRiskScore)}`}>
              {overallRiskScore}
            </span>
            <span className="text-sm text-gray-500">/100</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600 mb-1">Risk Level</p>
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${getUrgencyBadge(
              getOverallRiskLevel(overallRiskScore)
            )}`}
          >
            {getOverallRiskLevel(overallRiskScore).toUpperCase()}
          </span>
        </div>
      </div>
      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getRiskProgressBarColor(overallRiskScore)}`}
          style={{ width: `${overallRiskScore}%` }}
        />
      </div>
    </div>
  </>
);

const RiskItem = ({ risk, isExpanded, onToggle }: any) => (
  <div className={`p-4 rounded-lg border transition-all ${getUrgencyColor(risk.urgency)}`}>
    <button onClick={onToggle} className="w-full text-left flex items-start gap-3">
      <div className="mt-1">{getRiskIcon(risk.type)}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 capitalize">{risk.type}</h3>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getUrgencyBadge(risk.urgency)}`}>
            {risk.urgency || 'Medium'}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1">
            <span className={`text-lg font-bold ${getRiskScoreColor(risk.risk_score)}`}>{risk.risk_score}</span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
          {risk.timeline && <span className="text-xs text-gray-600">Timeline: {risk.timeline}</span>}
        </div>
      </div>
      <div className="text-gray-400">{isExpanded ? '▼' : '▶'}</div>
    </button>

    {isExpanded && (
      <div className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Why this risk?</h4>
          <p className="text-sm text-gray-600">{risk.cause}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Prevention Tips</h4>
          <ul className="space-y-1">
            {risk.prevention.map((tip: string) => (
              <li key={tip} className="text-sm text-gray-600 flex gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}

    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full transition-all ${getIndividualRiskBarColor(risk.risk_score)}`}
        style={{ width: `${risk.risk_score}%` }}
      />
    </div>
  </div>
);

// --- Helper Functions ---

async function fetchAnalysisData() {
  try {
    const metricsData = await dashboardService.getMetrics();
    const latestAnalysisId = metricsData?.latestAnalysisId;
    if (latestAnalysisId) {
      const fullAnalysis = await analysisService.getAnalysisById(latestAnalysisId);
      if (fullAnalysis?.metrics) {
        const getScore = (type: string) => fullAnalysis.metrics?.find((m: any) => m.metricType?.toUpperCase() === type)?.score || 0;
        return {
          latestAnalysisId,
          analysisData: {
            acneScore: getScore('ACNE'),
            drynessScore: getScore('DRYNESS'),
            wrinklesScore: getScore('WRINKLES'),
            sensitivityScore: getScore('REDNESS'),
            pigmentationScore: getScore('PIGMENTATION'),
            poresScore: getScore('PORES')
          }
        };
      }
    }
  } catch (e) {
    console.log('Analysis fetch failed');
  }
  return { analysisData: {} };
}

async function fetchDigitalTwinData() {
  try {
    const latestTwin = await digitalTwinService.getLatestDigitalTwin();
    if (latestTwin?.month1Prediction?.metrics) {
      const m = latestTwin.month1Prediction.metrics;
      return {
        latestDigitalTwinId: latestTwin.id,
        digitalTwinData: {
          acneScore: Number(m.acne) || 0,
          drynessScore: Math.max(0, 100 - (Number(m.hydration) || 0)),
          wrinklesScore: Number(m.wrinkles) || 0,
          poresScore: Number(m.oil) || 0,
        }
      };
    }
  } catch (e) {
    console.log('Twin fetch failed');
  }
  return { digitalTwinData: {} };
}

const getRiskIcon = (type: string) => {
  switch (type) {
    case 'acne': return <AlertCircle className="w-5 h-5 text-orange-500" />;
    case 'dryness': return <Droplets className="w-5 h-5 text-blue-500" />;
    case 'aging': return <Sun className="w-5 h-5 text-yellow-500" />;
    case 'sensitivity': return <Wind className="w-5 h-5 text-pink-500" />;
    case 'pigmentation': return <TrendingUp className="w-5 h-5 text-purple-500" />;
    case 'redness': return <Zap className="w-5 h-5 text-red-500" />;
    default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
  }
};

const getUrgencyColor = (urgency?: string) => {
  switch (urgency) {
    case 'high': return 'bg-red-50 border-red-200';
    case 'medium': return 'bg-yellow-50 border-yellow-200';
    case 'low': return 'bg-green-50 border-green-200';
    default: return 'bg-gray-50 border-gray-200';
  }
};

const getUrgencyBadge = (urgency?: string) => {
  switch (urgency) {
    case 'high': return 'bg-red-100 text-red-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getRiskScoreColor = (score: number) => {
  if (score >= 70) return 'text-red-600';
  if (score >= 50) return 'text-orange-600';
  if (score >= 30) return 'text-yellow-600';
  return 'text-green-600';
};

const getOverallRiskBg = (score: number) => {
  if (score >= 70) return 'bg-red-50 border-red-200';
  if (score >= 50) return 'bg-orange-50 border-orange-200';
  if (score >= 30) return 'bg-yellow-50 border-yellow-200';
  return 'bg-green-50 border-green-200';
};

const getOverallRiskLevel = (score: number) => {
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

const getRiskProgressBarColor = (score: number) => {
  if (score >= 70) return 'bg-red-500';
  if (score >= 50) return 'bg-orange-500';
  return 'bg-green-500';
};

const getIndividualRiskBarColor = (score: number) => {
  if (score >= 70) return 'bg-red-500';
  if (score >= 50) return 'bg-orange-500';
  return 'bg-yellow-500';
};

interface HabitsFormProps {
  habits: UserHabits;
  setHabits: (h: UserHabits) => void;
  onSave: () => void;
  onClose: () => void;
}

const HabitsForm = ({ habits, setHabits, onSave, onClose }: HabitsFormProps) => (
  <div className="p-4 bg-white border border-indigo-100 shadow-sm rounded-xl space-y-4 mb-4">
    <div className="flex items-center justify-between border-b pb-2 border-gray-100">
      <h3 className="text-sm font-semibold text-indigo-900">Mon Rythme de Vie</h3>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Sommeil (heures)</label>
        <input
          type="number" min="3" max="15"
          value={habits.sleepHours}
          onChange={e => setHabits({ ...habits, sleepHours: Number(e.target.value) })}
          className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Eau (Litres)</label>
        <input
          type="number" min="0.5" max="5" step="0.5"
          value={habits.waterIntake}
          onChange={e => setHabits({ ...habits, waterIntake: Number(e.target.value) })}
          className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Stress</label>
        <select
          value={habits.stressLevel}
          onChange={e => setHabits({ ...habits, stressLevel: e.target.value })}
          className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="low">Bas</option>
          <option value="moderate">Modéré</option>
          <option value="high">Élevé</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Alimentation</label>
        <select
          value={habits.diet}
          onChange={e => setHabits({ ...habits, diet: e.target.value })}
          className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="poor">Mauvaise</option>
          <option value="average">Moyenne</option>
          <option value="healthy">Saine</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Protection Solaire</label>
        <select
          value={habits.sunProtection}
          onChange={e => setHabits({ ...habits, sunProtection: e.target.value })}
          className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="none">Aucune</option>
          <option value="occasional">Occasionnelle</option>
          <option value="regular">Régulière</option>
        </select>
      </div>
    </div>

    <button
      onClick={onSave}
      className="w-full mt-2 flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-md transition-colors"
    >
      <Check className="w-4 h-4" /> Recalculer les risques
    </button>
  </div>
);
