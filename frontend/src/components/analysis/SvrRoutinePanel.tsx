import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sun, Moon, Sparkles, ChevronDown, ChevronUp,
  Loader2, Lock, ArrowUpRight, Info, CheckCircle, AlertCircle,
  Droplets, Star, Zap,
} from 'lucide-react';
import { svrRoutineService } from '../../services/svrRoutineService';
import type { SvrRoutineResult, SvrRoutineStep, SvrRecommendedProduct } from '../../services/svrRoutineService';
import type { UserSkinProfile } from '../../types/aiAnalysis';

/* ─── Category colour map ────────────────────────────────────────── */
const CAT_META: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  cleanser: { label: 'Nettoyant', color: '#0891b2', bg: 'rgba(8,145,178,0.08)', emoji: '🧼' },
  toner: { label: 'Tonique', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', emoji: '💦' },
  serum: { label: 'Sérum', color: '#0d9488', bg: 'rgba(13,148,136,0.08)', emoji: '💧' },
  moisturizer: { label: 'Hydratant', color: '#2563eb', bg: 'rgba(37,99,235,0.08)', emoji: '🫧' },
  sunscreen: { label: 'Écran Solaire', color: '#d97706', bg: 'rgba(217,119,6,0.08)', emoji: '☀️' },
  'eye-cream': { label: 'Contour Yeux', color: '#7e22ce', bg: 'rgba(126,34,206,0.08)', emoji: '👁️' },
  exfoliant: { label: 'Exfoliant', color: '#b45309', bg: 'rgba(180,83,9,0.08)', emoji: '✨' },
  mask: { label: 'Masque', color: '#be185d', bg: 'rgba(190,24,93,0.08)', emoji: '🌿' },
  treatment: { label: 'Traitement', color: '#16a34a', bg: 'rgba(22,163,74,0.08)', emoji: '🔬' },
};

function getCat(category: string) {
  return CAT_META[category] ?? { label: category, color: '#64748b', bg: 'rgba(100,116,139,0.08)', emoji: '🧴' };
}

/* ─── Utils ─────────────────────────────────────────────────────── */
const normalizeImageUrl = (url?: string) => {
  if (!url) return null;
  if (url.startsWith('//')) return `https:${url}`;
  if (!url.startsWith('http')) return `https://${url}`;
  return url;
};

