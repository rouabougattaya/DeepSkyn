import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  GitCompare,
  Calendar,
  BarChart2,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Info,
  Lock,
  Crown,
} from 'lucide-react';
import { apiGet } from '../services/apiClient';
import { getUser } from '../lib/authSession';
import { comparisonService } from '../services/comparison.service';
import type {
  CompareAnalysisResult,
  MetricKey,
  UserAnalysisItem,
} from '../services/comparison.service';

const METRIC_LABELS: Record<MetricKey, string> = {
  hydration: 'Hydration',
  oil: 'Sebum',
  acne: 'Acne',
  wrinkles: 'Wrinkles',
};

/** Métriques par défaut lorsque les données sont absentes (évite les erreurs de rendu). */
const DEFAULT_METRICS: { hydration: number; oil: number; acne: number; wrinkles: number } = {
  hydration: 0,
  oil: 0,
  acne: 0,
  wrinkles: 0,
};

/* ──────────────────────────── Composants auxiliaires ──────────────────────────── */

function TrendBadge({ trend }: { trend: 'improvement' | 'regression' | 'stable' }) {
  if (trend === 'improvement') {
    return (
      <span className="trend-badge improvement">
        <TrendingUp size={14} /> Improvement
      </span>
    );
  }
  if (trend === 'regression') {
    return (
      <span className="trend-badge regression">
        <TrendingDown size={14} /> Regression
      </span>
    );
  }
  return (
    <span className="trend-badge stable">
      <Minus size={14} /> Stable
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let badgeClass = 'score-badge ';
  if (score >= 70) badgeClass += 'score-high';
  else if (score >= 50) badgeClass += 'score-medium';
  else badgeClass += 'score-low';

  return (
    <span className={badgeClass}>
      Score {score}
    </span>
  );
}

function AnalysisCard({
  title,
  id,
  skinScore,
  createdAt,
  metrics: metricsProp,
}: {
  title: string;
  id: string;
  skinScore: number;
  createdAt: string;
  metrics?: { hydration: number; oil: number; acne: number; wrinkles: number } | null;
}) {
  const metrics = metricsProp ?? DEFAULT_METRICS;
  const scoreColor =
    skinScore >= 70 ? 'score-value-high' : skinScore >= 50 ? 'score-value-medium' : 'score-value-low';
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="analysis-card">
      <div className="analysis-card-header">
        <h2 className="analysis-card-title">{title}</h2>
        <span className="analysis-card-id">#{id.slice(0, 8)}</span>
      </div>
      <div className="analysis-card-date">
        <Calendar size={14} />
        {date}
      </div>
      <div className="analysis-card-score">
        <div className={`analysis-card-score-value ${scoreColor}`}>{skinScore}</div>
        <div className="analysis-card-score-unit">/ 100</div>
      </div>
      <div className="analysis-card-metrics">
        <div className="analysis-card-metrics-title">
          <BarChart2 size={12} />
          Metrics
        </div>
        <div className="analysis-card-metrics-grid">
          {(Object.keys(metrics) as MetricKey[]).map((key) => (
            <div key={key} className="analysis-card-metric-item">
              <span className="analysis-card-metric-label">{METRIC_LABELS[key]}:</span>{' '}
              <strong className="analysis-card-metric-value">
                {Number(metrics[key] ?? 0).toFixed(1)}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PLACEHOLDER = '';

/* ──────────────────────────── Page principale ──────────────────────────── */

export default function ComparisonPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const firstIdFromUrl = searchParams.get('firstId') ?? '';
  const secondIdFromUrl = searchParams.get('secondId') ?? '';

  const [analyses, setAnalyses] = useState<UserAnalysisItem[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [analysesError, setAnalysesError] = useState<string | null>(null);

  const [firstId, setFirstId] = useState(firstIdFromUrl);
  const [secondId, setSecondId] = useState(secondIdFromUrl);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareAnalysisResult | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('FREE');

  const user = getUser();
  const userId = user?.id;

  const hasUrlIds = Boolean(firstIdFromUrl && secondIdFromUrl);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAnalysesLoading(true);
      setAnalysesError(null);
      try {
        const response = await comparisonService.getUserAnalyses();
        if (!cancelled) setAnalyses(response.data);
      } catch (err: unknown) {
        if (!cancelled)
          setAnalysesError(
            err instanceof Error ? err.message : 'Unable to load your analyses.'
          );
      } finally {
        if (!cancelled) setAnalysesLoading(false);
      }
    })();

    // Fetch current plan
    if (userId) {
      apiGet<any>(`/subscription/${userId}`).then(subData => {
        setCurrentPlan(subData.plan || 'FREE');
      }).catch(() => setCurrentPlan('FREE'));
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (firstIdFromUrl && secondIdFromUrl && firstIdFromUrl !== secondIdFromUrl) {
      setFirstId(firstIdFromUrl);
      setSecondId(secondIdFromUrl);
    }
  }, [firstIdFromUrl, secondIdFromUrl]);

  useEffect(() => {
    if (!hasUrlIds || firstIdFromUrl === secondIdFromUrl) return;
    let cancelled = false;
    setCompareLoading(true);
    setCompareError(null);
    setResult(null);
    comparisonService
      .compare(firstIdFromUrl, secondIdFromUrl)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setCompareError(
            err instanceof Error ? err.message : 'Unable to compare analyses.'
          );
      })
      .finally(() => {
        if (!cancelled) setCompareLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasUrlIds, firstIdFromUrl, secondIdFromUrl]);

  const sameSelection = firstId && secondId && firstId === secondId;
  const bothSelected = Boolean(firstId && secondId && firstId !== secondId);
  const canCompare = bothSelected && !compareLoading;

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCompare) return;
    setCompareError(null);
    navigate(`/analysis/compare?firstId=${encodeURIComponent(firstId)}&secondId=${encodeURIComponent(secondId)}`, {
      replace: true,
    });
  };

  /**
   * Génère un paragraphe explicatif dynamique en français basé sur les résultats.
   */
  const getExplanatoryText = () => {
    if (!result || !result.differences) return null;

    const { globalTrend, differences } = result;
    const hydration = differences.find((d) => d.metric === 'hydration');
    const acne = differences.find((d) => d.metric === 'acne');
    const wrinkles = differences.find((d) => d.metric === 'wrinkles');

    const sections: string[] = [];

    // Hydratation
    if (hydration) {
      if (hydration.trend === 'improvement') {
        sections.push(
          `Votre hydratation a augmenté de ${Math.abs(hydration.delta).toFixed(
            1
          )} points, ce qui est excellent pour la barrière cutanée !`
        );
      } else if (hydration.trend === 'regression') {
        sections.push(
          `Votre hydratation a baissé de ${Math.abs(hydration.delta).toFixed(
            1
          )} points, ce qui peut fragiliser votre peau.`
        );
      }
    }

    // Acné / Rides
    if (acne && acne.trend === 'improvement') {
      sections.push('Votre acné montre des signes de diminution, bravo !');
    } else if (acne && acne.trend === 'regression') {
      sections.push(
        "On observe une petite poussée d'acné, restez régulier sur le nettoyage."
      );
    }

    if (wrinkles && wrinkles.trend === 'regression') {
      sections.push('En revanche, vos rides ont légèrement augmenté.');
    } else if (wrinkles && wrinkles.trend === 'improvement') {
      sections.push('Vos rides se sont estompées, continuez vos soins anti-âge.');
    }

    // Conseil final selon la tendance globale
    if (globalTrend === 'improvement') {
      sections.push(
        'Votre peau est sur la bonne voie, restez constant dans vos efforts !'
      );
    } else if (globalTrend === 'regression') {
      sections.push(
        'Votre peau a besoin de plus de soin en ce moment, pensez à ajuster votre routine.'
      );
    } else {
      sections.push(
        'Votre peau est stable, continuez ainsi pour maintenir ces résultats.'
      );
    }

    return sections.join(' ');
  };

  return (
    <div className="comparison-root">
      <style>{`
        /* ────────── Style global inspiré de SkinAnalysisPage ────────── */
        .comparison-root {
          min-height: 100vh;
          background: #f8fafc;
          color: #1e293b;
          font-family: 'Inter', system-ui, sans-serif;
          padding: 24px 16px 60px;
        }

        .glass-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
        }

        .fade-in {
          animation: fadeIn 0.5s ease forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pulse-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 0 rgba(16,185,129,0.4);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          70% { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }

        /* ────────── Boutons ────────── */
        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: color 0.2s;
          padding: 8px 16px;
          border-radius: 30px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
        }

        .btn-back:hover {
          color: #334155;
          background: #f8fafc;
        }

        .btn-compare {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0d9488;
          color: white;
          padding: 8px 24px;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(13,148,136,0.3);
          border: 1px solid #0a7a70;
          transition: all 0.2s;
        }

        .btn-compare:hover {
          background: #0a7a70;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(13,148,136,0.4);
        }

        .btn-compare-small {
          background: #0d9488;
          color: white;
          border: none;
          border-radius: 16px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(13,148,136,0.3);
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-compare-small:hover:not(:disabled) {
          background: #0a7a70;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(13,148,136,0.4);
        }

        .btn-compare-small:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ────────── Sélecteurs ────────── */
        .select-wrapper {
          margin-bottom: 16px;
        }

        .select-label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .select-field {
          height: 48px;
          width: 100%;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 0 16px;
          font-size: 14px;
          color: #1e293b;
          outline: none;
          transition: all 0.2s;
          cursor: pointer;
        }

        .select-field:focus {
          border-color: #0d9488;
          box-shadow: 0 0 0 3px rgba(13,148,136,0.1);
        }

        .select-field:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f1f5f9;
        }

        /* ────────── Badges de score ────────── */
        .score-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 30px;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .score-high {
          background: rgba(16,185,129,0.1);
          color: #10b981;
          border: 1px solid rgba(16,185,129,0.2);
        }

        .score-medium {
          background: rgba(245,158,11,0.1);
          color: #f59e0b;
          border: 1px solid rgba(245,158,11,0.2);
        }

        .score-low {
          background: rgba(239,68,68,0.1);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,0.2);
        }

        /* ────────── Cartes d'analyse ────────── */
        .analysis-card {
          flex: 1;
          min-width: 280px;
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: all 0.2s;
        }

        .analysis-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -8px rgba(0,0,0,0.15);
          border-color: #0d9488;
        }

        .analysis-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .analysis-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
        }

        .analysis-card-id {
          font-family: monospace;
          font-size: 11px;
          color: #94a3b8;
          background: #f1f5f9;
          padding: 4px 8px;
          border-radius: 30px;
        }

        .analysis-card-date {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #64748b;
          margin-bottom: 16px;
        }

        .analysis-card-score {
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 20px;
          text-align: center;
          margin-bottom: 16px;
        }

        .analysis-card-score-value {
          font-size: 36px;
          font-weight: 800;
          line-height: 1;
        }

        .score-value-high {
          color: #10b981;
        }

        .score-value-medium {
          color: #f59e0b;
        }

        .score-value-low {
          color: #ef4444;
        }

        .analysis-card-score-unit {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .analysis-card-metrics {
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
        }

        .analysis-card-metrics-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }

        .analysis-card-metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .analysis-card-metric-item {
          font-size: 13px;
        }

        .analysis-card-metric-label {
          color: #64748b;
        }

        .analysis-card-metric-value {
          color: #1e293b;
          font-weight: 600;
        }

        /* ────────── Badges de tendance ────────── */
        .trend-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 600;
        }

        .trend-badge.improvement {
          background: rgba(16,185,129,0.1);
          color: #10b981;
          border: 1px solid rgba(16,185,129,0.2);
        }

        .trend-badge.regression {
          background: rgba(239,68,68,0.1);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,0.2);
        }

        .trend-badge.stable {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        /* ────────── Tableau d'évolution ────────── */
        .evolution-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .evolution-table th {
          text-align: left;
          padding-bottom: 10px;
          font-weight: 600;
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
        }

        .evolution-table td {
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .evolution-table tr:last-child td {
          border-bottom: none;
        }

        .delta-positive {
          color: #10b981;
          font-weight: 600;
        }

        .delta-negative {
          color: #ef4444;
          font-weight: 600;
        }

        /* ────────── Messages ────────── */
        .loading-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 48px 24px;
          background: #f8fafc;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          color: #64748b;
        }

        .error-message {
          margin-top: 16px;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .error-message.error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #ef4444;
        }

        .error-message.warning {
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.2);
          color: #f59e0b;
        }

        .summary-box {
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          margin-top: 24px;
        }

        .summary-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 12px;
        }

        .summary-text {
          font-size: 14px;
          line-height: 1.6;
          color: #334155;
        }

        .stats-pill {
          background: #f0fdf4;
          color: #10b981;
          padding: 4px 16px;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>

        {/* LOCK OVERLAY FOR FREE USERS */}
        {currentPlan === 'FREE' && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            textAlign: 'center'
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: 'white', display: 'grid', placeItems: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)', marginBottom: 24,
              color: '#0d9488'
            }}>
              <Lock size={40} />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', marginBottom: 16 }}>
              Comparaison d'Analyses <span style={{ color: '#0d9488' }}>PRO</span>
            </h1>
            <p style={{ fontSize: 18, color: '#64748b', maxWidth: 500, lineHeight: 1.6, marginBottom: 32 }}>
              La comparaison détaillée entre deux analyses et le calcul des tendances
              sont réservés aux membres PRO. Suivez vos résultats précisément !
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-4 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all font-sans"
              >
                Retour
              </button>
              <button
                onClick={() => navigate('/upgrade')}
                style={{
                  background: 'linear-gradient(135deg, #0d9488, #10b981)',
                  color: 'white', padding: '16px 40px', borderRadius: 20,
                  fontWeight: 800, border: 'none', cursor: 'pointer',
                  boxShadow: '0 10px 20px rgba(13, 148, 136, 0.2)',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.3s',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                <Crown size={20} /> Débloquer maintenant
              </button>
            </div>
          </div>
        )}

        {/* ── En-tête ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 12
        }}>
          <Link to="/analysis" className="btn-back">
            <ArrowLeft size={18} /> Back
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {result && (
              <div className="stats-pill">
                <div className="pulse-dot" />
                {result.summaryText.split(' ').slice(0, 3).join(' ')}...
              </div>
            )}
          </div>
        </div>

        {/* ── Titre ── */}
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)',
            borderRadius: 99, padding: '6px 14px', marginBottom: 16
          }}>
            <Sparkles size={14} style={{ color: '#0d9488' }} />
            <span style={{ fontSize: 12, color: '#0d9488', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Comparative Analysis
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800,
            color: '#0f172a',
            marginBottom: 10, lineHeight: 1.1
          }}>
            Compare two analyses
          </h1>
          <p style={{ color: '#64748b', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
            Choose two analyses to visualize your skin evolution over time.
          </p>
        </div>

        {/* ── Formulaire de sélection ── */}
        <form onSubmit={handleCompare} style={{ marginBottom: 40 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: 16,
            alignItems: 'end',
            background: '#ffffff',
            padding: 24,
            borderRadius: 24,
            border: '1px solid #e2e8f0'
          }}>
            <div className="select-wrapper">
              <label className="select-label">First analysis</label>
              <select
                className="select-field"
                value={firstId || PLACEHOLDER}
                onChange={(e) => {
                  setFirstId(e.target.value || '');
                  setCompareError(null);
                }}
                disabled={analysesLoading || compareLoading}
              >
                <option value={PLACEHOLDER}>Select an analysis</option>
                {analyses.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === secondId}>
                    {a.createdAt} – Score {a.skinScore}
                  </option>
                ))}
              </select>
              {firstId && analyses.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <ScoreBadge
                    score={analyses.find((a) => a.id === firstId)?.skinScore ?? 0}
                  />
                </div>
              )}
            </div>

            <div className="select-wrapper">
              <label className="select-label">Second analysis</label>
              <select
                className="select-field"
                value={secondId || PLACEHOLDER}
                onChange={(e) => {
                  setSecondId(e.target.value || '');
                  setCompareError(null);
                }}
                disabled={analysesLoading || compareLoading}
              >
                <option value={PLACEHOLDER}>Sélectionnez une analyse</option>
                {analyses.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === firstId}>
                    {a.createdAt} – Score {a.skinScore}
                  </option>
                ))}
              </select>
              {secondId && analyses.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <ScoreBadge
                    score={analyses.find((a) => a.id === secondId)?.skinScore ?? 0}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn-compare-small"
              disabled={!canCompare}
            >
              {compareLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <GitCompare size={16} />
                  Compare
                </>
              )}
            </button>
          </div>

          {/* Messages d'état */}
          {analysesLoading && (
            <div className="loading-message" style={{ marginTop: 16 }}>
              <Loader2 size={20} className="animate-spin" />
              Loading your analyses...
            </div>
          )}

          {analysesError && (
            <div className="error-message error">
              <AlertCircle size={16} />
              {analysesError}
            </div>
          )}

          {sameSelection && (
            <div className="error-message warning">
              <AlertCircle size={16} />
              Please choose two different analyses.
            </div>
          )}

          {compareError && (
            <div className="error-message error">
              <AlertCircle size={16} />
              {compareError}
            </div>
          )}
        </form>

        {/* ── Résultats de la comparaison ── */}
        {compareLoading && !result && (
          <div className="loading-message" role="status" aria-live="polite" style={{ flexDirection: 'column', minHeight: 140 }}>
            <Loader2 size={32} className="animate-spin" style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Comparison in progress...</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Loading analyses and calculating differences.</div>
          </div>
        )}

        {result && !compareLoading && (
          <div className="fade-in">
            {/* Message si aucune donnée de métrique */}
            {(result.metricsMissing || result.metricsMessage) && (
              <div className="glass-card" style={{ padding: 16, marginBottom: 24, background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 4 }}>No metric data available</div>
                    <p style={{ fontSize: 14, color: '#78350f', margin: 0, lineHeight: 1.5 }}>
                      {result.metricsMessage ?? 'Detailed metrics (hydration, sebum, acne, wrinkles) are not available for these analyses. You can see the global score and dates below.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cartes des deux analyses */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
              <AnalysisCard
                title="Analysis 1 (older)"
                id={result.first?.id ?? ''}
                skinScore={result.first?.skinScore ?? 0}
                createdAt={result.first?.createdAt ?? new Date().toISOString()}
                metrics={result.first?.metrics ?? DEFAULT_METRICS}
              />
              <AnalysisCard
                title="Analysis 2 (newer)"
                id={result.second?.id ?? ''}
                skinScore={result.second?.skinScore ?? 0}
                createdAt={result.second?.createdAt ?? new Date().toISOString()}
                metrics={result.second?.metrics ?? DEFAULT_METRICS}
              />
            </div>

            {/* Tableau d'évolution par métrique */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Evolution by metric
              </h3>
              {(!result.differences || result.differences.length === 0) ? (
                <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>No metrics to display for this comparison.</p>
              ) : (
                <table className="evolution-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th style={{ textAlign: 'right' }}>Analysis 1</th>
                      <th style={{ textAlign: 'right' }}>Analysis 2</th>
                      <th style={{ textAlign: 'right' }}>Δ</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.differences.map((d) => (
                      <tr key={d.metric}>
                        <td style={{ fontWeight: 500 }}>{METRIC_LABELS[d.metric]}</td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>{Number(d.firstValue).toFixed(1)}</td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>{Number(d.secondValue).toFixed(1)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={d.delta >= 0 ? 'delta-positive' : 'delta-negative'}>
                            {d.delta >= 0 ? '+' : ''}{Number(d.delta).toFixed(1)}
                          </span>
                        </td>
                        <td><TrendBadge trend={d.trend} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Résumé textuel */}
            <div className="summary-box">
              <div className="summary-title">
                <Info size={16} style={{ color: '#0d9488' }} />
                Evolution Summary
              </div>
              <p className="summary-text">
                {result.summaryText ?? 'Comparison completed.'}
              </p>

              {/* Paragraphe explicatif dynamique */}
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3 fade-in">
                <span className="text-xl" role="img" aria-label="light-bulb">
                  💡
                </span>
                <p className="text-slate-700 text-sm leading-relaxed">
                  <strong className="text-slate-900">À retenir :</strong>{' '}
                  {getExplanatoryText()}
                </p>
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <CheckCircle size={16} style={{ color: '#10b981', marginRight: 6 }} />
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Comparative analysis completed
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}