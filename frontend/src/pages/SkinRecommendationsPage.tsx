import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUser } from '@/lib/authSession';
import { apiGet } from '@/services/apiClient';
import { SvrRoutinePanel } from '../components/analysis/SvrRoutinePanel';
import { comparisonService } from '@/services/comparison.service';
import type { UserSkinProfile, GlobalScoreResult } from '../types/aiAnalysis';
import {
    ArrowLeft,
    Sparkles,
    AlertCircle,
    FlaskConical,
    Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SkinRecommendationsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const user = getUser();

    const [currentPlan, setCurrentPlan] = useState<string>('FREE');
    const [profile, setProfile] = useState<UserSkinProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    /* ── Helper: Map Result to Profile ── */
    const reconstructProfileFromResults = (result: GlobalScoreResult): UserSkinProfile => {
        // Try to get user inputs if they were saved in the result
        if (result.userInputs) {
            return {
                ...result.userInputs as UserSkinProfile,
                skinType: result.userInputs.skinType || 'Normal',
                age: result.userInputs.age || 25,
                gender: result.userInputs.gender || 'Female',
                concerns: result.userInputs.concerns || []
            };
        }

        // Otherwise Map metrics (0-100) to profile expectations
        const getScore = (type: string) => result.conditionScores?.find(c => c.type === type)?.score || 50;

        return {
            skinType: 'Normal', // Default fallback
            age: result.skinAge || 25,
            gender: 'Female',
            concerns: [],
            hydrationLevel: getScore('Hydratation'),
            acneLevel: 100 - getScore('Acne'), // Score is health, profile expects severity? 
            // In SvrRoutinePanel, if acneLevel is high, it recommends acne products.
            // Wait, let's check SvrRoutinePanel.tsx logic for profile mapping.
        };
    };

    /* ── 1. Resolve profile: location.state → localStorage → Backend ── */
    useEffect(() => {
        const resolveProfile = async () => {
            setLoading(true);
            setLoadError(null);

            // Priority 1: passed via navigate state
            if (location.state?.profile) {
                setProfile(location.state.profile as UserSkinProfile);
                setLoading(false);
                return;
            }

            // Priority 2: stored profile after last analysis
            try {
                const rawProfile = localStorage.getItem('skinAnalysisProfile');
                if (rawProfile) {
                    setProfile(JSON.parse(rawProfile) as UserSkinProfile);
                    setLoading(false);
                    return;
                }

                // Priority 3: stored result after last analysis
                const rawResult = localStorage.getItem('skinAnalysisResult');
                if (rawResult) {
                    const result = JSON.parse(rawResult) as GlobalScoreResult;
                    setProfile(reconstructProfileFromResults(result));
                    setLoading(false);
                    return;
                }
            } catch (e) {
                console.error("Local storage parse error", e);
            }

            // Priority 4: Fetch latest analysis from server
            if (user?.id) {
                try {
                    const history = await comparisonService.getUserAnalyses(1, 1);
                    if (history.data && history.data.length > 0) {
                        const latestId = history.data[0].id;
                        const detailed = await comparisonService.getAnalysis(latestId);
                        
                        // Map detailed (ComparedAnalysisItem) to profile
                        setProfile({
                            skinType: 'Normal',
                            age: detailed.realAge || detailed.skinAge || 25,
                            gender: 'Female',
                            concerns: [],
                            hydrationLevel: detailed.metrics.hydration,
                            acneLevel: detailed.metrics.acne,
                            wrinklesDepth: detailed.metrics.wrinkles,
                        });
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.error("Failed to fetch history", err);
                }
            }

            setLoadError(t('recommendations.error_load', { defaultValue: 'Aucun profil trouvé. Veuillez lancer une analyse cutanée d\'abord.' }));
            setLoading(false);
        };

        resolveProfile();
    }, [location.state, user?.id]);

    /* ── 2. Fetch plan ── */
    useEffect(() => {
        if (!user?.id) return;
        apiGet<any>(`/subscription/${user.id}`)
            .then(sub => setCurrentPlan(sub?.plan || 'FREE'))
            .catch(() => setCurrentPlan('FREE'));
    }, [user?.id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
                <p className="text-slate-500 font-medium italic">{t('recommendations.loading_profile', { defaultValue: 'Récupération de votre profil IA...' })}</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">
            {/* ── Header ── */}
            <div className="relative overflow-hidden rounded-3xl border border-teal-100/80 bg-white/80 backdrop-blur p-7 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-teal-200/30 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-200/20 blur-2xl pointer-events-none" />

                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <button
                            onClick={() => navigate('/analysis')}
                            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors mb-3"
                        >
                            <ArrowLeft size={14} />
                            {t('recommendations.back_to_analysis', { defaultValue: 'Retour à l\'analyse' })}
                        </button>
                        <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-800">
                            <FlaskConical size={13} />
                            {t('recommendations.ai_selection_tag', { defaultValue: 'Sélection IA Personnalisée' })}
                        </div>
                        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
                            {t('recommendations.title', { defaultValue: 'Produits Recommandés' })}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {t('recommendations.subtitle', { defaultValue: 'Conseils et soins SVR optimisés pour votre état actuel.' })}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/routines')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-teal-200 bg-white text-teal-700 font-bold text-sm hover:bg-teal-50 transition-all shadow-sm active:scale-95"
                        >
                            <Sparkles size={15} />
                            {t('recommendations.view_routine', { defaultValue: 'Voir ma routine' })}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Error: no profile found ── */}
            {loadError && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center shadow-inner">
                        <AlertCircle size={28} className="text-amber-500" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800">{t('recommendations.error_title', { defaultValue: 'Analyse Requise' })}</h2>
                    <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                        {t('recommendations.error_desc', { defaultValue: 'Pour des recommandations précises, l\'IA a besoin d\'analyser votre peau ou de consulter vos derniers résultats.' })}
                    </p>
                    <button
                        onClick={() => navigate('/analysis')}
                        className="mt-2 px-8 py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-teal-500/25 hover:scale-105 active:scale-95 transition-all"
                    >
                        {t('recommendations.start_analysis', { defaultValue: 'Démarrer une analyse' })}
                    </button>
                </div>
            )}

            {/* ── Recommendations panel ── */}
            {profile && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <SvrRoutinePanel
                        profile={profile}
                        currentPlan={currentPlan}
                        displayMode="products"
                    />
                </div>
            )}
        </div>
    );
}
