"use client"

import { useEffect, useState } from "react"
import { authFetch, getUser } from "@/lib/authSession"
import { Sparkles, ArrowUpRight, ArrowDownRight, Minus, History as LucideHistory, RefreshCw, Lock, Crown } from "lucide-react"
import { updateRoutine } from "@/services/routinePersonalizationService"
import { apiGet } from "@/services/apiClient"
import { useNavigate } from "react-router-dom"
import type { RoutineUpdateResponseDto, TrendDetail } from "@/types/routinePersonalization"
import { SvrRoutinePanel } from "../components/analysis/SvrRoutinePanel"
import type { UserSkinProfile } from "../types/aiAnalysis"



type RoutineResponse = any


export default function RoutinesPage() {
  const user = getUser()
  const userId = user?.id
  const navigate = useNavigate()
  const [currentPlan, setCurrentPlan] = useState<string>('FREE')

  const [routine, setRoutine] = useState<any>(null)

  const [personalizing, setPersonalizing] = useState(false)
  const [personalizationResult, setPersonalizationResult] = useState<RoutineUpdateResponseDto | null>(null)
  const [history, setHistory] = useState<RoutineUpdateResponseDto[]>([])

  const historyKey = userId ? `routine_history_${userId}` : null

  const totalSteps = routine ? (routine.morning?.steps?.length || 0) + (routine.night?.steps?.length || 0) : 0
  const completedCount = 0 // Mocking as it was only for old UI

  const progressPct = totalSteps ? Math.round((completedCount / totalSteps) * 100) : 0


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
    if (!userId) {
      setError("Veuillez vous connecter pour voir votre routine.")
      setLoading(false)
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
        const data = (await res.json()) as RoutineResponse;
        setRoutine(data);
      } catch (err: any) {
        console.error("Routine page error:", err);
      }
    }

    run()
  }, [userId])


  const handleUpdateRoutine = async () => {
    if (!userId) return
    setPersonalizing(true)
    setError(null)
    try {
      const result = await updateRoutine({ forceRegenerate: true })
      setRoutine(result.routine as any)
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

              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Ta routine AM / PM</h1>
              <p className="mt-1 text-sm text-slate-600">
                Coche chaque étape quand tu l’as faite. Objectif: une routine claire et régulière.
              </p>
            </div>

            <div className="md:w-[340px]">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold text-slate-800">
                  Progression
                  <span className="ml-2 inline-flex items-center rounded-full bg-teal-50 border border-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">
                    {progressPct}%
                  </span>
                </div>
                <div className="text-xs text-slate-500">{completedCount}/{totalSteps} étapes</div>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
                  style={{ width: `${progressPct}%`, transition: "width 350ms ease" }}
                />
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 p-1">
                    <button
                      className="flex-1 rounded-2xl px-3 py-2 text-xs font-bold bg-teal-600 text-white shadow-sm"
                    >
                      Tout
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleUpdateRoutine}
                  disabled={personalizing}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {personalizing ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                  Mettre à jour
                </button>
              </div>
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
                profile={{
                  skinType: (personalizationResult.inferredSkinType || 'Normal') as any,
                  age: 25,
                  gender: 'Female',
                  concerns: personalizationResult.adjustments?.map(adj => adj.reason) || [],
                  acneLevel: personalizationResult.trends?.acne?.current || 0,
                  wrinklesDepth: personalizationResult.trends?.wrinkles?.current || 0,
                  hydrationLevel: personalizationResult.trends?.hydration?.current || 100,
                }}
                currentPlan={currentPlan}
                displayMode="routine"
              />
            </div>
          )}
        </div>

        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <LucideHistory size={16} />
            </div>
            <h2 className="text-xl font-black text-slate-900">Historique des personnalisations</h2>
          </div>

          <div className="space-y-4">
            {history.map((item, i) => (
              <div key={item.personalizationId + i} className="group relative rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-teal-200 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${item.trends.globalScoreTrend === 'improving' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {new Date(item.createdAt || '').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        {item.analysisCount} analyses prises en compte • Type {item.inferredSkinType}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {item.adjustments.slice(0, 3).map((_, idx) => (
                        <div key={idx} className="h-5 w-5 rounded-full border-2 border-white bg-indigo-100" />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">
                      {item.adjustments.length} ajustements
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <p className="text-sm font-medium text-slate-500">Aucun historique disponible. Cliquez sur "Mettre à jour" pour commencer.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Astuce: une routine simple et répétée donne de meilleurs résultats qu’une routine trop complexe.
        </div>
      </div>
    </div>
  )
}
