import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Camera, Sparkles, ArrowLeft, Zap, AlertCircle, GitCompare,
    CheckCircle, RefreshCw, ChevronRight, Activity,
    TrendingUp, TrendingDown, Minus, BarChart2, Info
} from 'lucide-react';
import { aiAnalysisService } from '../services/aiAnalysisService';
import type { GlobalScoreResult, ConditionWeights, ConditionScore } from '../types/aiAnalysis';

/* ─────────────────────────── Constants ─────────────────────────── */

const CONDITION_META: Record<string, {
    label: string;
    emoji: string;
    color: string;
    bg: string;
    border: string;
    gradient: string;
    description: string;
}> = {
    'Acne': {
        label: 'Acné', emoji: '🔴', color: '#ef4444',
        bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)',
        gradient: 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)',
        description: 'Inflammation folliculaire avec production de sébum'
    },
    'Enlarged-Pores': {
        label: 'Pores dilatés', emoji: '⚪', color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)',
        gradient: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
        description: 'Pores visibles avec accumulation de sébum'
    },
    'Atrophic Scars': {
        label: 'Cicatrices atrophiques', emoji: '🟤', color: '#d97706',
        bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.25)',
        gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        description: 'Dépressions cutanées post-inflammatoires'
    },
    'Skin Redness': {
        label: 'Rougeurs', emoji: '🌹', color: '#f43f5e',
        bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.25)',
        gradient: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
        description: 'Érythème et irritation cutanée diffuse'
    },
    'Blackheads': {
        label: 'Points noirs', emoji: '⚫', color: '#374151',
        bg: 'rgba(55,65,81,0.08)', border: 'rgba(55,65,81,0.25)',
        gradient: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
        description: 'Comédons ouverts avec oxydation du sébum'
    },
    'Dark-Spots': {
        label: 'Taches brunes', emoji: '🟡', color: '#ca8a04',
        bg: 'rgba(202,138,4,0.08)', border: 'rgba(202,138,4,0.25)',
        gradient: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
        description: 'Hyperpigmentation post-inflammatoire ou solaire'
    },
    'black_dots': {
        label: 'Points sombres', emoji: '🔵', color: '#0891b2',
        bg: 'rgba(8,145,178,0.08)', border: 'rgba(8,145,178,0.25)',
        gradient: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
        description: 'Microcomédons en formation'
    },
};

const TEST_SCENARIOS = [
    { id: 'mild', label: 'Léger', icon: '🌱', desc: 'Quelques imperfections mineures', color: '#10b981' },
    { id: 'mixed', label: 'Mixte', icon: '🌿', desc: 'Combinaison de conditions variées', color: '#f59e0b' },
    { id: 'severe', label: 'Sévère', icon: '🔥', desc: 'Conditions multiples et intenses', color: '#ef4444' },
    { id: 'random', label: 'Aléatoire', icon: '🎲', desc: 'Simulation aléatoire réaliste', color: '#8b5cf6' },
];

/* ─────────────────────── Helper Components ────────────────────── */

