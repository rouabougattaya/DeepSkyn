import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
    Camera, Sparkles, ArrowLeft, Zap, AlertCircle, GitCompare,
    CheckCircle, RefreshCw, Activity,
    BarChart2, Info, Waves, Flame, Microscope,
    Bandage, CircleDot, HeartPulse, Sprout, Leaf, Dice5,
    CircleCheck, AlertTriangle, BarChart3,
} from 'lucide-react';
import { aiAnalysisService } from '../services/aiAnalysisService';
import type { GlobalScoreResult, ConditionScore, UserSkinProfile } from '../types/aiAnalysis';
import { SkinProfileForm } from '../components/analysis/SkinProfileForm';

/* ─────────────────────────── Constants ─────────────────────────── */

const CONDITION_META: Record<string, {
    label: string;
    icon: any;
    color: string;
    bg: string;
    border: string;
    gradient: string;
    description: string;
}> = {
    'Acne': {
        label: 'Acné', icon: Flame, color: '#f43f5e',
        bg: 'rgba(244,63,94,0.05)', border: 'rgba(244,63,94,0.15)',
        gradient: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
        description: 'Inflammation folliculaire et sébum'
    },
    'Enlarged-Pores': {
        label: 'Pores dilatés', icon: Waves, color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.05)', border: 'rgba(139,92,246,0.15)',
        gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
        description: 'Pores visibles et accumulation de sébum'
    },
    'Atrophic Scars': {
        label: 'Cicatrices', icon: Bandage, color: '#64748b',
        bg: 'rgba(100,116,139,0.05)', border: 'rgba(100,116,139,0.15)',
        gradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        description: 'Dépressions cutanées post-inflammatoires'
    },
    'Skin Redness': {
        label: 'Rougeurs', icon: HeartPulse, color: '#ef4444',
        bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.15)',
        gradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        description: 'Érythème et irritation diffuse'
    },
    'Blackheads': {
        label: 'Points noirs', icon: CircleDot, color: '#1e293b',
        bg: 'rgba(30,41,59,0.05)', border: 'rgba(30,41,59,0.15)',
        gradient: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
        description: 'Comédons ouverts avec oxydation'
    },
    'Dark-Spots': {
        label: 'Taches brunes', icon: Sparkles, color: '#d97706',
        bg: 'rgba(217,119,6,0.05)', border: 'rgba(217,119,6,0.15)',
        gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        description: 'Hyperpigmentation post-inflammatoire'
    },
    'black_dots': {
        label: 'Micro-imperfections', icon: Microscope, color: '#0d9488',
        bg: 'rgba(13,148,136,0.05)', border: 'rgba(13,148,136,0.15)',
        gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        description: 'Formation de microcomédons'
    },
};

const TEST_SCENARIOS: {
    id: 'mild' | 'mixed' | 'severe' | 'random';
    label: string;
    Icon: LucideIcon;
    desc: string;
    color: string;
}[] = [
    { id: 'mild', label: 'Mild', Icon: Sprout, desc: 'A few minor imperfections', color: '#10b981' },
    { id: 'mixed', label: 'Mixed', Icon: Leaf, desc: 'Combination of various conditions', color: '#f59e0b' },
    { id: 'severe', label: 'Severe', Icon: Flame, desc: 'Multiple and intense conditions', color: '#ef4444' },
    { id: 'random', label: 'Random', Icon: Dice5, desc: 'Realistic random simulation', color: '#8b5cf6' },
];

function normalizeExternalUrl(url: unknown): string | null {
    if (typeof url !== 'string') return null
    const trimmed = url.trim()
    if (!trimmed || trimmed === '#') return null
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
    if (trimmed.startsWith('//')) return `https:${trimmed}`
    // Defensive fallback: if dataset returns "www..." or similar
    return `https://${trimmed}`
}

/* ─────────────────────── Helper Components ────────────────────── */

function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
    const r = 45;
    const circumference = 2 * Math.PI * r;
    const filled = ((100 - score) / 100) * circumference;
    const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Average' : 'To improve';

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background track */}
                <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                {/* Glow ring */}
                <circle
                    cx="50" cy="50" r={r} fill="none"
                    stroke={color} strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={filled}
                    strokeLinecap="round"
                    style={{
                        filter: `drop-shadow(0 0 6px ${color})`,
                        transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease'
                    }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
            }}>
                <span style={{ fontSize: size * 0.22, fontWeight: 800, color, lineHeight: 1 }}>
                    {Math.round(score)}
                </span>
                <span style={{ fontSize: size * 0.09, color: '#64748b', marginTop: 2 }}>
                    {label}
                </span>
            </div>
        </div>
    );
}

