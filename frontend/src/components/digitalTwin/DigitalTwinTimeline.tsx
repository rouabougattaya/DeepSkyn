import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Volume2, Square } from 'lucide-react';
import type { DigitalTwinTimelineDto } from '@/types/digitalTwin';

const THEME = {
  primary: '#0d9488',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
};

interface TimelineProps {
  timeline: DigitalTwinTimelineDto;
}

export const DigitalTwinTimeline: React.FC<TimelineProps> = ({ timeline }) => {
  const [speakingSection, setSpeakingSection] = useState<'current' | 'projected' | null>(null);
  const { currentState, predictions, trends } = timeline;

  const months = [
    { label: 'Month 1', value: 'month1', prediction: predictions.month1 },
    { label: 'Month 3', value: 'month3', prediction: predictions.month3 },
    { label: 'Month 6', value: 'month6', prediction: predictions.month6 },
  ];

  const getScoreColor = (score: number): string => {
    if (score >= 80) return THEME.success;
    if (score >= 60) return THEME.warning;
    return THEME.danger;
  };

  const getScoreTrend = (current: number, future: number): 'up' | 'down' | 'stable' => {
    const diff = future - current;
    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakSection = (section: 'current' | 'projected') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const currentMetrics = Object.entries(currentState.metrics)
      .map(([key, value]) => `${key} ${value.toFixed(1)} percent`)
      .join('. ');

    const projectedText = months
      .map(({ label, prediction }) => {
        const change = (prediction.skinScore - currentState.skinScore).toFixed(0);
        return `${label}. Skin score ${prediction.skinScore.toFixed(0)} with change ${change}. Skin age ${prediction.skinAge.toFixed(1)} years.`;
      })
      .join(' ');

    const text = section === 'current'
      ? `Current Skin State. Skin score ${currentState.skinScore.toFixed(0)} out of 100. Skin age ${currentState.skinAge.toFixed(1)} years. Analysis date ${new Date(currentState.createdAt).toLocaleDateString()}. Metrics: ${currentMetrics}.`
      : `Projected Timeline. ${projectedText} Overall trajectory is ${trends.overallTrajectory}.`;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingSection(null);
    utterance.onerror = () => setSpeakingSection(null);
    setSpeakingSection(section);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setSpeakingSection(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Current State */}
      <div style={{ padding: 24, borderRadius: 20, background: THEME.surface, border: `1px solid ${THEME.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: THEME.textPrimary, margin: 0 }}>
            Current Skin State
          </h3>
          <button
            onClick={speakingSection === 'current' ? stopSpeaking : () => speakSection('current')}
            style={{ border: `1px solid ${THEME.border}`, background: '#eefcf9', color: THEME.primary, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {speakingSection === 'current' ? <Square size={12} /> : <Volume2 size={12} />}
            {speakingSection === 'current' ? 'Arreter' : 'Ecouter'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>Skin Score</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: getScoreColor(currentState.skinScore) }}>
              {currentState.skinScore.toFixed(0)}
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4 }}>/100</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>Skin Age</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: THEME.primary }}>
              {currentState.skinAge.toFixed(1)}
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4 }}>years</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>Analysis Date</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.textPrimary }}>
              {new Date(currentState.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Metric Bars */}
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${THEME.border}` }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: THEME.textSecondary, marginBottom: 12 }}>CURRENT METRICS</h4>
          {Object.entries(currentState.metrics).map(([key, value]) => {
            const color = key === 'hydration' ? THEME.success : key === 'oil' ? THEME.warning : key === 'acne' ? THEME.danger : '#8b5cf6';
            return (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: THEME.textSecondary, textTransform: 'capitalize' }}>
                    {key}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textPrimary }}>
                    {value.toFixed(1)}%
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, background: `${THEME.border}`, borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${value}%`,
                      height: '100%',
                      background: color,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: 24, borderRadius: 20, background: THEME.surface, border: `1px solid ${THEME.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: THEME.textPrimary, margin: 0 }}>
            Projected Timeline
          </h3>
          <button
            onClick={speakingSection === 'projected' ? stopSpeaking : () => speakSection('projected')}
            style={{ border: `1px solid ${THEME.border}`, background: '#eefcf9', color: THEME.primary, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {speakingSection === 'projected' ? <Square size={12} /> : <Volume2 size={12} />}
            {speakingSection === 'projected' ? 'Arreter' : 'Ecouter'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {months.map(({ label, value, prediction }) => {
            const trend = getScoreTrend(currentState.skinScore, prediction.skinScore);
            const trendColor = trend === 'up' ? THEME.success : trend === 'down' ? THEME.danger : THEME.textSecondary;
            const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
            const isBest = value === trends.bestOutcome;
            const isWorst = value === trends.worstOutcome;

            return (
              <div
                key={value}
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: isBest ? '#f0fdf4' : isWorst ? '#fef2f2' : THEME.background,
                  border: `2px solid ${isBest ? THEME.success : isWorst ? THEME.danger : THEME.border}`,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                }}
                className="timeline-card"
              >
                {isBest && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      right: 20,
                      background: THEME.success,
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    BEST OUTCOME
                  </div>
                )}

                <h4 style={{ fontSize: 14, fontWeight: 700, color: THEME.textPrimary, marginBottom: 16 }}>
                  {label}
                </h4>

                {/* Score */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: getScoreColor(prediction.skinScore) }}>
                      {prediction.skinScore.toFixed(0)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <TrendIcon size={16} color={trendColor} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: trendColor }}>
                        {trend === 'up' ? '+' : ''}{(prediction.skinScore - currentState.skinScore).toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: THEME.textSecondary }}>Skin Score</div>
                </div>

                {/* Skin Age */}
                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: THEME.primary }}>
                    {prediction.skinAge.toFixed(1)} years
                  </div>
                  <div style={{ fontSize: 11, color: THEME.textSecondary }}>Skin Age</div>
                </div>

                {/* Improvements */}
                {prediction.improvements.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.success, marginBottom: 8 }}>
                      ✓ Improvements
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: THEME.textSecondary }}>
                      {prediction.improvements.map((imp, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>
                          {imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Degradations */}
                {prediction.degradations.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.danger, marginBottom: 8 }}>
                      ⚠ Watch Out
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: THEME.textSecondary }}>
                      {prediction.degradations.map((deg, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>
                          {deg}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall Trajectory */}
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${THEME.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: trends.overallTrajectory === 'improvement' ? '#f0fdf4' : trends.overallTrajectory === 'degradation' ? '#fef2f2' : '#f0f9ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {trends.overallTrajectory === 'improvement' ? (
                <TrendingUp size={20} color={THEME.success} />
              ) : trends.overallTrajectory === 'degradation' ? (
                <TrendingDown size={20} color={THEME.danger} />
              ) : (
                <Minus size={20} color="#64748b" />
              )}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.textPrimary, textTransform: 'capitalize' }}>
                Overall: {trends.overallTrajectory}
              </div>
              <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2 }}>
                {trends.overallTrajectory === 'improvement'
                  ? 'Your skin is expected to significantly improve over 6 months.'
                  : trends.overallTrajectory === 'degradation'
                    ? 'Without consistent routine, skin may degrade.'
                    : 'Skin condition is expected to remain stable.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
