import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Crown, Zap, ShieldCheck, CreditCard,
  ArrowRight, Star, Loader2, X, Lock, CheckCheck,
} from 'lucide-react';
import { getUser } from '@/lib/authSession';
import { subscribePlan, createCheckoutSession, type Plan, type SubscribeResult } from '@/services/paymentService';
import { apiGet } from '@/services/apiClient';
import type { SubscriptionData } from '@/services/paymentService';

// ─── Plan definitions ───────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'FREE' as Plan,
    name: 'Gratuit',
    price: 0,
    priceLabel: '0€',
    period: 'pour toujours',
    icon: ShieldCheck,
    color: 'slate',
    gradient: 'from-slate-400 to-slate-600',
    border: 'border-slate-200',
    badge: null,
    features: [
      '5 analyses de peau IA / mois',
      '20 messages chat IA / jour',
      'Score de peau de base',
      'Suggestions de routine',
      'Accès communauté',
    ],
    missing: [
      'Rapports d\'analyse avancés',
      'Réponses IA prioritaires',
      'Recommandations produits',
      'Suivi de progression',
    ],
  },
  {
    id: 'PRO' as Plan,
    name: 'Pro',
    price: 20,
    priceLabel: '20€',
    period: 'par mois',
    icon: Zap,
    color: 'teal',
    gradient: 'from-teal-400 to-teal-600',
    border: 'border-teal-400',
    badge: '⭐ Le plus populaire',
    features: [
      '50 analyses de peau IA / mois',
      '200 messages chat IA / jour',
      'Rapports de peau détaillés',
      'Réponses IA prioritaires',
      'Recommandations produits intelligentes',
      'Suivi de progression et graphiques',
      'Export PDF de l\'analyse',
    ],
    missing: [
      'Tout en illimité',
      'Support dédié',
    ],
  },
  {
    id: 'PREMIUM' as Plan,
    name: 'Premium',
    price: 50,
    priceLabel: '50€',
    period: 'par mois',
    icon: Crown,
    color: 'purple',
    gradient: 'from-purple-400 to-purple-700',
    border: 'border-purple-400',
    badge: '👑 Meilleure valeur',
    features: [
      'Analyses de peau IA illimitées',
      'Messages chat IA illimités',
      'Rapports complets niveau expert',
      'Réponses IA ultra-prioritaires',
      'Accès boutique produits curatés',
      'Suivi de progression complet',
      'Export PDF illimité',
      'Support Premium dédié',
      'Accès anticipé aux nouveautés',
    ],
    missing: [],
  },
];

const COLOR_MAP: Record<string, Record<string, string>> = {
  slate: { bg: 'bg-slate-50', text: 'text-slate-700', ring: 'ring-slate-300', btn: 'bg-slate-800 hover:bg-slate-700', badge: 'bg-slate-100 text-slate-600' },
  teal:  { bg: 'bg-teal-50',  text: 'text-teal-700',  ring: 'ring-teal-400',  btn: 'bg-teal-600 hover:bg-teal-500',  badge: 'bg-teal-100 text-teal-700'  },
  purple:{ bg: 'bg-purple-50',text: 'text-purple-700',ring: 'ring-purple-400',btn: 'bg-purple-600 hover:bg-purple-500',badge: 'bg-purple-100 text-purple-700'},
};

// ─── Checkout Modal ──────────────────────────────────────────────────────────
interface CheckoutModalProps {
  plan: (typeof PLANS)[number];
  onClose: () => void;
  onSuccess: (result: SubscribeResult) => void;
}