/* ─── Dynamic Recommended Product Card ──────────────────────────── */
function RecommendedCard({ product, rank }: { product: SvrRecommendedProduct; rank: number }) {
  const { t } = useTranslation();
  const [showReason, setShowReason] = useState(false);
  const [failedImg, setFailedImg] = useState(false);
  const cat = getCat(product.category);
  const imageUrl = normalizeImageUrl(product.imageUrl);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 24,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        position: 'relative',
        minHeight: imageUrl && !failedImg ? 420 : 300, // Card plus grande quand il y a une image
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-6px)';
        el.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)';
        el.style.borderColor = cat.color;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)';
        el.style.borderColor = '#e2e8f0';
      }}
    >
      {/* Rank badge */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        padding: '4px 10px', borderRadius: 12,
        background: rank <= 2 ? 'rgba(13,148,136,0.1)' : 'rgba(100,116,139,0.1)',
        color: rank <= 2 ? '#0d9488' : '#64748b',
        fontWeight: 800, fontSize: 10,
        zIndex: 10, backdropFilter: 'blur(4px)',
        border: `1px solid ${rank <= 2 ? 'rgba(13,148,136,0.2)' : 'rgba(100,116,139,0.2)'}`
      }}>
        TOP {rank}
      </div>

      {/* Product Image Area - Responsive height */}
      <div style={{
        height: imageUrl && !failedImg ? 200 : 80, // Plus grand pour l'image, discret sinon
        width: '100%',
        background: `linear-gradient(135deg, ${cat.bg} 0%, ${cat.color}08 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', padding: imageUrl && !failedImg ? '16px' : '12px',
        position: 'relative'
      }}>
        {imageUrl && !failedImg ? (
          <img
            src={imageUrl}
            alt={product.name}
            style={{ height: '100%', width: 'auto', maxWidth: '90%', objectFit: 'contain' }}
            onError={() => setFailedImg(true)}
          />
        ) : (
          <div style={{ textAlign: 'center', color: cat.color, opacity: 0.2 }}>
            <Droplets size={failedImg ? 32 : 24} />
          </div>
        )}
      </div>

      <div style={{ padding: '16px', flex: 1, background: '#fff', display: 'flex', flexDirection: 'column' }}>
        {/* Category & Texture */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, color: cat.color,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            background: `${cat.color}10`, padding: '3px 10px', borderRadius: 8,
          }}>
            {t(`svr_routine.categories.${product.category}`, { defaultValue: cat.label })}
          </span>
          {product.texture && (
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
              • {product.texture}
            </span>
          )}
        </div>

        {/* Name - Bigger and bolder */}
        <div style={{
          fontSize: 15,
          fontWeight: 800,
          color: '#0f172a',
          lineHeight: 1.2,
          marginBottom: 12,
          minHeight: '2.4em',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {product.name}
        </div>

        {/* Benefits & Ingredients - Only if image exists for cleaner compact look */}
        {(imageUrl && !failedImg) && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 12, color: cat.color
            }}>
              <Zap size={14} fill={cat.color} style={{ opacity: 0.2 }} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>{product.skinBenefit}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {product.keyIngredients?.slice(0, 2).map((ing) => (
                <div key={`${product.name}-${ing}`} style={{
                  fontSize: 10, fontWeight: 700, padding: '4px 10px',
                  borderRadius: 10, background: 'rgba(12, 148, 136, 0.05)',
                  color: '#0d9488', border: '1px solid rgba(12, 148, 136, 0.1)',
                }}>
                  {ing}
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: 'auto' }}>
          {/* AI reason action */}
          <button
            onClick={() => setShowReason(v => !v)}
            style={{
              width: '100%', background: showReason ? '#f8fafc' : 'white',
              border: `1px solid ${showReason ? cat.color + '30' : '#e2e8f0'}`,
              cursor: 'pointer', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 12, fontWeight: 700, color: showReason ? cat.color : '#64748b',
              padding: '10px', transition: 'all 0.2s'
            }}
          >
            <Sparkles size={14} style={{ color: cat.color }} />
            {showReason ? t('svr_routine.reduce', { defaultValue: 'Réduire' }) : t('svr_routine.ai_analysis', { defaultValue: 'Analyse IA' })}
            {showReason ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showReason && (
            <div className="fade-in" style={{
              marginTop: 12,
              padding: '14px',
              background: 'white',
              border: `1px solid ${cat.color}15`,
              borderRadius: 16,
              fontSize: 12, color: '#334155', lineHeight: 1.6,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}>
              {product.reason}
            </div>
          )}
        </div>
      </div>

      {/* Footer Rating */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#fcfcfd'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Star size={14} fill="#f59e0b" color="#f59e0b" />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
            {(product.score ?? 8).toFixed(1)}
          </span>
        </div>
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11, fontWeight: 800, color: cat.color,
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4
          }}
        >
          {t('svr_routine.details', { defaultValue: 'Détails' })} <ArrowUpRight size={14} />
        </a>
      </div>
    </div>
  );
}

/* ─── Routine Step Card ─────────────────────────────────────────── */
function StepCard({ step, index, completed, locked, onToggle }: {
  step: SvrRoutineStep;
  index: number;
  completed?: boolean;
  locked?: boolean;
  onToggle?: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const cat = getCat(step.product.category);

  const getCardStyle = () => {
    if (locked) return { background: '#f8fafc', border: '1px solid #e2e8f0', opacity: 0.5 };
    if (completed) return { background: '#f0fdfa', border: '1px solid #99f6e4', opacity: 0.85 };
    return { background: '#fff', border: '1px solid #e2e8f0', opacity: 1 };
  };

  const getBadgeStyle = () => {
    if (locked) return { background: '#cbd5e1' };
    if (completed) return { background: '#0d9488' };
    return { background: 'linear-gradient(135deg,#0d9488,#6366f1)', boxShadow: '0 3px 8px rgba(13,148,136,0.3)' };
  };

  const cardStyle = getCardStyle();
  const badgeStyle = getBadgeStyle();

  return (
    <div style={{
      ...cardStyle,
      borderRadius: 18,
      overflow: 'hidden', transition: 'all 0.2s',
      pointerEvents: locked ? 'none' : 'auto',
    }}
      onMouseEnter={e => {
        if (locked) return;
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Locked banner */}
      {locked && (
        <div style={{
          padding: '6px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8',
          background: '#f1f5f9', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Lock size={12} /> {t('svr_routine.lock_message', { defaultValue: "Complétez l'étape précédente pour déverrouiller" })}
        </div>
      )}
      {/* Header */}
      <div
        onClick={locked ? undefined : onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '15px 18px',
          background: completed ? 'rgba(13,148,136,0.03)' : '#fafafa',
          borderBottom: '1px solid #f1f5f9',
          cursor: locked ? 'not-allowed' : 'pointer'
        }}
      >
        <div style={{
          ...badgeStyle,
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          color: 'white', fontWeight: 800, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {locked ? <Lock size={16} /> : completed ? <CheckCircle size={18} /> : index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            textDecoration: completed ? 'line-through' : 'none'
          }}>
            {t('svr_routine.step_prefix', { defaultValue: 'Étape' })} {index + 1} — {step.stepName}
          </div>
          <div style={{
            fontSize: 14, fontWeight: 800, color: completed ? '#64748b' : '#0f172a',
            lineHeight: 1.25, marginTop: 2,
            textDecoration: completed ? 'line-through' : 'none'
          }}>
            {step.product.name}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
            background: cat.bg, color: cat.color, border: `1px solid ${cat.color}25`,
            display: 'block',
          }}>
            {cat.emoji} {t(`svr_routine.categories.${step.product.category}`, { defaultValue: cat.label })}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, padding: '0 20px 16px' }}>
        {step.product.imageUrl && (
          <div style={{
            width: 100, height: 100, borderRadius: 16, background: '#fff',
            border: '1px solid #f1f5f9', overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <img
              src={step.product.imageUrl}
              alt={step.product.name}
              style={{ height: '100%', width: 'auto', objectFit: 'contain' }}
              onError={(e) => {
                const parent = (e.currentTarget as HTMLImageElement).parentElement;
                if (parent) parent.style.display = 'none';
              }}
            />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 12px' }}>
            {step.product.description}
          </p>
          {step.product.keyIngredients?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {step.product.keyIngredients.map((ing) => (
                <span key={`${step.product.name}-${ing}`} style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 8,
                  background: 'rgba(16,185,129,0.04)', color: '#059669', border: '1px solid rgba(16,185,129,0.08)',
                }}>
                  {ing}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 18px 13px' }}>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 700, color: '#0d9488', padding: '4px 0',
          }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? t('svr_routine.hide', { defaultValue: 'Masquer' }) : t('svr_routine.instructions_reason', { defaultValue: 'Instructions & raison' })}
        </button>
        {expanded && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
            <div style={{ borderRadius: 12, padding: '11px 13px', background: 'rgba(8,145,178,0.05)', border: '1px solid rgba(8,145,178,0.15)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', marginBottom: 4 }}>📋 {t('svr_routine.application', { defaultValue: 'Application' })}</div>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{step.instruction}</p>
            </div>
            <div style={{ borderRadius: 12, padding: '11px 13px', background: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.15)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', marginBottom: 4 }}>💡 {t('svr_routine.why_product', { defaultValue: 'Pourquoi ce produit' })}</div>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{step.reason}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Loading Skeleton Card ─────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ height: 4, background: 'linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)', borderRadius: 2, animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 12, width: '40%', background: '#f1f5f9', borderRadius: 6 }} />
      <div style={{ height: 16, width: '85%', background: '#e2e8f0', borderRadius: 6 }} />
      <div style={{ height: 12, width: '60%', background: '#f1f5f9', borderRadius: 6 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        {[40, 55, 45].map((w) => (
          <div key={`skel-w-${w}`} style={{ height: 20, width: w, background: '#f0fdf4', borderRadius: 99 }} />
        ))}
      </div>
    </div>
  );
}

const LoadingState = ({ t }: { t: any }) => (
  <div style={{
    padding: '30px', textAlign: 'center', background: 'white', borderRadius: 24,
    border: '1px solid rgba(13,148,136,0.2)', marginBottom: 20,
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
  }}>
    <Loader2 className="animate-spin mx-auto mb-3 text-teal-600" size={32} />
    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{t('svr_routine.generating', { defaultValue: 'Génération en cours...' })}</div>
    <div style={{ fontSize: 13, color: '#64748b' }}>{t('svr_routine.generating_desc', { defaultValue: "L'IA sélectionne vos produits SVR personnalisés" })}</div>
  </div>
);

const FreeNotice = ({ t }: { t: any }) => (
  <div style={{
    padding: '40px 20px', textAlign: 'center', background: 'white', borderRadius: 24,
    border: '1px dashed #cbd5e1', marginBottom: 20
  }}>
    <Lock className="mx-auto mb-4 text-slate-400" size={32} />
    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{t('svr_routine.free_notice.title', { defaultValue: 'Programme SVR Personnalisé' })}</h3>
    <p style={{ fontSize: 14, color: '#64748b', maxWidth: 400, margin: '8px auto 16px' }}>
      {t('svr_routine.free_notice.desc', { defaultValue: 'Débloquez votre routine SVR générée par IA et vos programmes de soins personnalisés en passant au plan PRO.' })}
    </p>
    <button
      onClick={() => window.location.href = '/upgrade'}
      style={{
        padding: '10px 24px', background: 'linear-gradient(135deg,#0d9488,#6366f1)',
        color: 'white', fontWeight: 700, borderRadius: 50, border: 'none', cursor: 'pointer'
      }}
    >
      {t('svr_routine.free_notice.upgrade', { defaultValue: 'Passer à PRO' })}
    </button>
  </div>
);

/* ─── Main Panel ─────────────────────────────────────────────────── */
interface SvrRoutinePanelProps {
  profile: UserSkinProfile;
  currentPlan: string;
  displayMode?: 'products' | 'routine' | 'all';
  completedSteps?: string[];
  onToggleStep?: (stepId: string) => void;
}

export function SvrRoutinePanel({
  profile,
  currentPlan,
  displayMode = 'all',
  onRoutineLoad,
  completedSteps = [],
  onToggleStep
}: SvrRoutinePanelProps & { onRoutineLoad?: (data: SvrRoutineResult) => void }) {
  const { t } = useTranslation();
  const [routine, setRoutine] = useState<SvrRoutineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'morning' | 'night'>('morning');

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRoutine(null);

    // Progress animation
    const timer = setInterval(() => {
      // Background logic
    }, 600);

    try {
      const result = await svrRoutineService.generateRoutine({
        skinType: profile.skinType,
        age: profile.age,
        gender: profile.gender,
        concerns: profile.concerns,
        acneLevel: profile.acneLevel,
        blackheadsLevel: profile.blackheadsLevel,
        poreSize: profile.poreSize,
        wrinklesDepth: profile.wrinklesDepth,
        hydrationLevel: profile.hydrationLevel,
        rednessLevel: profile.rednessLevel,
        sensitivityLevel: profile.sensitivityLevel,
      });
      setRoutine(result);
      if (onRoutineLoad) onRoutineLoad(result);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération. Veuillez réessayer.');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }, [profile, onRoutineLoad]);

  // Initial generation
  useEffect(() => {
    if (!routine && !loading && !error && profile && currentPlan !== 'FREE') {
      generate();
    }
  }, [profile, routine, loading, error, generate, currentPlan]);

  // Auto-regenerate when a new analysis is detected
  useEffect(() => {
    if (currentPlan === 'FREE') return;
    const check = () => {
      const signal = localStorage.getItem('svrRoutineRegenerate');
      if (signal) {
        localStorage.removeItem('svrRoutineRegenerate');
        setRoutine(null);
        setError(null);
        // generate() will be triggered by the effect above once routine === null
      }
    };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, [currentPlan]);


  const getActiveSteps = () => {
    if (!routine) return [];
    return activeTab === 'morning' ? routine.morning : routine.night;
  };
  const activeSteps = getActiveSteps();

  // Group recommended products by category for display
  const catGroups = routine?.recommendedProducts?.reduce<Record<string, SvrRecommendedProduct[]>>((acc, p) => {
    const key = p.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {}) ?? {};

  return (
    <div style={{ marginTop: 40 }} id="svr-routine-section">
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ══════════════ COMPACT LOADING STATE ══════════════ */}
      {!routine && loading && <LoadingState t={t} />}

      {/* FREE User Notice */}
      {!routine && !loading && currentPlan === 'FREE' && <FreeNotice t={t} />}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 12, display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px', borderRadius: 14,
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>
        </div>
      )}

      {/* ══════════════ LOADING SKELETONS ══════════════ */}
      {loading && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Sélection des produits en cours...
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
            {[1, 2, 3, 4, 5, 6].map((id) => <SkeletonCard key={`skel-${id}`} />)}
          </div>
        </div>
      )}

      {/* ══════════════ RESULTS ══════════════ */}
      {routine && (
        <div style={{ animation: 'fadeUp 0.4s ease' }}>
          {(displayMode === 'all' || displayMode === 'products') && (
            <ProductsSection routine={routine} t={t} setRoutine={setRoutine} setError={setError} />
          )}

          {(displayMode === 'all' || displayMode === 'routine') && (
            <RoutineSection 
              routine={routine} 
              t={t} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              activeSteps={activeSteps} 
              completedSteps={completedSteps} 
              onToggleStep={onToggleStep} 
            />
          )}
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  routine: SvrRoutineResult;
  t: any;
  setRoutine?: (r: SvrRoutineResult | null) => void;
  setError?: (e: string | null) => void;
}

const ProductsSection = ({ routine, t, setRoutine, setError }: SectionProps) => {
  const catGroups: Record<string, SvrRecommendedProduct[]> = routine?.recommendedProducts?.reduce((acc: Record<string, SvrRecommendedProduct[]>, p: SvrRecommendedProduct) => {
    const key = p.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {}) ?? {};

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: 'linear-gradient(135deg,#0d9488,#0891b2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 3px 10px rgba(13,148,136,0.25)',
        }}>
          <Sparkles size={18} color="white" />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t('svr_routine.selection_title', { defaultValue: 'Sélection IA Personnalisée' })}
          </div>
          <h3 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {t('svr_routine.selection_subtitle', { defaultValue: 'Produits Recommandés pour Votre Peau' })}
          </h3>
        </div>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 700,
          background: 'rgba(13,148,136,0.1)', color: '#0d9488',
          padding: '4px 12px', borderRadius: 99, border: '1px solid rgba(13,148,136,0.25)',
        }}>
          {t('svr_routine.products_selected', { count: routine.recommendedProducts?.length ?? 0, defaultValue: 'produits sélectionnés' })}
        </span>
      </div>

      <div style={{
        padding: '14px 18px', marginBottom: 18, borderRadius: 16,
        background: 'linear-gradient(135deg,rgba(13,148,136,0.06),rgba(99,102,241,0.04))',
        border: '1px solid rgba(13,148,136,0.15)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <CheckCircle size={16} style={{ color: '#0d9488', flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0d9488' }}>{t('svr_routine.profile_identified', { defaultValue: 'Profil identifié : ' })}</span>
          <span style={{ fontSize: 13, color: '#334155' }}>{routine.skinProfile}</span>
        </div>
        <button
          onClick={() => { setRoutine(null); setError(null); }}
          style={{
            marginLeft: 'auto', background: 'none', border: '1px solid rgba(13,148,136,0.25)',
            borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700,
            color: '#0d9488', cursor: 'pointer', flexShrink: 0,
          }}
        >
          ↻ {t('svr_routine.regenerate', { defaultValue: 'Regénérer' })}
        </button>
      </div>

      {Object.entries(catGroups).map(([catKey, catProducts]) => (
        <div key={catKey} style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: getCat(catKey).color,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 10,
            paddingBottom: 8, borderBottom: `2px solid ${getCat(catKey).color}20`,
          }}>
            <span>{getCat(catKey).emoji}</span>
            {getCat(catKey).label}
            <span style={{
              fontSize: 10, background: getCat(catKey).bg, color: getCat(catKey).color,
              borderRadius: 99, padding: '1px 8px', border: `1px solid ${getCat(catKey).color}25`,
            }}>
              {catProducts.length} produit{catProducts.length > 1 ? 's' : ''}
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14,
          }}>
            {catProducts.map((p) => (
              <RecommendedCard key={p.name} product={p} rank={routine.recommendedProducts.indexOf(p) + 1} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

interface RoutineSectionProps extends SectionProps {
  activeTab: 'morning' | 'night';
  setActiveTab: (tab: 'morning' | 'night') => void;
  activeSteps: SvrRoutineStep[];
  completedSteps: string[];
  onToggleStep?: (id: string) => void;
}

const RoutineSection = ({ routine, t, activeTab, setActiveTab, activeSteps, completedSteps, onToggleStep }: RoutineSectionProps) => (
  <div style={{ marginTop: 32 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 12,
        background: 'linear-gradient(135deg,#6366f1,#7c3aed)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {activeTab === 'morning' ? <Sun size={18} color="white" /> : <Moon size={18} color="white" />}
      </div>
      <h3 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: 0 }}>
        {t('svr_routine.daily_routine', { defaultValue: 'Routine Quotidienne Personnalisée' })}
      </h3>
    </div>

    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      {(['morning', 'night'] as const).map(tab => (
        <button key={tab} onClick={() => setActiveTab(tab)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 22px', borderRadius: 50, border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
          background: activeTab === tab
            ? 'linear-gradient(135deg,#0d9488,#6366f1)'
            : '#f1f5f9',
          color: activeTab === tab ? 'white' : '#64748b',
          boxShadow: activeTab === tab ? '0 4px 14px rgba(13,148,136,0.3)' : 'none',
        }}>
          {tab === 'morning' ? <Sun size={15} /> : <Moon size={15} />}
          {tab === 'morning' ? t('svr_routine.morning_tab', { defaultValue: ' Routine Matin (AM)' }) : t('svr_routine.night_tab', { defaultValue: ' Routine Soir (PM)' })}
          <span style={{
            fontSize: 10, fontWeight: 800,
            background: activeTab === tab ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
            color: activeTab === tab ? 'white' : '#64748b',
            padding: '2px 8px', borderRadius: 99,
          }}>
            {t('svr_routine.steps_count', { count: (tab === 'morning' ? routine.morning : routine.night).length, defaultValue: 'étapes' })}
          </span>
        </button>
      ))}
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {activeSteps.map((step, idx) => {
        const stepId = `${activeTab}-${idx}-${step.stepName}`;
        const locked = idx > 0 && !activeSteps
          .slice(0, idx)
          .every((_: any, prevIdx: number) => completedSteps.includes(`${activeTab}-${prevIdx}-${activeSteps[prevIdx].stepName}`));
        return (
          <StepCard
            key={stepId}
            step={step}
            index={idx}
            completed={completedSteps.includes(stepId)}
            locked={locked}
            onToggle={() => !locked && onToggleStep?.(stepId)}
          />
        );
      })}
    </div>

    {routine.generalAdvice && (
      <div style={{
        marginTop: 20, padding: '18px 20px',
        background: 'linear-gradient(135deg,rgba(13,148,136,0.06),rgba(99,102,241,0.04))',
        border: '1px solid rgba(13,148,136,0.15)', borderRadius: 18,
        display: 'flex', gap: 14, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg,#0d9488,#6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Info size={17} color="white" />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
            {t('svr_routine.advice_title', { defaultValue: 'Conseil Dermatologique Personnalisé' })}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.7 }}>{routine.generalAdvice}</p>
        </div>
      </div>
    )}
  </div>
);
