import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Sparkles, ArrowLeft, Zap, AlertCircle, GitCompare,
    CheckCircle, RefreshCw, Activity,
    BarChart2, Info, Waves, Flame, Microscope,
    Bandage, CircleDot, HeartPulse,
    CircleCheck, AlertTriangle, BarChart3,
    Upload, X, Download, Volume2, VolumeX,
    Send, Loader2, Bot, ArrowUpCircle, Lock, Calendar, FlaskConical,
    Sun, Moon, UserCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { aiAnalysisService } from '../services/aiAnalysisService';
import { chatService } from '../services/chat.service';
import { getUser } from '../lib/authSession';
import { apiGet } from '../services/apiClient';
import type { SubscriptionData } from '../services/paymentService';

import type { GlobalScoreResult, ConditionScore, UserSkinProfile } from '../types/aiAnalysis';
import { SkinProfileForm } from '../components/analysis/SkinProfileForm';
import { SvrRoutinePanel } from '../components/analysis/SvrRoutinePanel';
import { DEFAULT_QUESTIONNAIRE, type SkinQuestionnaireData } from '../types/skinQuestionnaire';
import { comparisonService } from '../services/comparison.service';
import TimelineView from '../components/insights/TimelineView';
import { svrRoutineService, type SvrRoutineResult } from '../services/svrRoutineService';

/* ─────────────────────── metadata getter ────────────────────── */

const getAnalysisMetadata = (t: any) => {
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
            label: t('analysis.conditions.Acne'), icon: Flame, color: '#f43f5e',
            bg: 'rgba(244,63,94,0.05)', border: 'rgba(244,63,94,0.15)',
            gradient: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
            description: t('analysis.condition_meta_desc.Acne')
        },
        'Enlarged-Pores': {
            label: t('analysis.conditions.Enlarged-Pores'), icon: Waves, color: '#8b5cf6',
            bg: 'rgba(139,92,246,0.05)', border: 'rgba(139,92,246,0.15)',
            gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            description: t('analysis.condition_meta_desc.Enlarged-Pores')
        },
        'Atrophic Scars': {
            label: t('analysis.conditions.Atrophic Scars'), icon: Bandage, color: '#64748b',
            bg: 'rgba(100,116,139,0.05)', border: 'rgba(100,116,139,0.15)',
            gradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            description: t('analysis.condition_meta_desc.Atrophic Scars')
        },
        'Skin Redness': {
            label: t('analysis.conditions.Skin Redness'), icon: HeartPulse, color: '#ef4444',
            bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.15)',
            gradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            description: t('analysis.condition_meta_desc.Skin Redness')
        },
        'Blackheads': {
            label: t('analysis.conditions.Blackheads'), icon: CircleDot, color: '#1e293b',
            bg: 'rgba(30,41,59,0.05)', border: 'rgba(30,41,59,0.15)',
            gradient: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
            description: t('analysis.condition_meta_desc.Blackheads')
        },
        'Dark-Spots': {
            label: t('analysis.conditions.Dark-Spots'), icon: Sparkles, color: '#d97706',
            bg: 'rgba(217,119,6,0.05)', border: 'rgba(217,119,6,0.15)',
            gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            description: t('analysis.condition_meta_desc.Dark-Spots')
        },
        'black_dots': {
            label: t('analysis.conditions.black_dots'), icon: Microscope, color: '#0d9488',
            bg: 'rgba(13,148,136,0.05)', border: 'rgba(13,148,136,0.15)',
            gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            description: t('analysis.condition_meta_desc.black_dots')
        },
        'Hydration': {
            label: t('analysis.conditions.Hydration'), icon: Waves, color: '#0ea5e9',
            bg: 'rgba(14,165,233,0.05)', border: 'rgba(14,165,233,0.15)',
            gradient: 'linear-gradient(135deg, #ecfeff 0%, #e0f2fe 100%)',
            description: t('analysis.condition_meta_desc.Hydration')
        },
        'Wrinkles': {
            label: t('analysis.conditions.Wrinkles'), icon: AlertTriangle, color: '#d97706',
            bg: 'rgba(217,119,6,0.05)', border: 'rgba(217,119,6,0.15)',
            gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            description: t('analysis.condition_meta_desc.Wrinkles')
        },
    };

    const BLEND_LABELS: Record<string, { label: string; helper: string }> = {
        'Acne': { label: t('analysis.conditions.Acne'), helper: t('analysis.fusion') },
        'Blackheads': { label: t('analysis.conditions.Blackheads'), helper: t('analysis.fusion') },
        'Enlarged-Pores': { label: t('analysis.profile.concerns_labels.pores'), helper: t('analysis.fusion') },
        'Skin Redness': { label: t('analysis.conditions.Skin Redness'), helper: t('analysis.fusion') },
        'Hydration': { label: t('analysis.conditions.Hydration'), helper: t('analysis.fusion') },
        'Wrinkles': { label: t('analysis.conditions.Wrinkles'), helper: t('analysis.fusion') },
    };

    const CONDITION_DETAILS: Record<string, { detailedDescription: string; causes: string[]; careRecommendations: string[] }> = {
        'Acne': {
            detailedDescription: t('analysis.condition_details.Acne.desc'),
            causes: t('analysis.condition_details.Acne.causes', { returnObjects: true }) as string[],
            careRecommendations: t('analysis.condition_details.Acne.care', { returnObjects: true }) as string[]
        },
        'Enlarged-Pores': {
            detailedDescription: t('analysis.condition_details.Enlarged-Pores.desc'),
            causes: t('analysis.condition_details.Enlarged-Pores.causes', { returnObjects: true }) as string[],
            careRecommendations: t('analysis.condition_details.Enlarged-Pores.care', { returnObjects: true }) as string[]
        },
        'Blackheads': {
            detailedDescription: t('analysis.condition_details.Blackheads.desc'),
            causes: t('analysis.condition_details.Blackheads.causes', { returnObjects: true }) as string[],
            careRecommendations: t('analysis.condition_details.Blackheads.care', { returnObjects: true }) as string[]
        },
        'Skin Redness': {
            detailedDescription: t('analysis.condition_details.Skin Redness.desc'),
            causes: t('analysis.condition_details.Skin Redness.causes', { returnObjects: true }) as string[],
            careRecommendations: t('analysis.condition_details.Skin Redness.care', { returnObjects: true }) as string[]
        },
        'Hydration': {
            detailedDescription: t('analysis.condition_details.Hydration.desc'),
            causes: t('analysis.condition_details.Hydration.causes', { returnObjects: true }) as string[],
            careRecommendations: t('analysis.condition_details.Hydration.care', { returnObjects: true }) as string[]
        },
        'Wrinkles': {
            detailedDescription: t('analysis.condition_details.Wrinkles.desc'),
            causes: t('analysis.condition_details.Wrinkles.causes', { returnObjects: true }) as string[],
            careRecommendations: t('analysis.condition_details.Wrinkles.care', { returnObjects: true }) as string[]
        },
        'Atrophic Scars': {
            detailedDescription: t('analysis.condition_details.Atrophic Scars.desc'),
            causes: t('analysis.condition_details.Atrophic Scars.causes', { returnObjects: true }) as string[],
            careRecommendations: t('analysis.condition_details.Atrophic Scars.care', { returnObjects: true }) as string[]
        },
        'Dark-Spots': {
            detailedDescription: t('analysis.condition_details.Dark-Spots.desc'),
            causes: t('analysis.condition_details.Dark-Spots.causes', { returnObjects: true }) as string[],
            careRecommendations: t('analysis.condition_details.Dark-Spots.care', { returnObjects: true }) as string[]
        },
        'black_dots': {
            detailedDescription: t('analysis.condition_details.black_dots.desc'),
            causes: t('analysis.condition_details.black_dots.causes', { returnObjects: true }) as string[],
            careRecommendations: t('analysis.condition_details.black_dots.care', { returnObjects: true }) as string[]
        }
    };

    return { CONDITION_META, BLEND_LABELS, CONDITION_DETAILS };
}

