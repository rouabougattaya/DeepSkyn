import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, X, Star, Crown, Zap, ShieldCheck,
  ArrowRight, Sparkles, Loader2, Users, BarChart3, Lock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlanFeature {
  label: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  description: string;
  features: PlanFeature[];
  badge: string | null;
  highlighted: boolean;
}

// ─── Visual helpers ───────────────────────────────────────────────────────────
const PLAN_VISUALS: Record<string, {
  icon: React.ElementType;
  gradient: string;
  ring: string;
  btn: string;
  iconBg: string;
  badgeClass: string;
}> = {
  FREE: {
    icon: ShieldCheck,
    gradient: 'from-slate-500 to-slate-700',
    ring: 'ring-slate-200',
    btn: 'bg-slate-800 hover:bg-slate-700 text-white',
    iconBg: 'bg-slate-100 text-slate-600',
    badgeClass: 'bg-slate-100 text-slate-600',
  },
  PRO: {
    icon: Zap,
    gradient: 'from-teal-400 to-teal-600',
    ring: 'ring-teal-400',
    btn: 'bg-teal-600 hover:bg-teal-500 text-white',
    iconBg: 'bg-teal-100 text-teal-600',
    badgeClass: 'bg-teal-500 text-white',
  },
  PREMIUM: {
    icon: Crown,
    gradient: 'from-purple-500 to-purple-700',
    ring: 'ring-purple-400',
    btn: 'bg-purple-600 hover:bg-purple-500 text-white',
    iconBg: 'bg-purple-100 text-purple-600',
    badgeClass: 'bg-purple-100 text-purple-700',
  },
};

const getPlanTextColor = (planId: string) => {
  if (planId === 'PRO') return 'text-teal-500';
  if (planId === 'PREMIUM') return 'text-purple-500';
  return 'text-slate-500';
};

// ─── FAQs ─────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel anytime from your account settings with no penalties or hidden fees.' },
  { q: 'Is my payment information secure?', a: 'Absolutely. All transactions use 256-bit SSL encryption and we never store full card numbers.' },
  { q: 'Can I upgrade or downgrade my plan?', a: 'You can upgrade any time. Downgrades take effect at the end of your billing cycle.' },
  { q: 'Is there a free trial?', a: 'The Free plan is yours forever — no credit card required. Paid plans can be cancelled with a 30-day money-back guarantee.' },
];

