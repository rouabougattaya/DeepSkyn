import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader, ArrowLeft, Sparkles, Settings, Lock, Volume2, Square } from 'lucide-react';
import { getUser, authFetch } from '@/lib/authSession';
import { digitalTwinService } from '@/services/digitalTwinService';
import type { DigitalTwinTimelineDto } from '@/types/digitalTwin';
import { DigitalTwinTimeline } from '@/components/digitalTwin/DigitalTwinTimeline';

const THEME = {
  primary: '#0d9488',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
};

interface DigitalTwinPageProps {
  baseAnalysisId?: string;
}

export const DigitalTwinPage: React.FC<DigitalTwinPageProps> = ({ baseAnalysisId: propAnalysisId }) => {
  const navigate = useNavigate();
  const { analysisId } = useParams<{ analysisId: string }>();
  const [timeline, setTimeline] = useState<DigitalTwinTimelineDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [routineConsistency, setRoutineConsistency] = useState<'high' | 'medium' | 'low'>('medium');
  const [lifestyleFactors, setLifestyleFactors] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('FREE');
  const [isSpeakingRecommendation, setIsSpeakingRecommendation] = useState(false);

  const currentAnalysisId = propAnalysisId || analysisId;
  const isPro = currentPlan?.toUpperCase() === 'PRO' || currentPlan?.toUpperCase() === 'PREMIUM';

  useEffect(() => {
    if (!currentAnalysisId) {
      setError('No analysis provided');
      setLoading(false);
      return;
    }

    const loadUserPlan = async () => {
      try {
        const currentUser = getUser();
        if (!currentUser) {
          navigate('/auth/login');
          return;
        }

        const res = await authFetch(`/subscription/${currentUser.id}`);
        if (!res.ok) throw new Error('Failed to fetch plan');
        const subData = await res.json();
        const plan = subData?.plan || 'FREE';
        setCurrentPlan(plan);
      } catch (err) {
        console.error('Failed to load plan:', err);
        setCurrentPlan('FREE');
      }
    };

    loadUserPlan();
    loadDigitalTwin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAnalysisId]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeakRecommendation = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !timeline) return;

    window.speechSynthesis.cancel();
    const recommendationText = `Your Personalized Recommendation. Get a tailored recommendation based on your current skin state and predicted trajectory. Current score ${timeline.currentState.skinScore.toFixed(0)}. Current skin age ${timeline.currentState.skinAge.toFixed(1)} years. Overall trajectory ${timeline.trends.overallTrajectory}.`;
    const utterance = new SpeechSynthesisUtterance(recommendationText);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeakingRecommendation(false);
    utterance.onerror = () => setIsSpeakingRecommendation(false);

    setIsSpeakingRecommendation(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopRecommendation = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeakingRecommendation(false);
  };

  const loadDigitalTwin = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if digital twin already exists for this analysis by fetching latest
      const latest = await digitalTwinService.getLatestDigitalTwin();

      if (latest) {
        const timelineData = await digitalTwinService.getDigitalTwinTimeline(latest.id);
        setTimeline(timelineData);
      } else {
        // No existing simulation, show options for creating one
        setShowOptions(true);
      }
    } catch (err) {
      console.error('Failed to load digital twin:', err);
      setShowOptions(true); // Show options form instead of error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDigitalTwin = async () => {
    if (!currentAnalysisId) return;

    try {
      setIsCreating(true);
      setError(null);

      const response = await digitalTwinService.createDigitalTwin(currentAnalysisId, {
        routineConsistency,
        lifestyleFactors,
      });

      // Fetch the timeline view
      const timelineData = await digitalTwinService.getDigitalTwinTimeline(response.id);
      setTimeline(timelineData);
      setShowOptions(false);
    } catch (err) {
      console.error('Failed to create digital twin:', err);
      setError('Failed to create digital twin. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleLifestyleFactor = (factor: string) => {
    setLifestyleFactors((prev) =>
      prev.includes(factor) ? prev.filter((f) => f !== factor) : [...prev, factor]
    );
  };

  if (loading && !showOptions) {
    return (
      <div style={{ minHeight: '100vh', background: THEME.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={48} style={{ color: THEME.primary, animation: 'spin 1s linear infinite', marginBottom: 20 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: THEME.textPrimary }}>Loading your skin future...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: THEME.background, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: THEME.surface, borderBottom: `1px solid ${THEME.border}`, padding: '20px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              color: THEME.textSecondary,
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: THEME.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={24} style={{ color: THEME.primary }} />
              Skin Digital Twin
            </h1>
            <p style={{ fontSize: 13, color: THEME.textSecondary, margin: '4px 0 0 0' }}>
              See how your skin will evolve over the next 6 months
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: `1px solid ${THEME.danger}`, borderRadius: 12, padding: 16, marginBottom: 24, color: THEME.danger }}>
            {error}
          </div>
        )}

        {/* Show options form (Pro) or upgrade prompt (Free) */}
        {showOptions && !timeline ? (
          isPro ? (
            // ✅ PRO USERS: Show creation form
            <div style={{ background: THEME.surface, borderRadius: 20, border: `1px solid ${THEME.border}`, padding: 40 }}>
              <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    background: `${THEME.primary}20`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                  }}
                >
                  <Sparkles size={44} color={THEME.primary} />
                </div>

                <h2 style={{ fontSize: 28, fontWeight: 800, color: THEME.textPrimary, marginBottom: 12 }}>
                  Create Your Skin Digital Twin
                </h2>

                <p style={{ fontSize: 16, color: THEME.textSecondary, marginBottom: 32 }}>
                  Simulate how your skin will look in 1, 3, and 6 months based on your current routine and lifestyle.
                </p>

                {/* Options */}
                <div style={{ background: THEME.background, borderRadius: 16, padding: 24, textAlign: 'left', marginBottom: 32 }}>
                  {/* Routine Consistency */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: THEME.textPrimary, marginBottom: 12 }}>
                      <Settings size={16} style={{ display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }} />
                      Routine Consistency
                    </label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {(['high', 'medium', 'low'] as const).map((consistency) => (
                        <button
                          key={consistency}
                          onClick={() => setRoutineConsistency(consistency)}
                          style={{
                            flex: 1,
                            padding: 12,
                            borderRadius: 8,
                            border: `2px solid ${routineConsistency === consistency ? THEME.primary : THEME.border}`,
                            background: routineConsistency === consistency ? `${THEME.primary}10` : THEME.surface,
                            color: routineConsistency === consistency ? THEME.primary : THEME.textSecondary,
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          {consistency}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 8 }}>
                      {routineConsistency === 'high'
                        ? 'You follow your routine religiously every day'
                        : routineConsistency === 'medium'
                          ? 'You follow your routine most days (5-6 days/week)'
                          : 'You follow your routine occasionally (2-3 days/week)'}
                    </p>
                  </div>

                  {/* Lifestyle Factors */}
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: THEME.textPrimary, marginBottom: 12 }}>
                      Lifestyle Factors (Select all that apply)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      {['High stress', 'Good sleep (7-9 hours)', 'Regular exercise', 'Healthy diet', 'Smoking', 'Sun exposure', 'Alcohol consumption', 'Air pollution exposure'].map((factor) => (
                        <button
                          key={factor}
                          onClick={() => handleToggleLifestyleFactor(factor)}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            border: `1px solid ${lifestyleFactors.includes(factor) ? THEME.primary : THEME.border}`,
                            background: lifestyleFactors.includes(factor) ? `${THEME.primary}10` : THEME.background,
                            color: lifestyleFactors.includes(factor) ? THEME.primary : THEME.textSecondary,
                            fontWeight: 500,
                            fontSize: 13,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          {lifestyleFactors.includes(factor) ? '✓ ' : ''}
                          {factor}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Create Button */}
                <button
                  onClick={handleCreateDigitalTwin}
                  disabled={isCreating}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    borderRadius: 12,
                    background: THEME.primary,
                    color: 'white',
                    border: 'none',
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    opacity: isCreating ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {isCreating ? (
                    <>
                      <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Creating your digital twin...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Simulate My Future Skin
                    </>
                  )}
                </button>

                {/* Cancel Button */}
                <button
                  onClick={() => setShowOptions(false)}
                  disabled={isCreating}
                  style={{
                    marginTop: 12,
                    width: '100%',
                    padding: '12px 24px',
                    borderRadius: 12,
                    background: THEME.surface,
                    color: THEME.textPrimary,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    opacity: isCreating ? 0.7 : 1,
                    transition: 'all 0.3s ease',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // 🔒 FREE USERS: Show upgrade prompt
            <div style={{ background: 'linear-gradient(135deg, #fef2f2, #ede9fe)', borderRadius: 20, border: `1px solid ${THEME.border}`, padding: 40 }}>
              <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    background: '#ec489920',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                  }}
                >
                  <Lock size={44} color="#ec4899" />
                </div>

                <h2 style={{ fontSize: 28, fontWeight: 800, color: THEME.textPrimary, marginBottom: 12 }}>
                  🚀 Unlock Advanced Skin Simulation
                </h2>

                <p style={{ fontSize: 16, color: THEME.textSecondary, marginBottom: 32 }}>
                  The Digital Twin feature is exclusively available for PRO members. Upgrade your plan to unlock detailed skin simulations and personalized 6-month predictions powered by AI.
                </p>

                {/* Features List */}
                <div style={{ background: THEME.surface, borderRadius: 16, padding: 24, marginBottom: 32, textAlign: 'left' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: THEME.textPrimary, marginBottom: 16 }}>
                    ✨ What you'll get with PRO:
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                    {[
                      'Simulate skin at 1, 3, and 6 months',
                      'AI-powered predictions based on your routine',
                      'Personalized lifestyle recommendations',
                      'Track your long-term skin trajectory',
                      'Detailed improvement metrics'
                    ].map((feature, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, fontSize: 14, color: THEME.textPrimary }}>
                        <span style={{ color: THEME.primary, fontWeight: 'bold' }}>✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Buttons */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => navigate('/upgrade')}
                    style={{
                      flex: 1,
                      padding: '16px 24px',
                      borderRadius: 12,
                      background: THEME.primary,
                      color: 'white',
                      border: 'none',
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Upgrade to PRO
                  </button>
                  <button
                    onClick={() => setShowOptions(false)}
                    style={{
                      flex: 1,
                      padding: '16px 24px',
                      borderRadius: 12,
                      background: THEME.surface,
                      color: THEME.textPrimary,
                      border: `1px solid ${THEME.border}`,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          )
        ) : timeline ? (
          <div>
            {/* Timeline */}
            <DigitalTwinTimeline timeline={timeline} />

            {/* Overall Recommendation */}
            {timeline && (
              <div style={{ marginTop: 32, padding: 24, borderRadius: 20, background: 'linear-gradient(135deg, #f0fdfa, #e0f2fe)', border: `1px solid ${THEME.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: THEME.textPrimary, margin: 0 }}>
                    💡 Your Personalized Recommendation
                  </h3>
                  <button
                    onClick={isSpeakingRecommendation ? handleStopRecommendation : handleSpeakRecommendation}
                    style={{ border: `1px solid ${THEME.border}`, background: '#ffffff', color: THEME.primary, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {isSpeakingRecommendation ? <Square size={12} /> : <Volume2 size={12} />}
                    {isSpeakingRecommendation ? 'Arreter' : 'Ecouter'}
                  </button>
                </div>
                <p style={{ fontSize: 16, color: THEME.textPrimary, lineHeight: 1.6, margin: 0 }}>
                  {timeline.currentState && (
                    <div style={{ marginBottom: 16 }}>
                      {/* Dynamic recommendation based on trajectory */}
                      Get a tailored recommendation based on your current skin state and predicted trajectory.
                    </div>
                  )}
                </p>
              </div>
            )}

            {/* Create New Simulation Button */}
            <div style={{ marginTop: 32, textAlign: 'center' }}>
              <button
                onClick={() => {
                  setShowOptions(true);
                  setTimeline(null);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: 12,
                  background: THEME.surface,
                  border: `1px solid ${THEME.border}`,
                  color: THEME.textPrimary,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                Create New Simulation
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default DigitalTwinPage;