function CheckoutModal({ plan, onClose, onSuccess }: CheckoutModalProps) {
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry]         = useState('');
  const [cvv, setCvv]               = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // Format card number with spaces
  const handleCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    setCardNumber(digits.replace(/(.{4})/g, '$1 ').trim());
  };

  const handleExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = getUser();
    if (!user?.id) { setError('Veuillez vous connecter d\'abord.'); return; }

    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 16) { setError('Veuillez entrer un numéro de carte valide.'); return; }
    if (!expiry.match(/^\d{2}\/\d{2}$/)) { setError('Veuillez entrer une date d\'expiration valide (MM/AA).'); return; }
    if (cvv.length < 3) { setError('Veuillez entrer un CVV valide.'); return; }

    setLoading(true);
    try {
      const result = await subscribePlan({
        userId: user.id,
        plan: plan.id as 'PRO' | 'PREMIUM',
        cardHolder: cardHolder.trim(),
        cardLast4: digits.slice(-4),
      });
      onSuccess(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Le paiement a échoué. Veuillez réessayer.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const c = COLOR_MAP[plan.color];
  const Icon = plan.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        {/* Header */}
        <div className={`bg-gradient-to-br ${plan.gradient} p-6 text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl grid place-items-center">
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs opacity-80 font-medium uppercase tracking-wider">Passage au</p>
              <h3 className="text-xl font-black">Plan {plan.name}</h3>
            </div>
          </div>
          <p className="text-3xl font-black mt-3">
            {plan.priceLabel}
            <span className="text-base font-normal opacity-70"> / mois</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Nom du titulaire
            </label>
            <input
              type="text"
              required
              value={cardHolder}
              onChange={e => setCardHolder(e.target.value)}
              placeholder="Dina Ben Ali"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 transition-shadow"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Numéro de carte
            </label>
            <div className="relative">
              <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={cardNumber}
                onChange={e => handleCardNumber(e.target.value)}
                placeholder="1234 5678 9012 3456"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 transition-shadow"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Expiration
              </label>
              <input
                type="text"
                required
                value={expiry}
                onChange={e => handleExpiry(e.target.value)}
                placeholder="MM/AA"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                CVV
              </label>
              <input
                type="password"
                required
                value={cvv}
                onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="•••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 transition-shadow"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <X size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 ${c.btn} disabled:opacity-60`}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Traitement…</>
            ) : (
              <><Lock size={14} /> Payer {plan.priceLabel} / mois</>
            )}
          </button>

          <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
            <Lock size={11} /> Paiement sécurisé SSL 256-bit · Annulable à tout moment
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── Success Banner ──────────────────────────────────────────────────────────
function SuccessBanner({ plan, onClose }: { plan: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-fade-in">
        <div className="w-20 h-20 bg-green-50 rounded-full grid place-items-center mx-auto mb-4">
          <CheckCheck size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Vous êtes sur {plan} ! 🎉</h2>
        <p className="text-slate-500 text-sm mb-6">Votre plan a été mis à jour avec succès. Profitez de vos nouvelles fonctionnalités !</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-500 transition-colors"
        >
          Commencer à utiliser {plan}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function UpgradePage() {
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<Plan>('FREE');
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[number] | null>(null);
  const [successPlan, setSuccessPlan]   = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user?.id) { setLoading(false); return; }
    apiGet<SubscriptionData>(`/subscription/${user.id}`)
      .then(s => setCurrentPlan(s.plan))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpgradeClick = async (plan: (typeof PLANS)[number]) => {
    if (plan.price === 0) return; // FREE has no checkout
    
    const user = getUser();
    if (!user?.id) { navigate('/auth/login'); return; }

    setLoading(true);
    try {
      const { url } = await createCheckoutSession(user.id, plan.id);
      if (url) {
        window.location.href = url; // Redirect to Stripe
      } else {
        setSelectedPlan(plan); // Fallback to mock form
      }
    } catch (err) {
      console.error('Stripe error, falling back to mock:', err);
      setSelectedPlan(plan); // Fallback to mock form if Stripe fails (e.g. no keys)
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (result: SubscribeResult) => {
    setSelectedPlan(null);
    setCurrentPlan(result.subscription.plan);
    setSuccessPlan(result.subscription.plan);
  };

  const planLevel = { FREE: 0, PRO: 1, PREMIUM: 2 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Checkout modal */}
      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Success modal */}
      {successPlan && (
        <SuccessBanner
          plan={successPlan}
          onClose={() => { setSuccessPlan(null); navigate('/dashboard'); }}
        />
      )}

      {/* Page Header */}
      <div className="text-center pt-12 pb-8 px-4">
        <p className="text-teal-600 font-bold mb-4 flex items-center gap-2 justify-center">
          <Star size={20} className="fill-teal-500" />
          <span>Plans & Tarification</span>
        </p>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 leading-tight">
          Choisissez le plan qui <br />
          <span className="bg-gradient-to-r from-teal-500 to-purple-500 bg-clip-text text-transparent">
            sublime votre peau
          </span>
        </h1>
        <p className="text-slate-500 text-lg max-w-xl mx-auto">
          Débloquez des analyses IA plus profondes, des consultations illimitées et des conseils skincare exclusifs.
        </p>

        {loading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Chargement de votre plan…
          </div>
        )}
        {!loading && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-semibold shadow-sm">
            Plan actuel : <span className="text-teal-700 font-black">{currentPlan}</span>
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 pb-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const c = COLOR_MAP[plan.color];
          const Icon = plan.icon;
          const isCurrent = plan.id === currentPlan;
          const isLocked  = planLevel[plan.id as Plan] <= planLevel[currentPlan];

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col bg-white rounded-3xl border-2 ${plan.badge ? plan.border : 'border-slate-200'} shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${plan.badge ? 'scale-[1.02] md:scale-105' : ''}`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={`absolute top-0 inset-x-0 py-1.5 text-center text-xs font-black tracking-wide ${c.badge}`}>
                  {plan.badge}
                </div>
              )}

              <div className={`p-6 ${plan.badge ? 'pt-9' : ''}`}>
                {/* Plan header */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.gradient} grid place-items-center mb-4`}>
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-slate-900">{plan.priceLabel}</span>
                  {plan.price > 0 && <span className="text-slate-400 text-sm pb-1">/ mo</span>}
                </div>
                <p className="text-xs text-slate-400">{plan.period}</p>

                {/* CTA Button */}
                <div className="mt-5">
                  {isCurrent ? (
                    <div className="w-full py-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm text-center">
                      ✓ Plan Actuel
                    </div>
                  ) : isLocked ? (
                    <div className="w-full py-3 rounded-xl bg-slate-50 text-slate-300 font-bold text-sm text-center border border-slate-100">
                      Non disponible
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgradeClick(plan)}
                      className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 ${c.btn} hover:shadow-lg active:scale-95`}
                    >
                      Passer à {plan.name} <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className={`flex-1 px-6 pb-6 border-t ${c.bg === 'bg-white' ? 'border-slate-100' : 'border-slate-100'} pt-4 space-y-2`}>
                {plan.features.map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 size={15} className={`mt-0.5 shrink-0 ${c.text}`} />
                    {f}
                  </div>
                ))}
                {plan.missing.map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <X size={15} className="mt-0.5 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust badges */}
      <div className="border-t border-slate-100 py-8 px-4">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-6 text-slate-400 text-sm">
          <div className="flex items-center gap-2"><Lock size={14} /> Paiement sécurisé</div>
          <div className="flex items-center gap-2"><CheckCircle2 size={14} /> Annulable à tout moment</div>
          <div className="flex items-center gap-2"><Star size={14} /> Garantie 30 jours</div>
          <div className="flex items-center gap-2"><CreditCard size={14} /> Toutes cartes acceptées</div>
        </div>
      </div>
    </div>
  );
}
