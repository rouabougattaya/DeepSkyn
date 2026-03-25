import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
    Sparkles, ArrowLeft, Zap, AlertCircle, GitCompare,
    CheckCircle, RefreshCw, Activity,
    BarChart2, Info, Waves, Flame, Microscope,
    Bandage, CircleDot, HeartPulse,
    CircleCheck, AlertTriangle, BarChart3,
    Upload, X, Download, Printer, Volume2, VolumeX,
} from 'lucide-react';
import { aiAnalysisService } from '../services/aiAnalysisService';
import type { GlobalScoreResult, ConditionScore, UserSkinProfile } from '../types/aiAnalysis';
import { SkinProfileForm } from '../components/analysis/SkinProfileForm';
import { DEFAULT_QUESTIONNAIRE, type SkinQuestionnaireData } from '../types/skinQuestionnaire';

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

const BLEND_LABELS: Record<string, { label: string; helper: string }> = {
    'Acne': { label: 'Acné', helper: 'Fusion photo + questionnaire' },
    'Blackheads': { label: 'Points noirs', helper: 'Visuel + auto-évaluation' },
    'Enlarged-Pores': { label: 'Pores', helper: 'Mix AI + ressenti' },
    'Skin Redness': { label: 'Rougeurs', helper: 'Observation + vécu' },
};


