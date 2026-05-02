import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUser, authFetch } from '@/lib/authSession';
import {
  TrendingUp, BarChart2, Activity,
  Zap, ArrowRight, Lock, Brain, RefreshCw, Star, Smartphone, Calendar, Sparkles
} from 'lucide-react';
import { dashboardService } from '@/services/dashboardService';
import { skinAgeInsightsService, type SkinAgeInsightResponse } from '@/services/skinAgeInsightsService';
import SkinAgeInsightCard from '@/components/insights/SkinAgeInsightCard';
import type { DashboardMetrics, MonthlyData } from '@/types/dashboard';
import { WeatherAdaptiveWidget } from '@/components/dashboard/WeatherAdaptiveWidget';
import { RiskAlerts } from '@/components/dashboard/RiskAlerts';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Medical Grade Metric Card
function TechnicalStat({ title, value, unit, icon, color, trend }: any) {
  return (
    <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6 transition-all hover:scale-[1.02] shadow-sm">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">{title}</div>
      <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
        {value}
        {unit && <span className="text-xs font-bold text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

export default function ProfessionalDashboard() {
  const { t } = useTranslation();

  const [, setUser] = useState<any>(null);
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
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Activity size={40} className="text-teal-600 dark:text-teal-400 animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
          {t('dashboard.sync_data', { defaultValue: 'Synchronizing clinical data...' })}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300">
      <main className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12">

        {/* TOP BAR: IDENTITY & GLOBAL STATUS */}
        <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{t('dashboard.diagnostic_mode')}</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              DeepSkyn <span className="text-teal-700 font-medium">{t('dashboard.clinical_tag', { defaultValue: 'Clinical' })}</span>
            </h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              aria-label={t('dashboard.sync_profile')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 font-bold text-xs text-slate-700 hover:shadow-md transition-all active:scale-95"
            >
              <RefreshCw size={14} /> {t('dashboard.sync_profile')}
            </button>
            <Link
              to="/analysis"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 text-white font-black text-sm shadow-lg shadow-teal-600/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Zap size={16} fill="currentColor" /> {t('dashboard.launch_ai')}
            </Link>
          </div>
        </header>

        {/* ANALYTIC SUMMARY ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <TechnicalStat title={t('dashboard.metrics.health')} value={metrics?.averageScore?.toFixed(1) ?? '—'} unit="/100" icon={<Activity size={20} />} color="#0d9488" trend={metrics?.trendPercentage ?? 0} />
          <TechnicalStat title={t('dashboard.metrics.peak')} value={metrics?.bestScore ?? '—'} unit="/100" icon={<TrendingUp size={20} />} color="#10b981" />
          <TechnicalStat title={t('dashboard.metrics.count')} value={metrics?.totalAnalyses ?? '0'} icon={<BarChart2 size={20} />} color="#6366f1" />
          <TechnicalStat title={t('dashboard.metrics.tier')} value={currentPlan} icon={<Star size={20} />} color="#f59e0b" />
        </div>

        {/* PRIMARY DIAGNOSTIC GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: DEEP DIAGNOSTICS */}
          <div className="lg:col-span-2 space-y-8">

            {/* AI DIAGNOSTIC PANEL */}
            <div className="relative bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-1 bg-teal-600 rounded-t-3xl" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100">
                    <Brain size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-tight">{t('dashboard.ai_intelligence', { defaultValue: 'Clinical AI Intelligence' })}</h2>
                    <p className="text-xs font-semibold text-slate-700">{t('dashboard.neural_markers', { defaultValue: 'Neural-network derived skin markers' })}</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-teal-50 text-[10px] font-black text-teal-600 uppercase tracking-widest rounded-lg border border-teal-100">
                  {t('dashboard.live_stream', { defaultValue: 'Live Stream Active' })}
                </div>
              </div>

              {isPro ? (
                <SkinAgeInsightCard insight={skinAgeInsight} loading={skinAgeLoading} />
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-12 px-6 text-center">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50 text-slate-400">
                    <Lock size={32} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">{t('dashboard.diagnostic_restricted', { defaultValue: 'Diagnostic Insight Restricted' })}</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
                    {t('dashboard.pro_engine_desc', { defaultValue: 'The Professional Engine provides deep-layer analysis of skin age markers and clinical routine adjustments.' })}
                  </p>
                  <Link
                    to="/upgrade"
                    className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 hover:scale-105 transition-all"
                  >
                    {t('dashboard.activate_pro', { defaultValue: 'Activate Pro Engine' })} <ArrowRight size={18} />
                  </Link>
                </div>
              )}
            </div>

            {/* PERFORMANCE TRAJECTORY */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-3xl" />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">{t('dashboard.health_trajectory', { defaultValue: 'Health Trajectory' })}</h3>
                  <p className="text-xs font-semibold text-slate-600 mt-1">{t('dashboard.trajectory_desc', { defaultValue: 'Longitudinal tracking of clinical skin scores' })}</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <div className="w-2.5 h-2.5 rounded-sm bg-teal-600" /> {t('dashboard.aggregate')}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <div className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> {t('dashboard.tolerance')}
                  </div>
                </div>
              </div>

              <div className="h-[340px] w-full">
                {monthly.length > 0 ? (
                  <Line
                    data={{
                      labels: monthly.map(m => m.month),
                      datasets: [{
                        label: t('dashboard.score_label', { defaultValue: 'Score' }),
                        data: monthly.map(m => m.averageScore),
                        borderColor: '#0d9488',
                        backgroundColor: 'rgba(13, 148, 136, 0.05)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#0d9488',
                        pointBorderWidth: 2,
                        borderWidth: 3
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: '#fff',
                          titleColor: '#1e293b',
                          bodyColor: '#64748b',
                          borderColor: '#e2e8f0',
                          borderWidth: 1,
                          padding: 12,
                          cornerRadius: 12,
                          displayColors: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          grid: { color: 'rgba(226, 232, 240, 0.8)', lineWidth: 1 },
                          ticks: { color: '#64748b', font: { size: 10, weight: 700 }, padding: 8 }
                        },
                        x: {
                          grid: { display: false },
                          ticks: { color: '#64748b', font: { size: 10, weight: 700 }, padding: 8 }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Activity size={40} className="opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">{t('dashboard.baseline_required', { defaultValue: 'Diagnostic baseline required for trend analysis.' })}</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT: CLINICAL TOOLS & ENVIRONMENTS */}
          <div className="space-y-8">

            {/* DIGITAL TWIN - CLINICAL STYLE */}
            <div className="bg-gradient-to-br from-teal-50 to-white border border-teal-100 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles size={18} className="text-teal-600" />
                <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{t('dashboard.predictive_modeling', { defaultValue: 'Predictive Modeling' })}</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">{t('dashboard.digital_twin', { defaultValue: 'Digital Twin Simulation' })}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-8">
                {t('dashboard.digital_twin_desc', { defaultValue: 'Calculate biological skin age trajectory based on your current routine and environmental exposure markers.' })}
              </p>
              <button
                onClick={() => navigate(isPremiumPlan ? '/digital-twin' : '/upgrade')}
                className="w-full py-4 rounded-xl bg-teal-600 text-white font-black text-sm shadow-lg shadow-teal-600/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                {isPremiumPlan ? t('dashboard.start_simulation', { defaultValue: 'Start Simulation' }) : t('dashboard.activate_premium', { defaultValue: 'Activate Premium Modeling' })}
              </button>
            </div>

            {/* HEALTH MONITORING (RISK ALERTS) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h4 className="text-[11px] font-black text-slate-900 mb-5 uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-rose-500" />
                {t('dashboard.active_monitoring', { defaultValue: 'Active Monitoring' })}
              </h4>
              {isPremiumPlan ? (
                <RiskAlerts />
              ) : (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <Lock size={18} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-700">{t('dashboard.premium_risk_disabled', { defaultValue: 'Premium Risk Detection Disabled' })}</span>
                </div>
              )}
            </div>

            {/* ENVIRONMENTAL CONTEXT */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">{t('dashboard.env_context', { defaultValue: 'Environmental Context' })}</h4>
              <WeatherAdaptiveWidget />
            </div>

            {/* CLINICAL NAVIGATION */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">{t('dashboard.management', { defaultValue: 'Management' })}</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t('dashboard.nav.sessions', { defaultValue: 'Sessions' }), icon: <Smartphone size={18} />, path: '/sessions' },
                  { label: t('dashboard.nav.routines', { defaultValue: 'Routines' }), icon: <Calendar size={18} />, path: '/routines' },
                ].map(item => (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 hover:border-teal-600 hover:shadow-md transition-all active:scale-95 group"
                  >
                    <div className="text-teal-600 group-hover:scale-110 transition-transform">{item.icon}</div>
                    <span className="text-xs font-bold">{item.label}</span>
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
