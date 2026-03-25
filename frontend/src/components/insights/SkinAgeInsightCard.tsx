import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCcw, Sparkles, Activity, HeartPulse } from 'lucide-react';
import type { SkinAgeInsightResponse } from '@/services/skinAgeInsightsService';
import type { Product } from '@/services/product.service';
import ProductCard from '@/components/ProductCard';

interface SkinAgeInsightCardProps {
  insight?: SkinAgeInsightResponse | null;
  loading?: boolean;
  productsLoading?: boolean;
  onRetry?: () => void;
  onRefreshProducts?: () => void;
  onLaunchAnalysis?: () => void;
  recommendedProducts?: Product[];
}

const statusCopy: Record<string, { color: string; bg: string; label: string }> = {
  younger: { color: '#16a34a', bg: '#dcfce7', label: 'Skin age looks younger' },
  aligned: { color: '#0ea5e9', bg: '#e0f2fe', label: 'Skin age aligned' },
  older: { color: '#ef4444', bg: '#fee2e2', label: 'Needs improvement' },
  unknown: { color: '#64748b', bg: '#e2e8f0', label: 'Pending analysis' },
};

export const SkinAgeInsightCard: React.FC<SkinAgeInsightCardProps> = ({ insight, loading, productsLoading, onRetry, onRefreshProducts, onLaunchAnalysis, recommendedProducts }) => {
  const copy = statusCopy[insight?.status || 'unknown'];
  const missingRealAge = !insight?.latestAnalysis?.realAge;
  const realAge = insight?.latestAnalysis?.realAge;
  const skinAge = insight?.latestAnalysis?.skinAge;
  const delta = insight?.delta;
  const score = insight?.latestAnalysis?.skinScore;

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-teal-50 border border-slate-200 rounded-3xl shadow-sm p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-600/10 border border-teal-100 grid place-items-center text-teal-700">
            <HeartPulse size={18} />
          </div>
          <div>
            <p className="text-[11px] uppercase font-bold text-slate-400 tracking-[0.2em]">Overview</p>
            <h3 className="text-lg font-extrabold text-slate-900">Skin Age Insights · Age Analysis</h3>
            <p className="text-xs text-slate-500">Clinical-style view of real vs. skin age, deltas, score, and targeted actions.</p>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
            disabled={loading}
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-100 rounded" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          <div className="h-20 bg-slate-100 rounded" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold" style={{ color: copy.color, background: copy.bg }}>
              {copy.label}
            </span>
            {delta != null && (
              <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-semibold">
                Δ skin vs real: {delta > 0 ? '+' : ''}{delta} yrs
              </span>
            )}
            {score != null && (
              <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold border border-teal-100 flex items-center gap-1">
                <Activity size={12} /> Score {score}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 p-4 rounded-2xl border border-slate-100 bg-gradient-to-r from-white to-teal-50">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Summary</p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {insight?.headline || 'Analysis pending. Launch an AI scan to unlock your data.'}
                  </p>
                </div>
                {missingRealAge && (
                  <span className="px-3 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold">Run analysis with age</span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{ label: 'Detected real age', value: realAge, tone: 'text-slate-900' },
                  { label: 'Detected skin age', value: skinAge, tone: 'text-slate-900' },
                  { label: 'Delta (yrs)', value: delta != null ? `${delta > 0 ? '+' : ''}${delta}` : '—', tone: delta != null && delta <= 0 ? 'text-emerald-600' : 'text-amber-600' },
                  { label: 'Skin score', value: score, tone: 'text-teal-700' }].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-white border border-slate-100 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.14em]">{item.label}</p>
                    <p className={`text-xl font-extrabold ${item.tone}`}>{item.value ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-100 bg-white">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Quick tips</p>
              <ul className="space-y-1.5 text-sm text-slate-700 list-disc list-inside">
                {(insight?.advice || ['Add a first analysis.']).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border border-slate-100 bg-white lg:col-span-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Targeted recommendations</p>
              <div className="flex flex-wrap gap-2">
                {(insight?.productSuggestions || ['Anti-aging', 'Hydration']).map((item, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-xs font-semibold text-teal-700 shadow-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-slate-100 bg-white">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Benchmarks</p>
              <p className="text-sm text-slate-600">Personal: {insight?.userBenchmark.avgRealAge ?? '—'} / {insight?.userBenchmark.avgSkinAge ?? '—'} yrs (Δ {insight?.userBenchmark.avgDelta ?? '—'})</p>
              <p className="text-sm text-slate-600">Dataset: {insight?.datasetBenchmark.avgRealAge ?? '—'} / {insight?.datasetBenchmark.avgSkinAge ?? '—'} yrs (Δ {insight?.datasetBenchmark.avgDelta ?? '—'}) · n={insight?.datasetBenchmark.sampleSize ?? 0}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 mb-1">
            <h4 className="text-sm font-bold text-slate-800">Produits recommandés</h4>
            {onRefreshProducts && (
              <button
                onClick={onRefreshProducts}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                disabled={productsLoading}
              >
                <RefreshCcw size={12} className={productsLoading ? 'animate-spin' : ''} />
                Refresh products
              </button>
            )}
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : recommendedProducts && recommendedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {recommendedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No products recommended yet.</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onLaunchAnalysis}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d9488] text-white text-sm font-semibold shadow hover:bg-[#0b7b74] disabled:opacity-60"
              disabled={loading}
            >
              <Sparkles size={14} /> Launch AI analysis
            </button>
            <Link
              to="/analysis/history"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              View history
              <ArrowRight size={14} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default SkinAgeInsightCard;
