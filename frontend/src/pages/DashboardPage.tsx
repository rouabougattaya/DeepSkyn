import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getUser, authFetch } from '@/lib/authSession';
import {
  TrendingUp, TrendingDown, Minus, BarChart2, Activity,
  Zap, ArrowRight, Lock,
  Brain, Camera, BarChart3, Shield, History, Sparkles, RefreshCw, Smartphone
} from 'lucide-react';
import AIStatusBadge from '@/components/AIStatusBadge';
import { simpleAuthService } from '@/services/authService-simple';
import { dashboardService } from '@/services/dashboardService';
import { comparisonService } from '@/services/comparison.service';
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
  primary: '#0d9488',
  primaryHover: '#0f766e',
  surface: '#ffffff',
  background: '#f8fafc',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  greenSoft: '#f0fdfa',
};

function SparkLine({ data, color = '#0d9488' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const fillPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {data.length > 0 && (
        <circle cx={w} cy={h - ((data[data.length - 1] - min) / range) * h} r="3" fill={color}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      )}
    </svg>
  );
}

function KPIMetricCard({
  title, value, unit = '', trend, icon, color, sparkData, subtitle
}: {
  title: string; value: number | string; unit?: string;
  trend?: { direction: 'up' | 'down' | 'stable'; percentage: number };
  icon: React.ReactNode; color: string; sparkData?: number[]; subtitle?: string;
}) {
  const trendColor = trend?.direction === 'up' ? '#10b981' : trend?.direction === 'down' ? '#ef4444' : '#64748b';
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  return (
    <div style={{ background: '#ffffff', border: `1px solid ${THEME.border}`, borderRadius: 20, padding: '24px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default', position: 'relative', overflow: 'hidden' }} className="kpi-card">
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: color, borderRadius: '50%', opacity: 0.05, filter: 'blur(24px)' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${trendColor}10`, padding: '4px 8px', borderRadius: 20 }}>
            <TrendIcon size={12} style={{ color: trendColor }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>{trend.direction === 'up' ? '+' : ''}{trend.percentage.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: THEME.textPrimary, lineHeight: 1, marginBottom: 4 }}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        <span style={{ fontSize: 16, color: THEME.textSecondary, marginLeft: 4, fontWeight: 500 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 13, color: THEME.textSecondary, fontWeight: 500 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>}
      {sparkData && sparkData.length > 1 && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${THEME.border}`, paddingTop: 16 }}>
          <SparkLine data={sparkData} color={color} />
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, value, icon }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', display: 'grid', placeItems: 'center', color: THEME.textSecondary }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: THEME.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  );
}

