"use client"

import { useEffect, useMemo, useState } from "react"
import { authFetch, getUser } from "@/lib/authSession"
import { Check, Moon, Sparkles, Sun, ShoppingBag } from "lucide-react"

type RoutineProduct = {
  id: string
  name: string
  type: string
  price: number
  url: string | null
}

type RoutineStep = {
  stepOrder: number
  stepName: "Cleanser" | "Serum" | "Moisturizer"
  notes?: string
  product: RoutineProduct
}

type RoutineResponse = {
  morning: { steps: RoutineStep[] }
  night: { steps: RoutineStep[] }
}

function normalizeExternalUrl(url: unknown): string | null {
  if (typeof url !== "string") return null
  const trimmed = url.trim()
  if (!trimmed || trimmed === "#") return null
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  if (trimmed.startsWith("//")) return `https:${trimmed}`
  return `https://${trimmed}`
}

export default function RoutinesPage() {
  const user = getUser()
  const userId = user?.id

  const [routine, setRoutine] = useState<RoutineResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const storageKey = userId ? `routine_completed_${userId}_${todayKey}` : null

  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [panel, setPanel] = useState<"all" | "morning" | "night">("all")

  const stepKey = (routineType: "morning" | "night", stepOrder: number, productId: string) =>
    `${routineType}_${stepOrder}_${productId}`

  const allSteps = routine ? [...routine.morning.steps, ...routine.night.steps] : []

  const completedCount = routine
    ? routine.morning.steps.reduce(
        (acc, s) => acc + (completed[stepKey("morning", s.stepOrder, s.product.id)] ? 1 : 0),
        0,
      ) +
      routine.night.steps.reduce(
        (acc, s) => acc + (completed[stepKey("night", s.stepOrder, s.product.id)] ? 1 : 0),
        0,
      )
    : 0

  const totalSteps = routine ? allSteps.length : 0
  const progressPct = totalSteps ? Math.round((completedCount / totalSteps) * 100) : 0

  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      setCompleted(raw ? (JSON.parse(raw) as Record<string, boolean>) : {})
    } catch {
      setCompleted({})
    }
  }, [storageKey])

  useEffect(() => {
    if (!userId) {
      setError("Veuillez vous connecter pour voir votre routine.")
      setLoading(false)
      return
    }

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await authFetch(`/routine/${userId}`, { method: "GET" })
        const data = (await res.json()) as RoutineResponse
        setRoutine(data)
      } catch {
        setError("Impossible de charger la routine. Vérifie le backend.")
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [userId])

  const toggleStep = (routineType: "morning" | "night", stepOrder: number, productId: string) => {
    const key = stepKey(routineType, stepOrder, productId)
    setCompleted((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-indigo-50 py-10">
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
                      onClick={() => setPanel("all")}
                      className={`flex-1 rounded-2xl px-3 py-2 text-xs font-bold transition ${
                        panel === "all" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Tout
                    </button>
                    <button
                      onClick={() => setPanel("morning")}
                      className={`flex-1 rounded-2xl px-3 py-2 text-xs font-bold transition ${
                        panel === "morning"
                          ? "bg-teal-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      AM
                    </button>
                    <button
                      onClick={() => setPanel("night")}
                      className={`flex-1 rounded-2xl px-3 py-2 text-xs font-bold transition ${
                        panel === "night" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">Chargement...</div>
          )}
          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">{error}</div>
          )}
          {!loading && !error && !routine && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
              Aucune routine disponible pour le moment.
            </div>
          )}

          {!loading && routine && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(["morning", "night"] as const).map((type) => {
                if (panel !== "all" && panel !== type) return null

                const title = type === "morning" ? "Matin (AM)" : "Soir (PM)"
                const Icon = type === "morning" ? Sun : Moon
                const steps = routine[type].steps
                const doneForPanel = steps.reduce((acc, s) => acc + (completed[stepKey(type, s.stepOrder, s.product.id)] ? 1 : 0), 0)

                return (
                  <div
                    key={type}
                    className="rounded-3xl border border-teal-100/70 bg-white/80 backdrop-blur p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                          <Icon size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">{title}</div>
                          <div className="text-xs text-slate-500">{doneForPanel}/{steps.length} étapes faites</div>
                        </div>
                      </div>
                      <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                        3 étapes
                      </div>
                    </div>

                    <ol className="relative">
                      {steps.map((s, idx) => {
                        const key = stepKey(type, s.stepOrder, s.product.id)
                        const isDone = !!completed[key]
                        const productHref = normalizeExternalUrl(s.product.url)

                        return (
                          <li key={key} className="relative pl-12 pb-4 last:pb-0">
                            {idx !== steps.length - 1 && (
                              <div className="absolute left-[18px] top-[44px] bottom-[-6px] w-px bg-gradient-to-b from-teal-200 to-slate-200" />
                            )}

                            <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-2xl border shadow-sm">
                              <button
                                type="button"
                                aria-label={`Toggle step ${s.stepOrder}`}
                                onClick={() => toggleStep(type, s.stepOrder, s.product.id)}
                                className={`h-9 w-9 rounded-2xl border transition ${
                                  isDone
                                    ? "bg-gradient-to-br from-teal-600 to-cyan-500 border-teal-600 text-white"
                                    : "bg-white border-teal-200 text-teal-700 hover:bg-teal-50"
                                }`}
                              >
                                {isDone ? <Check size={18} /> : <span className="text-xs font-extrabold">{s.stepOrder}</span>}
                              </button>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-extrabold text-slate-900">
                                    {s.stepName}
                                  </div>
                                  <div className="mt-1 text-xs font-bold text-slate-500">{s.product.type}</div>
                                </div>
                                <div className="text-xs font-bold text-slate-600 bg-white/80 border border-slate-200 rounded-full px-2 py-1">
                                  £{s.product.price.toFixed(2)}
                                </div>
                              </div>

                              <div className="mt-2 text-sm font-semibold text-slate-800">{s.product.name}</div>

                              {productHref ? (
                                <a
                                  href={productHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-teal-600 text-white px-3 py-2 text-xs font-extrabold shadow-sm hover:brightness-105 transition"
                                >
                                  <ShoppingBag size={14} />
                                  Acheter
                                </a>
                              ) : (
                                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-100 text-slate-500 px-3 py-2 text-xs font-extrabold border border-slate-200">
                                  <ShoppingBag size={14} />
                                  Lien indisponible
                                </div>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Astuce: une routine simple et répétée donne de meilleurs résultats qu’une routine trop complexe.
        </div>
      </div>
    </div>
  )
}

