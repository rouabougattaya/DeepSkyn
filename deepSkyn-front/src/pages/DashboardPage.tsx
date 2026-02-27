import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getUser } from '@/lib/authSession';
import {
  Brain, Camera, Shield, History, Sparkles, RefreshCw, LogOut,
  TrendingUp, TrendingDown, Minus, BarChart2, Activity,
  Star, AlertTriangle, CheckCircle, Zap, ArrowRight, LayoutDashboard,
  Settings, Bell, Search, User as UserIcon
} from 'lucide-react';
import { simpleAuthService } from '@/services/authService-simple';
import AIStatusBadge from '@/components/AIStatusBadge';
import { dashboardService } from '@/services/dashboardService';
import type { DashboardMetrics, TrendData, MonthlyData } from '@/types/dashboard';

/* ─────────────────────── DESIGN SYSTEM ────────────────── */
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

/* ─────────────────────── REUSABLE COMPONENTS ────────────────── */

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
        <circle
          cx={w}
          cy={h - ((data[data.length - 1] - min) / range) * h}
          r="3" fill={color}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      )}
    </svg>
  );
}

function KPIMetricCard({
  title, value, unit = '', trend, icon, color, sparkData, subtitle
}: {
  title: string;
  value: number | string;
  unit?: string;
  trend?: { direction: 'up' | 'down' | 'stable'; percentage: number };
  icon: React.ReactNode;
  color: string;
  sparkData?: number[];
  subtitle?: string;
}) {
  const trendColor = trend?.direction === 'up' ? '#10b981' : trend?.direction === 'down' ? '#ef4444' : '#64748b';
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;

  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${THEME.border}`,
      borderRadius: 20,
      padding: '24px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden',
    }} className="kpi-card">
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: color, borderRadius: '50%', opacity: 0.05, filter: 'blur(24px)' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${trendColor}10`, padding: '4px 8px', borderRadius: 20 }}>
            <TrendIcon size={12} style={{ color: trendColor }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>
              {trend.direction === 'up' ? '+' : ''}{trend.percentage.toFixed(1)}%
            </span>
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

function TrendPill({ trend }: { trend: TrendData }) {
  const isUp = trend.direction === 'up';
  const isDown = trend.direction === 'down';
  const color = isUp ? '#10b981' : isDown ? '#ef4444' : '#64748b';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <div style={{ background: '#ffffff', border: `1px solid ${THEME.border}`, borderRadius: 16, padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{trend.period}</span>
        <Icon size={14} style={{ color }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color }}>{trend.current.toFixed(1)}</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>vs {trend.previous.toFixed(1)}</span>
      </div>
    </div>
  );
}

function MiniBarChart({ data }: { data: MonthlyData[] }) {
  const filtered = data.filter(d => d.analysisCount > 0).slice(-8);
  if (filtered.length === 0) return <div style={{ textAlign: 'center', padding: 32, color: THEME.textSecondary, fontSize: 13 }}>Pas assez de données</div>;
  const maxScore = Math.max(...filtered.map(d => d.averageScore), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
      {filtered.map((d, i) => {
        const heightPct = (d.averageScore / maxScore) * 100;
        const color = d.averageScore >= 75 ? '#10b981' : d.averageScore >= 50 ? '#f59e0b' : '#ef4444';
        return (
          <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 10, color: THEME.textSecondary, fontWeight: 600 }}>{Math.round(d.averageScore)}</div>
            <div style={{
              width: '100%', height: `${heightPct}%`,
              background: `linear-gradient(180deg, ${color}, ${color}40)`,
              borderRadius: '6px 6px 0 0', minHeight: 4,
              transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)',
              transitionDelay: `${i * 0.1}s`
            }} />
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>{new Date(d.month + '-01').toLocaleDateString('fr-FR', { month: 'short' })}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────── MAIN COMPONENT ──────────────────── */

export default function ProfessionalDashboard() {
  const [user, setUser] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      const currentUser = getUser();
      if (!currentUser) { navigate('/auth/login'); return; }
      setUser(currentUser);
      setAiStatus({ verified: currentUser.aiVerified || false, score: currentUser.aiScore || 0 });
      setLoading(false);
    };
    loadUserData();
  }, [navigate]);

  const loadSkinMetrics = async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const [m, t, mon] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getTrends(),
        dashboardService.getMonthlyData(6),
      ]);
      setMetrics(m);
      setTrends(t);
      setMonthly(mon);
    } catch {
      setMetricsError('Données indisponibles (Backend déconnecté)');
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) loadSkinMetrics();
  }, [loading]);

  const handleRefreshAI = async () => {
    setLoading(true);
    try {
      const res = await simpleAuthService.refreshAIVerification();
      setAiStatus({ verified: res.verified, score: res.score });
      setUser(getUser());
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: THEME.background }}>
      <RefreshCw size={40} className="animate-spin" style={{ color: THEME.primary }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: THEME.background, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
        .sidebar-item:hover { background: ${THEME.greenSoft}; color: ${THEME.primary}; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: '240px', background: THEME.surface, borderRight: `1px solid ${THEME.border}`, position: 'fixed', top: '64px', height: 'calc(100vh - 64px)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>Menu Principal</div>
          <SidebarItem icon={LayoutDashboard} label="Vue d'ensemble" active={location.pathname === '/dashboard'} onClick={() => navigate('/dashboard')} />
          <SidebarItem icon={Camera} label="Analyse IA" onClick={() => navigate('/ai-demo')} />
          <SidebarItem icon={History} label="Archives médicales" onClick={() => navigate('/analysis')} />
          <SidebarItem icon={Shield} label="Sécurité & IPs" onClick={() => navigate('/security')} />

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '32px 0 24px' }}>Système</div>
          <SidebarItem icon={UserIcon} label="Mon Profil" onClick={() => navigate('/profile')} />
          <SidebarItem icon={Shield} label="Sécurité" onClick={() => navigate('/security-history')} />
          <SidebarItem icon={Settings} label="Paramètres" onClick={() => navigate('/settings')} />
        </div>

        <div style={{ marginTop: 'auto', padding: '24px', borderTop: `1px solid ${THEME.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: THEME.greenSoft, display: 'grid', placeItems: 'center', fontWeight: 700, color: THEME.primary, border: `1px solid ${THEME.primary}20` }}>
              {user?.firstName?.charAt(0) || user?.name?.charAt(0) || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.firstName || user?.name || 'Utilisateur'}</div>
              <div style={{ fontSize: 12, color: THEME.textSecondary }}>Plan Premium</div>
            </div>
          </div>
          <button onClick={async () => { await simpleAuthService.logout(); navigate('/auth/login'); }} style={{ width: '100%', padding: '10px', borderRadius: 12, border: `1px solid ${THEME.border}`, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#ef4444' }}>
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ marginLeft: '240px', flex: 1, marginTop: '64px', padding: '40px' }}>

        {/* Header Hero */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: THEME.textPrimary, letterSpacing: '-0.02em', marginBottom: 8 }}>
              Bonjour, <span style={{ color: THEME.primary }}>{user?.firstName || user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p style={{ color: THEME.textSecondary, fontSize: 16 }}>Voici l'état actuel de votre santé cutanée.</p>
          </div>
          <button onClick={handleRefreshAI} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: THEME.surface, border: `1px solid ${THEME.border}`, fontWeight: 600, fontSize: 14, color: THEME.textPrimary, cursor: 'pointer', transition: 'all 0.2s' }}>
            <RefreshCw size={16} /> Actualiser les données IA
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* KPI ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              <KPIMetricCard
                title="Score moyen"
                value={metrics?.averageScore ?? '—'}
                unit="/100"
                trend={metrics ? { direction: metrics.trendDirection, percentage: metrics.trendPercentage } : undefined}
                icon={<BarChart2 size={24} />}
                color="#0d9488"
                sparkData={monthly.filter(m => m.analysisCount > 0).map(m => m.averageScore).slice(-5)}
                subtitle={metrics ? (metrics.averageScore >= 75 ? 'Optimal' : 'À surveiller') : 'Prêt pour analyse'}
              />
              <KPIMetricCard
                title="Analyses totales"
                value={metrics?.totalAnalyses ?? '0'}
                icon={<Activity size={24} />}
                color="#8b5cf6"
                subtitle="Derniers 30 jours"
              />
            </div>



            {/* SINGLE PROMINENT ACTION */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: THEME.textSecondary, textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em' }}>Action Principale</h3>
              <Link to="/ai-demo" style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '14px 24px',
                background: `linear-gradient(135deg, ${THEME.primary}, #0f766e)`,
                borderRadius: 14,
                boxShadow: `0 4px 12px ${THEME.primary}40`,
                transition: 'all 0.3s ease',
                color: 'white'
              }} className="kpi-card">
                <Zap size={18} fill="white" />
                <span style={{ fontSize: 15, fontWeight: 600 }}>Lancer l'Analyse IA</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* STATUS WIDGET */}
            <div style={{ background: THEME.surface, borderRadius: 24, padding: 24, border: `1px solid ${THEME.border}` }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: THEME.textSecondary, textTransform: 'uppercase', marginBottom: 16 }}>Vérification IA</h4>
              <AIStatusBadge verified={aiStatus?.verified} score={aiStatus?.score} compact={false} />

              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <StatusRow label="Email" value={user?.email} icon={<Search size={14} />} />
                <StatusRow label="Sécurité" value="Chiffrement AES-256" icon={<Shield size={14} />} />
              </div>
            </div>



            {/* AD BANNER */}
            <div style={{ background: `linear-gradient(135deg, ${THEME.primary}, #0d9488)`, borderRadius: 24, padding: 24, color: 'white', position: 'relative', overflow: 'hidden' }}>
              <Brain size={120} style={{ position: 'absolute', right: -30, bottom: -30, opacity: 0.1 }} />
              <h4 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>DeepSkyn Pro</h4>
              <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5, marginBottom: 20 }}>Accédez à des rapports cliniques détaillés et des conseils personnalisés.</p>
              <button style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>En savoir plus</button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

/* ──────────────────────── SUB-COMPONENTS ──────────────────── */

function SidebarItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <div onClick={onClick} className="sidebar-item" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
      cursor: 'pointer', marginBottom: 4, transition: 'all 0.2s',
      background: active ? THEME.greenSoft : 'transparent',
      color: active ? THEME.primary : THEME.textSecondary,
      fontWeight: active ? 700 : 500,
      fontSize: 14,
    }}>
      <Icon size={20} />
      <span>{label}</span>
      {active && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: THEME.primary }} />}
    </div>
  );
}

function QuickAction({ icon, label, to, color }: any) {
  return (
    <Link to={to} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16, background: '#ffffff', borderRadius: 16, border: `1px solid ${THEME.border}`, transition: 'all 0.2s' }} className="kpi-card">
      <div style={{ color }}>{icon}</div>
      <span style={{ fontSize: 12, fontWeight: 600, color: THEME.textPrimary }}>{label}</span>
    </Link>
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