function ConditionBar({ condition }: { condition: ConditionScore }) {
    const meta = CONDITION_META[condition.type] || {
        label: condition.type, icon: Info, color: '#6b7280',
        bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)',
        gradient: '', description: ''
    };

    const scoreColor = condition.score >= 75 ? '#10b981' : condition.score >= 50 ? '#f59e0b' : '#ef4444';
    const Icon = meta.icon;

    return (
        <div className="skin-condition-bar" style={{
            background: meta.bg, border: `1px solid ${meta.border}`,
            borderRadius: 16, padding: '14px 18px',
            transition: 'transform 0.2s, box-shadow 0.2s'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'white', border: `1px solid ${meta.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Icon size={18} style={{ color: meta.color }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{meta.label}</div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>
                            {condition.count} détection{condition.count > 1 ? 's' : ''} · sévérité {(condition.severity * 100).toFixed(0)}%
                        </div>
                    </div>
                </div>
                <div style={{
                    fontSize: 22, fontWeight: 800, color: scoreColor,
                    textShadow: `0 0 12px ${scoreColor}60`
                }}>
                    {Math.round(condition.score)}
                </div>
            </div>

            {/* Progress bar */}
            <div style={{
                height: 6, background: '#e2e8f0',
                borderRadius: 99, overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%', width: `${condition.score}%`,
                    background: `linear-gradient(90deg, ${scoreColor}80, ${scoreColor})`,
                    borderRadius: 99,
                    boxShadow: `0 0 8px ${scoreColor}90`,
                    transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)'
                }} />
            </div>
        </div>
    );
}

/* ──────────────────────── Main Page ──────────────────────────── */

export default function SkinAnalysisPage() {
    const [result, setResult] = useState<GlobalScoreResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedScenario, setSelectedScenario] = useState<'mild' | 'mixed' | 'severe' | 'random'>('mixed');
    const [analysisCount, setAnalysisCount] = useState(0);
    const [scanPhase, setScanPhase] = useState<'idle' | 'capturing' | 'processing' | 'scoring' | 'done'>('idle');
    const [useLLM, setUseLLM] = useState(true);
    const [profile, setProfile] = useState<UserSkinProfile>({
        skinType: 'Combination',
        age: 25,
        gender: 'Female',
        concerns: []
    });

    useEffect(() => {
        // weights logic removed as per user request
    }, []);



    const runAnalysis = useCallback(async () => {
        setLoading(true);
        setError(null);
        setScanPhase('capturing');

        try {
            // Simulate progressive phases for UX
            await new Promise(r => setTimeout(r, 600));
            setScanPhase('processing');
            await new Promise(r => setTimeout(r, 800));
            setScanPhase('scoring');

            let analysisResult: GlobalScoreResult;

            if (useLLM) {
                analysisResult = await aiAnalysisService.analyzeUnified(profile);
            } else if (selectedScenario === 'random') {
                const randomResult = await aiAnalysisService.analyzeRandom(
                    Date.now() % 9999
                );
                analysisResult = randomResult.result;
            } else {
                analysisResult = await aiAnalysisService.analyzeTestCase(selectedScenario);
            }

            await new Promise(r => setTimeout(r, 400));
            setScanPhase('done');
            setResult(analysisResult);
            setAnalysisCount(c => c + 1);

            // Auto-scroll to recommendations after a short delay
            setTimeout(() => {
                const recSection = document.getElementById('recommendations-section');
                if (recSection) {
                    recSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 1000);
        } catch (err: any) {
            console.error('Analysis error:', err);
            setError(`Erreur d'analyse : ${err.message || 'Impossible de se connecter au serveur (port 3001).'}`);
            setScanPhase('idle');
        } finally {
            setLoading(false);
        }
    }, [selectedScenario, useLLM, profile]);



    const globalScoreColor = result
        ? result.globalScore >= 75 ? '#10b981' : result.globalScore >= 50 ? '#f59e0b' : '#ef4444'
        : '#0d9488';

    const scanLabels: Record<string, string> = {
        capturing: 'Capture de l\'image...',
        processing: 'Analyse multi-conditions par l\'IA...',
        scoring: 'Calcul du score composite expert...',
        done: 'Analyse terminée',
        idle: '',
    };

    return (
        <div className="skin-analysis-root">
            <style>{`
        .skin-analysis-root {
               min-height: 100vh;
        background: #f8fafc;
        color: #1e293b;
        font-family: 'Inter', system-ui, sans-serif;
        padding: 80px 16px 60px;  /* ← 80px en haut au lieu de 24px */
        margin-top: 0;
        }
        .glass-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
        }
        .scenario-btn {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          color: #1e293b;
        }
        .scenario-btn:hover {
          background: rgba(255,255,255,0.08);
          transform: translateY(-2px);
        }
        .scenario-btn.active {
          border-color: #0d9488;
          background: rgba(13,148,136,0.12);
          box-shadow: 0 0 20px rgba(13,148,136,0.2);
        }
        .analyze-btn {
          background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
          border: none;
          border-radius: 16px;
          padding: 16px 32px;
          color: white;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 8px 32px rgba(13,148,136,0.35);
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .analyze-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(13,148,136,0.5);
        }
        .analyze-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .skin-condition-bar:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
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
        .scan-line {
          position: absolute;
          left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #0d9488, transparent);
          animation: scan 1.5s ease-in-out infinite;
        }
        @keyframes scan {
          0% { top: 0; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .weight-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 99px;
          background: #e2e8f0;
          outline: none;
        }
        .weight-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: #0d9488;
          cursor: pointer;
          box-shadow: 0 0 0 3px rgba(13,148,136,0.2);
        }
        .tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 600;
        }
        .fade-in {
          animation: fadeIn 0.5s ease forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

            <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                {/* ── Header ── */}
                {/* ── Header ── */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 40
                }}>
                    {/* Boutons côte à côte */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 20,
                        width: '100%',
                        flexWrap: 'wrap'
                    }}>
                        <Link
                            to="/dashboard"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                padding: '10px 24px',
                                borderRadius: '30px',
                                fontSize: '15px',
                                fontWeight: '600',
                                textDecoration: 'none',
                                border: '1px solid #cbd5e1',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#e2e8f0';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#f1f5f9';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                            }}
                        >
                            <ArrowLeft size={18} /> Retour au tableau de bord
                        </Link>

                        <Link
                            to="/analysis/compare"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: '#0d9488',
                                color: 'white',
                                padding: '10px 24px',
                                borderRadius: '30px',
                                fontSize: '15px',
                                fontWeight: '600',
                                textDecoration: 'none',
                                boxShadow: '0 4px 12px rgba(13,148,136,0.4)',
                                border: '1px solid #0a7a70',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#0a7a70';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(13,148,136,0.5)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#0d9488';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,148,136,0.4)';
                            }}
                        >
                            <GitCompare size={18} /> Comparer deux analyses
                        </Link>
                    </div>

                    {/* Indicateur d'analyses (si résultat disponible) */}
                    {result && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <div className="pulse-dot" />
                            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600, backgroundColor: '#f0fdf4', padding: '4px 12px', borderRadius: '30px' }}>
                                Analyses effectuées : {analysisCount}
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Page Title ── */}
                <div style={{ marginBottom: 36, textAlign: 'center' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)',
                        borderRadius: 99, padding: '6px 14px', marginBottom: 16
                    }}>
                        <Sparkles size={14} style={{ color: '#0d9488' }} />
                        <span style={{ fontSize: 12, color: '#0d9488', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Moteur IA Multi-Conditions
                        </span>
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800,
                        color: '#0f172a',
                        marginBottom: 10, lineHeight: 1.1
                    }}>
                        Analyse de Peau
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
                        7 conditions analysées · Score composite intelligent · Expertise Dermatologique
                    </p>
                </div>

                {/* ── Main Grid ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 20
                }}>

                    {/* ── LEFT: Controls ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* LLM Toggle */}
                        <div className="glass-card" style={{ padding: '4px' }}>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setUseLLM(true)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${useLLM ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'
                                        }`}
                                >
                                    Analyse Réelle (LLM)
                                </button>
                                <button
                                    onClick={() => setUseLLM(false)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!useLLM ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'
                                        }`}
                                >
                                    Scénarios de Test
                                </button>
                            </div>
                        </div>

                        {/* Skin Profile Form (LLM Mode) */}
                        {useLLM && (
                            <div className="glass-card fade-in" style={{ padding: 24 }}>
                                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                                    Profil de Peau
                                </h2>
                                <SkinProfileForm profile={profile} setProfile={setProfile} disabled={loading} />
                            </div>
                        )}

                        {/* Scenario Selection (Test Mode) */}
                        {!useLLM && (
                            <div className="glass-card fade-in" style={{ padding: 24 }}>
                                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                                    Scénario de test
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {TEST_SCENARIOS.map(({ id, Icon, label, desc, color }) => (
                                        <button
                                            key={id}
                                            className={`scenario-btn ${selectedScenario === id ? 'active' : ''}`}
                                            onClick={() => setSelectedScenario(id as any)}
                                        >
                                            <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center' }}>
                                                <Icon size={22} strokeWidth={2} style={{ color }} />
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Camera Simulation */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                                Camera interface
                            </h2>
                            <div style={{
                                position: 'relative', background: '#f1f5f9',
                                borderRadius: 16, border: '1px solid #e2e8f0',
                                height: 180, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                {/* Corner brackets */}
                                {['tl', 'tr', 'bl', 'br'].map(c => (
                                    <div key={c} style={{
                                        position: 'absolute',
                                        ...(c.includes('t') ? { top: 12 } : { bottom: 12 }),
                                        ...(c.includes('l') ? { left: 12 } : { right: 12 }),
                                        width: 20, height: 20,
                                        borderTop: c.includes('t') ? '2px solid #0d9488' : 'none',
                                        borderBottom: c.includes('b') ? '2px solid #0d9488' : 'none',
                                        borderLeft: c.includes('l') ? '2px solid #0d9488' : 'none',
                                        borderRight: c.includes('r') ? '2px solid #0d9488' : 'none',
                                    }} />
                                ))}

                                {loading && <div className="scan-line" style={{ top: 0 }} />}

                                {loading ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{
                                            width: 56, height: 56, borderRadius: '50%',
                                            border: '3px solid rgba(13,148,136,0.2)',
                                            borderTop: '3px solid #0d9488',
                                            animation: 'spin 1s linear infinite',
                                            margin: '0 auto 12px'
                                        }} />
                                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                        <div style={{ color: '#0d9488', fontSize: 13, fontWeight: 600 }}>
                                            {scanLabels[scanPhase]}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                        <Camera size={32} style={{ margin: '0 auto 8px' }} />
                                        <div style={{ fontSize: 12 }}>Prêt pour l'analyse</div>
                                    </div>
                                )}
                            </div>
                        </div>



                        {/* Analyze Button */}
                        <button
                            className="analyze-btn"
                            onClick={runAnalysis}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                    {scanLabels[scanPhase]}
                                </>
                            ) : (
                                <>
                                    <Zap size={18} />
                                    Lancer l'analyse IA
                                </>
                            )}
                        </button>

                        {/* Error */}
                        {error && (
                            <div style={{
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: 12, padding: 14, display: 'flex', gap: 10, alignItems: 'flex-start'
                            }}>
                                <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                                <p style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>{error}</p>
                            </div>
                        )}
                    </div>

                    {/* ── RIGHT: Results ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {!result ? (
                            /* Empty state */
                            <div className="glass-card" style={{
                                padding: 48, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                minHeight: 400, textAlign: 'center', gap: 16
                            }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: '50%',
                                    background: 'rgba(13,148,136,0.08)',
                                    border: '1px solid rgba(13,148,136,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Activity size={32} style={{ color: '#0d9488' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: '#1e293b' }}>
                                        Aucune analyse effectuée
                                    </h3>
                                    <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                                        Lancez l'analyse réelle pour obtenir<br />votre score de santé cutanée.
                                    </p>
                                </div>

                                {/* Architecture info */}
                                <div style={{
                                    background: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.1)',
                                    borderRadius: 12, padding: 16, width: '100%'
                                }}>
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                                        Pipeline d'Analyse
                                    </div>
                                    {['Modèle IA Vision', 'Adapteur de détection', 'Agrégation des métriques', 'Calcul expert (7 conditions)'].map((step, i) => (
                                        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <div style={{
                                                width: 20, height: 20, borderRadius: '50%',
                                                background: '#f1f5f9', border: '1px solid #e2e8f0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 10, fontWeight: 700, color: '#0d9488', flexShrink: 0
                                            }}>
                                                {i + 1}
                                            </div>
                                            <span style={{ fontSize: 12, color: '#64748b' }}>{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Results */
                            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                                {/* Global Score Card */}
                                <div className="glass-card" style={{
                                    padding: 28,
                                    background: `linear-gradient(135deg, rgba(13,148,136,0.03) 0%, rgba(8,145,178,0.02) 100%)`,
                                    border: '1px solid rgba(13,148,136,0.15)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                            Score de santé cutanée
                                        </h2>
                                        <CheckCircle size={16} style={{ color: '#10b981' }} />
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                        <ScoreRing score={result.globalScore} size={130} />

                                        <div style={{ flex: 1 }}>
                                            {/* Best / Worst / Dominant */}
                                            {[
                                                { label: 'Meilleur', value: result.analysis.bestCondition, color: '#10b981', Icon: CircleCheck },
                                                { label: 'Point critique', value: result.analysis.worstCondition, color: '#ef4444', Icon: AlertTriangle },
                                                { label: 'Dominant', value: result.analysis.dominantCondition, color: '#f59e0b', Icon: BarChart3 },
                                            ].map(({ label, value, color, Icon }) => (
                                                <div key={label} style={{
                                                    display: 'flex', alignItems: 'center',
                                                    justifyContent: 'space-between', marginBottom: 10
                                                }}>
                                                    <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Icon size={14} style={{ color, flexShrink: 0 }} />
                                                        {label}
                                                    </span>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color }}>
                                                        {value
                                                            ? (CONDITION_META[value]?.label || value)
                                                            : 'N/A'}
                                                    </span>
                                                </div>
                                            ))}

                                            <div style={{
                                                marginTop: 12, paddingTop: 12,
                                                borderTop: '1px solid #f1f5f9',
                                                display: 'flex', alignItems: 'center', gap: 6
                                            }}>
                                                <BarChart2 size={12} style={{ color: '#94a3b8' }} />
                                                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                                    {result.totalDetections} détections analysées
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Condition Scores */}
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                                        Scores par condition
                                    </h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {result.conditionScores
                                            .sort((a, b) => a.score - b.score)
                                            .map(condition => (
                                                <ConditionBar key={condition.type} condition={condition} />
                                            ))
                                        }
                                    </div>
                                </div>

                                {/* Skin Conditions Legend */}
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                                        Interprétation clinique
                                    </h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {result.conditionScores.map(condition => {
                                            const meta = CONDITION_META[condition.type];
                                            if (!meta) return null;
                                            const severity = condition.score < 50 ? 'Sévère' : condition.score < 75 ? 'Modéré' : 'Contrôlé';
                                            const sevColor = condition.score < 50 ? '#ef4444' : condition.score < 75 ? '#f59e0b' : '#10b981';
                                            const Icon = meta.icon;

                                            return (
                                                <div key={condition.type} style={{
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    padding: '10px 12px', borderRadius: 10,
                                                    background: '#f8fafc',
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    <div style={{
                                                        width: 28, height: 28, borderRadius: 8,
                                                        background: 'white', border: '1px solid #e2e8f0',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <Icon size={14} style={{ color: meta.color }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{meta.label}</div>
                                                        <div style={{ fontSize: 11, color: '#64748b' }}>{meta.description}</div>
                                                    </div>
                                                    <span className="tag" style={{
                                                        background: `${sevColor}10`, color: sevColor,
                                                        border: `1px solid ${sevColor}20`
                                                    }}>
                                                        {severity}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Score interpretation guide */}
                                    <div style={{
                                        marginTop: 16, padding: 12, borderRadius: 10,
                                        background: 'rgba(13,148,136,0.05)',
                                        border: '1px solid rgba(13,148,136,0.1)',
                                        display: 'flex', gap: 8, alignItems: 'flex-start'
                                    }}>
                                        <Info size={14} style={{ color: '#0d9488', flexShrink: 0, marginTop: 1 }} />
                                        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                                            Score 0–100 : plus le score est <strong style={{ color: '#10b981' }}>élevé</strong>, meilleure est la condition.
                                            L'IA analyse vos préoccupations pour pondérer le score global.
                                        </p>
                                    </div>
                                </div>

                                {/* AI Summary */}
                                <div className="bg-[#0d9488] p-8 rounded-3xl shadow-xl shadow-teal-500/20 text-white relative overflow-hidden group">
                                    <Sparkles className="absolute -right-4 -top-4 w-24 h-24 opacity-10 group-hover:rotate-12 transition-transform" />
                                    <div className="relative z-10">
                                        <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80">
                                            <CheckCircle size={14} /> Sommaire de l'analyse
                                        </h3>
                                        <p className="text-lg font-medium leading-relaxed italic">
                                            "Votre peau montre des signes de vitalité. Maintenez votre routine actuelle pour préserver ces résultats."
                                        </p>
                                    </div>
                                </div>

                                {/* Product Recommendations */}
                                <div id="recommendations-section" className="glass-card fade-in" style={{ padding: 24, border: '2px solid #0d9488' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Sparkles className="text-teal-600" size={20} />
                                            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                                Tes Recommandations Skincare
                                            </h2>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {result.recommendations && result.recommendations.length > 0 && (
                                                <div
                                                    className="tag"
                                                    style={{
                                                        background: 'linear-gradient(135deg, rgba(13,148,136,0.10) 0%, rgba(8,145,178,0.06) 100%)',
                                                        color: '#0d9488',
                                                        border: '1px solid rgba(13,148,136,0.20)',
                                                        boxShadow: '0 6px 18px rgba(13,148,136,0.10)',
                                                    }}
                                                >
                                                    Recommandations personnalisées
                                                </div>
                                            )}
                                            <Link
                                                to="/routines"
                                                style={{
                                                    background: '#0d9488',
                                                    color: 'white',
                                                    padding: '8px 12px',
                                                    borderRadius: 10,
                                                    fontSize: 12,
                                                    fontWeight: 800,
                                                    textDecoration: 'none',
                                                    boxShadow: '0 10px 25px rgba(13,148,136,0.22)',
                                                    border: '1px solid rgba(10,122,112,0.35)',
                                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-1px)'
                                                    e.currentTarget.style.boxShadow = '0 14px 35px rgba(13,148,136,0.28)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)'
                                                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(13,148,136,0.22)'
                                                }}
                                            >
                                                Voir ta routine AM/PM
                                            </Link>
                                        </div>
                                    </div>

                                    {!result.recommendations || result.recommendations.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>
                                            <Info size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                                            <p>Chargement des produits depuis ta dataset...</p>
                                            <p style={{ fontSize: 12 }}>Assure-toi que `skincare_products_clean.csv` est bien dans `backend/data/`</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                            {result.recommendations.map((product, idx) => (
                                                <div key={idx} style={{
                                                    background: 'white',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: 16,
                                                    padding: 16,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 8,
                                                    transition: 'all 0.2s',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                                                }}>
                                                    <div style={{
                                                        fontSize: 10,
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        color: '#0d9488',
                                                        letterSpacing: '0.05em'
                                                    }}>
                                                        {product.type}
                                                    </div>
                                                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', flex: 1 }}>
                                                        {product.name}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                                        <span style={{ fontWeight: 800, color: '#0f172a' }}>£{product.price.toFixed(2)}</span>
                                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>Peau {product.skinType}</span>
                                                    </div>
                                                    {normalizeExternalUrl(product.url) ? (
                                                        <a
                                                            href={normalizeExternalUrl(product.url) as string}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                marginTop: 8,
                                                                textAlign: 'center',
                                                                background: '#0d9488',
                                                                borderRadius: 10,
                                                                padding: '8px 0',
                                                                fontSize: 12,
                                                                fontWeight: 700,
                                                                color: 'white',
                                                                textDecoration: 'none',
                                                                boxShadow: '0 4px 10px rgba(13,148,136,0.2)'
                                                            }}
                                                        >
                                                            Acheter
                                                        </a>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                marginTop: 8,
                                                                textAlign: 'center',
                                                                background: '#e2e8f0',
                                                                borderRadius: 10,
                                                                padding: '8px 0',
                                                                fontSize: 12,
                                                                fontWeight: 700,
                                                                color: '#94a3b8',
                                                                boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                                                            }}
                                                        >
                                                            Lien indisponible
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Raw Metrics Summary */}
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                                        Résumé des métriques
                                    </h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                        {[
                                            {
                                                label: 'Composite score',
                                                value: `${result.globalScore.toFixed(1)}/100`,
                                                icon: <Activity size={16} />,
                                                color: globalScoreColor
                                            },
                                            {
                                                label: 'Detections',
                                                value: result.totalDetections,
                                                icon: <BarChart2 size={16} />,
                                                color: '#8b5cf6'
                                            },
                                            {
                                                label: 'Conditions',
                                                value: result.conditionScores.length,
                                                icon: <Sparkles size={16} />,
                                                color: '#0d9488'
                                            },
                                        ].map(m => (
                                            <div key={m.label} style={{
                                                padding: 14, borderRadius: 12,
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ color: m.color, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                                                    {m.icon}
                                                </div>
                                                <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.value}</div>
                                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{m.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        className="analyze-btn"
                                        onClick={runAnalysis}
                                        disabled={loading}
                                        style={{ marginTop: 16, background: 'rgba(255,255,255,0.05)', boxShadow: 'none', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' }}
                                    >
                                        <RefreshCw size={16} />
                                        Restart analysis
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