// ─── FAQ Item ────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
      >
        {q}
        <span className={`ml-4 shrink-0 transition-transform ${open ? 'rotate-45' : ''} text-slate-400 text-lg leading-none`}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetch(`${API_BASE}/plans`)
      .then(r => r.json())
      .then((data: Plan[]) => setPlans(data))
      .catch(() => setError('Could not load plans. Please refresh.'))
      .finally(() => setLoading(false));
  }, [API_BASE]);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 font-black text-lg text-slate-900"
          >
            <Sparkles size={20} className="text-teal-500" />
            DeepSkyn
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/auth/login')}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/auth/register')}
              className="text-sm font-bold bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-500 transition-colors"
            >
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-16 px-4 text-center relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-100 rounded-full blur-3xl opacity-40 -translate-y-1/2" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-30 -translate-y-1/2" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold mb-6">
            <Star size={12} fill="currentColor" /> Simple, transparent pricing
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-tight mb-5">
            The right plan for<br />
            <span className="bg-gradient-to-r from-teal-500 via-teal-400 to-purple-500 bg-clip-text text-transparent">
              your skin journey
            </span>
          </h1>
          <p className="text-xl text-slate-500 max-w-xl mx-auto mb-8">
            Start free. Upgrade when you're ready for deeper AI insights, unlimited analyses, and personalised skincare coaching.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-semibold text-slate-500">
            <div className="flex items-center gap-2"><Users size={16} className="text-teal-500" /> 50,000+ users</div>
            <div className="flex items-center gap-2"><BarChart3 size={16} className="text-purple-500" /> 1M+ analyses done</div>
            <div className="flex items-center gap-2"><Star size={16} className="text-amber-400" fill="currentColor" /> 4.9 / 5 rating</div>
          </div>
        </div>
      </section>

      {/* ── Plan Cards ───────────────────────────────────────────────────── */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto">

          {loading && (
            <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
              <Loader2 size={24} className="animate-spin" /> Loading plans…
            </div>
          )}

          {error && (
            <div className="text-center py-20 text-red-500 font-medium">{error}</div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {plans.map((plan) => {
                const v = PLAN_VISUALS[plan.id] ?? PLAN_VISUALS.FREE;
                const Icon = v.icon;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col bg-white rounded-3xl border-2 transition-all duration-300
                      ${plan.highlighted
                        ? `border-teal-400 ring-4 ${v.ring} shadow-2xl shadow-teal-100 scale-[1.03]`
                        : 'border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                  >
                    {/* Popular / Best Value badge */}
                    {plan.badge && (
                      <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black shadow ${v.badgeClass}`}>
                        {plan.id === 'PRO' ? '⭐ ' : '👑 '}{plan.badge}
                      </div>
                    )}

                    {/* Card header */}
                    <div className={`rounded-t-3xl p-6 bg-gradient-to-br ${v.gradient} text-white`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl grid place-items-center">
                          <Icon size={20} />
                        </div>
                        <h2 className="text-xl font-black">{plan.name}</h2>
                      </div>

                      <div className="flex items-end gap-1 mb-1">
                        <span className="text-5xl font-black">
                          {plan.price === 0 ? '$0' : `$${plan.price}`}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-base opacity-70 pb-2">/ mo</span>
                        )}
                      </div>
                      <p className="text-xs opacity-70">{plan.period}</p>
                      <p className="text-sm opacity-80 mt-3 leading-relaxed">{plan.description}</p>
                    </div>

                    {/* CTA */}
                    <div className="px-6 pt-5">
                      <button
                        onClick={() =>
                          plan.price === 0
                            ? navigate('/auth/register')
                            : navigate('/auth/register')
                        }
                        className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 hover:shadow-lg active:scale-95 ${v.btn}`}
                      >
                        {plan.price === 0 ? 'Get started for free' : `Get ${plan.name}`}
                        <ArrowRight size={15} />
                      </button>
                    </div>

                    {/* Features */}
                    <div className="flex-1 px-6 pb-6 pt-4 space-y-2.5 mt-2 border-t border-slate-100">
                      {plan.features.map((f) => (
                        <div
                          key={f.label}
                          className={`flex items-start gap-2.5 text-sm ${f.included ? 'text-slate-700' : 'text-slate-300'}`}
                        >
                          {f.included
                            ? <CheckCircle2 size={15} className={`mt-0.5 shrink-0 ${getPlanTextColor(plan.id)}`} />
                            : <X size={15} className="mt-0.5 shrink-0" />
                          }
                          {f.label}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Comparison Table ─────────────────────────────────────────────── */}
      {!loading && !error && plans.length > 0 && (
        <section className="py-16 px-4 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-black text-slate-900 text-center mb-2">Full comparison</h2>
            <p className="text-slate-500 text-center mb-10">See exactly what you get with each plan.</p>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-4 border-b border-slate-100">
                <div className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Feature</div>
                {plans.map(p => (
                  <div key={p.id} className={`p-4 text-center text-sm font-black ${p.highlighted ? 'bg-teal-50 text-teal-700' : 'text-slate-700'}`}>
                    {p.name}
                  </div>
                ))}
              </div>

              {/* Table rows — use features from PRO (longest list) */}
              {plans[1]?.features.map((f, i) => (
                <div key={f.label} className={`grid grid-cols-4 border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                  <div className="p-3.5 pl-5 text-sm text-slate-600">{f.label.replace(/\/ month| \/ day/, '')}</div>
                  {plans.map(p => {
                    const feat = p.features[i];
                    return (
                      <div key={p.id} className={`p-3.5 flex items-center justify-center ${p.highlighted ? 'bg-teal-50/40' : ''}`}>
                        {feat?.included
                          ? <CheckCircle2 size={16} className={getPlanTextColor(p.id)} />
                          : <X size={16} className="text-slate-200" />
                        }
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-slate-900 text-center mb-2">Frequently asked questions</h2>
          <p className="text-slate-500 text-center mb-10">Everything you need to know about our plans.</p>
          <div className="space-y-3">
            {FAQS.map(faq => <FaqItem key={faq.q} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-teal-500 to-purple-600 rounded-3xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-3xl font-black mb-3">Ready to transform your skin?</h2>
          <p className="text-white/80 mb-8 text-lg">Join 50,000+ users already using DeepSkyn to understand and improve their skin.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/auth/register')}
              className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-50 transition-all hover:shadow-lg active:scale-95"
            >
              Start free — no card needed
            </button>
            <button
              onClick={() => navigate('/auth/login')}
              className="px-8 py-4 bg-white/10 border border-white/30 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors"
            >
              Sign in
            </button>
          </div>
          <p className="mt-5 text-white/60 text-xs flex items-center justify-center gap-1">
            <Lock size={11} /> No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-8 px-4 text-center text-sm text-slate-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles size={16} className="text-teal-500" />
          <span className="font-black text-slate-700">DeepSkyn</span>
        </div>
        © {new Date().getFullYear()} DeepSkyn. All rights reserved.
      </footer>
    </div>
  );
}