function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
    const r = 45;
    const circumference = 2 * Math.PI * r;
    const filled = ((100 - score) / 100) * circumference;
    const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Moyen' : 'À améliorer';

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
        label: condition.type, emoji: '🔹', color: '#6b7280',
        bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)',
        gradient: '', description: ''
    };

    const scoreColor = condition.score >= 75 ? '#10b981' : condition.score >= 50 ? '#f59e0b' : '#ef4444';

    return (
        <div className="skin-condition-bar" style={{
            background: meta.bg, border: `1px solid ${meta.border}`,
            borderRadius: 16, padding: '14px 18px',
            transition: 'transform 0.2s, box-shadow 0.2s'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{meta.emoji}</span>
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
    const [weights, setWeights] = useState<Partial<ConditionWeights>>({});
    const [defaultWeights, setDefaultWeights] = useState<ConditionWeights | null>(null);
    const [showWeights, setShowWeights] = useState(false);
    const [analysisCount, setAnalysisCount] = useState(0);
    const [scanPhase, setScanPhase] = useState<'idle' | 'capturing' | 'processing' | 'scoring' | 'done'>('idle');

    useEffect(() => {
        loadDefaultWeights();
    }, []);

    const loadDefaultWeights = async () => {
        try {
            const w = await aiAnalysisService.getDefaultWeights();
            setDefaultWeights(w);
            setWeights(w);
        } catch {
            // Fallback weights if backend not available — use demo mode
            const fallback: ConditionWeights = {
                acne: 25, pores: 15, scars: 20,
                redness: 15, blackheads: 10, darkSpots: 10, blackDots: 5
            };
            setDefaultWeights(fallback);
            setWeights(fallback);
        }
    };

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

            if (selectedScenario === 'random') {
                const randomResult = await aiAnalysisService.analyzeRandom(
                    Date.now() % 9999,
                    weights
                );
                analysisResult = randomResult.result;
            } else {
                analysisResult = await aiAnalysisService.analyzeTestCase(selectedScenario, weights);
            }

            await new Promise(r => setTimeout(r, 400));
            setScanPhase('done');
            setResult(analysisResult);
            setAnalysisCount(c => c + 1);
        } catch (err: any) {
            setError('Connexion au backend IA impossible. Vérifiez que le serveur tourne sur le port 3001.');
            setScanPhase('idle');
        } finally {
            setLoading(false);
        }
    }, [selectedScenario, weights]);

    const handleWeightChange = (key: keyof ConditionWeights, value: string) => {
        const num = Math.max(0, Math.min(100, parseFloat(value) || 0));
        setWeights(prev => ({ ...prev, [key]: num }));
    };

    const globalScoreColor = result
        ? result.globalScore >= 75 ? '#10b981' : result.globalScore >= 50 ? '#f59e0b' : '#ef4444'
        : '#0d9488';

    const scanLabels: Record<string, string> = {
        capturing: 'Capture de l\'image...',
        processing: 'Analyse multi-conditionnelle IA...',
        scoring: 'Calcul du score composite...',
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
            <ArrowLeft size={18} /> Retour au dashboard
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
                            Multi-Condition AI Engine
                        </span>
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800,
                        color: '#0f172a',
                        marginBottom: 10, lineHeight: 1.1
                    }}>
                        Skin Analysis
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
                        7 conditions analysées simultanément · Score composite intelligent · Architecture SaaS
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

                        {/* Scenario Selection */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                                Scénario de test
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {TEST_SCENARIOS.map(s => (
                                    <button
                                        key={s.id}
                                        className={`scenario-btn ${selectedScenario === s.id ? 'active' : ''}`}
                                        onClick={() => setSelectedScenario(s.id as any)}
                                    >
                                        <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Camera Simulation */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                                Interface caméra
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
                                        <div style={{ fontSize: 12 }}>Prêt à analyser</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Weights Panel */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <button
                                onClick={() => setShowWeights(!showWeights)}
                                style={{
                                    width: '100%', background: 'none', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    cursor: 'pointer', marginBottom: showWeights ? 16 : 0
                                }}
                            >
                                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    Pondérations
                                </h2>
                                <ChevronRight size={16} style={{
                                    color: '#94a3b8',
                                    transform: showWeights ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                }} />
                            </button>

                            {showWeights && defaultWeights && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {Object.entries(defaultWeights).map(([key]) => {
                                        const conditionKey = {
                                            acne: 'Acne', pores: 'Enlarged-Pores', scars: 'Atrophic Scars',
                                            redness: 'Skin Redness', blackheads: 'Blackheads',
                                            darkSpots: 'Dark-Spots', blackDots: 'black_dots'
                                        }[key];
                                        const meta = conditionKey ? CONDITION_META[conditionKey] : null;
                                        const val = weights[key as keyof ConditionWeights] || 0;

                                        return (
                                            <div key={key}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <span style={{ fontSize: 12, color: 'rgba(241,245,249,0.6)', fontWeight: 600 }}>
                                                        {meta?.label || key}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: meta?.color || '#0d9488', fontWeight: 700 }}>
                                                        {val}%
                                                    </span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="50"
                                                    value={val}
                                                    onChange={e => handleWeightChange(key as keyof ConditionWeights, e.target.value)}
                                                    className="weight-slider"
                                                    style={{
                                                        background: `linear-gradient(90deg, ${meta?.color || '#0d9488'} 0%, ${meta?.color || '#0d9488'} ${val * 2}%, rgba(255,255,255,0.1) ${val * 2}%, rgba(255,255,255,0.1) 100%)`
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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
                                        Sélectionnez un scénario et lancez l'analyse<br />pour voir les résultats multi-conditions.
                                    </p>
                                </div>

                                {/* Architecture info */}
                                <div style={{
                                    background: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.1)',
                                    borderRadius: 12, padding: 16, width: '100%'
                                }}>
                                    <div style={{ fontSize: 11, color: 'rgba(241,245,249,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                                        Pipeline Engine
                                    </div>
                                    {['AI Model (YOLO)', 'Detection Adapter', 'Metric Aggregation', 'Scoring Engine (7 conditions)'].map((step, i) => (
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
                                            Score global de santé cutanée
                                        </h2>
                                        <CheckCircle size={16} style={{ color: '#10b981' }} />
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                        <ScoreRing score={result.globalScore} size={130} />

                                        <div style={{ flex: 1 }}>
                                            {/* Best / Worst / Dominant */}
                                            {[
                                                { label: 'Meilleure', value: result.analysis.bestCondition, color: '#10b981', icon: '✅' },
                                                { label: 'Pire', value: result.analysis.worstCondition, color: '#ef4444', icon: '⚠️' },
                                                { label: 'Dominante', value: result.analysis.dominantCondition, color: '#f59e0b', icon: '📊' },
                                            ].map(item => (
                                                <div key={item.label} style={{
                                                    display: 'flex', alignItems: 'center',
                                                    justifyContent: 'space-between', marginBottom: 10
                                                }}>
                                                    <span style={{ fontSize: 12, color: '#64748b' }}>
                                                        {item.icon} {item.label}
                                                    </span>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>
                                                        {item.value
                                                            ? (CONDITION_META[item.value]?.label || item.value)
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

                                            return (
                                                <div key={condition.type} style={{
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    padding: '10px 12px', borderRadius: 10,
                                                    background: '#f8fafc',
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    <span style={{ fontSize: 16 }}>{meta.emoji}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{meta.label}</div>
                                                        <div style={{ fontSize: 11, color: '#64748b' }}>{meta.description}</div>
                                                    </div>
                                                    <span className="tag" style={{
                                                        background: `${sevColor}18`, color: sevColor,
                                                        border: `1px solid ${sevColor}30`
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
                                            Le score global est une moyenne <strong style={{ color: '#1e293b' }}>pondérée</strong> de toutes les conditions.
                                        </p>
                                    </div>
                                </div>

                                {/* Raw Metrics Summary */}
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                                        Résumé des métriques
                                    </h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                        {[
                                            {
                                                label: 'Score composite',
                                                value: `${result.globalScore.toFixed(1)}/100`,
                                                icon: <Activity size={16} />,
                                                color: globalScoreColor
                                            },
                                            {
                                                label: 'Détections',
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
                                        Relancer l'analyse
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
