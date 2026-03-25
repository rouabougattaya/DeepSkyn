import { ExternalLink, Leaf, Star } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '../services/product.service';

interface ProductCardProps {
    product: Product;
}

const TYPE_COLORS: Record<string, string> = {
    cleanser: 'bg-sky-50  border-sky-200  text-sky-700',
    serum: 'bg-violet-50 border-violet-200 text-violet-700',
    moisturizer: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    moisturiser: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    treatment: 'bg-amber-50  border-amber-200  text-amber-700',
};

function typeColor(type: string): string {
    return TYPE_COLORS[type?.toLowerCase?.()] ?? 'bg-slate-50 border-slate-200 text-slate-600';
}

function normalizeUrl(u: unknown): string | null {
    if (typeof u !== 'string') return null;
    const t = u.trim();
    if (!t || t === '#') return null;
    if (t.startsWith('http://')) return `https://${t.slice('http://'.length)}`;
    if (t.startsWith('https://')) return t;
    if (t.startsWith('//')) return `https:${t}`;
    return `https://${t}`;
}

export default function ProductCard({ product }: ProductCardProps) {
    const buyUrl = normalizeUrl(product.url);
    const badgeClass = typeColor(product.type);
    const [failedImg, setFailedImg] = useState(false);

    return (
        <div className="group flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            {/* Image or gradient placeholder */}
            <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-teal-50 to-indigo-50 flex items-center justify-center">
                {product.imageUrl && !failedImg ? (
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => setFailedImg(true)}
                    />
                ) : (
                    <span className="text-4xl select-none">🧴</span>
                )}

                {/* isClean badge */}
                {product.isClean && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow">
                        <Leaf size={10} />
                        Clean
                    </div>
                )}
            </div>

            <div className="flex flex-col flex-1 p-4 gap-3">
                {/* Type chip */}
                <span className={`self-start rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${badgeClass}`}>
                    {product.type}
                </span>

                {/* Name */}
                <h3 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
                    {product.name}
                </h3>

                {/* Description */}
                {product.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
                )}

                {/* Rating + Price row */}
                <div className="mt-auto flex items-center justify-between gap-2">
                    {product.rating != null ? (
                        <div className="flex items-center gap-1 text-amber-500">
                            <Star size={13} fill="currentColor" />
                            <span className="text-xs font-bold text-slate-700">{product.rating.toFixed(1)}</span>
                        </div>
                    ) : (
                        <div />
                    )}

                    {product.price != null && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-extrabold text-slate-800">
                            £{product.price.toFixed(2)}
                        </span>
                    )}
                </div>

                {/* Buy link */}
                {buyUrl ? (
                    <a
                        href={buyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:brightness-105 transition"
                    >
                        <ExternalLink size={13} />
                        Buy
                    </a>
                ) : (
                    <div className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400">
                        Link unavailable
                    </div>
                )}
            </div>
        </div>
    );
}
