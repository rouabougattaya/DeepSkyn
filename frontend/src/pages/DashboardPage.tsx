import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUser, authFetch } from '@/lib/authSession';
import {
  TrendingUp, BarChart2, Activity,
  Zap, ArrowRight, Lock, Brain, RefreshCw, Star, Smartphone, Calendar, Sparkles
} from 'lucide-react';
import { dashboardService } from '@/services/dashboardService';
import { skinAgeInsightsService, type SkinAgeInsightResponse } from '@/services/skinAgeInsightsService';
import SkinAgeInsightCard from '@/components/insights/SkinAgeInsightCard';
import type { DashboardMetrics, TrendData, MonthlyData } from '@/types/dashboard';
import { WeatherAdaptiveWidget } from '@/components/dashboard/WeatherAdaptiveWidget';
import { RiskAlerts } from '@/components/dashboard/RiskAlerts';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const THEME = {
  primary: '#0d9488', // DeepSkyn Teal
  primaryLight: '#f0fdfa',
  primaryBorder: '#ccfbf1',
  success: '#10b981',
  successLight: '#f0fdf4',
  danger: '#f43f5e',
  dangerLight: '#fff1f2',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  background: '#f8fafc', // Technical Gray
  surface: '#ffffff',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
};

// Medical Grade Metric Card
function TechnicalStat({ title, value, unit, icon, color, trend }: any) {
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: '24px', position: 'relative', overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} className="clinical-card-hover">
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        {trend !== undefined && (
          <div style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? THEME.success : THEME.danger, background: trend >= 0 ? THEME.successLight : THEME.dangerLight, padding: '4px 8px', borderRadius: 6 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: THEME.textPrimary, display: 'flex', alignItems: 'baseline', gap: 4 }}>
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 600, color: THEME.textTertiary }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function ProfessionalDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [skinAgeInsight, setSkinAgeInsight] = useState<SkinAgeInsightResponse | null>(null);
  const [skinAgeLoading, setSkinAgeLoading] = useState<boolean>(true);
  const [currentPlan, setCurrentPlan] = useState<string>('FREE');

  const isPro = currentPlan?.toUpperCase() === 'PRO' || currentPlan?.toUpperCase() === 'PREMIUM';
  const isPremiumPlan = currentPlan?.toUpperCase() === 'PREMIUM';

  useEffect(() => {
    const loadData = async () => {
      const currentUser = getUser();
      if (!currentUser) { navigate('/auth/login'); return; }
      setUser(currentUser);

      try {
        const [planRes, dashRes, insightRes] = await Promise.all([
          authFetch(`/subscription/${currentUser.id}`).then(res => res.json()),
          dashboardService.getMetrics(),
          skinAgeInsightsService.getInsights(currentUser.id).catch(() => null)
        ]);

        setCurrentPlan(planRes?.plan || 'FREE');
        setMetrics(dashRes);
        setMonthly(await dashboardService.getMonthlyData(6));
        setSkinAgeInsight(insightRes);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
        setSkinAgeLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: THEME.background }}>
        <div style={{ textAlign: 'center' }}>
          <Activity size={40} className="animate-spin" style={{ color: THEME.primary, marginBottom: 16 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.textSecondary }}>Synchronizing clinical data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: THEME.background, fontFamily: 'Inter, system-ui, sans-serif', color: THEME.textPrimary }}>
      <style>{`
        .clinical-card-hover:hover { transform: translateY(-4px); border-color: ${THEME.primary}40; box-shadow: 0 12px 24px -8px rgba(13,148,136,0.1); }
        .clinical-panel { background: white; border: 1px solid ${THEME.border}; border-radius: 20px; box-shadow: 0 4px 12px rgba(13,148,136,0.03); position: relative; }
        .clinical-accent-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: ${THEME.primary}; border-radius: 20px 20px 0 0; }
        .hover-lift { transition: all 0.2s ease; }
        .hover-lift:hover { transform: translateY(-2px); filter: brightness(0.98); }
        @keyframes pulse-soft { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        .status-pulse { animation: pulse-soft 2s infinite ease-in-out; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '48px 40px' }}>

        {/* TOP BAR: IDENTITY & GLOBAL STATUS */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, borderBottom: `1px solid ${THEME.border}`, paddingBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: THEME.success }} className="status-pulse" />
              <span style={{ fontSize: 11, fontWeight: 800, color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Core Engine Diagnostic Mode</span>
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: THEME.textPrimary, letterSpacing: '-0.03em', margin: 0 }}>
              DeepSkyn <span style={{ color: THEME.primary, fontWeight: 500 }}>Clinical</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, background: THEME.surface, border: `1px solid ${THEME.border}`, fontWeight: 700, fontSize: 13, color: THEME.textSecondary, cursor: 'pointer' }} className="hover-lift">
              <RefreshCw size={16} /> Sync Profile
            </button>
            <Link to="/analysis" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12, background: THEME.primary, color: 'white', fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: `0 4px 12px ${THEME.primary}30` }} className="hover-lift">
              <Zap size={18} fill="white" /> Launch AI Session
            </Link>
          </div>
        </header>

        {/* ANALYTIC SUMMARY ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
          <TechnicalStat title="Aggregate Health" value={metrics?.averageScore?.toFixed(1) ?? '—'} unit="/100" icon={<Activity size={20} />} color={THEME.primary} trend={metrics?.trendPercentage ?? 0} />
          <TechnicalStat title="Diagnostic Peak" value={metrics?.bestScore ?? '—'} unit="/100" icon={<TrendingUp size={20} />} color={THEME.success} />
          <TechnicalStat title="Analysis Count" value={metrics?.totalAnalyses ?? '0'} icon={<BarChart2 size={20} />} color="#6366f1" />
          <TechnicalStat title="Engine Tier" value={currentPlan} icon={<Star size={20} />} color={THEME.warning} />
        </div>

        {/* PRIMARY DIAGNOSTIC GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 40 }}>

          {/* LEFT: DEEP DIAGNOSTICS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

            {/* AI DIAGNOSTIC PANEL */}
            <div className="clinical-panel" style={{ padding: 32 }}>
              <div className="clinical-accent-bar" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: THEME.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.primary, border: `1px solid ${THEME.primaryBorder}` }}>
                    <Brain size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Clinical AI Intelligence</h2>
                    <p style={{ fontSize: 13, color: THEME.textSecondary, margin: 0 }}>Neural-network derived skin markers</p>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: THEME.primary, background: THEME.primaryLight, padding: '6px 12px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Stream Active</div>
              </div>

              {isPro ? (
                <SkinAgeInsightCard insight={skinAgeInsight} loading={skinAgeLoading} />
              ) : (
                <div style={{ padding: '48px 32px', textAlign: 'center', background: THEME.background, borderRadius: 16, border: `1px dashed ${THEME.border}` }}>
                  <div style={{ width: 64, height: 64, background: 'white', borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto 24px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <Lock size={28} style={{ color: THEME.textTertiary }} />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Diagnostic Insight Restricted</h3>
                  <p style={{ color: THEME.textSecondary, fontSize: 15, marginBottom: 28, maxWidth: 360, marginInline: 'auto', lineHeight: 1.6 }}>The Professional Engine provides deep-layer analysis of skin age markers and clinical routine adjustments.</p>
                  <Link to="/upgrade" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 32px', background: THEME.primary, color: 'white', borderRadius: 12, fontWeight: 700, textDecoration: 'none', boxShadow: `0 4px 12px ${THEME.primary}25` }}>
                    Activate Pro Engine <ArrowRight size={18} />
                  </Link>
                </div>
              )}
            </div>

            {/* PERFORMANCE TRAJECTORY */}
            <div className="clinical-panel" style={{ padding: 32 }}>
              <div className="clinical-accent-bar" style={{ background: '#6366f1' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Health Trajectory</h3>
                  <p style={{ fontSize: 13, color: THEME.textSecondary, marginTop: 4 }}>Longitudinal tracking of clinical skin scores</p>
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: THEME.textSecondary }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: THEME.primary }} /> Aggregate
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: THEME.textSecondary }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: THEME.border }} /> Tolerance
                  </div>
                </div>
              </div>

              <div style={{ height: 320, width: '100%' }}>
                {monthly.length > 0 ? (
                  <Line
                    data={{
                      labels: monthly.map(m => m.month),
                      datasets: [{
                        label: 'Score',
                        data: monthly.map(m => m.averageScore),
                        borderColor: THEME.primary,
                        backgroundColor: `${THEME.primary}05`,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: THEME.surface,
                        pointBorderColor: THEME.primary,
                        pointBorderWidth: 2,
                        borderWidth: 3
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { cornerRadius: 8, padding: 12 } },
                      scales: {
                        y: { beginAtZero: true, max: 100, grid: { color: THEME.border, lineWidth: 0.5 }, ticks: { color: THEME.textTertiary, font: { size: 11, weight: 600 } } },
                        x: { grid: { display: false }, ticks: { color: THEME.textTertiary, font: { size: 11, weight: 600 } } }
                      }
                    }}
                  />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.textTertiary, fontSize: 14, fontWeight: 600 }}>
                    <Activity size={24} style={{ marginRight: 12, opacity: 0.5 }} />
                    Diagnostic baseline required for trend analysis.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT: CLINICAL TOOLS & ENVIRONMENTS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* DIGITAL TWIN - CLINICAL STYLE */}
            <div className="clinical-panel" style={{ padding: 28, background: `linear-gradient(135deg, ${THEME.primaryLight} 0%, #ffffff 100%)`, border: `1px solid ${THEME.primaryBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Sparkles size={20} style={{ color: THEME.primary }} />
                <span style={{ fontSize: 11, fontWeight: 900, color: THEME.primary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Predictive Modeling</span>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: THEME.textPrimary, marginBottom: 10 }}>Digital Twin Simulation</h3>
              <p style={{ fontSize: 14, color: THEME.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>Calculate biological skin age trajectory based on your current routine and environmental exposure markers.</p>
              <button
                onClick={() => navigate(isPremiumPlan ? '/digital-twin' : '/upgrade')}
                style={{ width: '100%', padding: '14px', borderRadius: 12, background: THEME.primary, color: 'white', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: `0 4px 12px ${THEME.primary}20` }}
                className="hover-lift"
              >
                {isPremiumPlan ? 'Start Simulation' : 'Activate Premium Modeling'}
              </button>
            </div>

            {/* HEALTH MONITORING (RISK ALERTS) */}
            <div className="clinical-panel" style={{ padding: 24 }}>
              <h4 style={{ fontSize: 13, fontWeight: 900, color: THEME.textPrimary, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} style={{ color: THEME.danger }} />
                Active Monitoring
              </h4>
              {isPremiumPlan ? (
                <RiskAlerts />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderRadius: 12, background: THEME.background, border: `1px solid ${THEME.border}` }}>
                  <Lock size={18} style={{ color: THEME.textTertiary }} />
                  <span style={{ fontSize: 13, color: THEME.textSecondary, fontWeight: 600 }}>Premium Risk Detection Disabled</span>
                </div>
              )}
            </div>

            {/* ENVIRONMENTAL CONTEXT */}
            <div className="clinical-panel" style={{ padding: 24 }}>
              <h4 style={{ fontSize: 12, fontWeight: 900, color: THEME.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Environmental Context</h4>
              <WeatherAdaptiveWidget />
            </div>

            {/* CLINICAL NAVIGATION */}
            <div className="clinical-panel" style={{ padding: 24 }}>
              <h4 style={{ fontSize: 12, fontWeight: 900, color: THEME.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Management</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Sessions', icon: <Smartphone size={18} />, path: '/sessions' },
                  { label: 'Routines', icon: <Calendar size={18} />, path: '/routines' },
                ].map(item => (
                  <Link key={item.label} to={item.path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px', borderRadius: 16, background: THEME.background, border: `1px solid ${THEME.border}`, textDecoration: 'none', color: THEME.textPrimary, transition: '0.2s' }} className="hover-lift">
                    <div style={{ color: THEME.primary }}>{item.icon}</div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
