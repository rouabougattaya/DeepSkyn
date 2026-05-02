"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Navbar } from "@/components/Navbar"
import { Sidebar } from "@/components/Sidebar"
import { getUser } from "@/lib/authSession"
import {
    Filter,
    Leaf,
    Loader2,
    Search,
    SlidersHorizontal,
    SortAsc,
    SortDesc,
    X,
} from "lucide-react"
import { productService, type Product, type ProductFilterParams } from "../services/product.service"
import ProductCard from "../components/ProductCard"

type SortField = "name" | "price" | "rating"
type SortDir = "ASC" | "DESC"

const SORT_OPTIONS: { label: string; field: SortField; dir: SortDir }[] = [
    { label: "Nom (A→Z)", field: "name", dir: "ASC" },
    { label: "Nom (Z→A)", field: "name", dir: "DESC" },
    { label: "Prix croissant", field: "price", dir: "ASC" },
    { label: "Prix décroissant", field: "price", dir: "DESC" },
    { label: "Mieux notés", field: "rating", dir: "DESC" },
]

export default function ProductsPage() {
    const { t } = useTranslation()
    const user = getUser()
    // ── Filter state ────────────────────────────────────────────────────────────
    const [search, setSearch] = useState("")
    const [type, setType] = useState("")
    const [ingredient, setIngredient] = useState("")
    const [minPrice, setMinPrice] = useState("")
    const [maxPrice, setMaxPrice] = useState("")
    const [cleanOnly, setCleanOnly] = useState(false)
    const [sortIdx, setSortIdx] = useState(0)

    // ── Data state ──────────────────────────────────────────────────────────────
    const [products, setProducts] = useState<Product[]>([])
    const [types, setTypes] = useState<string[]>([])
    const [ingredients, setIngredients] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // ── Mobile sidebar ──────────────────────────────────────────────────────────
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)

    // Debounce ref for the search field
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Load types & ingredients once ───────────────────────────────────────────
    useEffect(() => {
        Promise.all([productService.getTypes(), productService.getIngredients()])
            .then(([t, i]) => {
                setTypes(t)
                setIngredients(i)
            })
            .catch(() => {/* non-blocking */ })
    }, [])

    // ── Fetch products when filters change ──────────────────────────────────────
    const fetchProducts = useCallback(async (params: ProductFilterParams) => {
        setLoading(true)
        setError(null)
        try {
            const data = await productService.filter(params)
            setProducts(data)
        } catch {
            setError("Impossible de charger les produits. Vérifiez votre connexion.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        const sort = SORT_OPTIONS[sortIdx]
        const params: ProductFilterParams = {
            type: type || undefined,
            ingredient: ingredient || undefined,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
            isClean: cleanOnly || undefined,
            sortBy: sort.field,
            sortOrder: sort.dir,
            limit: 100, // Augmenter la limite pour voir plus de produits avec images
        }

        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            fetchProducts({ ...params, search: search || undefined })
        }, 350)

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [search, type, ingredient, minPrice, maxPrice, cleanOnly, sortIdx, fetchProducts])

    // ── Reset all filters ───────────────────────────────────────────────────────
    const resetFilters = () => {
        setSearch("")
        setType("")
        setIngredient("")
        setMinPrice("")
        setMaxPrice("")
        setCleanOnly(false)
        setSortIdx(0)
    }

    const hasActiveFilters = !!(search || type || ingredient || minPrice || maxPrice || cleanOnly)
    const sort = SORT_OPTIONS[sortIdx]

    // ── Sidebar content (shared between desktop & mobile) ───────────────────────
    const SidebarContent = () => (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                    <SlidersHorizontal size={15} />
                    {t('products.filters')}
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={resetFilters}
                        aria-label={t('products.reset')}
                        className="flex items-center gap-1 text-xs text-teal-700 font-bold hover:underline"
                    >
                        <X size={12} /> {t('products.reset')}
                    </button>
                )}
            </div>

            {/* Type */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-600 mb-2">Type</label>
                <div className="flex flex-wrap gap-2">
                    {["", ...types].map((typeOpt) => (
                        <button
                            key={typeOpt || "__all__"}
                            onClick={() => setType(typeOpt)}
                            aria-pressed={type === typeOpt}
                            className={`rounded-full border px-3 py-1 text-xs font-bold capitalize transition ${type === typeOpt
                                ? "bg-teal-700 border-teal-700 text-white"
                                : "border-slate-200 text-slate-700 hover:border-teal-400 hover:text-teal-700"
                                }`}
                        >
                            {typeOpt || t('products.all')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Price range */}
            <div>
                <label id="price-range-label" className="block text-xs font-bold uppercase tracking-widest text-slate-600 mb-2">Prix (£)</label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        placeholder="Min"
                        aria-label="Prix minimum"
                        value={minPrice}
                        min={0}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <span className="text-slate-600 text-xs font-bold">—</span>
                    <input
                        type="number"
                        placeholder="Max"
                        aria-label="Prix maximum"
                        value={maxPrice}
                        min={0}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                </div>
            </div>

            {/* Ingredient */}
            {ingredients.length > 0 && (
                <div>
                    <label htmlFor="ingredient-select" className="block text-xs font-bold uppercase tracking-widest text-slate-600 mb-2">Ingrédient</label>
                    <select
                        id="ingredient-select"
                        value={ingredient}
                        aria-label="Filtrer par ingrédient"
                        onChange={(e) => setIngredient(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                        <option value="">Tous les ingrédients</option>
                        {ingredients.slice(0, 200).map((ing) => (
                            <option key={ing} value={ing}>{ing}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Clean only toggle */}
            <div>
                <button
                    role="switch"
                    aria-checked={cleanOnly}
                    onClick={() => setCleanOnly((v) => !v)}
                    className="flex items-center gap-3 cursor-pointer select-none group"
                >
                    <div
                        className={`relative h-5 w-9 rounded-full transition-colors ${cleanOnly ? "bg-emerald-600" : "bg-slate-300"
                            }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${cleanOnly ? "translate-x-4" : "translate-x-0"
                                }`}
                        />
                    </div>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <Leaf size={14} className="text-emerald-600" />
                        {t('products.clean_only')}
                    </span>
                </button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-indigo-50">
            <Navbar />
            <div className="flex pt-16">
                {user && (
                    <Sidebar
                        isCollapsed={isSidebarCollapsed}
                        onCollapsedChange={setIsSidebarCollapsed}
                    />
                )}
                <div className={`flex-1 transition-all duration-300 ease-in-out ${user ? (isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64") : ""
                    }`}>
                    <div className="max-w-7xl mx-auto px-4 py-10">

                        {/* ── Page header ──────────────────────────────────────────────────── */}
                        <div className="relative overflow-hidden rounded-3xl border border-teal-100/80 bg-white/80 backdrop-blur p-7 shadow-sm mb-6">
                            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-teal-200/30 blur-2xl pointer-events-none" />
                            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-200/30 blur-2xl pointer-events-none" />

                            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-800">
                                        <Filter size={13} />
                                        Smart Search
                                    </div>
                                    <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
                                        {t('products.title')}
                                        {!loading && (
                                            <span className="ml-3 text-sm text-slate-500 font-medium">
                                                {products.length} {t('products.results')}{products.length !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </h1>
                                    <p className="mt-1 text-sm text-slate-600">
                                        {t('products.subtitle')}
                                    </p>
                                </div>

                                {/* Search bar */}
                                <div className="relative w-full md:max-w-sm">
                                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder={t('products.search_placeholder')}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch("")}
                                            aria-label="Effacer la recherche"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                        >
                                            <X size={15} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
                            <aside className="hidden lg:flex flex-col w-64 shrink-0">
                                <div className="sticky top-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                                    <SidebarContent />
                                </div>
                            </aside>

                            {/* ── Main content ─────────────────────────────────────────────────── */}
                            <div className="flex-1 min-w-0">

                                {/* Toolbar row: mobile filter button + sort */}
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    {/* Mobile: open sidebar */}
                                    <button
                                        onClick={() => setSidebarOpen(true)}
                                        aria-label="Ouvrir les filtres"
                                        className="lg:hidden flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm hover:border-teal-400 transition"
                                    >
                                        <SlidersHorizontal size={14} />
                                        Filtres
                                        {hasActiveFilters && (
                                            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-700 text-[9px] font-extrabold text-white">!</span>
                                        )}
                                    </button>

                                    <div className="flex items-center gap-2 ml-auto">
                                        {/* Result count is now in the header, but keeping it here for mobile if needed or just removing if redundant */}
                                        
                                        {/* Sort */}
                                        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
                                            {sort.dir === "ASC" ? <SortAsc size={14} className="text-teal-700" /> : <SortDesc size={14} className="text-teal-700" />}
                                            <select
                                                value={sortIdx}
                                                aria-label="Trier les produits"
                                                onChange={(e) => setSortIdx(Number(e.target.value))}
                                                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none pr-1"
                                            >
                                                {SORT_OPTIONS.map((o, i) => (
                                                    <option key={i} value={i}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Loading */}
                                {loading && (
                                    <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white py-16 shadow-sm text-slate-500">
                                        <Loader2 size={22} className="animate-spin text-teal-500" />
                                        <span className="text-sm font-semibold">{t('common.loading')}</span>
                                    </div>
                                )}

                                {/* Error */}
                                {!loading && error && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
                                        {error}
                                    </div>
                                )}

                                {/* Empty state */}
                                {!loading && !error && products.length === 0 && (
                                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white py-20 shadow-sm text-center">
                                        <span className="text-5xl">🔍</span>
                                        <p className="text-sm font-semibold text-slate-600">{t('products.no_products')}</p>
                                        <button
                                            onClick={resetFilters}
                                            className="mt-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-extrabold text-white hover:brightness-105 transition"
                                        >
                                            {t('products.reset')}
                                        </button>
                                    </div>
                                )}

                                {/* Product grid */}
                                {!loading && !error && products.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {products.map((product) => (
                                            <ProductCard key={product.id} product={product} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Mobile sidebar overlay ─────────────────────────────────────────── */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                    {/* Panel */}
                    <div className="relative ml-auto h-full w-72 overflow-y-auto bg-white p-6 shadow-2xl">
                        <button
                            onClick={() => setSidebarOpen(false)}
                            aria-label="Fermer les filtres"
                            className="absolute top-4 right-4 rounded-xl border border-slate-200 p-2 text-slate-600 hover:text-slate-900 transition"
                        >
                            <X size={16} />
                        </button>
                        <div className="mt-8">
                            <SidebarContent />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