function normalizeExternalUrl(url: unknown): string | null {
    if (typeof url !== 'string') return null
    const trimmed = url.trim()
    if (!trimmed || trimmed === '#') return null
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
    if (trimmed.startsWith('//')) return `https:${trimmed}`
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
                <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
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
    const [analysisCount, setAnalysisCount] = useState(0);
    const [scanPhase, setScanPhase] = useState<'idle' | 'capturing' | 'processing' | 'scoring' | 'done'>('idle');
    const [useLLM] = useState(true);
    const [questionnaire, setQuestionnaire] = useState<SkinQuestionnaireData>(DEFAULT_QUESTIONNAIRE);
    const [profile, setProfile] = useState<UserSkinProfile>({
        skinType: 'Combination',
        age: 25,
        gender: 'Female',
        concerns: [],
        acneLevel: 50,
        blackheadsLevel: 50,
        poreSize: 50,
        wrinklesDepth: 50,
        sensitivityLevel: 50,
        hydrationLevel: 50,
        rednessLevel: 50,
    });
    const [isSpeaking, setIsSpeaking] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const exportToCSV = useCallback(() => {
        if (!result) return;
        const headers = ['Condition', 'Score', 'Detections', 'Severity'];
        const rows = result.conditionScores.map(c => [
            c.type,
            c.score,
            c.count || 0,
            (c.severity * 100).toFixed(0) + '%'
        ]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `DeepSkyn_Analysis_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [result]);

    const exportToPDF = useCallback(() => {
        // Optimal way without extra libs: Use browser print
        window.print();
    }, []);

    const speakAnalysis = useCallback(() => {
        if (!result || !window.speechSynthesis) return;
        
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const text = `
            Voici l'analyse de votre peau par DeepSkyn. 
            Votre score global est de ${Math.round(result.globalScore)} sur 100. 
            Votre meilleur aspect est ${CONDITION_META[result.analysis.bestCondition]?.label || result.analysis.bestCondition}. 
            Le point critique identifié est ${CONDITION_META[result.analysis.worstCondition]?.label || result.analysis.worstCondition}. 
            Prenez soin de vous avec une routine adaptée.
        `;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.onend = () => setIsSpeaking(false);
        
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    }, [result, isSpeaking]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile(prev => ({ ...prev, imageBase64: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setProfile(prev => ({ ...prev, imageBase64: undefined }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    useEffect(() => {
        // weights logic removed as per user request
    }, []);



    const runAnalysis = useCallback(async () => {
        // Validate age is provided
        if (!profile.age || profile.age < 1 || profile.age > 120) {
            setError('Please enter a valid age (1-120) to perform analysis');
            return;
        }

        setLoading(true);
        setError(null);
        setScanPhase('capturing');

        try {
            await new Promise(r => setTimeout(r, 600));
            setScanPhase('processing');
            await new Promise(r => setTimeout(r, 800));
            setScanPhase('scoring');

            let analysisResult: GlobalScoreResult;

            analysisResult = await aiAnalysisService.analyzeUnified(profile);

            await new Promise(r => setTimeout(r, 400));
            setScanPhase('done');
            setResult(analysisResult);
            setAnalysisCount(c => c + 1);

            // Signal to dashboard that analysis was completed
            sessionStorage.setItem('analysisCompleted', Date.now().toString());

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
    }, [profile]);



    const globalScoreColor = result
        ? result.globalScore >= 75 ? '#10b981' : result.globalScore >= 50 ? '#f59e0b' : '#ef4444'
        : '#0d9488';

    const hasPhoto = Boolean(profile.imageBase64);

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
        padding: 80px 16px 60px;
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

        /* ──── PRINT STYLES ──── */
        @media print {
          @page {
            margin: 15mm;
            size: A4;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .skin-analysis-root > div:not(#printable-report) {
            display: none !important;
          }
          #printable-report {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            position: relative !important;
            background: white !important;
            color: black !important;
            font-family: 'Inter', system-ui, sans-serif;
          }
          .glass-card {
            box-shadow: none !important;
            border: 1px solid #eee !important;
          }
          button { display: none !important; }
        }
        #printable-report {
          display: none;
        }
      `}</style>

            <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                {/* ── Header ── */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 40
                }}>
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

                        <div className="glass-card fade-in" style={{ padding: 24 }}>
                            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                                Profil de Peau
                            </h2>
                            <SkinProfileForm
                                profile={profile}
                                setProfile={setProfile}
                                questionnaire={questionnaire}
                                setQuestionnaire={setQuestionnaire}
                                disabled={loading}
                            />
                        </div>

                        {/* Upload + Scan */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                                Ajouter une image
                            </h2>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                            />
                            <div style={{
                                position: 'relative',
                                background: '#f1f5f9',
                                borderRadius: 16,
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden'
                            }}>
                                {profile.imageBase64 ? (
                                    <div style={{ position: 'relative' }}>
                                        <img
                                            src={profile.imageBase64}
                                            alt="Preview"
                                            style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
                                        />
                                        <button
                                            onClick={removeImage}
                                            className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-red-500 shadow-lg hover:bg-red-50 transition-colors"
                                            type="button"
                                        >
                                            <X size={16} />
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/40 backdrop-blur-[2px] text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                            <CheckCircle size={12} className="text-teal-300" />
                                            Image prête pour l'analyse IA
                                        </div>
                                        {loading && <div className="scan-line" style={{ top: 0 }} />}
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={loading}
                                        className="w-full h-[220px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:bg-slate-100 hover:border-slate-300 group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-teal-500 group-hover:scale-110 transition-all shadow-sm">
                                            <Upload size={20} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-slate-600">Ajouter une photo</p>
                                            <p className="text-[10px] text-slate-400 mt-1">Selfie clair recommande</p>
                                        </div>
                                    </button>
                                )}
                            </div>
                            {loading && (
                                <div className="mt-3 text-sm text-teal-700 font-semibold flex items-center gap-2">
                                    <RefreshCw size={14} className="animate-spin" />
                                    {scanLabels[scanPhase]}
                                </div>
                            )}
                        </div>

                        {/* Analyze Button */}
                        <button
                            className="analyze-btn"
                            onClick={runAnalysis}
                            disabled={loading || !profile.age || profile.age < 1 || profile.age > 120}
                            title={!profile.age ? 'Please enter your age' : ''}
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

                                    {/* Action Buttons for Results */}
                                    <div style={{
                                        marginTop: 20,
                                        paddingTop: 16,
                                        borderTop: '1px solid rgba(13,148,136,0.1)',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 10
                                    }}>
                                        <button
                                            onClick={exportToCSV}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                        >
                                            <Download size={14} className="text-teal-600" />
                                            Export CSV
                                        </button>
                                        <button
                                            onClick={exportToPDF}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 border border-teal-700 rounded-xl text-xs font-bold text-white hover:bg-teal-700 transition-all shadow-md active:scale-95"
                                        >
                                            <Download size={14} />
                                            Exporter Rapport PDF
                                        </button>
                                        <button
                                            onClick={speakAnalysis}
                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                                                isSpeaking 
                                                ? 'bg-red-50 border border-red-100 text-red-600' 
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} className="text-orange-500" />}
                                            {isSpeaking ? 'Arrêter l\'écoute' : 'Écouter l\'analyse'}
                                        </button>
                                    </div>
                                </div>

                                {/* Condition Scores */}
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                                        Scores par condition
                                    </h2>
                                    {result.combinedInsights && (
                                        <div style={{
                                            marginBottom: 16,
                                            padding: 12,
                                            borderRadius: 12,
                                            border: '1px dashed #bae6fd',
                                            background: 'linear-gradient(135deg, #ecfeff, #f8fafc)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>Fusion photo + questionnaire</div>
                                                {result.metaWeighting && (
                                                    <div style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 700 }}>
                                                        {Math.round((result.metaWeighting.aiWeight ?? 0) * 100)}% IA · {Math.round((result.metaWeighting.userWeight ?? 0) * 100)}% Vous
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                                                {Object.entries(result.combinedInsights).map(([key, entry]) => {
                                                    const meta = BLEND_LABELS[key];
                                                    if (!meta) return null;
                                                    return (
                                                        <div key={key} style={{
                                                            padding: 12,
                                                            borderRadius: 10,
                                                            background: '#fff',
                                                            border: '1px solid #e2e8f0',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                                                        }}>
                                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{meta.label}</div>
                                                            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>{meta.helper}</div>
                                                            {hasPhoto && (
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#0f172a' }}>
                                                                    <span>IA (photo)</span>
                                                                    <span>{entry.aiScore ?? '—'}</span>
                                                                </div>
                                                            )}
                                                            {entry.userScore !== undefined && (
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#0f172a' }}>
                                                                    <span>Vous</span>
                                                                    <span>{entry.userScore}</span>
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#0ea5e9', marginTop: 6 }}>
                                                                <span>Fusion</span>
                                                                <span>{Math.round(entry.combinedScore)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {!hasPhoto && (
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                                                    Aucun selfie fourni · Fusion basée sur le questionnaire et l'estimation profil IA.
                                                </div>
                                            )}
                                        </div>
                                    )}
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

                                {/* 👇 BOUTON VERS TA PAGE PRODUITS 👇 */}
                                <div className="mt-4 text-center">
                                    <Link
                                        to="/products"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors shadow-md"
                                    >
                                        🛍️ Parcourir tous les produits
                                    </Link>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Filtrez par prix, ingrédients, type de peau et plus
                                    </p>
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

            {/* ──── PRINTABLE REPORT TEMPLATE ──── */}
            {result && (
                <div id="printable-report" style={{ background: 'white', padding: '10mm' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0d9488', paddingBottom: 20, marginBottom: 30 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <div style={{ background: '#0d9488', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Sparkles size={20} />
                                </div>
                                <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0d9488', margin: 0, letterSpacing: '-0.02em' }}>DEEPSKYN AI</h1>
                            </div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: 12, fontWeight: 600 }}>ADVANCED DERMATOLOGICAL ANALYTICS</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>REPORT #DS-{new Date().getTime().toString().slice(-6)}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>Date: {new Date().toLocaleDateString('fr-FR')}</div>
                        </div>
                    </div>

                    {/* Summary Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 40, marginBottom: 40 }}>
                        <div style={{ background: '#f8fafc', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 15 }}>Score Global</div>
                            <div style={{ fontSize: 64, fontWeight: 900, color: globalScoreColor, lineHeight: 1 }}>{Math.round(result.globalScore)}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: globalScoreColor, marginBottom: 20 }}>
                                {result.globalScore >= 75 ? 'EXCELLENT' : result.globalScore >= 50 ? 'AVERAGE' : 'TO IMPROVE'}
                            </div>
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 15, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: '#64748b' }}>Âge:</span>
                                    <span style={{ fontWeight: 700 }}>{profile.age} ans</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: '#64748b' }}>Type de peau:</span>
                                    <span style={{ fontWeight: 700 }}>{profile.skinType}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 15, borderLeft: '4px solid #0d9488', paddingLeft: 12 }}>Diagnostic Expert</h2>
                            <div style={{ marginBottom: 20 }}>
                                <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, marginBottom: 15 }}>
                                    L'analyse multi-dimensionnelle révèle un aspect optimal concernant la condition <strong>{CONDITION_META[result.analysis.bestCondition]?.label || result.analysis.bestCondition}</strong>. 
                                    Cependant, une attention particulière est recommandée pour <strong>{CONDITION_META[result.analysis.worstCondition]?.label || result.analysis.worstCondition}</strong> qui présente le score le plus bas de la série.
                                </p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div style={{ padding: 12, borderRadius: 12, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Meilleur aspect</div>
                                    <div style={{ fontSize: 14, fontWeight: 800 }}>{CONDITION_META[result.analysis.bestCondition]?.label || result.analysis.bestCondition}</div>
                                </div>
                                <div style={{ padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Point critique</div>
                                    <div style={{ fontSize: 14, fontWeight: 800 }}>{CONDITION_META[result.analysis.worstCondition]?.label || result.analysis.worstCondition}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Conditions Table */}
                    <div style={{ marginBottom: 40 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 15, borderLeft: '4px solid #0d9488', paddingLeft: 12 }}>Analyse des Conditions Cutatnées</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, color: '#64748b' }}>CONDITION</th>
                                    <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, color: '#64748b' }}>SCORE IA</th>
                                    <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, color: '#64748b' }}>SÉVÉRITÉ</th>
                                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, color: '#64748b' }}>INTERPRÉTATION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.conditionScores.map(c => {
                                    const meta = CONDITION_META[c.type];
                                    const scoreColor = c.score >= 75 ? '#10b981' : c.score >= 50 ? '#f59e0b' : '#ef4444';
                                    const status = c.score >= 75 ? 'Contrôlé' : c.score >= 50 ? 'Modéré' : 'Sévère';
                                    return (
                                        <tr key={c.type} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 8px', fontSize: 14, fontWeight: 700 }}>{meta?.label || c.type}</td>
                                            <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: 14, fontWeight: 800, color: scoreColor }}>{Math.round(c.score)}/100</td>
                                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${scoreColor}10`, color: scoreColor, border: `1px solid ${scoreColor}20` }}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 8px', fontSize: 12, color: '#64748b' }}>{meta?.description}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Recommendations */}
                    {result.recommendations && result.recommendations.length > 0 && (
                        <div style={{ marginBottom: 40, breakInside: 'avoid' }}>
                            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 15, borderLeft: '4px solid #0d9488', paddingLeft: 12 }}>Routine Recommandée</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
                                {result.recommendations.slice(0, 3).map((p, idx) => (
                                    <div key={idx} style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white' }}>
                                        <div style={{ fontSize: 10, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', marginBottom: 4 }}>{p.type}</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, height: 40, overflow: 'hidden' }}>{p.name}</div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>£{p.price.toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer / Disclaimer */}
                    <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #eee', textAlign: 'center' }}>
                        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>
                            Ce rapport a été généré par l'Intelligence Artificielle de DeepSkyn. 
                            Cette analyse n'est pas un diagnostic médical et ne remplace pas l'avis d'un dermatologue professionnel.
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', marginTop: 8 }}>www.deepskyn.app</p>
                    </div>
                </div>
            )}
        </div>
    );
}