"use client"

import { useEffect, useState } from "react"
import { authFetch, getUser } from "@/lib/authSession"
import { Sparkles, ArrowUpRight, ArrowDownRight, Minus, Lock, Crown, RefreshCw, FileText, Download } from "lucide-react"
import { updateRoutine } from "@/services/routinePersonalizationService"
import { apiGet } from "@/services/apiClient"
import { useNavigate } from "react-router-dom"
import type { RoutineUpdateResponseDto, TrendDetail } from "@/types/routinePersonalization"
import { SvrRoutinePanel } from "../components/analysis/SvrRoutinePanel"
import { skinAgeInsightsService, type SkinAgeInsightResponse } from "@/services/skinAgeInsightsService"
import { generateClinicalReport } from "@/utils/reportGenerator"



type RoutineResponse = any


export default function RoutinesPage() {
  const user = getUser()
  const userId = user?.id
  const navigate = useNavigate()
  const [currentPlan, setCurrentPlan] = useState<string>('FREE')
  const [error, setError] = useState<string | null>(null)

  const [personalizing, setPersonalizing] = useState(false)
  const [personalizationResult, setPersonalizationResult] = useState<RoutineUpdateResponseDto | null>(null)
  const [history, setHistory] = useState<RoutineUpdateResponseDto[]>([])
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null)
  const [skinAgeInsight, setSkinAgeInsight] = useState<SkinAgeInsightResponse | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [fullRoutineData, setFullRoutineData] = useState<any>(null)

  const historyKey = userId ? `routine_history_${userId}` : null
  const completedKey = userId ? `routine_completed_${userId}` : null


  useEffect(() => {
    if (!historyKey) return
    try {
      const raw = localStorage.getItem(historyKey)
      const parsed = raw ? (JSON.parse(raw) as RoutineUpdateResponseDto[]) : []
      setHistory(parsed)
      if (parsed.length > 0 && !personalizationResult) {
        setPersonalizationResult(parsed[0])
      }
    } catch {
      setHistory([])
    }
  }, [historyKey])

  useEffect(() => {
    if (!completedKey) return
    const raw = localStorage.getItem(completedKey)
    if (raw) {
      try {
        setCompletedSteps(JSON.parse(raw))
      } catch (e) {
        console.error("Failed to parse completed steps", e)
      }
    }
  }, [completedKey])

  const toggleStep = (stepId: string) => {
    if (!completedKey) return
    setCompletedSteps(prev => {
      const next = prev.includes(stepId) 
        ? prev.filter(id => id !== stepId) 
        : [...prev, stepId]
      localStorage.setItem(completedKey, JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    if (!userId) {
      setError("Veuillez vous connecter pour voir votre routine.")
      return
    }

    const run = async () => {
      try {
        // Fetch subscription first to correctly resolve PRO access
        const subData = await apiGet<any>(`/subscription/${userId}`).catch(() => ({ plan: 'FREE' }));
        setCurrentPlan(subData?.plan || 'FREE');

        // Then fetch routine
        const res = await authFetch(`/routine/${userId}`, { method: "GET" });
        if (!res.ok) {
          throw new Error("Routine fetch failed");
        }
        await res.json() as RoutineResponse;
      } catch (err: any) {
        console.error("Routine page error:", err);
      }
    }

    const fetchLatestAnalysis = async () => {
      try {
        const res = await authFetch(`/analysis/user?limit=1`, { method: "GET" });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.data && data.data.length > 0) {
          const latestId = data.data[0].id;
          const fullRes = await authFetch(`/analysis/${latestId}`, { method: "GET" });
          if (fullRes.ok) {
             const fullAnalysis = await fullRes.json();
             setLatestAnalysis(fullAnalysis);
          }
        }
      } catch (err) {
        console.error("Failed to fetch latest analysis", err);
      }
    };

    const fetchInsights = async () => {
      try {
        const insightRes = await skinAgeInsightsService.getInsights(userId).catch(() => null);
        setSkinAgeInsight(insightRes);
      } catch (err) {
        console.error("Failed to fetch insights", err);
      }
    }

    run()
    fetchLatestAnalysis()
    fetchInsights()
  }, [userId, personalizing])

  // Listen for analysis completion and automatically update routine
  useEffect(() => {
    if (!userId || currentPlan !== 'PRO' || personalizing) return;

    const handleAnalysisCompleted = async () => {
      // Check both sessionStorage and localStorage for analysis completion signal
      const sessionCompleted = sessionStorage.getItem('analysisCompleted');
      const storageCompleted = localStorage.getItem('analysisJustCompleted');
      
      if (sessionCompleted || storageCompleted) {
        // Clear the signals
        sessionStorage.removeItem('analysisCompleted');
        localStorage.removeItem('analysisJustCompleted');
        
        // Auto-update routine
        console.log('Auto-updating routine after new analysis...');
        await handleUpdateRoutine();
      }
    }

    // Check on mount
    handleAnalysisCompleted();

    // Set up interval to check for analysis completion every 2 seconds
    const interval = setInterval(handleAnalysisCompleted, 2000);
    
    // Also listen for storage changes from other tabs
    window.addEventListener('storage', handleAnalysisCompleted);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleAnalysisCompleted);
    };
  }, [userId, currentPlan, personalizing])


  const handleUpdateRoutine = async () => {
    if (!userId) return
    setPersonalizing(true)
    setError(null)
    try {
      const result = await updateRoutine({ forceRegenerate: true })
      setPersonalizationResult(result)

      // Save to history
      const newHistory = [{ ...result, createdAt: new Date().toISOString() }, ...history].slice(0, 10)
      setHistory(newHistory)
      if (historyKey) localStorage.setItem(historyKey, JSON.stringify(newHistory))
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la mise à jour de la routine.")
    } finally {
      setPersonalizing(false)
    }
  }

  const handleDownloadReport = async () => {
    if (!userId || !personalizationResult) return;
    setIsGeneratingPdf(true);
    try {
      await generateClinicalReport({
        user: user,
        plan: currentPlan,
        routine: {
          ...personalizationResult,
          morning: fullRoutineData?.morning || [],
          night: fullRoutineData?.night || []
        },
        insight: skinAgeInsight,
        analysis: latestAnalysis,
        products: fullRoutineData?.recommendedProducts || []
      });
    } catch (err) {
      console.error("PDF Generation failed:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const TrendIcon = ({ trend }: { trend: TrendDetail['trend'] }) => {
    if (trend === 'improving') return <ArrowUpRight className="text-emerald-500" size={16} />
    if (trend === 'worsening') return <ArrowDownRight className="text-rose-500" size={16} />
    return <Minus className="text-slate-400" size={16} />
  }

  const TrendCard = ({ label, detail }: { label: string, detail: TrendDetail }) => (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 flex items-center justify-between">
        <div className="text-lg font-black text-slate-900">{detail.current}%</div>
        <div className="flex items-center gap-1">
          <TrendIcon trend={detail.trend} />
          <span className={`text-xs font-bold ${detail.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {detail.delta > 0 ? '+' : ''}{detail.delta}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-indigo-50 py-10 relative">

      {/* LOCK OVERLAY FOR FREE USERS */}
      {currentPlan === 'FREE' && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-10 text-center bg-white/60 backdrop-blur-xl">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-[#0d9488] shadow-2xl ring-1 ring-slate-200">
            <Lock size={40} />
          </div>
          <h1 className="mb-4 text-3xl font-black text-slate-900">
            Routine Personnalisée <span className="text-[#0d9488]">PRO</span>
          </h1>
          <p className="mb-8 max-w-md text-lg font-medium text-slate-500 leading-relaxed">
            Le Routine Builder intelligent, qui adapte vos soins selon vos analyses IA,
            est réservé aux membres PRO. Optimisez votre routine maintenant !
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-4 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
            >
              Retour
            </button>
            <button
              onClick={() => navigate('/upgrade')}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[#0d9488] to-[#10b981] px-10 py-4 text-lg font-black text-white shadow-xl shadow-teal-500/20 hover:scale-105 transition-all"
            >
              <Crown size={22} /> Débloquer maintenant
            </button>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl border border-teal-100/80 bg-white/80 backdrop-blur p-7 shadow-sm">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-teal-200/30 blur-2xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-200/30 blur-2xl" />

          <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-800">
                <Sparkles size={14} />
                Routine Builder
              </div>
              {error && (
                <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Ta routine AM / PM</h1>
              <p className="mt-1 text-sm text-slate-600">
                Coche chaque étape quand tu l’as faite. Objectif: une routine claire et régulière.
              </p>
            </div>

            <div className="flex gap-3">
               <button
                 onClick={handleDownloadReport}
                 disabled={isGeneratingPdf || !personalizationResult}
                 className="flex items-center gap-2 rounded-2xl border border-teal-200 bg-white px-5 py-3 text-sm font-bold text-teal-700 shadow-sm hover:bg-teal-50 disabled:opacity-50 transition-all"
               >
                 {isGeneratingPdf ? (
                   <RefreshCw size={18} className="animate-spin" />
                 ) : (
                   <FileText size={18} />
                 )}
                 Clinical PDF Report
               </button>
            </div>
          </div>
        </div>

        {personalizationResult && (
          <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-6 backdrop-blur">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="text-indigo-600" size={20} />
                  <h2 className="text-lg font-black text-slate-900">Analyse & Ajustements</h2>
                  <span className="ml-auto rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                    Peau {personalizationResult.inferredSkinType}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <TrendCard label="Hydratation" detail={personalizationResult.trends.hydration} />
                  <TrendCard label="Sébum" detail={personalizationResult.trends.oil} />
                  <TrendCard label="Acné" detail={personalizationResult.trends.acne} />
                  <TrendCard label="Rides" detail={personalizationResult.trends.wrinkles} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ SECTION: PRODUITS RECOMMANDÉS SVR (DYNAMIC AI) ══ */}
        <div className="mt-8 mb-8">


          {personalizationResult && (
            <div className="mt-2">
              <SvrRoutinePanel
                key={`${personalizationResult.personalizationId}-${latestAnalysis?.id || 'loading'}`}
                profile={{
                  skinType: (personalizationResult.inferredSkinType || latestAnalysis?.aiRawResponse?.globalAnalysis?.dominantCondition || 'Normal') as any,
                  age: Number(localStorage.getItem('userAge')) || latestAnalysis?.realAge || latestAnalysis?.skinAge || 30,
                  gender: (localStorage.getItem('userGender') || 'Female') as 'Female' | 'Male' | 'Other',
                  concerns: personalizationResult.adjustments?.map(adj => adj.reason) || latestAnalysis?.aiRawResponse?.conditionScores?.filter((c:any) => c.score && c.score > 40).map((c:any) => c.type) || [],
                  acneLevel: latestAnalysis?.aiRawResponse?.conditionScores?.find((c:any) => c.type === 'acne')?.score || personalizationResult.trends?.acne?.current || 0,
                  wrinklesDepth: latestAnalysis?.aiRawResponse?.conditionScores?.find((c:any) => c.type === 'wrinkles')?.score || personalizationResult.trends?.wrinkles?.current || 0,
                  hydrationLevel: latestAnalysis?.aiRawResponse?.conditionScores?.find((c:any) => c.type === 'hydration')?.score || personalizationResult.trends?.hydration?.current || 100,
                  blackheadsLevel: latestAnalysis?.aiRawResponse?.conditionScores?.find((c:any) => c.type === 'blackheads')?.score || 0,
                  poreSize: latestAnalysis?.aiRawResponse?.conditionScores?.find((c:any) => c.type === 'pores')?.score || personalizationResult.trends?.oil?.current || 0,
                  rednessLevel: latestAnalysis?.aiRawResponse?.conditionScores?.find((c:any) => c.type === 'redness')?.score || 0,
                  sensitivityLevel: 50,
                }}
                currentPlan={currentPlan}
                displayMode="routine"
                completedSteps={completedSteps}
                onToggleStep={toggleStep}
                onRoutineLoad={setFullRoutineData}
              />
            </div>
          )}
        </div>

        <div className="mt-12 text-center text-xs text-slate-400">
          Astuce: une routine simple et répétée donne de meilleurs résultats qu’une routine trop complexe.
        </div>
      </div>
    </div>
  )
}