export default function ProfessionalDashboard() {
  const [user, setUser] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analysisJustCompleted, setAnalysisJustCompleted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const lastFetchTimeRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [skinAgeInsight, setSkinAgeInsight] = useState<SkinAgeInsightResponse | null>(null);
  const [skinAgeLoading, setSkinAgeLoading] = useState<boolean>(true);
  const [currentPlan, setCurrentPlan] = useState<string>('FREE');

  useEffect(() => {
    const loadUserData = async () => {
      const currentUser = getUser();
      if (!currentUser) { navigate('/auth/login'); return; }
      setUser(currentUser);
      setAiStatus({ verified: currentUser.aiVerified || false, score: currentUser.aiScore || 0 });

      const loadPlan = async () => {
        try {
          const res = await authFetch(`/subscription/${currentUser.id}`);
          if (!res.ok) throw new Error('Subscription API returned ' + res.status);
          const subData = await res.json();
          const newPlan = subData?.plan || 'FREE';
          setCurrentPlan(newPlan);
          return newPlan;
        } catch (e) {
          console.error("Dashboard Failed to fetch plan:", e);
          setCurrentPlan('FREE');
          return 'FREE';
        }
      };

      await loadPlan();

      const analysisCompleted = sessionStorage.getItem('analysisCompleted');
      if (analysisCompleted) { sessionStorage.removeItem('analysisCompleted'); setAnalysisJustCompleted(true); }
      setLoading(false);

      // Polling pour détecter les changements de plan (toutes les 3 secondes pendant 30 secondes après upgrade)
      let pollCount = 0;
      const maxPolls = 10; // 30 secondes max
      const pollInterval = setInterval(async () => {
        pollCount++;
        const newPlan = await loadPlan();
        if (newPlan !== 'FREE' || pollCount >= maxPolls) {
          clearInterval(pollInterval);
          if (newPlan !== 'FREE') {
            // Recharger les données quand le plan change
            loadSkinMetrics();
            loadSkinAgeInsights(true);
          }
        }
      }, 3000);

      return () => clearInterval(pollInterval);
    };
    loadUserData();
  }, [navigate]);

  const loadSkinMetrics = async () => {
    try {
      const [m, t, mon, hist] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getTrends(),
        dashboardService.getMonthlyData(6),
        comparisonService.getUserAnalyses(1, 4),
      ]);
      setMetrics(m); setTrends(t); setMonthly(mon); setRecentHistory(hist.data);
    } catch (err) { console.error('Error fetching dashboard data:', err); }
  };



  const loadSkinAgeInsights = async (skipDebounce: boolean = false) => {
    if (!user?.id || isFetchingRef.current) return;
    const now = Date.now();
    if (!skipDebounce && now - lastFetchTimeRef.current < 5000) return;
    isFetchingRef.current = true;
    setSkinAgeLoading(true);
    try {
      const data = await skinAgeInsightsService.getInsights(user.id);
      setSkinAgeInsight(data);
      lastFetchTimeRef.current = now;
    } catch (err) { console.error('Error fetching skin-age insights:', err); }
    finally { setSkinAgeLoading(false); isFetchingRef.current = false; }
  };

  const handleLaunchAnalysis = async () => { navigate('/analysis'); };

  useEffect(() => {
    if (!loading) {
      loadSkinMetrics();
      loadSkinAgeInsights();
    }
  }, [loading]); // eslint-disable-line

  // Détection immédiate du changement de plan au retour depuis la page de paiement
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment') === 'success';
    const planUpgraded = urlParams.get('plan');

    if (paymentSuccess && planUpgraded && planUpgraded !== 'FREE') {
      // Forcer la mise à jour immédiate du plan
      const currentUser = getUser();
      if (currentUser) {
        const checkPlanImmediately = async () => {
          try {
            const res = await authFetch(`/subscription/${currentUser.id}`);
            if (res.ok) {
              const subData = await res.json();
              const newPlan = subData?.plan || 'FREE';
              setCurrentPlan(newPlan);
              if (newPlan !== 'FREE') {
                // Recharger toutes les données immédiatement
                loadSkinMetrics();
                loadSkinAgeInsights(true);
                // Nettoyer l'URL
                window.history.replaceState({}, '', window.location.pathname);
              }
            }
          } catch (e) {
            console.error("Error checking plan after payment:", e);
          }
        };
        checkPlanImmediately();
      }
    }
  }, [loading]); // eslint-disable-line

  useEffect(() => {
    if (analysisJustCompleted && !loading) { loadSkinMetrics(); loadSkinAgeInsights(true); setAnalysisJustCompleted(false); }
  }, [analysisJustCompleted, loading]); // eslint-disable-line

  useEffect(() => {
    if (!loading && location.pathname === '/dashboard') { loadSkinMetrics(); loadSkinAgeInsights(true); }
  }, [location.pathname, loading]); // eslint-disable-line

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'analysisCompleted' && e.newValue && !loading) { loadSkinMetrics(); loadSkinAgeInsights(true); }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loading]); // eslint-disable-line

  const handleRefreshAI = async () => {
    setLoading(true);
    try {
      const res = await simpleAuthService.refreshAIVerification();
      setAiStatus({ verified: res.verified, score: res.score });
      setUser(getUser());
    } catch (error) { console.error('Error refreshing AI verification:', error); }
    finally { setLoading(false); }
  };

  const handleDowngrade = async () => {
    const currentUser = getUser();
    if (!currentUser) return;
    if (!confirm('Êtes-vous sûr de vouloir passer au plan FREE ?')) return;
    try {
      const res = await authFetch(`/payments/subscription/${currentUser.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'FREE' })
      });
      if (res.ok) { setCurrentPlan('FREE'); loadSkinMetrics(); loadSkinAgeInsights(); }
    } catch (e) { console.error("Error downgrading plan:", e); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-teal-100 border-t-[#0d9488] rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-500 font-medium animate-pulse">Analyzing your profile...</p>
    </div>
  );

  const isPro = currentPlan?.toUpperCase() === 'PRO' || currentPlan?.toUpperCase() === 'PREMIUM';
  const isPremiumPlan = currentPlan?.toUpperCase() === 'PREMIUM';
  const canAccessStats = ['FREE', 'PRO', 'PREMIUM'].includes((currentPlan || '').toUpperCase());

  return (
    <div style={{ minHeight: '100vh', background: THEME.background, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px 56px', marginTop: '12px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, padding: '20px 24px', borderRadius: 20, background: 'linear-gradient(120deg, #f0fdfa, #e0f2fe)', border: `1px solid ${THEME.border}`, boxShadow: '0 14px 28px rgba(13,148,136,0.12)' }} className="kpi-card">
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: THEME.textPrimary, letterSpacing: '-0.02em', marginBottom: 8 }}>
              Welcome back, <span style={{ color: THEME.primary }}>{user?.firstName || user?.name?.split(' ')[0]}</span> 
            </h1>
            <p style={{ color: THEME.textSecondary, fontSize: 16 }}>Here is your latest skin health snapshot.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isPro && (
              <button onClick={handleDowngrade} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: '#fee2e2', border: '1px solid #fecaca', fontWeight: 600, fontSize: 14, color: '#dc2626', cursor: 'pointer' }}>
                Downgrade to Free
              </button>
            )}
           
          </div>
        </div>

        {/* GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>

          {/* ══ COLONNE GAUCHE ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              <KPIMetricCard title="Average score" value={metrics?.averageScore ?? '—'} unit="/100"
                trend={metrics ? { direction: metrics.trendDirection, percentage: metrics.trendPercentage } : undefined}
                icon={<BarChart2 size={24} />} color="#0d9488"
                sparkData={monthly.filter(m => m.analysisCount > 0).map(m => m.averageScore).slice(-5)}
                subtitle={metrics ? (metrics.averageScore >= 75 ? 'Optimal' : 'Needs attention') : 'Ready for analysis'} />
              <KPIMetricCard title="Total analyses" value={metrics?.totalAnalyses ?? '0'}
                icon={<Activity size={24} />} color="#8b5cf6" subtitle="Last 30 days" />
            </div>

            {/* SKIN AGE INSIGHT */}
            {isPro ? (
              <SkinAgeInsightCard insight={skinAgeInsight} loading={skinAgeLoading}
                onRetry={loadSkinAgeInsights}
                onLaunchAnalysis={handleLaunchAnalysis} />
            ) : (
              <div
                style={{
                  background: '#ffffff',
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 20,
                  padding: '28px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  minHeight: 250,
                }}
              >
                <div style={{ width: 80, height: 80, background: 'rgba(13,148,136,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Lock size={40} style={{ color: THEME.primary }} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: THEME.textPrimary, marginBottom: 8 }}>Skin Age Analysis PRO</h3>
                <p style={{ color: THEME.textSecondary, fontSize: 16, marginBottom: 24, maxWidth: 340 }}>
                  Unlock detailed skin age analysis and personalized recommendations
                </p>
                <button
                  onClick={() => navigate('/upgrade')}
                  style={{ background: 'linear-gradient(135deg, #0d9488, #10b981)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  Upgrade to PRO <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* STATS */}
            {canAccessStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: THEME.textPrimary, margin: 0 }}>Statistical Aggregation Engine</h3>
                  <p style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4 }}>Advanced analytics • Dynamic averages • Trends • Dispersion</p>
                </div>

                {/* Gradient KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Average Score', value: metrics?.averageScore ?? 0, sub: 'Dynamic average', gradient: 'linear-gradient(135deg, #0d9488, #0f766e)', icon: <BarChart2 size={22} /> },
                    { label: 'Best Score', value: metrics?.bestScore ?? 0, sub: 'Max across scores', gradient: 'linear-gradient(135deg, #10b981, #059669)', icon: <TrendingUp size={22} /> },
                    { label: 'Lowest Score', value: metrics?.worstScore ?? 0, sub: 'Min across scores', gradient: 'linear-gradient(135deg, #14b8a6, #0f766e)', icon: <TrendingDown size={22} /> },
                    { label: 'Total Analyses', value: metrics?.totalAnalyses ?? 0, sub: 'All analyses', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', icon: <Activity size={22} /> },
                  ].map(kpi => (
                    <div key={kpi.label} style={{ background: kpi.gradient, borderRadius: 20, padding: 22, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} className="kpi-card">
                      <div style={{ position: 'absolute', top: -15, right: -15, opacity: 0.15 }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid white' }} />
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>{kpi.icon}</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                        {typeof kpi.value === 'number' && kpi.label !== 'Total Analyses' ? kpi.value.toFixed(1) : kpi.value}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 6, fontWeight: 700 }}>{kpi.label}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Statistical Distribution */}
                <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: `1px solid ${THEME.border}`, borderRadius: 20, padding: 24, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20 }}>
                  {[
                    { label: 'Std Dev (σ)', value: (metrics?.standardDeviation ?? 0).toFixed(1), sub: 'Score spread', color: '#0f172a', border: true },
                    { label: 'Median', value: (metrics?.medianScore ?? 0).toFixed(1), sub: 'Central value', color: '#0f172a', border: true },
                    { label: 'Q1 (25%ile)', value: (metrics?.percentile25 ?? 0).toFixed(1), sub: 'Bottom 25%', color: '#0f766e', border: true },
                    { label: 'Q3 (75%ile)', value: (metrics?.percentile75 ?? 0).toFixed(1), sub: 'Top 75%', color: '#10b981', border: true },
                    { label: 'Rolling Avg (5)', value: (metrics?.movingAverage5 ?? 0).toFixed(1), sub: 'Last 5', color: '#8b5cf6', border: false },
                  ].map(stat => (
                    <div key={stat.label} style={{ textAlign: 'center', borderRight: stat.border ? '1px solid #e2e8f0' : 'none', paddingRight: stat.border ? 16 : 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{stat.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>{stat.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Trend Bar */}
                <div style={{ background: '#ffffff', border: `1px solid ${THEME.border}`, borderRadius: 16, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: metrics?.trendDirection === 'up' ? '#f0fdf4' : metrics?.trendDirection === 'down' ? '#ecfdf5' : '#f8fafc', display: 'grid', placeItems: 'center' }}>
                      {metrics?.trendDirection === 'up' && <TrendingUp size={20} style={{ color: '#16a34a' }} />}
                      {metrics?.trendDirection === 'down' && <TrendingDown size={20} style={{ color: '#0f766e' }} />}
                      {(!metrics || metrics?.trendDirection === 'stable') && <Minus size={20} style={{ color: '#64748b' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: THEME.textPrimary }}>Overall trend</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {metrics?.trendPercentage?.toFixed(1) ?? '0.0'}% {metrics?.trendDirection === 'up' ? 'improvement' : metrics?.trendDirection === 'down' ? 'decline' : 'stable range'}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '8px 20px', borderRadius: 24, background: metrics?.trendDirection === 'up' ? 'linear-gradient(135deg, #10b981, #059669)' : metrics?.trendDirection === 'down' ? 'linear-gradient(135deg, #14b8a6, #0f766e)' : 'linear-gradient(135deg, #94a3b8, #64748b)', color: 'white', fontSize: 13, fontWeight: 800 }}>
                    {metrics?.trendDirection === 'up' ? '↑ IMPROVING' : metrics?.trendDirection === 'down' ? '↓ DECLINING' : '― STABLE'}
                  </div>
                </div>

                {/* Trend Widgets */}
                {trends.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(trends.length, 4)}, 1fr)`, gap: 14 }}>
                    {trends.map(t => {
                      const isUp = t.direction === 'up', isDown = t.direction === 'down';
                      const tColor = isUp ? '#10b981' : isDown ? '#0f766e' : '#64748b';
                      const TIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                      return (
                        <div key={t.period} style={{ background: isUp ? 'linear-gradient(180deg, #f0fdf4, #fff)' : isDown ? 'linear-gradient(180deg, #ecfdf5, #fff)' : 'linear-gradient(180deg, #f8fafc, #fff)', border: `1px solid ${THEME.border}`, borderRadius: 18, padding: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: tColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.label}</span>
                            <TIcon size={16} style={{ color: tColor }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontSize: 28, fontWeight: 900, color: tColor, lineHeight: 1 }}>{t.current.toFixed(1)}</span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>vs {t.previous.toFixed(1)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: tColor, padding: '3px 10px', borderRadius: 6, background: isUp ? '#dcfce7' : isDown ? '#fee2e2' : '#f1f5f9' }}>
                              {isUp ? '+' : isDown ? '-' : ''}{t.percentage.toFixed(1)}%
                            </div>
                            <span style={{ fontSize: 9, color: '#94a3b8' }}>{t.sampleSize} {t.sampleSize === 1 ? 'analysis' : 'analyses'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Monthly Chart */}
                <div style={{ background: '#ffffff', border: `1px solid ${THEME.border}`, borderRadius: 24, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #0d9488, #10b981, #8b5cf6, #0f766e)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #0d9488, #10b981)', display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(13,148,136,0.3)' }}>
                        <BarChart3 size={22} style={{ color: 'white' }} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: 15, fontWeight: 800, color: THEME.textPrimary, margin: 0 }}>Monthly Score Evolution</h4>
                        <p style={{ fontSize: 11, color: THEME.textSecondary, marginTop: 2 }}>Historical skin health analysis • Progress over the last 6 months</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                      {[{ color: '#0d9488', label: 'Average' }, { color: '#8b5cf6', label: 'Best' }, { color: '#0f766e', label: 'Lowest' }].map(l => (
                        <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 20, height: 3, borderRadius: 2, background: l.color, display: 'inline-block' }} /> {l.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {monthly.filter(m => m.analysisCount > 0).length > 0 ? (
                    <div>
                      <Line
                        data={{
                          labels: monthly.filter(m => m.analysisCount > 0).map(m => {
                            const [y, mo] = m.month.split('-');
                            return new Date(+y, +mo - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                          }),
                          datasets: [
                            { label: 'Average score', data: monthly.filter(m => m.analysisCount > 0).map(m => m.averageScore), borderColor: '#0d9488', backgroundColor: 'rgba(13,148,136,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#0d9488', pointBorderColor: '#ffffff', pointBorderWidth: 2, pointRadius: 6, pointHoverRadius: 9, borderWidth: 3 },
                            { label: 'Best score', data: monthly.filter(m => m.analysisCount > 0).map(m => m.bestScore), borderColor: '#8b5cf6', backgroundColor: 'transparent', fill: false, tension: 0.4, pointBackgroundColor: '#8b5cf6', pointBorderColor: '#ffffff', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 7, borderWidth: 2, borderDash: [6, 4] },
                            { label: 'Lowest score', data: monthly.filter(m => m.analysisCount > 0).map(m => m.worstScore), borderColor: '#0f766e', backgroundColor: 'transparent', fill: false, tension: 0.4, pointBackgroundColor: '#0f766e', pointBorderColor: '#ffffff', pointBorderWidth: 2, pointRadius: 3, pointHoverRadius: 6, borderWidth: 1.5, borderDash: [3, 3] },
                          ],
                        }}
                        options={{
                          responsive: true, maintainAspectRatio: true, aspectRatio: 2.2,
                          interaction: { mode: 'index', intersect: false },
                          plugins: {
                            legend: { display: false },
                            tooltip: { backgroundColor: '#0f172a', padding: 16, cornerRadius: 12, displayColors: true, usePointStyle: true, titleFont: { weight: 'bold', size: 13 }, bodyFont: { size: 12 }, callbacks: { title: (items) => `📅 ${items[0]?.label || ''}`, label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)}/100` } },
                          },
                          scales: {
                            y: { beginAtZero: true, max: 100, grid: { color: 'rgba(226,232,240,0.6)', lineWidth: 1 }, ticks: { color: '#94a3b8', font: { size: 11, weight: 'bold' }, stepSize: 20, callback: (v) => `${v}` }, title: { display: true, text: 'Score /100', color: '#64748b', font: { size: 11, weight: 'bold' } } },
                            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11, weight: 'bold' } }, title: { display: true, text: 'Period (month)', color: '#64748b', font: { size: 11, weight: 'bold' } } },
                          },
                        }}
                      />
                      <div style={{ display: 'flex', gap: 20, marginTop: 20, padding: '14px 20px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderRadius: 14 }}>
                        <div style={{ fontSize: 11, color: '#64748b' }}><strong style={{ color: THEME.textPrimary }}>{monthly.filter(m => m.analysisCount > 0).length}</strong> months with data</div>
                        <div style={{ width: 1, background: '#e2e8f0' }} />
                        <div style={{ fontSize: 11, color: '#64748b' }}><strong style={{ color: THEME.textPrimary }}>{monthly.reduce((s, m) => s + m.analysisCount, 0)}</strong> total analyses</div>
                        <div style={{ width: 1, background: '#e2e8f0' }} />
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Change: <strong style={{ color: monthly[monthly.length - 1]?.changePercent && monthly[monthly.length - 1].changePercent! > 0 ? '#10b981' : '#0f766e' }}>
                            {monthly[monthly.length - 1]?.changePercent != null ? `${monthly[monthly.length - 1].changePercent! > 0 ? '+' : ''}${monthly[monthly.length - 1].changePercent!.toFixed(1)}%` : '—'}
                          </strong> (last month)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
                      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #f0fdfa, #e0f2fe)', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
                        <BarChart3 size={32} style={{ color: '#0d9488' }} />
                      </div>
                      <h5 style={{ fontSize: 16, fontWeight: 800, color: THEME.textPrimary, margin: '0 0 8px' }}>No monthly data yet</h5>
                      <p style={{ fontSize: 12, color: THEME.textSecondary, textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
                        Your trend chart will appear here after your first AI analyses.
                      </p>
                      <Link to="/analysis" style={{ marginTop: 20, padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg, #0d9488, #10b981)', color: 'white', fontWeight: 700, fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(13,148,136,0.3)' }}>
                        <Sparkles size={16} /> Launch an AI analysis
                      </Link>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* FREE - locked stats */
              <div style={{ position: 'relative', minHeight: 200 }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 20 }}>
                  <div style={{ width: 80, height: 80, background: 'rgba(13,148,136,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <Lock size={40} style={{ color: THEME.primary }} />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: THEME.textPrimary, marginBottom: 8 }}>Advanced Statistics PRO</h3>
                  <p style={{ color: THEME.textSecondary, fontSize: 16, marginBottom: 24, maxWidth: 300, textAlign: 'center' }}>Unlock detailed statistical analysis and professional metrics</p>
                  <button onClick={() => navigate('/upgrade')} style={{ background: 'linear-gradient(135deg, #0d9488, #10b981)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Upgrade to PRO <ArrowRight size={16} />
                  </button>
                </div>
                <div style={{ opacity: 0.1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: 24, minHeight: 200 }}>
                  {[1, 2, 3, 4].map(i => <div key={i} style={{ background: '#f8fafc', borderRadius: 20, padding: 22, border: `1px solid ${THEME.border}` }} />)}
                </div>
              </div>
            )}

            {/* RECENT HISTORY */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: THEME.textPrimary, margin: 0 }}>Recent Analyses</h3>
                <Link to="/analysis" style={{ fontSize: 12, fontWeight: 700, color: THEME.primary, textDecoration: 'none' }}>View all</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentHistory.length > 0 ? recentHistory.map((analysis) => (
                  <div key={analysis.id} style={{ background: 'white', padding: '16px', borderRadius: 20, border: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }} className="kpi-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: analysis.skinScore >= 75 ? '#f0fdf4' : analysis.skinScore >= 50 ? '#fffbeb' : '#fef2f2', color: analysis.skinScore >= 75 ? '#16a34a' : analysis.skinScore >= 50 ? '#d97706' : '#dc2626', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800, border: `1px solid ${analysis.skinScore >= 75 ? '#dcfce7' : analysis.skinScore >= 50 ? '#fef3c7' : '#fee2e2'}` }}>
                        {analysis.skinScore}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: THEME.textPrimary }}>
                          {new Date(analysis.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                        </div>
                        <div style={{ fontSize: 11, color: THEME.textSecondary }}>{analysis.summary || 'Skin health analysis'}</div>
                      </div>
                    </div>
                    <Link to={`/analysis/details/${analysis.id}`} style={{ fontSize: 12, fontWeight: 700, color: THEME.primary, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Details <ArrowRight size={14} />
                    </Link>
                  </div>
                )) : (
                  <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: 20, border: `1px dashed ${THEME.border}`, color: THEME.textSecondary, fontSize: 13 }}>
                    No recent analyses
                  </div>
                )}
              </div>
            </div>

            {/* PRIMARY ACTION */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: THEME.textSecondary, textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em' }}>Primary Action</h3>
              <Link to="/analysis" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 24px', background: `linear-gradient(135deg, ${THEME.primary}, #0f766e)`, borderRadius: 14, boxShadow: `0 4px 12px ${THEME.primary}40`, color: 'white' }} className="kpi-card">
                <Zap size={18} fill="white" />
                <span style={{ fontSize: 15, fontWeight: 600 }}>Launch AI Analysis</span>
                <ArrowRight size={18} />
              </Link>
            </div>

          </div>
          {/* ══ FIN COLONNE GAUCHE ══ */}

          {/* ══ COLONNE DROITE ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* DIGITAL TWIN */}
            {metrics?.totalAnalyses && metrics.totalAnalyses > 0 && (
              <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 20, padding: 24, color: 'white', boxShadow: '0 8px 32px rgba(102,126,234,0.3)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} />
                    Digital Twin
                  </h3>
                  <p style={{ fontSize: 12, opacity: 0.9, marginBottom: 16, lineHeight: 1.4 }}>
                    {isPremiumPlan ? 'Explore how your skin will evolve over the next 6 months' : 'Upgrade to PREMIUM to explore how your skin will evolve'}
                  </p>
                  <button 
                    onClick={() => {
                      if (isPremiumPlan && metrics?.latestAnalysisId) {
                        navigate(`/analysis/digital-twin/${metrics.latestAnalysisId}`);
                      } else if (!isPremiumPlan) {
                        navigate('/upgrade');
                      }
                    }}
                    disabled={!isPremiumPlan && !metrics?.latestAnalysisId}
                    style={{ 
                      width: '100%', 
                      background: (isPremiumPlan && metrics?.latestAnalysisId) || !isPremiumPlan ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', 
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: 'white',
                      padding: '10px 16px',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: ((isPremiumPlan && metrics?.latestAnalysisId) || !isPremiumPlan) ? 'pointer' : 'not-allowed',
                      opacity: ((isPremiumPlan && metrics?.latestAnalysisId) || !isPremiumPlan) ? 1 : 0.6,
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => { 
                      if ((isPremiumPlan && metrics?.latestAnalysisId) || !isPremiumPlan) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; 
                      }
                    }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.background = ((isPremiumPlan && metrics?.latestAnalysisId) || !isPremiumPlan) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'; 
                    }}
                  >
                    {isPremiumPlan ? (metrics?.latestAnalysisId ? 'View Future Skin →' : 'No analysis yet') : 'Upgrade to PREMIUM →'}
                  </button>
                </div>
              </div>
            )}

            {/* WEATHER */}
            <WeatherAdaptiveWidget />

            {/* RISK ALERTS (PREMIUM ONLY) */}
            {isPremiumPlan ? (
              <RiskAlerts 
                onRefresh={loadSkinMetrics}
                className="mt-6"
              />
            ) : (
              <div
                className="mt-6"
                style={{
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 20,
                  padding: 20,
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdfa 100%)',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: THEME.textPrimary }}>
                  Skin Risk Alerts
                </h3>
                <p style={{ marginTop: 8, marginBottom: 14, fontSize: 13, color: THEME.textSecondary }}>
                  This feature is available for PREMIUM plan users only.
                </p>
                <button
                  onClick={() => navigate('/upgrade')}
                  style={{
                    background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Upgrade to PREMIUM
                </button>
              </div>
            )}

           
            

          </div>
          {/* ══ FIN COLONNE DROITE ══ */}

        </div>
        {/* FIN GRID */}

      </main>
    </div>
  );
}
