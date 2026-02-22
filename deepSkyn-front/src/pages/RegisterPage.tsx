"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Eye, EyeOff } from "lucide-react"

import { setSession } from "@/lib/authSession"
import { registerSchema } from "@/lib/schemas/auth"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

export default function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setFieldErrors({})
    const parsed = registerSchema.safeParse({ email, password, firstName, lastName })
    if (!parsed.success) {
      const err: Record<string, string> = {}
      const flat = parsed.error.flatten().fieldErrors
      if (flat.email?.[0]) err.email = flat.email[0]
      if (flat.password?.[0]) err.password = flat.password[0]
      if (flat.firstName?.[0]) err.firstName = flat.firstName[0]
      if (flat.lastName?.[0]) err.lastName = flat.lastName[0]
      setFieldErrors(err)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message.join(", ") : (data.message || "Erreur lors de l'inscription."))
        return
      }
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
        user: data.user,
      })
      navigate("/", { replace: true })
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez que le backend est démarré.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center p-4">
      <div className="w-full max-w-7xl flex justify-start p-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0d9488] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">DeepSkyn</span>
        </Link>
      </div>

      <div className="w-full max-w-[440px] mt-12">
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-bold text-slate-900 mb-2">
            Créer un compte
          </h1>
          <p className="text-slate-500 text-sm">
            Inscrivez-vous pour accéder à DeepSkyn
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium text-slate-900">
                Prénom
              </label>
              <Input
                id="firstName"
                type="text"
                placeholder="Jean"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); clearFieldError("firstName") }}
                className={`h-12 bg-white border-slate-200 focus:ring-[#0d9488] ${fieldErrors.firstName ? "border-red-500" : ""}`}
              />
              {fieldErrors.firstName && (
                <p className="text-sm text-red-600">{fieldErrors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium text-slate-900">
                Nom
              </label>
              <Input
                id="lastName"
                type="text"
                placeholder="Dupont"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); clearFieldError("lastName") }}
                className={`h-12 bg-white border-slate-200 focus:ring-[#0d9488] ${fieldErrors.lastName ? "border-red-500" : ""}`}
              />
              {fieldErrors.lastName && (
                <p className="text-sm text-red-600">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-900">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError("email") }}
              className={`h-12 bg-white border-slate-200 focus:ring-[#0d9488] ${fieldErrors.email ? "border-red-500" : ""}`}
            />
            {fieldErrors.email && (
              <p className="text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-900">
              Mot de passe (8 caractères min.)
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearFieldError("password") }}
                className={`h-12 bg-white border-slate-200 pr-10 focus:ring-[#0d9488] ${fieldErrors.password ? "border-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-sm text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white font-semibold rounded-lg transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Inscription..." : "S'inscrire"}
          </Button>
        </form>

        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            Vous avez déjà un compte ?{" "}
            <Link to="/auth/login" className="text-[#0d9488] hover:underline font-semibold">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
