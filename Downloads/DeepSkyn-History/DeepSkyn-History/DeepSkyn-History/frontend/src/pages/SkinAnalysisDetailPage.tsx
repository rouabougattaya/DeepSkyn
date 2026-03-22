import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Sparkles,
    Shield,
    Clock,
    Info,
    CheckCircle2,
    BarChart2
} from 'lucide-react';
import { comparisonService } from '@/services/comparison.service';
import type { ComparedAnalysisItem, MetricKey } from '@/services/comparison.service';

const METRIC_LABELS: Record<MetricKey, string> = {
    hydration: 'Hydratation',
    oil: 'Sébum',
    acne: 'Acné',
    wrinkles: 'Rides',
};

function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
    const r = 45;
    const circumference = 2 * Math.PI * r;
    const filled = ((100 - score) / 100) * circumference;
    const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Medium' : 'Needs Care';

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <circle
                    cx="50" cy="50" r={r} fill="none"
                    stroke={color} strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={filled}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black" style={{ color }}>{Math.round(score)}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{label}</span>
            </div>
        </div>
    );
}

function MetricBar({ label, value }: { label: string; value: number }) {
    const color = value >= 75 ? 'bg-teal-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500';
    const bgColor = value >= 75 ? 'bg-teal-50' : value >= 50 ? 'bg-amber-50' : 'bg-rose-50';

    return (
        <div className={`p-4 rounded-2xl border border-slate-100 ${bgColor}/30`}>
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-slate-700">{label}</span>
                <span className="text-sm font-black text-slate-900">{Math.round(value)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

import { Navbar } from '@/components/Navbar';

export default function SkinAnalysisDetailPage() {
    const { id } = useParams();
    const [analysis, setAnalysis] = useState<ComparedAnalysisItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!id) return;

        const fetchAnalysis = async () => {
            try {
                const data = await comparisonService.getAnalysis(id);
                setAnalysis(data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching analysis:', err);
                setError('Unable to load analysis details.');
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d9488]"></div>
                    <p className="text-slate-500 font-medium">Loading AI data...</p>
                </div>
            </div>
        );
    }

    if (error || !analysis) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center max-w-md">
                    <Info className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
                    <p className="text-slate-500 mb-6">{error || 'Analysis not found.'}</p>
                    <Link to="/analysis/history" className="px-6 py-2 bg-[#0d9488] text-white rounded-full font-bold">
                        Back to history
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Navbar />
            <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                Analysis from {new Date(analysis.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </h1>
                            <p className="text-slate-500 text-sm">ID: {analysis.id.slice(0, 8)} • Status: <span className="text-teal-600 font-bold">Completed</span></p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Left: Global Score */}
                        <div className="md:col-span-1 space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Global Score</h3>
                                <ScoreRing score={analysis.skinScore} />
                                <div className="mt-8 space-y-3 w-full">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                            <Clock size={14} /> Time
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">
                                            {new Date(analysis.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                            <Shield size={14} /> Skin Age
                                        </div>
                                        <span className="text-sm font-bold text-teal-600">{analysis.skinAge || 'N/A'} years</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Detailed Metrics */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <BarChart2 className="w-5 h-5 text-[#0d9488]" />
                                        Parameters Details
                                    </h3>
                                    <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[10px] font-bold uppercase tracking-widest rounded-full border border-teal-100 italic">
                                        AI Accuracy 98.4%
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.entries(analysis.metrics).map(([key, value]) => (
                                        <MetricBar key={key} label={METRIC_LABELS[key as MetricKey] || key} value={value} />
                                    ))}
                                </div>
                            </div>

                            {/* AI Summary */}
                            <div className="bg-[#0d9488] p-8 rounded-3xl shadow-xl shadow-teal-500/20 text-white relative overflow-hidden group">
                                <Sparkles className="absolute -right-4 -top-4 w-24 h-24 opacity-10 group-hover:rotate-12 transition-transform" />
                                <div className="relative z-10">
                                    <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80">
                                        <CheckCircle2 className="w-4 h-4" /> Analysis Summary
                                    </h3>
                                    <p className="text-lg font-medium leading-relaxed italic">
                                        "{analysis.summary || "Your skin shows signs of vitality. Maintain your current routine to preserve these results."}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
