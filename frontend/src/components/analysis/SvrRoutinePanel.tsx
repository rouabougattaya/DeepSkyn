import { useState, useCallback, useEffect } from 'react';
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
  cleanser:    { label: 'Nettoyant',      color: '#0891b2', bg: 'rgba(8,145,178,0.08)',    emoji: '🧼' },
  toner:       { label: 'Tonique',        color: '#7c3aed', bg: 'rgba(124,58,237,0.08)',   emoji: '💦' },
  serum:       { label: 'Sérum',          color: '#0d9488', bg: 'rgba(13,148,136,0.08)',   emoji: '💧' },
  moisturizer: { label: 'Hydratant',      color: '#2563eb', bg: 'rgba(37,99,235,0.08)',    emoji: '🫧' },
  sunscreen:   { label: 'Écran Solaire',  color: '#d97706', bg: 'rgba(217,119,6,0.08)',    emoji: '☀️' },
  'eye-cream': { label: 'Contour Yeux',  color: '#7e22ce', bg: 'rgba(126,34,206,0.08)',   emoji: '👁️' },
  exfoliant:   { label: 'Exfoliant',     color: '#b45309', bg: 'rgba(180,83,9,0.08)',      emoji: '✨' },
  mask:        { label: 'Masque',         color: '#be185d', bg: 'rgba(190,24,93,0.08)',    emoji: '🌿' },
  treatment:   { label: 'Traitement',     color: '#16a34a', bg: 'rgba(22,163,74,0.08)',    emoji: '🔬' },
};

function getCat(category: string) {
  return CAT_META[category] ?? { label: category, color: '#64748b', bg: 'rgba(100,116,139,0.08)', emoji: '🧴' };
}

