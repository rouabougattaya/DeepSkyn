"use client"

import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Eye, EyeOff } from "lucide-react"

import { setSession } from "@/lib/authSession"
import { saveTwoFASession } from "@/lib/twoFASession"
import { loginSchema } from "@/lib/schemas/auth"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setFieldErrors({})
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors

      setFieldErrors({
        email: fieldErrors.email?.[0] ?? "",
        password: fieldErrors.password?.[0] ?? "",
      })

      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(parsed.data),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message.join(", ") : (data.message || "Email ou mot de passe incorrect."))
        return
      }

      // Si 2FA est requis, rediriger vers la page de vérification 2FA
      if (data.requiresTwoFa) {
        saveTwoFASession(data);
        navigate("/auth/2fa", {
          state: {
            loginData: data,
            from: location.state?.from || "/"
          }
        })
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
      {/* Top Left Logo */}
      <div className="w-full max-w-7xl flex justify-start p-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0d9488] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">DeepSkyn</span>
        </Link>
      </div>

      <div className="w-full max-w-[440px] mt-20">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-bold text-slate-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-500 text-sm">
            Sign in to your DeepSkyn account to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-900">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: "" })) }}
              className={`h-12 bg-white border-slate-200 focus:ring-[#0d9488] ${fieldErrors.email ? "border-red-500" : ""}`}
            />
            {fieldErrors.email && (
              <p className="text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-900">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: "" })) }}
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

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="remember"
                className="rounded border-slate-300 text-[#0d9488] focus:ring-[#0d9488]"
              />
              <label htmlFor="remember" className="text-sm text-slate-500">
                Remember me
              </label>
            </div>
            <Link
              to="/auth/forgot-password"
              className="text-sm font-medium text-[#0d9488] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white font-semibold rounded-lg transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
          
        </form>

        {/* Divider */}
        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#f8fafc] px-3 text-slate-400 font-medium">
              Or continue with
            </span>
          </div>
        </div>

        {/* Social Logins */}
       <div className="space-y-4">

  {/* Google + Apple */}
  <div className="grid grid-cols-2 gap-4">
    <Button
      variant="outline"
      className="h-12 border-slate-200 font-medium bg-white flex items-center justify-center"
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        {/* SVG Google */}
      </svg>
      Google
    </Button>

    <Button
      variant="outline"
      className="h-12 border-slate-200 font-medium bg-white flex items-center justify-center"
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        {/* SVG Apple */}
      </svg>
      Apple
    </Button>
  </div>

  {/* Face Login */}
  <Button
    type="button"
    variant="outline"
    className="w-full h-12 border-slate-200 font-medium bg-white flex items-center justify-center"
    onClick={() => navigate("/auth/login-face")}
  >
    🔐 Se connecter avec reconnaissance faciale
  </Button>
<Button
  type="button"
  variant="outline"
  className="w-full h-12 border-slate-200 font-medium bg-white flex items-center"
  onClick={() => navigate("/auth/login-empreinte")}
>
  🔐 Se connecter avec empreinte
</Button>
</div>

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-slate-500 text-sm">
            Don't have an account?{" "}
            <Link
              to="/auth/register"
              className="text-[#0d9488] hover:underline font-semibold"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
