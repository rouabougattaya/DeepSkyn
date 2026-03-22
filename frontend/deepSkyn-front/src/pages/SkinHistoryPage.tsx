import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUser } from '@/lib/authSession';
import {
    History,
    ArrowLeft,
    ChevronRight,
    ChevronLeft,
    Activity,
    Search,
    BarChart3,
    Maximize2
} from 'lucide-react';
import { comparisonService } from '@/services/comparison.service';
import TimelineView from '@/components/insights/TimelineView';
import HistoryTimelineModal from '@/components/insights/HistoryTimelineModal';

import { Navbar } from '@/components/Navbar';

export default function SkinHistoryPage() {
    const [analyses, setAnalyses] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [timelineData, setTimelineData] = useState<{ date: string; score: number }[]>([]);
    const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 6;

    const navigate = useNavigate();
    const user = getUser();
    const userId = user?.id;

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                if (!userId) {
                    navigate('/auth/login');
                    return;
                }

                setError(null);
                const response = await comparisonService.getUserAnalyses(currentPage, pageSize);

                if (!isMounted) return;

                setAnalyses(response.data);
                setTotalItems(response.total);

                const history = response.data.map((a: any) => ({
                    date: new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                    score: a.skinScore
                })).reverse();
                setTimelineData(history);
                setLoading(false);
            } catch (err: any) {
                if (!isMounted) return;
                console.error('Error fetching history:', err);
                if (err.message?.includes('401') || err.status === 401) {
                    navigate('/auth/login');
                    return;
                }
                setError('Unable to load your history. Please try again.');
                setLoading(false);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [userId, navigate, currentPage]);

    const filteredAnalyses = useMemo(() => {
        if (!searchTerm) return analyses;
        const term = searchTerm.toLowerCase();
        return analyses.filter(a =>
            new Date(a.createdAt).toLocaleDateString().toLowerCase().includes(term) ||
            a.skinScore.toString().includes(term)
        );
    }, [analyses, searchTerm]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d9488]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Navbar />
            <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <Link to="/dashboard" className="p-2 bg-white rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 transition-all">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                    <History className="w-8 h-8 text-[#0d9488]" />
                                    Skin Analysis History
                                </h1>
                                <p className="text-slate-500">Track your skin's evolution over time</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#0d9488] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by date or score..."
                                    className="w-full sm:w-80 pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main List */}
                        <div className="lg:col-span-2 space-y-4">
                            {error ? (
                                <div className="bg-white p-12 rounded-3xl border border-rose-100 text-center">
                                    <Activity className="w-12 h-12 text-rose-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-slate-900">{error}</h3>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="mt-6 inline-flex items-center gap-2 px-6 py-2 bg-[#0d9488] text-white rounded-full font-bold hover:bg-[#0a7a70] transition-all"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : filteredAnalyses.length > 0 ? (
                                filteredAnalyses.map((analysis) => (
                                    <div key={analysis.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${analysis.skinScore >= 75 ? 'bg-teal-50 text-teal-600 border border-teal-100' :
                                                    analysis.skinScore >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                        'bg-rose-50 text-rose-600 border border-rose-100'
                                                    }`}>
                                                    {analysis.skinScore}
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Analysis Date</p>
                                                    <p className="font-bold text-slate-900">
                                                        {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Activity className="w-3 h-3" />
                                                        {analysis.summary || 'General health check'}
                                                    </div>
                                                </div>
                                            </div>

                                            <Link
                                                to={`/analysis/details/${analysis.id}`}
                                                className="flex items-center gap-2 text-sm font-bold text-[#0d9488] hover:gap-3 transition-all"
                                            >
                                                View Details
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
                                    <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Analysis History</h2>
                                    <p className="text-slate-500 text-sm font-medium">Track your skincare journey over time</p>
                                    <Link
                                        to="/analysis"
                                        className="inline-flex items-center gap-2 px-6 py-2 bg-[#0d9488] text-white rounded-full font-bold hover:bg-[#0a7a70] transition-all"
                                    >
                                        Analyze Skin Now
                                    </Link>
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {totalItems > pageSize && (
                                <div className="flex items-center justify-center gap-4 mt-8 py-4 border-t border-slate-100">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>

                                    <div className="flex items-center gap-1">
                                        <span className="text-sm font-bold text-slate-900">Page {currentPage}</span>
                                        <span className="text-sm text-slate-400">of {Math.ceil(totalItems / pageSize)}</span>
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalItems / pageSize), prev + 1))}
                                        disabled={currentPage === Math.ceil(totalItems / pageSize)}
                                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Sidebar Area */}
                        <div className="lg:col-span-1 space-y-6">
                            <div
                                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group/card sticky top-24"
                                onClick={() => setIsTimelineModalOpen(true)}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-[#0d9488]" />
                                        Evolution Overview
                                    </h3>
                                    <Maximize2 className="w-4 h-4 text-slate-300 group-hover/card:text-[#0d9488] transition-colors" />
                                </div>
                                <div className="h-64 pointer-events-none">
                                    <TimelineView data={timelineData} showTitle={false} height="100%" />
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-slate-500">Total Analyses</span>
                                        <span className="font-bold text-slate-900">{totalItems}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Page Average Score</span>
                                        <span className="font-bold text-teal-600">
                                            {analyses.length > 0
                                                ? Math.round(analyses.reduce((acc, current) => acc + current.skinScore, 0) / analyses.length)
                                                : 0}
                                        </span>
                                    </div>
                                    <div className="mt-4 text-center">
                                        <p className="text-[10px] text-slate-400 font-medium">Click to see full period analysis</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <HistoryTimelineModal
                isOpen={isTimelineModalOpen}
                onClose={() => setIsTimelineModalOpen(false)}
                userId={userId}
            />
        </div >
    );
}