/* ─── Dynamic Recommended Product Card ──────────────────────────── */
function RecommendedCard({ product, rank }: { product: SvrRecommendedProduct; rank: number }) {
  const [showReason, setShowReason] = useState(false);
  const cat = getCat(product.category);

  return (
    <div
      style={{
        background: '#fff',
        border: `1.5px solid ${cat.color}25`,
        borderRadius: 20,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.22s ease',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        position: 'relative',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = `0 12px 32px ${cat.color}28`;
        el.style.borderColor = `${cat.color}50`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)';
        el.style.borderColor = `${cat.color}25`;
      }}
    >
      {/* Rank badge */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        width: 26, height: 26, borderRadius: '50%',
        background: rank <= 2 ? 'linear-gradient(135deg,#f59e0b,#f97316)' : '#f1f5f9',
        color: rank <= 2 ? 'white' : '#64748b',
        fontWeight: 800, fontSize: 11,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: rank <= 2 ? '0 2px 8px rgba(249,115,22,0.4)' : 'none',
      }}>
        #{rank}
      </div>

      {/* Colour bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg,${cat.color},${cat.color}70)` }} />

      <div style={{ padding: '16px 16px 0', flex: 1 }}>
        {/* Category */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>{cat.emoji}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: cat.color,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            background: cat.bg, padding: '2px 8px', borderRadius: 99,
            border: `1px solid ${cat.color}30`,
          }}>
            {cat.label}
          </span>
          {product.texture && (
            <span style={{
              fontSize: 9, fontWeight: 600, color: '#94a3b8',
              background: '#f8fafc', padding: '2px 7px', borderRadius: 99,
              border: '1px solid #e2e8f0',
            }}>
              {product.texture}
            </span>
          )}
        </div>

        {/* Name */}
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.3, marginBottom: 6, paddingRight: 30 }}>
          {product.name}
        </div>

        {/* Skin benefit */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          marginBottom: 8,
          background: `${cat.color}0f`, border: `1px solid ${cat.color}25`,
          borderRadius: 99, padding: '3px 10px',
        }}>
          <Zap size={10} style={{ color: cat.color }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: cat.color }}>{product.skinBenefit}</span>
        </div>

        {/* Description */}
        <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, margin: '0 0 10px' }}>
          {product.description}
        </p>

        {/* Key ingredients */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {product.keyIngredients?.slice(0, 3).map((ing, i) => (
            <span key={i} style={{
              fontSize: 9, fontWeight: 600, padding: '2px 7px',
              borderRadius: 99, background: '#f0fdf4',
              color: '#15803d', border: '1px solid rgba(21,128,61,0.15)',
            }}>
              ✓ {ing}
            </span>
          ))}
        </div>

        {/* AI reason toggle */}
        <button
          onClick={() => setShowReason(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 700, color: '#6366f1',
            padding: '4px 0', marginBottom: showReason ? 0 : 6,
          }}
        >
          {showReason ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showReason ? 'Masquer' : '💡 Pourquoi ce produit pour vous ?'}
        </button>
        {showReason && (
          <div style={{
            margin: '6px 0 10px',
            padding: '10px 12px',
            background: 'rgba(99,102,241,0.05)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 12,
            fontSize: 12, color: '#334155', lineHeight: 1.65,
          }}>
            {product.reason}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 8,
      }}>
        <div>
          {/* Stars */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={10}
                fill={i < Math.round(product.score / 2) ? '#f59e0b' : 'none'}
                color="#f59e0b"
              />
            ))}
            <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 3 }}>
              {(product.score ?? 8).toFixed(1)}/10
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Routine Step Card ─────────────────────────────────────────── */
function StepCard({ step, index }: { step: SvrRoutineStep; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cat = getCat(step.product.category);

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18,
      overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 18px', background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#0d9488,#6366f1)',
          color: 'white', fontWeight: 800, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 3px 8px rgba(13,148,136,0.3)',
        }}>
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Étape {index + 1} — {step.stepName}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginTop: 2 }}>
            {step.product.name}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
            background: cat.bg, color: cat.color, border: `1px solid ${cat.color}25`,
            display: 'block', marginBottom: 4,
          }}>
            {cat.emoji} {cat.label}
          </span>
        </div>
      </div>

      <div style={{ padding: '13px 18px 6px' }}>
        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.65, margin: '0 0 10px' }}>
          {step.product.description}
        </p>
        {step.product.keyIngredients?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
            {step.product.keyIngredients.map((ing, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
                background: '#f0fdf4', color: '#15803d', border: '1px solid rgba(21,128,61,0.15)',
              }}>
                ✓ {ing}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 700, color: '#0d9488', padding: '4px 0',
          }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Masquer' : 'Instructions & raison'}
        </button>
        {expanded && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
            <div style={{ borderRadius: 12, padding: '11px 13px', background: 'rgba(8,145,178,0.05)', border: '1px solid rgba(8,145,178,0.15)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', marginBottom: 4 }}>📋 Application</div>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{step.instruction}</p>
            </div>
            <div style={{ borderRadius: 12, padding: '11px 13px', background: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.15)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', marginBottom: 4 }}>💡 Pourquoi ce produit</div>
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
        {[40, 55, 45].map((w, i) => (
          <div key={i} style={{ height: 20, width: w, background: '#f0fdf4', borderRadius: 99 }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Panel ─────────────────────────────────────────────────── */
interface SvrRoutinePanelProps {
  profile: UserSkinProfile;
  currentPlan: string;
  displayMode?: 'products' | 'routine' | 'all';
}

export function SvrRoutinePanel({ profile, currentPlan, displayMode = 'all' }: SvrRoutinePanelProps) {
  const [routine, setRoutine] = useState<SvrRoutineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'morning' | 'night'>('morning');
  const [progress, setProgress] = useState(0);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRoutine(null);
    setProgress(10);

    // Progress animation
    const timer = setInterval(() => {
      setProgress(p => (p < 85 ? p + 8 : p));
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
      setProgress(100);
      setRoutine(result);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération. Veuillez réessayer.');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!routine && !loading && !error && profile && currentPlan !== 'FREE') {
      generate();
    }
  }, [profile, routine, loading, error, generate, currentPlan]);


  const activeSteps = routine ? (activeTab === 'morning' ? routine.morning : routine.night) : [];

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
      {!routine && loading && (
        <div style={{
          padding: '30px', textAlign: 'center', background: 'white', borderRadius: 24, 
          border: '1px solid rgba(13,148,136,0.2)', marginBottom: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          <Loader2 className="animate-spin mx-auto mb-3 text-teal-600" size={32} />
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Génération en cours...</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>L'IA sélectionne vos produits SVR personnalisés</div>
        </div>
      )}

      {/* FREE User Notice */}
      {!routine && !loading && currentPlan === 'FREE' && (
        <div style={{
          padding: '40px 20px', textAlign: 'center', background: 'white', borderRadius: 24, 
          border: '1px dashed #cbd5e1', marginBottom: 20
        }}>
          <Lock className="mx-auto mb-4 text-slate-400" size={32} />
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Programme SVR Personnalisé</h3>
          <p style={{ fontSize: 14, color: '#64748b', maxWidth: 400, margin: '8px auto 16px' }}>
            Débloquez votre routine SVR générée par IA et vos programmes de soins personnalisés en passant au plan PRO.
          </p>
          <button 
            onClick={() => window.location.href = '/upgrade'}
            style={{
              padding: '10px 24px', background: 'linear-gradient(135deg,#0d9488,#6366f1)',
              color: 'white', fontWeight: 700, borderRadius: 50, border: 'none', cursor: 'pointer'
            }}
          >
            Passer à PRO
          </button>
        </div>
      )}

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
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {/* ══════════════ RESULTS ══════════════ */}
      {routine && (
        <div style={{ animation: 'fadeUp 0.4s ease' }}>

          {/* ── SECTION 1: PRODUITS RECOMMANDÉS ── */}
          {(displayMode === 'all' || displayMode === 'products') && (
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
                    Sélection IA Personnalisée
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Produits Recommandés pour Votre Peau
                  </h3>
                </div>
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                  background: 'rgba(13,148,136,0.1)', color: '#0d9488',
                  padding: '4px 12px', borderRadius: 99, border: '1px solid rgba(13,148,136,0.25)',
                }}>
                  {routine.recommendedProducts?.length ?? 0} produits sélectionnés
                </span>
              </div>

              {/* Profile result banner */}
              <div style={{
                padding: '14px 18px', marginBottom: 18, borderRadius: 16,
                background: 'linear-gradient(135deg,rgba(13,148,136,0.06),rgba(99,102,241,0.04))',
                border: '1px solid rgba(13,148,136,0.15)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <CheckCircle size={16} style={{ color: '#0d9488', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0d9488' }}>Profil identifié : </span>
                  <span style={{ fontSize: 13, color: '#334155' }}>{routine.skinProfile}</span>
                </div>
                <button
                  onClick={() => { setRoutine(null); setError(null); setProgress(0); }}
                  style={{
                    marginLeft: 'auto', background: 'none', border: '1px solid rgba(13,148,136,0.25)',
                    borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700,
                    color: '#0d9488', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  ↻ Regénérer
                </button>
              </div>

              {/* Product cards grid — grouped by category */}
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
                    gridTemplateColumns: catProducts.length === 1 ? '1fr' : 'repeat(auto-fit,minmax(260px,1fr))',
                    gap: 14,
                  }}>
                    {catProducts.map((p, i) => (
                      <RecommendedCard key={i} product={p} rank={routine.recommendedProducts.indexOf(p) + 1} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── SECTION 2: ROUTINE AM/PM ── */}
          {(displayMode === 'all' || displayMode === 'routine') && (
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
                  Routine Quotidienne Personnalisée
                </h3>
              </div>

              {/* AM/PM tabs */}
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
                    {tab === 'morning' ? '☀️ Routine Matin (AM)' : '🌙 Routine Soir (PM)'}
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      background: activeTab === tab ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: activeTab === tab ? 'white' : '#64748b',
                      padding: '2px 8px', borderRadius: 99,
                    }}>
                      {(tab === 'morning' ? routine.morning : routine.night).length} étapes
                    </span>
                  </button>
                ))}
              </div>

              {/* Step cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeSteps.map((step, idx) => (
                  <StepCard key={idx} step={step} index={idx} />
                ))}
              </div>
            </div>
          )}

          {/* General advice */}
          {routine.generalAdvice && (displayMode === 'all' || displayMode === 'routine') && (
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
                  Conseil Dermatologique Personnalisé
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.7 }}>{routine.generalAdvice}</p>
              </div>
            </div>
          )}

          {/* Footer disclaimer */}
          <div style={{
            marginTop: 14, padding: '12px 18px',
            background: '#fafafa', border: '1px solid #f1f5f9',
            borderRadius: 14, fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5,
          }}>
            🔬 Recommandations générées par l'IA DeepSkyn avec les produits SVR. Non substituable à l'avis d'un dermatologue qualifié.
          </div>
        </div>
      )}
    </div>
  );
}