const drawerSectionTitleStyle: React.CSSProperties = {
    margin: '0 0 12px',
    fontSize: 13,
    fontWeight: 700,
    color: '#1a1a2e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: 'monospace'
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
    const { t } = useTranslation();
    const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    const label = score >= 75 ? t('analysis.optimal') : score >= 50 ? t('analysis.moderate') : t('analysis.critical');

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                {/* Outer decorative track */}
                <circle cx="50" cy="50" r={r + 3} fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
                {/* Background track */}
                <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
                {/* Main progress ring */}
                <circle
                    cx="50" cy="50" r={r} fill="none"
                    stroke={color} strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={filled}
                    strokeLinecap="round"
                    style={{
                        filter: `drop-shadow(0 0 10px ${color}40)`,
                        transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.5s ease'
                    }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
            }}>
                <span style={{ fontSize: size * 0.25, fontWeight: 900, color: '#1e293b', lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {Math.round(score)}
                </span>
                <div style={{
                    marginTop: 4, padding: '2px 8px', borderRadius: 99,
                    background: `${color}15`, color: color, fontSize: size * 0.08,
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                    {label}
                </div>
            </div>
        </div>
    );
}

function ConditionBar({ condition, onSelect }: { condition: ConditionScore; onSelect?: (condition: ConditionScore) => void }) {
    const { t } = useTranslation();
    const { CONDITION_META } = getAnalysisMetadata(t);
    const meta = CONDITION_META[condition.type] || {
        label: condition.type, icon: Info, color: '#6b7280',
        bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)',
        gradient: '', description: ''
    };

    const isEvaluated = typeof condition.score === 'number';
    const scoreValue = isEvaluated ? (condition.score as number) : 0;
    const scoreColor = !isEvaluated
        ? '#94a3b8'
        : scoreValue >= 75
            ? '#10b981'
            : scoreValue >= 50
                ? '#f59e0b'
                : '#ef4444';

    const interpretation = !isEvaluated
        ? t('analysis.unavailable')
        : scoreValue >= 75
            ? `${t('analysis.optimal')} : ${t('analysis.interpretation.optimal')}`
            : scoreValue >= 50
                ? `${t('analysis.moderate')} : ${t('analysis.interpretation.moderate')}`
                : `${t('analysis.critical')} : ${t('analysis.interpretation.critical')}`;

    const Icon = meta.icon;

    return (
        <div
            className="skin-condition-bar"
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(condition)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect?.(condition);
                }
            }}
            style={{
                background: '#ffffff', border: '1px solid #f1f5f9',
                borderRadius: 16, padding: '18px 22px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer'
            }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: meta.gradient || meta.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${meta.border}`
                    }}>
                        <Icon size={20} style={{ color: meta.color }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: meta.color, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{meta.label}</div>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 15, letterSpacing: '-0.01em' }}>
                            {isEvaluated ? interpretation?.split(':')[0] : t('analysis.non_evaluated')}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            fontSize: 28, fontWeight: 900, color: scoreColor,
                            fontVariantNumeric: 'tabular-nums', lineHeight: 1
                        }}>
                            {isEvaluated ? Math.round(scoreValue) : '—'}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 2, fontFamily: 'monospace' }}>SCORE/100</div>
                    </div>
                    <div style={{
                        width: 28,
                        height: 28,
                        border: '1.5px solid #e0e0e0',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#bbb',
                        fontSize: 13,
                        flexShrink: 0
                    }}>
                        {'›'}
                    </div>
                </div>
            </div>

            <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5, marginBottom: 14, minHeight: '1.5em' }}>
                {isEvaluated ? interpretation?.split(':')[1]?.trim() : (condition.notEvaluatedReason || t('analysis.no_data_available'))}
            </div>

            {/* Premium Progress bar */}
            {isEvaluated ? (
                <div style={{
                    height: 8, background: '#f1f5f9',
                    borderRadius: 99, overflow: 'hidden', position: 'relative'
                }}>
                    <div style={{
                        height: '100%', width: `${scoreValue}%`,
                        background: `linear-gradient(90deg, ${scoreColor}cc, ${scoreColor})`,
                        borderRadius: 99,
                        transition: 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)'
                    }} />
                    {/* Gloss effect */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 100%)',
                        pointerEvents: 'none'
                    }} />
                </div>
            ) : (
                <div style={{ height: 8, background: '#f8fafc', borderRadius: 99, border: '1px dashed #e2e8f0' }} />
            )}
        </div>
    );
}

/* ──────────────────────── Condition Detail Drawer Component ──────────────────────────── */
interface ConditionDetailDrawerProps {
    condition: any; // Using any for simplicity in mapping
    result: any;
    profile: any;
    onClose: () => void;
}

function ConditionDetailDrawer({ condition, result, profile, onClose }: ConditionDetailDrawerProps) {
    const { t } = useTranslation();
    const { CONDITION_META, CONDITION_DETAILS } = getAnalysisMetadata(t);
    const meta = CONDITION_META[condition.type] || {
        label: condition.type,
        icon: Info,
        color: '#6b7280',
        gradient: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
        description: t('analysis.no_description_available')
    };
    const baseDetails = CONDITION_DETAILS[condition.type] || {
        detailedDescription: meta.description || t('analysis.no_detailed_description'),
        causes: [t('analysis.multiple_factors')],
        careRecommendations: [t('analysis.adopt_gentle_routine')]
    };

    const isEvaluated = typeof condition.score === 'number';
    const scoreValue = isEvaluated ? Math.round(condition.score as number) : null;
    const severityPct = condition.severity !== null && condition.severity !== undefined
        ? Math.round((condition.severity as number) * 100) : null;
    const detectionCount = condition.count ?? 0;

    const tier = !isEvaluated
        ? 'unknown'
        : scoreValue >= 75 ? 'excellent'
            : scoreValue >= 50 ? 'moderate'
                : 'critical';

    const severityLabel = tier === 'unknown' ? t('analysis.non_evaluated')
        : tier === 'excellent' ? t('analysis.optimal')
            : tier === 'moderate' ? t('analysis.moderate')
                : t('analysis.critical');
    const severityColor = tier === 'unknown' ? '#94a3b8'
        : tier === 'excellent' ? '#10b981'
            : tier === 'moderate' ? '#f59e0b'
                : '#ef4444';

    const getDynamicDescription = () => {
        if (result.totalDetections === 0) return t('analysis.no_detection_summary', { condition: meta.label.toLowerCase() });
        if (tier === 'excellent') return `${baseDetails.detailedDescription} ${t('analysis.desc_excellent')}`;
        if (tier === 'moderate') return `${baseDetails.detailedDescription} ${t('analysis.desc_moderate', { score: scoreValue })}`;
        
        const detectionsStr = detectionCount > 0 
            ? (detectionCount > 1 ? t('analysis.detections_plural', { count: detectionCount }) : t('analysis.detections_singular', { count: detectionCount }))
            : t('analysis.several_signals');
        return `${baseDetails.detailedDescription} ${t('analysis.desc_critical', { score: scoreValue, detections: detectionsStr })}`;
    };
    const dynamicDescription = getDynamicDescription();

    const dynamicCauses = tier === 'excellent'
        ? baseDetails.causes.slice(0, 2)
        : baseDetails.causes;

    const dynamicRecos = tier === 'excellent'
        ? [t('analysis.reco_excellent', { condition: meta.label.toLowerCase() }), ...baseDetails.careRecommendations.slice(0, 1)]
        : tier === 'moderate'
            ? baseDetails.careRecommendations
            : [t('analysis.reco_critical', { condition: meta.label.toLowerCase() }), ...baseDetails.careRecommendations];

    // Context badges
    const isBest = result?.analysis?.bestCondition === condition.type;
    const isWorst = result?.analysis?.worstCondition === condition.type;
    const isDominant = result?.analysis?.dominantCondition === condition.type;

    const Icon = meta.icon;
    const headerBackground = meta.gradient || 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)';
    const recoBorderColor = tier === 'excellent' ? '#34d399' : tier === 'moderate' ? '#f59e0b' : '#ef4444';
    const recoBg = tier === 'excellent' ? '#f8fffe' : tier === 'moderate' ? '#fffbeb' : '#fff5f5';
    const recoBorder = tier === 'excellent' ? '#d1fae5' : tier === 'moderate' ? '#fde68a' : '#fecaca';

    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 100, animation: 'drawerFadeIn 0.12s ease'
                }}
            />
            <aside
                role="dialog" aria-modal="true"
                aria-label={`Details ${meta.label}`}
                style={{
                    position: 'fixed', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'min(560px, 94vw)', maxHeight: '88vh',
                    background: '#ffffff', zIndex: 101,
                    display: 'flex', flexDirection: 'column',
                    boxShadow: `0 24px 60px rgba(0,0,0,0.2), 0 0 0 2px ${severityColor}20`,
                    animation: 'drawerSlideIn 0.15s cubic-bezier(0.2, 0, 0, 1)',
                    fontFamily: "'Segoe UI', sans-serif",
                    borderRadius: 18, overflow: 'hidden'
                }}
            >
                {/* ── Header ── */}
                <div style={{ background: headerBackground, padding: '28px 28px 22px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <div style={{
                                width: 48, height: 48, background: '#fff', borderRadius: 14,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.08)', flexShrink: 0
                            }}>
                                <Icon size={22} style={{ color: meta.color }} />
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: meta.color, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                                    {meta.label}
                                </p>
                                <h2 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>
                                    {severityLabel}
                                </h2>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'rgba(255,255,255,0.8)', border: 'none',
                                    borderRadius: 10, width: 36, height: 36, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666'
                                }}
                            >
                                <X size={16} />
                            </button>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {isBest && (
                                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 99, background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                                        ✓ {t('analysis.best_aspect')}
                                    </span>
                                )}
                                {isWorst && (
                                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 99, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                        ⚠ {t('analysis.critical_point')}
                                    </span>
                                )}
                                {isDominant && !isWorst && (
                                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 99, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
                                        ● {t('analysis.dominant')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: '#666', fontFamily: 'monospace' }}>{t('analysis.health_score')}</span>
                            <span style={{ fontSize: 24, fontWeight: 900, color: severityColor }}>
                                {scoreValue !== null ? scoreValue : '—'}
                                <span style={{ fontSize: 13, fontWeight: 400, color: '#aaa' }}>/100</span>
                            </span>
                        </div>
                        <div style={{ height: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                                width: `${scoreValue ?? 0}%`, height: '100%',
                                background: `linear-gradient(90deg, ${severityColor}99, ${severityColor})`,
                                borderRadius: 99, transition: 'width 1s cubic-bezier(.4,0,.2,1)'
                            }} />
                        </div>
                        {isEvaluated && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                {detectionCount > 0 && (
                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${severityColor}14`, color: severityColor, border: `1px solid ${severityColor}28` }}>
                                        {detectionCount} {detectionCount > 1 ? t('analysis.detections_plural') : t('analysis.detections_singular')}
                                    </span>
                                )}
                                {severityPct !== null && (
                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>
                                        {t('analysis.severity')} : {severityPct}%
                                    </span>
                                )}
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${severityColor}14`, color: severityColor, border: `1px solid ${severityColor}28` }}>
                                    {tier === 'excellent' ? `✓ ${t('analysis.under_control')}` : tier === 'moderate' ? `○ ${t('analysis.to_monitor')}` : `! ${t('analysis.priority')}`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                    {/* Not evaluated info */}
                    {!isEvaluated && condition.notEvaluatedReason && (
                        <div style={{ marginBottom: 20, padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                            ℹ️ {condition.notEvaluatedReason}
                        </div>
                    )}

                    <section style={{ marginBottom: 28 }}>
                        <h3 style={drawerSectionTitleStyle}>{t('analysis.description')}</h3>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#444' }}>
                            {dynamicDescription}
                        </p>
                    </section>

                    <section style={{ marginBottom: 28 }}>
                        <h3 style={drawerSectionTitleStyle}>{t('analysis.causes')}</h3>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                            {dynamicCauses.map((cause: string, index: number) => (
                                <li key={cause} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: index < dynamicCauses.length - 1 ? '1px solid #f5f5f5' : 'none', fontSize: 13.5, color: '#555', lineHeight: 1.5 }}>
                                    <span style={{ width: 20, height: 20, background: `${severityColor}22`, color: severityColor, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>
                                        {index + 1}
                                    </span>
                                    {cause}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section style={{ marginBottom: 16 }}>
                        <h3 style={drawerSectionTitleStyle}>{t('analysis.recommendations')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {dynamicRecos.map((reco: string) => (
                                <div key={reco} style={{ background: recoBg, border: `1px solid ${recoBorder}`, borderLeft: `3px solid ${recoBorderColor}`, borderRadius: 10, padding: '10px 14px', fontSize: 13.5, color: '#374151', lineHeight: 1.55 }}>
                                    {reco}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Global context footer */}
                    {result && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BarChart2 size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                {t('analysis.global_score')} : {Math.round(result.globalScore)}/100 · {result.totalDetections} {result.totalDetections > 1 ? t('analysis.detections_plural') : t('analysis.detections_singular')} {t('analysis.total')}
                                {result.analysis.bestCondition && ` · ${t('analysis.best')} : ${CONDITION_META[result.analysis.bestCondition]?.label ?? result.analysis.bestCondition}`}
                                {result.analysis.worstCondition && ` · ${t('analysis.critical')} : ${CONDITION_META[result.analysis.worstCondition]?.label ?? result.analysis.worstCondition}`}
                            </span>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}


/* ──────────────────────── Main Page ──────────────────────────── */

export default function SkinAnalysisPage() {
    const { t, i18n } = useTranslation();
    const { CONDITION_META, BLEND_LABELS, CONDITION_DETAILS } = getAnalysisMetadata(t);
    const navigate = useNavigate();
    const [result, setResult] = useState<GlobalScoreResult | null>(() => {
        const cached = sessionStorage.getItem('skinAnalysisResult');
        return cached ? JSON.parse(cached) : null;
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisCount, setAnalysisCount] = useState(0);
    const [scanPhase, setScanPhase] = useState<'idle' | 'capturing' | 'processing' | 'scoring' | 'done'>(() => {
        return sessionStorage.getItem('skinAnalysisResult') ? 'done' : 'idle';
    });
    const [questionnaire, setQuestionnaire] = useState<SkinQuestionnaireData>(DEFAULT_QUESTIONNAIRE);
    const [currentPlan, setCurrentPlan] = useState<string>('FREE');
    const [timelineData, setTimelineData] = useState<{ date: string; score: number }[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [timelineError, setTimelineError] = useState<string | null>(null);
    const [selectedCondition, setSelectedCondition] = useState<ConditionScore | null>(null);
    const [routineResult, setRoutineResult] = useState<SvrRoutineResult | null>(null);
    const [routineError, setRoutineError] = useState<boolean>(false);

    useEffect(() => {
        const user = getUser();
        if (user?.id) {
            apiGet<SubscriptionData>(`/subscription/${user.id}`)
                .then(s => setCurrentPlan(s.plan))
                .catch(() => { });
        }
    }, []);

    const [profile, setProfile] = useState<UserSkinProfile>({
        skinType: 'Combination',
        age: 25,
        gender: 'Female',
        concerns: [],
        imagesBase64: [],
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
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!selectedCondition) return;

        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSelectedCondition(null);
            }
        };

        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [selectedCondition]);

    const buildAnalysisSummary = useCallback((r: GlobalScoreResult | null) => {
        if (!r) return '';
        const evaluated = (r.conditionScores || []).filter(c => c?.evaluated !== false && typeof c?.score === 'number') as ConditionScore[];
        if (evaluated.length === 0) {
            return t('analysis.no_data_provided_desc', { defaultValue: "Aucune condition n'a pu être évaluée. Ajoutez un selfie (recommandé) ou renseignez vos niveaux (acné, pores, rougeurs, hydratation, rides) pour obtenir un diagnostic fiable et des solutions adaptées." });
        }

        const sorted = [...evaluated].sort((a, b) => (a.score as number) - (b.score as number));
        const allProblems = sorted.map(c => CONDITION_META[c.type]?.label || c.type);
        const userDeclaredNotDetected = (r.conditionScores || [])
            .filter(c =>
                c?.evaluated === false &&
                typeof c?.notEvaluatedReason === 'string' &&
                c.notEvaluatedReason.toLowerCase().includes('declare'),
            )
            .map(c => CONDITION_META[c.type]?.label || c.type);
        const score = typeof r.globalScore === 'number' ? Math.round(r.globalScore) : null;

        const solutions: string[] = [];
        const addIfPresent = (condType: string, text: string) => {
            if (evaluated.some(c => c.type === condType)) solutions.push(text);
        };
        addIfPresent('Acne', t('analysis.summary_solutions.Acne', { defaultValue: "Acné : routine douce + actifs ciblés (BHA/azélaïque) progressivement, sans sur-nettoyer." }));
        addIfPresent('Blackheads', t('analysis.summary_solutions.Blackheads', { defaultValue: "Points noirs : exfoliation chimique régulière (BHA) et hydratation légère pour éviter l'effet rebond." }));
        addIfPresent('Enlarged-Pores', t('analysis.summary_solutions.Enlarged-Pores', { defaultValue: "Pores : niacinamide + contrôle du sébum, et protection solaire quotidienne pour préserver la texture." }));
        addIfPresent('Skin Redness', t('analysis.summary_solutions.Skin Redness', { defaultValue: "Rougeurs : apaiser la barrière cutanée, éviter les irritants et privilégier des formules sans parfum." }));
        addIfPresent('Hydration', t('analysis.summary_solutions.Hydration', { defaultValue: "Hydratation : renforcer la barrière (humectants + émollients) et limiter les exfoliants trop fréquents." }));
        addIfPresent('Wrinkles', t('analysis.summary_solutions.Wrinkles', { defaultValue: "Rides : SPF quotidien + actifs anti-âge introduits progressivement (rétinoïde/peptides)." }));

        const header = score !== null ? `${t('analysis.global_score_estimated') || 'Score global estimé'} : ${score}/100.` : `${t('analysis.summary_header_done') || 'Analyse réalisée.'}`;
        const focus = allProblems.length ? `${t('analysis.conditions_analyzed_label') || 'Conditions analysées'} : ${allProblems.join(', ')}.` : '';
        const mismatch = userDeclaredNotDetected.length
            ? `${t('analysis.declared_not_detected_label') || 'Déclarées mais non détectées visuellement'} : ${userDeclaredNotDetected.join(', ')}.`
            : '';
        const plan = solutions.length ? `${t('analysis.recommended_plan_label') || 'Plan recommandé'} : ${solutions.join(' ')}` : '';
        return `${header} ${focus} ${mismatch} ${plan}`.trim();
    }, [t, CONDITION_META]);

    useEffect(() => {
        let mounted = true;
        const fetchTimeline = async () => {
            const user = getUser();
            if (!user?.id) return;
            if (currentPlan === 'FREE') return;

            try {
                setTimelineLoading(true);
                setTimelineError(null);
                const resp = await comparisonService.getUserAnalyses(1, 12);
                if (!mounted) return;
                const history = (resp.data || [])
                    .map((a: any) => ({
                        date: new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                        score: a.skinScore,
                    }))
                    .reverse();
                setTimelineData(history);
            } catch (e: any) {
                if (!mounted) return;
                setTimelineError(e?.message || t('analysis.errors.history_load_fail', { defaultValue: "Impossible de charger l'historique." }));
            } finally {
                if (mounted) setTimelineLoading(false);
            }
        };

        fetchTimeline();
        return () => { mounted = false; };
    }, [currentPlan]);

    useEffect(() => {
        if (result && !routineResult && !routineError && currentPlan !== 'FREE') {
            svrRoutineService.generateRoutine(profile)
                .then(res => setRoutineResult(res))
                .catch(err => {
                    console.error("Routine fetch error", err);
                    setRoutineError(true);
                });
        }
    }, [result, routineResult, routineError, currentPlan, profile]);


    // Chat states
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);


    const exportToCSV = useCallback(() => {
        if (!result) return;
        if (currentPlan === 'FREE') {
            setError(t('analysis.errors.csv_pro_only', { defaultValue: 'L\'exportation CSV est réservée aux utilisateurs PRO et PREMIUM. Passez au plan supérieur !' }));
            return;
        }
        const headers = [t('analysis.csv.condition'), t('analysis.csv.score'), t('analysis.csv.detections'), t('analysis.csv.severity')];
        const rows = result.conditionScores.map(c => [
            CONDITION_META[c.type]?.label || c.type,
            typeof c.score === 'number' ? c.score : t('analysis.unavailable'),
            c.count || 0,
            typeof c.severity === 'number' ? (c.severity * 100).toFixed(0) + '%' : 'N/A'
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
    }, [result, currentPlan]);

    const exportToPDF = useCallback(() => {
        window.print();
    }, [currentPlan]);

    const speakAnalysis = useCallback(() => {
        if (!result || !window.speechSynthesis) return;

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const text = t('analysis.speech_template', {
            score: Math.round(result.globalScore),
            best: result.analysis.bestCondition ? (CONDITION_META[result.analysis.bestCondition]?.label || result.analysis.bestCondition) : t('analysis.unavailable'),
            worst: result.analysis.worstCondition ? (CONDITION_META[result.analysis.worstCondition]?.label || result.analysis.worstCondition) : t('analysis.unavailable'),
            defaultValue: `
                Voici l'analyse de votre peau par DeepSkyn. 
                Votre score global est de ${Math.round(result.globalScore)} sur 100. 
                Votre meilleur aspect est ${result.analysis.bestCondition ? (CONDITION_META[result.analysis.bestCondition]?.label || result.analysis.bestCondition) : 'non déterminé'}. 
                Le point critique identifié est ${result.analysis.worstCondition ? (CONDITION_META[result.analysis.worstCondition]?.label || result.analysis.worstCondition) : 'non déterminé'}. 
                Prenez soin de vous avec une routine adaptée.
            `
        });

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = i18n.language === 'ar' ? 'ar-SA' : i18n.language === 'en' ? 'en-US' : 'fr-FR';
        utterance.onend = () => setIsSpeaking(false);

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    }, [result, isSpeaking]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const currentCount = profile.imagesBase64?.length || 0;
        const remaining = 5 - currentCount;
        const filesToAdd = files.slice(0, remaining);

        filesToAdd.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setProfile(prev => ({
                    ...prev,
                    imagesBase64: [...(prev.imagesBase64 || []), base64],
                    // Also set imageBase64 to the first one for backward compatibility if needed
                    imageBase64: prev.imageBase64 || base64
                }));
            };
            reader.readAsDataURL(file);
        });

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (index: number) => {
        setProfile(prev => {
            const newImages = (prev.imagesBase64 || []).filter((_, i) => i !== index);
            return {
                ...prev,
                imagesBase64: newImages,
                imageBase64: newImages.length > 0 ? newImages[0] : undefined
            };
        });
    };

    useEffect(() => {
        // Auto-scroll chat
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    const sendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || chatLoading) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setChatLoading(true);

        try {
            const response = await chatService.sendPersonalizedMessage(userMessage);
            setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (err: any) {
            console.error('Chat error:', err);
            const msg = err.message?.includes('LIMIT_REACHED')
                ? t('chat.limit_message')
                : t('chat.error_fallback', { defaultValue: "Désolé, j'ai rencontré une erreur. Réessaye plus tard." });
            setChatMessages(prev => [...prev, { role: 'assistant', content: msg }]);
        } finally {
            setChatLoading(false);
        }
    };




    const runAnalysis = useCallback(async () => {
        // Validate age is provided
        if (!profile.age || profile.age < 1 || profile.age > 120) {
            setError(t('analysis.errors.invalid_age', { defaultValue: 'Please enter a valid age (1-120) to perform analysis' }));
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

            // Global shared analysis state for downstream modules (products/routine/dashboard)
            sessionStorage.setItem('skinAnalysisResult', JSON.stringify(analysisResult));
            localStorage.setItem('skinAnalysisResult', JSON.stringify(analysisResult));

            // Save current profile to localStorage for recommendations page
            localStorage.setItem('skinAnalysisProfile', JSON.stringify(profile));

            // Signal to dashboard and routine that analysis was completed
            sessionStorage.setItem('analysisCompleted', Date.now().toString());
            localStorage.setItem('analysisJustCompleted', Date.now().toString());
            // Signal SVR routine panel to regenerate with fresh analysis data
            localStorage.setItem('svrRoutineRegenerate', Date.now().toString());

            // Fetch routine for professional report
            if (currentPlan !== 'FREE') {
                try {
                    const routine = await svrRoutineService.generateRoutine(profile);
                    setRoutineResult(routine);
                } catch (rErr) {
                    console.error("Failed to fetch routine for report", rErr);
                }
            }

            setTimeout(() => {
                const recSection = document.getElementById('recommendations-section');
                if (recSection) {
                    recSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 1000);
        } catch (err: any) {
            console.error('Analysis error:', err);
            const errorMsg = err.message?.includes('LIMIT_REACHED')
                ? "LIMIT_REACHED"
                : err.message?.includes('visage humain')
                    ? t('analysis.errors.no_face_detected', { defaultValue: 'Image non reconnue : aucun visage humain détecté.' })
                    : `${t('analysis.errors.generic_analysis_fail', { defaultValue: "Erreur d'analyse" })} : ${err.message || t('analysis.errors.connection_fail', { defaultValue: 'Impossible de se connecter au serveur.' })}`;
            setError(errorMsg);
            setScanPhase('idle');
        } finally {
            setLoading(false);
        }
    }, [profile]);

    /**
     * Réinitialise l'analyse pour permettre une nouvelle saisie.
     */
    const resetAnalysis = useCallback(() => {
        setResult(null);
        setLoading(false);
        setScanPhase('idle');
        setError(null);
        setChatMessages([]);
        sessionStorage.removeItem('skinAnalysisResult');
        localStorage.removeItem('skinAnalysisResult');
    }, []);



    const getGlobalScoreColor = (scoreValue: number | undefined) => {
        if (!scoreValue) return '#0d9488';
        if (scoreValue >= 75) return '#10b981';
        if (scoreValue >= 50) return '#f59e0b';
        return '#ef4444';
    };

    const globalScoreColor = getGlobalScoreColor(result?.globalScore);

    const hasPhoto = Boolean(profile.imagesBase64 && profile.imagesBase64.length > 0);
    const displayMetaWeighting = (() => {
        if (!result) return { aiWeight: 0, userWeight: 0 };

        // When no selfie is provided, we must never claim image AI contribution.
        if (!hasPhoto) {
            return { aiWeight: 0, userWeight: 1 };
        }

        const ai = result.metaWeighting?.aiWeight;
        const user = result.metaWeighting?.userWeight;
        if (Number.isFinite(ai) && Number.isFinite(user)) {
            return { aiWeight: ai as number, userWeight: user as number };
        }

        return { aiWeight: 1, userWeight: 0 };
    })();

    const scanLabels: Record<string, string> = {
        capturing: t('analysis.scan.capturing'),
        processing: t('analysis.scan.processing'),
        scoring: t('analysis.scan.scoring'),
        done: t('analysis.scan.done'),
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
         padding: clamp(28px, 5vw, 56px) 16px 60px;
        margin-top: 0;
        }
        .glass-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 1.5px solid #e2e8f0;
          border-radius: 24px;
          box-shadow: 0 12px 32px -8px rgba(0,0,0,0.08), 0 4px 12px -4px rgba(0,0,0,0.04);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          backdrop-filter: blur(8px);
        }
        .glass-card:hover {
          transform: translateY(-4px);
          border-color: #cbd5e1;
          box-shadow: 0 20px 48px -12px rgba(13,148,136,0.12), 0 8px 20px -6px rgba(0,0,0,0.06);
        }
        .analyze-btn {
          background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%);
          border: none;
          border-radius: 14px;
          padding: 16px 32px;
          color: white;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 24px rgba(13,148,136,0.25);
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          letter-spacing: 0.01em;
        }
        .analyze-btn:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 12px 32px rgba(13,148,136,0.4);
          filter: brightness(1.05);
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
                @keyframes drawerFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes drawerSlideIn {
                    from { opacity: 0; transform: translate(-50%, calc(-50% + 10px)) scale(0.97); }
                    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
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

            <div style={{ maxWidth: 1120, margin: '0 auto' }}>

                {/* ── Main Header Analysis ── */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    rowGap: 18,
                    marginBottom: 34,
                    padding: '18px 20px',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 20,
                    boxShadow: '0 12px 28px -16px rgba(15,23,42,0.22)'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.15)',
                            borderRadius: 99, padding: '5px 12px', width: 'fit-content'
                        }}>
                            <Sparkles size={12} style={{ color: '#0d9488' }} />
                            <span style={{ fontSize: 10, color: '#0d9488', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                {t('analysis.ai_engine_tag')}
                            </span>
                        </div>
                        <h1 style={{
                            fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900,
                            color: '#0f172a',
                            margin: 0, lineHeight: 1.05,
                            letterSpacing: '-0.02em'
                        }}>
                            {t('analysis.title')}
                        </h1>
                        <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
                            {t('analysis.subtitle')}
                        </p>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                        justifyContent: 'flex-end'
                    }}>
                        {result && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                backgroundColor: '#f0fdf4', padding: '8px 16px',
                                borderRadius: '12px', border: '1px solid #dcfce7',
                                marginRight: 8
                            }}>
                                <div className="pulse-dot" style={{ width: 6, height: 6 }} />
                                <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                                    {analysisCount} {analysisCount > 1 ? t('analysis.detections_analyzed_plural') : t('analysis.detections_analyzed_singular')}
                                </span>
                            </div>
                        )}


                        <Link
                            to="/analysis/compare"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                                color: 'white',
                                padding: '11px 20px',
                                borderRadius: '13px',
                                fontSize: '14px',
                                fontWeight: '700',
                                textDecoration: 'none',
                                boxShadow: '0 12px 22px -14px rgba(13,148,136,0.75)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <GitCompare size={16} /> {t('common.compare') || 'Comparer'}
                        </Link>
                    </div>
                </div>

                {/* ── Main Grid ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 20
                }}>

                    {/* ── LEFT: Controls (Cachés si résultats présents) ── */}
                    {!result && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                            <div className="glass-card fade-in" style={{ padding: 32, borderRadius: '24px' }}>
                                <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <UserCircle size={18} /> {t('analysis.profile.title')}
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
                            <div className="glass-card" style={{ padding: 32 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                                        {t('analysis.profile.add_photos')}
                                    </h2>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: (profile.imagesBase64?.length || 0) >= 5 ? '#ef4444' : '#0d9488', backgroundColor: (profile.imagesBase64?.length || 0) >= 5 ? '#fef2f2' : '#f0fdf4', padding: '4px 12px', borderRadius: '99px' }}>
                                        {t('analysis.profile.images_count', { count: profile.imagesBase64?.length || 0 })}
                                    </span>
                                </div>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                />

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
                                    {profile.imagesBase64?.map((img, idx) => (
                                        <div key={idx} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 160, border: '2px solid #e2e8f0', boxShadow: '0 8px 16px rgba(0,0,0,0.12)', transition: 'all 0.3s' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.18)'; e.currentTarget.style.borderColor = '#0d9488'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                                            <img
                                                src={img}
                                                alt={`Preview ${idx + 1}`}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                            <button
                                                onClick={() => removeImage(idx)}
                                                className="absolute top-2 right-2 p-2 bg-white/95 backdrop-blur-sm rounded-full text-red-500 shadow-lg hover:bg-red-50 transition-all hover:scale-110"
                                                type="button"
                                            >
                                                <X size={16} />
                                            </button>
                                            {idx === 0 && (
                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(13,148,136,0.9), transparent)', color: 'white', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', padding: '8px 4px' }}>
                                                    {t('analysis.profile.main_photo')}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {(profile.imagesBase64?.length || 0) < 5 && (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={loading}
                                            style={{
                                                height: 160,
                                                background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)',
                                                border: '3px dashed #0d9488',
                                                borderRadius: 16,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 12,
                                                transition: 'all 0.3s',
                                                cursor: loading ? 'not-allowed' : 'pointer',
                                                opacity: loading ? 0.6 : 1
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!loading) {
                                                    e.currentTarget.style.borderColor = '#10b981';
                                                    e.currentTarget.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)';
                                                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(13,148,136,0.2)';
                                                    e.currentTarget.style.transform = 'scale(1.02)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!loading) {
                                                    e.currentTarget.style.borderColor = '#0d9488';
                                                    e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                }
                                            }}
                                        >
                                            <Upload size={32} style={{ color: '#0d9488' }} strokeWidth={1.5} />
                                            <div style={{ textAlign: 'center' }}>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0d9488', display: 'block' }}>{t('analysis.profile.add_a_photo')}</span>
                                                <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>{t('analysis.profile.or_drag_drop')}</span>
                                            </div>
                                        </button>
                                    )}
                                </div>

                                {loading && (
                                    <div className="mt-4 text-sm text-teal-700 font-semibold flex items-center gap-2">
                                        <RefreshCw size={14} className="animate-spin" />
                                        {scanLabels[scanPhase]}
                                    </div>
                                )}

                                {hasPhoto && !loading && (
                                    <div className="mt-4 p-3 bg-teal-50 border border-teal-100 rounded-xl flex items-center gap-2">
                                        <CheckCircle size={14} className="text-teal-500" />
                                        <span className="text-[11px] font-bold text-teal-700 uppercase tracking-widest">
                                            {t('analysis.profile.photos_ready')}
                                        </span>
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
                                        {t('analysis.profile.launch_analysis')}
                                    </>
                                )}
                            </button>

                            {/* Error */}
                            {error && (
                                <div style={{
                                    background: error.includes('LIMIT_REACHED') || error.includes('visage humain') ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                                    border: error.includes('LIMIT_REACHED') || error.includes('visage humain') ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(239,68,68,0.2)',
                                    borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start'
                                }}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <AlertCircle size={18} style={{ color: error.includes('LIMIT_REACHED') || error.includes('visage humain') ? '#f59e0b' : '#ef4444', flexShrink: 0 }} />
                                        <p style={{ fontSize: 13, fontWeight: 700, color: error.includes('LIMIT_REACHED') || error.includes('visage humain') ? '#b45309' : '#b91c1c', margin: 0 }}>
                                            {error.includes('LIMIT_REACHED')
                                                ? 'Limite mensuelle atteinte'
                                                : error.includes('visage humain')
                                                    ? 'Image non reconnue'
                                                    : 'Erreur d\'analyse'}
                                        </p>
                                    </div>
                                    <p style={{ fontSize: 12, color: error.includes('LIMIT_REACHED') || error.includes('visage humain') ? '#92400e' : '#fca5a5', lineHeight: 1.5, margin: 0 }}>
                                        {error.includes('LIMIT_REACHED')
                                            ? 'Vous avez atteint le nombre maximal d\'analyses pour votre plan actuel ce mois-ci.'
                                            : error}
                                    </p>
                                    {error.includes('LIMIT_REACHED') && (
                                        <Link
                                            to="/upgrade"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                backgroundColor: '#f59e0b', color: 'white',
                                                padding: '8px 16px', borderRadius: '10px',
                                                fontSize: '12px', fontWeight: '700', textDecoration: 'none',
                                                boxShadow: '0 4px 12px rgba(245,158,11,0.3)', transition: 'all 0.2s'
                                            }}
                                        >
                                            <ArrowUpCircle size={14} /> Passer au plan supérieur
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── RIGHT: Results ── */}
                    {result && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                            {result && (
                                <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-2 fade-in">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-teal-50 p-2.5 rounded-xl text-teal-600">
                                            <CheckCircle size={20} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-slate-800 leading-tight">{t('analysis.scan.done')}</h3>
                                            <p className="text-slate-500 text-xs">{t('analysis.done_hint', { defaultValue: 'Retrouvez plus bas vos scores et conseils personnalisés' })}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={resetAnalysis}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95 text-sm"
                                    >
                                        <RefreshCw size={16} className="text-teal-600" />
                                        {t('analysis.new_analysis')}
                                    </button>
                                </div>
                            )}

                            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                                <div className="glass-card" style={{
                                    padding: 32,
                                    background: `linear-gradient(135deg, rgba(13,148,136,0.05) 0%, rgba(8,145,178,0.03) 100%)`,
                                    border: '1.5px solid rgba(13,148,136,0.2)',
                                    borderRadius: '24px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                                        <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Zap size={18} style={{ color: '#f59e0b' }} /> {t('analysis.health_score_title')}
                                        </h2>
                                        <CheckCircle size={16} style={{ color: '#10b981' }} />
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                        <ScoreRing score={result.globalScore} size={130} />

                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                                gap: 8,
                                                marginBottom: 12,
                                            }}>
                                                <div style={{ padding: '8px 10px', borderRadius: 10, background: '#ecfeff', border: '1px solid #bae6fd' }}>
                                                    <div style={{ fontSize: 10, color: '#0f766e', fontWeight: 700, textTransform: 'uppercase' }}>{t('analysis.real_age')}</div>
                                                    <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 800 }}>{profile.age}</div>
                                                </div>
                                                <div style={{ padding: '8px 10px', borderRadius: 10, background: '#f0fdfa', border: '1px solid #99f6e4' }}>
                                                    <div style={{ fontSize: 10, color: '#0f766e', fontWeight: 700, textTransform: 'uppercase' }}>{t('analysis.skin_age_ia')}</div>
                                                    <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 800 }}>
                                                        {typeof result.skinAge === 'number' ? result.skinAge : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>

                                            {[
                                                { label: t('analysis.best'), value: result.analysis.bestCondition, color: '#10b981', Icon: CircleCheck },
                                                { label: t('analysis.critical_point'), value: result.analysis.worstCondition, color: '#ef4444', Icon: AlertTriangle },
                                                { label: t('analysis.dominant'), value: result.analysis.dominantCondition, color: '#f59e0b', Icon: BarChart3 },
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
                                                    {result.totalDetections} {result.totalDetections > 1 ? t('analysis.detections_analyzed_plural') : t('analysis.detections_analyzed_singular')}
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
                                            {t('analysis.export_csv')}
                                        </button>
                                        <button
                                            onClick={exportToPDF}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 border border-teal-700 rounded-xl text-xs font-bold text-white hover:bg-teal-700 transition-all shadow-md active:scale-95"
                                        >
                                            <Download size={14} />
                                            {t('analysis.export_pdf')}
                                        </button>
                                        <button
                                            onClick={speakAnalysis}
                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${isSpeaking
                                                ? 'bg-red-50 border border-red-100 text-red-600'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} className="text-orange-500" />}
                                            {isSpeaking ? t('analysis.stop_listening') : t('analysis.listen_analysis')}
                                        </button>
                                    </div>
                                </div>

                                {/* Condition Scores */}
                                <div className="glass-card" style={{ padding: 32, borderRadius: '24px' }}>
                                    <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <BarChart3 size={18} style={{ color: '#0ea5e9' }} /> {t('analysis.scores_by_condition')}
                                    </h2>
                                    {result.combinedInsights && (
                                        <div style={{
                                            marginBottom: 20,
                                            padding: 16,
                                            borderRadius: 12,
                                            border: '1px dashed #bae6fd',
                                            background: 'linear-gradient(135deg, #ecfeff, #f8fafc)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{t('analysis.fusion_photo_questionnaire')}</div>
                                                <div style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 700 }}>
                                                    {Math.round((displayMetaWeighting.aiWeight ?? 0) * 100)}% {t('analysis.ai_photo')} · {Math.round((displayMetaWeighting.userWeight ?? 0) * 100)}% {t('analysis.you')}
                                                </div>
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
                                                                    <span>{t('analysis.ai_photo')}</span>
                                                                    <span>{entry.aiScore ?? '—'}</span>
                                                                </div>
                                                            )}
                                                            {entry.userScore !== undefined && (
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#0f172a' }}>
                                                                    <span>{t('analysis.you')}</span>
                                                                    <span>{entry.userScore}</span>
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#0ea5e9', marginTop: 6 }}>
                                                                <span>{t('analysis.fusion')}</span>
                                                                <span>{Math.round(entry.combinedScore)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {!hasPhoto && (
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                                                    {t('analysis.no_selfie_provided')} · {t('analysis.fusion_based_on')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {result.conditionScores
                                            .sort((a, b) => {
                                                const sa = typeof a.score === 'number' ? a.score : Number.POSITIVE_INFINITY;
                                                const sb = typeof b.score === 'number' ? b.score : Number.POSITIVE_INFINITY;
                                                return sa - sb;
                                            })
                                            .map(condition => (
                                                <ConditionBar key={condition.type} condition={condition} onSelect={setSelectedCondition} />
                                            ))
                                        }
                                    </div>
                                </div>



                                {/* AI Summary */}
                                <div className={`p-10 rounded-28px shadow-2xl text-white relative overflow-hidden group ${currentPlan === 'FREE' ? 'bg-gradient-to-br from-slate-700 to-slate-800 shadow-slate-600/25 border-2 border-slate-600' : 'bg-gradient-to-br from-[#0d9488] to-[#0f766e] shadow-teal-500/30 border border-teal-400'}`} style={{ borderRadius: '28px' }}>
                                    {currentPlan === 'FREE' && (
                                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-gradient-to-t from-slate-900/90 via-slate-800/60 to-transparent">
                                            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 border-2 border-amber-400">
                                                <Lock size={28} className="text-amber-300" />
                                            </div>
                                            <h3 className="text-lg font-black text-white mb-2">{t('analysis.deep_analysis')}</h3>
                                            <p className="text-xs text-slate-300 text-center max-w-[220px] mb-4">{t('analysis.unlock_analysis_desc')}</p>
                                            <button onClick={() => navigate('/upgrade')} className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 transition-all">
                                                {t('analysis.unlock_button')}
                                            </button>
                                        </div>
                                    )}
                                    {currentPlan !== 'FREE' && <Sparkles className="absolute -right-4 -top-4 w-24 h-24 opacity-10 group-hover:rotate-12 transition-transform" />}
                                    <div className={`relative z-10 ${currentPlan === 'FREE' ? 'blur-sm opacity-40' : ''}`}>
                                        <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80">
                                            <CheckCircle size={14} /> {t('analysis.analysis_summary')}
                                        </h3>
                                        <p className="text-lg font-medium leading-relaxed italic">
                                            {buildAnalysisSummary(result)}
                                        </p>
                                    </div>
                                </div>

                                {/* ── Recommendations & Routine Navigation Buttons ── */}
                                <div id="recommendations-section" className="glass-card p-8 rounded-[28px] border-2 border-teal-100 bg-white/50 backdrop-blur shadow-xl shadow-teal-500/5 mb-6 fade-in">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="bg-teal-100 p-2 rounded-xl text-teal-600">
                                                    <Sparkles size={20} />
                                                </div>
                                                <h3 className="text-xl font-black text-slate-800">{t('analysis.ai_personalized_solutions')}</h3>
                                            </div>
                                            <p className="text-slate-600 text-sm leading-relaxed">
                                                {t('analysis.ai_solutions_desc')}
                                            </p>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                            <button
                                                onClick={() => navigate('/analysis/recommendations', { state: { profile } })}
                                                className="group flex items-center justify-center gap-3 px-8 py-4 bg-white border-2 border-teal-500 text-teal-700 rounded-2xl font-bold transition-all hover:bg-teal-50 hover:shadow-lg active:scale-95"
                                            >
                                                <FlaskConical size={18} className="group-hover:rotate-12 transition-transform" />
                                                {t('analysis.view_products')}
                                            </button>
                                            <button
                                                onClick={() => navigate('/routines')}
                                                className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-2xl font-bold shadow-xl shadow-teal-600/20 hover:scale-105 active:scale-95 transition-all"
                                            >
                                                <Calendar size={18} />
                                                {t('analysis.my_ia_routine')}
                                                <ArrowUpCircle size={16} className="rotate-45" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Tracking Section */}
                                <div id="history-section" className="glass-card fade-in relative overflow-hidden border-2" style={{ padding: 24, minHeight: 400, borderColor: currentPlan === 'FREE' ? '#f59e0b33' : '#e2e8f0' }}>
                                    {currentPlan === 'FREE' && (
                                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-white/80 via-amber-50/60 to-white/80 backdrop-blur-sm border-t-2 border-amber-200">
                                            <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-50 rounded-full flex items-center justify-center mb-3 border-2 border-amber-300 shadow-lg shadow-amber-200/50">
                                                <Lock size={32} className="text-amber-600" />
                                            </div>
                                            <h3 className="text-xl font-black text-amber-900 mb-2">{t('analysis.progress_tracking')}</h3>
                                            <p className="text-slate-700 text-sm text-center max-w-[260px] mb-6 leading-relaxed">{t('analysis.progress_tracking_desc')}</p>
                                            <Link to="/upgrade" className="px-7 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 transition-all" style={{ textDecoration: 'none' }}>
                                                {t('analysis.unlock_tracking')}
                                            </Link>
                                        </div>
                                    )}

                                    <div className={currentPlan === 'FREE' ? 'opacity-20 pointer-events-none' : ''}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <BarChart2 className="text-teal-600" size={20} />
                                                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                                    {t('analysis.progress_tracking')}
                                                </h2>
                                            </div>
                                        </div>
                                        {timelineError && (
                                            <div style={{
                                                padding: 12,
                                                borderRadius: 12,
                                                border: '1px solid rgba(239,68,68,0.2)',
                                                background: 'rgba(239,68,68,0.05)',
                                                color: '#dc2626',
                                                fontSize: 12,
                                                fontWeight: 700,
                                            }}>
                                                {timelineError}
                                            </div>
                                        )}

                                        <div style={{ marginTop: 8 }}>
                                            {timelineLoading ? (
                                                <div className="h-48 w-full bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center">
                                                    <Loader2 className="animate-spin text-slate-400" size={28} />
                                                </div>
                                            ) : (
                                                <TimelineView data={timelineData} height={260} showTitle={false} />
                                            )}
                                        </div>

                                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                                            <Link
                                                to="/history"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                                style={{ textDecoration: 'none' }}
                                            >
                                                <BarChart3 size={14} className="text-teal-600" />
                                                {t('analysis.view_full_history')}
                                            </Link>
                                        </div>
                                    </div>
                                </div>





                                {/* Raw Metrics Summary */}

                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selectedCondition && (
                <ConditionDetailDrawer
                    condition={selectedCondition}
                    result={result}
                    profile={profile}
                    onClose={() => setSelectedCondition(null)}
                />
            )}

            {/* ──── PRINTABLE REPORT TEMPLATE ──── */}
            {result && (
                <div id="printable-report" style={{
                    background: 'white',
                    padding: '15mm',
                    width: '100%',
                    maxWidth: '210mm',
                    boxSizing: 'border-box',
                    margin: '0 auto',
                    fontFamily: "'Inter', sans-serif",
                    color: '#1e293b'
                }}>
                    <style>{`
                        @media print {
                            @page { 
                                size: A4; 
                                margin: 0; 
                            }
                            body { margin: 0; }
                            .page-break { page-break-after: always; }
                            .no-break { 
                                page-break-inside: avoid; 
                                break-inside: avoid;
                                -webkit-column-break-inside: avoid;
                            }
                        }
                    `}</style>

                    {/* Page 1: Executive Summary */}
                    <div className="page-break">
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #0d9488', paddingBottom: 25, marginBottom: 40 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ background: '#0d9488', width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(13,148,136,0.2)' }}>
                                    <Sparkles size={28} />
                                </div>
                                <div>
                                    <h1 style={{ fontSize: 32, fontWeight: 900, color: '#0d9488', margin: 0, letterSpacing: '-0.04em' }}>DEEPSKYN PRO</h1>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('analysis.pdf.ai_expertise', { defaultValue: 'Intelligence Artificielle Dermatologique' })}</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{t('analysis.pdf.expert_report', { defaultValue: 'RAPPORT ANALYTIQUE EXPERT' })}</div>
                                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>ID: #{new Date().getTime().toString().slice(-8)}</div>
                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('analysis.pdf.generated_on', { defaultValue: 'Généré le' })} {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : i18n.language === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </div>

                        {/* Executive Summary Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 30, marginBottom: 40 }}>
                            {/* Score Card */}
                            <div style={{ background: '#f8fafc', padding: 35, borderRadius: 24, border: '1px solid #e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 20, letterSpacing: '0.05em' }}>{t('analysis.health_score_title')}</div>
                                <div style={{ fontSize: 80, fontWeight: 900, color: globalScoreColor, lineHeight: 1, letterSpacing: '-0.05em' }}>{Math.round(result.globalScore)}<span style={{ fontSize: 24, color: '#94a3b8' }}>/100</span></div>
                                <div style={{
                                    marginTop: 20,
                                    padding: '8px 20px',
                                    borderRadius: 99,
                                    display: 'inline-block',
                                    background: `${globalScoreColor}15`,
                                    color: globalScoreColor,
                                    fontSize: 16,
                                    fontWeight: 800,
                                    textTransform: 'uppercase'
                                }}>
                                    {result.globalScore >= 75 ? t('analysis.optimal') : result.globalScore >= 50 ? t('analysis.moderate') : t('analysis.critical')}
                                </div>
                                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 30, paddingTop: 20, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <span style={{ color: '#64748b', fontWeight: 600 }}>{t('analysis.profile.age')}:</span>
                                        <span style={{ fontWeight: 800, color: '#1e293b' }}>{profile.age} {t('analysis.pdf.years', { defaultValue: 'ans' })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <span style={{ color: '#64748b', fontWeight: 600 }}>{t('analysis.profile.skin_type')}:</span>
                                        <span style={{ fontWeight: 800, color: '#1e293b' }}>{t(`analysis.profile.skin_types.${profile.skinType}`) || profile.skinType}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <span style={{ color: '#64748b', fontWeight: 600 }}>{t('analysis.pdf.ai_detections', { defaultValue: 'Detections IA' })}:</span>
                                        <span style={{ fontWeight: 800, color: '#1e293b' }}>{result.totalDetections} {t('analysis.pdf.points', { defaultValue: 'points' })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Text */}
                            <div>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Activity size={18} color="#0d9488" />
                                    Diagnostic de Synthèse
                                </h2>
                                <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.8, marginBottom: 25, textAlign: 'justify' }}>
                                    {currentPlan === 'FREE'
                                        ? t('analysis.pdf.free_plan_message', { defaultValue: 'Le diagnostic expert approfondi est réservé aux membres PRO. Ce rapport interactif présente une synthèse de votre état cutané actuel basée sur notre moteur IA multi-spectre.' })
                                        : t('analysis.pdf.pro_summary_template', {
                                            best: result.analysis.bestCondition ? (CONDITION_META[result.analysis.bestCondition]?.label || result.analysis.bestCondition) : 'N/A',
                                            worst: result.analysis.worstCondition ? (CONDITION_META[result.analysis.worstCondition]?.label || result.analysis.worstCondition) : 'N/A',
                                            score: Math.round(result.globalScore),
                                            defaultValue: `L'analyse automatisée de votre profil cutané met en évidence une performance optimale sur la condition ${result.analysis.bestCondition ? (CONDITION_META[result.analysis.bestCondition]?.label || result.analysis.bestCondition) : 'N/A'}. À l'inverse, l'aspect ${result.analysis.worstCondition ? (CONDITION_META[result.analysis.worstCondition]?.label || result.analysis.worstCondition) : 'N/A'} constitue votre priorité dermatologique actuelle. L'équilibre global de votre barrière est évalué à ${Math.round(result.globalScore)}/100.`
                                        })
                                    }
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    <div style={{ padding: 20, borderRadius: 20, background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: 8 }}>{t('analysis.pdf.strength_point', { defaultValue: 'Point de Force' })}</div>
                                        <div style={{ fontSize: 16, fontWeight: 900, color: '#065f46' }}>{result.analysis.bestCondition ? (CONDITION_META[result.analysis.bestCondition]?.label || result.analysis.bestCondition) : t('analysis.pdf.stable', { defaultValue: 'Stable' })}</div>
                                    </div>
                                    <div style={{ padding: 20, borderRadius: 20, background: '#fef2f2', border: '1px solid #fee2e2' }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: 8 }}>{t('analysis.pdf.priority_axis', { defaultValue: 'Axe Prioritaire' })}</div>
                                        <div style={{ fontSize: 16, fontWeight: 900, color: '#991b1b' }}>{result.analysis.worstCondition ? (CONDITION_META[result.analysis.worstCondition]?.label || result.analysis.worstCondition) : t('analysis.pdf.none', { defaultValue: 'Aucun' })}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Conditions Detailed List (Page 2) */}
                        <div style={{ marginTop: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 20, paddingLeft: 14, borderLeft: '5px solid #0d9488' }}>
                                {t('analysis.pdf.detailed_analysis', { defaultValue: 'Analyse Détaillée des Conditions' })}
                            </h2>
                            <div style={{ display: 'block' }}>
                                {result.conditionScores.slice(0, 4).map(c => {
                                    const meta = CONDITION_META[c.type];
                                    const details = CONDITION_DETAILS[c.type];
                                    const hasScore = typeof c.score === 'number';
                                    const scoreValue = hasScore ? (c.score as number) : 0;
                                    const getMetricColor = (s: number | null | undefined) => {
                                        if (s == null) return '#64748b';
                                        if (s >= 75) return '#10b981';
                                        if (s >= 50) return '#f59e0b';
                                        return '#ef4444';
                                    };
                                    const color = !hasScore ? '#64748b' : getMetricColor(scoreValue);

                                    return (
                                        <div key={c.type} className="no-break" style={{ padding: 22, borderRadius: 20, border: '1px solid #f1f5f9', background: '#fff', marginBottom: 15, display: 'inline-block', width: '100%', boxSizing: 'border-box' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                                                        {meta?.icon ? <meta.icon size={20} /> : <Activity size={20} />}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 16, fontWeight: 900, color: '#1e293b' }}>{meta?.label || c.type}</div>
                                                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{meta?.description}</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: 24, fontWeight: 900, color: color }}>{hasScore ? `${Math.round(scoreValue)}/100` : '—'}</div>
                                                    <div style={{ fontSize: 10, fontWeight: 800, color: color, textTransform: 'uppercase' }}>{t('analysis.pdf.expert_score', { defaultValue: 'Expert Score' })}</div>
                                                </div>
                                            </div>

                                            {details && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 15, paddingTop: 15, borderTop: '1px dashed #e2e8f0' }}>
                                                    <div>
                                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>{t('analysis.pdf.probable_causes', { defaultValue: 'Causes Probables' })}</div>
                                                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                                            {details.causes.map((cause) => (
                                                                <li key={cause} style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'flex', gap: 6 }}>
                                                                    <span style={{ color: color }}>•</span> {cause}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>{t('analysis.pdf.care_advice', { defaultValue: 'Conseils de Soins' })}</div>
                                                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                                            {details.careRecommendations.map((reco) => (
                                                                <li key={reco} style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'flex', gap: 6 }}>
                                                                    <span style={{ color: color }}>✔</span> {reco}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Page 2: Full Skincare Routine */}
                    <div className="page-break" style={{ paddingTop: '10mm' }}>
                        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0d9488', marginBottom: 30, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {t('analysis.pdf.complete_care_strategy', { defaultValue: 'Votre Stratégie de Soins Complète' })}
                        </h2>

                        {currentPlan === 'FREE' ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14, border: '1px dashed #e2e8f0', borderRadius: 20, background: '#f8fafc' }}>
                                <div style={{ fontSize: 40, marginBottom: 15 }}>✨</div>
                                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginBottom: 10 }}>{t('analysis.pdf.upgrade_title', { defaultValue: 'Passez à la vitesse supérieure' })}</h3>
                                {t('analysis.pdf.pro_routine_only', { defaultValue: 'La routine de soins complète et détaillée (incluant les recommandations de produits spécifiques) est une fonctionnalité de notre Intelligence Artificielle avancée exclusive aux abonnés PRO et PREMIUM.' })}
                            </div>
                        ) : routineResult ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 35 }}>
                                {/* Morning Routine */}
                                <div className="no-break" style={{ display: 'inline-block', width: '100%', boxSizing: 'border-box' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, padding: '10px 20px', background: '#f0f9ff', borderRadius: 14, border: '1px solid #bae6fd' }}>
                                        <Sun size={24} color="#0369a1" />
                                        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0369a1', margin: 0 }}>{t('analysis.pdf.morning_routine', { defaultValue: 'Routine du Matin (AM)' })}</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {routineResult.morning.map((step, i) => (
                                            <div key={i} style={{ display: 'flex', gap: 15, padding: 15, borderRadius: 16, border: '1px solid #f1f5f9', background: '#fcfcfd' }}>
                                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#0369a1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{step.stepName} — <span style={{ color: '#0369a1' }}>{step.product?.name || t('analysis.pdf.recommended_product', { defaultValue: 'Produit recommandé' })}</span></div>
                                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                                                        <strong>{t('analysis.pdf.instructions', { defaultValue: 'Instructions' })}:</strong> {step.instruction}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Night Routine */}
                                <div className="no-break" style={{ display: 'inline-block', width: '100%', boxSizing: 'border-box', marginTop: 35 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, padding: '10px 20px', background: '#f5f3ff', borderRadius: 14, border: '1px solid #ddd6fe' }}>
                                        <Moon size={24} color="#5b21b6" />
                                        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#5b21b6', margin: 0 }}>{t('analysis.pdf.night_routine', { defaultValue: 'Routine du Soir (PM)' })}</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {routineResult.night.map((step, i) => (
                                            <div key={i} style={{ display: 'flex', gap: 15, padding: 15, borderRadius: 16, border: '1px solid #f1f5f9', background: '#fcfcfd' }}>
                                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#5b21b6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{step.stepName} — <span style={{ color: '#5b21b6' }}>{step.product?.name || t('analysis.pdf.recommended_product', { defaultValue: 'Produit recommandé' })}</span></div>
                                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                                                        <strong>{t('analysis.pdf.instructions', { defaultValue: 'Instructions' })}:</strong> {step.instruction}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* General Advice */}
                                <div className="no-break" style={{ padding: 25, borderRadius: 24, background: 'linear-gradient(135deg, #f0fdfa 0%, #f0f9ff 100%)', border: '1px solid #ccfbf1', display: 'inline-block', width: '100%', boxSizing: 'border-box', marginTop: 35 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                        <Info size={20} color="#0d9488" />
                                        <div style={{ fontSize: 12, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('analysis.pdf.expert_personalized_advice', { defaultValue: 'Conseil Expert Personnalisé' })}</div>
                                    </div>
                                    <p style={{ margin: 0, fontSize: 14, color: '#134e4a', lineHeight: 1.8, fontStyle: 'italic' }}>
                                        "{routineResult.generalAdvice}"
                                    </p>
                                </div>
                            </div>
                        ) : routineError ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontSize: 14, border: '1px dashed #fecaca', borderRadius: 20, background: '#fef2f2' }}>
                                ⚠️ {t('analysis.errors.routine_load_fail', { defaultValue: 'Impossible de charger la section routine pour le moment.' })}<br />
                                {t('analysis.errors.retry_hint', { defaultValue: '(Veuillez réessayer plus tard ou vérifier votre connexion)' })}
                            </div>
                        ) : (
                            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14, border: '1px dashed #e2e8f0', borderRadius: 20 }}>
                                {t('analysis.routine_generating', { defaultValue: 'Génération de la routine personnalisée en cours...' })} <br />
                                {t('analysis.routine_generating_hint', { defaultValue: '(Veuillez attendre avant le téléchargement PDF)' })}
                            </div>
                        )}
                    </div>

                    {/* Footer / Legal */}
                    <div style={{ marginTop: 40, paddingTop: 30, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{ background: '#0d9488', width: 20, height: 20, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                <Sparkles size={12} />
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 900, color: '#0d9488', letterSpacing: '0.1em' }}>DEEPSKYN AI</span>
                        </div>
                        <p style={{ fontSize: 10, color: '#94a3b8', maxWidth: 600, margin: '0 auto', lineHeight: 1.5 }}>
                            {t('analysis.pdf.footer_disclaimer', { defaultValue: "Ce rapport a été généré par l'Intelligence Artificielle de DeepSkyn. Les résultats sont basés sur une analyse visuelle et des données déclaratives. Cette analyse n'est pas un diagnostic médical et ne remplace en aucun cas l'avis, le diagnostic ou le traitement d'un professionnel de santé qualifié." })}
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 800, color: '#0d9488', marginTop: 15 }}>{t('analysis.pdf.footer_brand', { defaultValue: 'www.deepskyn.app • Expertise Digitale Dermatologique' })}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
