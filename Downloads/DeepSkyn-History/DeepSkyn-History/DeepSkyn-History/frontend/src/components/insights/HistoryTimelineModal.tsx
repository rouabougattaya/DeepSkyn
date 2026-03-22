import React, { useEffect, useState } from 'react';
import { X, Calendar, TrendingUp } from 'lucide-react';
import { comparisonService } from '@/services/comparison.service';
import TimelineView from './TimelineView';

interface HistoryTimelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string | undefined;
}

const HistoryTimelineModal: React.FC<HistoryTimelineModalProps> = ({ isOpen, onClose, userId }) => {
    const [fullHistory, setFullHistory] = useState<{ date: string; score: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            const fetchFullHistory = async () => {
                try {
                    setLoading(true);
                    // Fetch a large limit to ensure we get the full history for the chart
                    const response = await comparisonService.getUserAnalyses(1, 1000);

                    const formattedHistory = response.data.map((a: any) => ({
                        date: new Date(a.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                        }),
                        score: a.skinScore
                    })).reverse();

                    setFullHistory(formattedHistory);
                    setLoading(false);
                } catch (err) {
                    console.error('Error fetching full history:', err);
                    setError('Unable to load full timeline.');
                    setLoading(false);
                }
            };
            fetchFullHistory();
        }
    }, [isOpen, userId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-6xl h-full max-h-[85vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-[#0d9488]" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Full History Analysis</h2>
                            <p className="text-slate-500 text-sm font-medium flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                Comprehensive skin evolution overview
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Chart Area */}
                <div className="flex-1 p-8 overflow-y-auto">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d9488]"></div>
                            <p className="text-slate-500 font-medium animate-pulse">Gathering history data...</p>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                                <X className="w-10 h-10 text-rose-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{error}</h3>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-[#0d9488] text-white rounded-full font-bold hover:bg-[#0a7a70] transition-all"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <div className="h-full">
                            <TimelineView
                                data={fullHistory}
                                height="100%"
                                showTitle={false}
                            />
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                {!loading && !error && (
                    <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Records</span>
                                <span className="text-lg font-black text-slate-900">{fullHistory.length}</span>
                            </div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Average Score</span>
                                <span className="text-lg font-black text-teal-600">
                                    {fullHistory.length > 0
                                        ? Math.round(fullHistory.reduce((acc, curr) => acc + curr.score, 0) / fullHistory.length)
                                        : 0}
                                </span>
                            </div>
                        </div>
                        <div className="text-slate-400 text-sm font-medium">
                            Auto-scaled timeline
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryTimelineModal;
