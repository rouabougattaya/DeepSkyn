"use client"

import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Eye, EyeOff } from "lucide-react"
import { authFetch, setSession } from "@/lib/authSession"
import { historyService } from "@/services/historyService"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"
import { saveTwoFASession } from "@/lib/twoFASession"
import { loginSchema } from "@/lib/schemas/auth"

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const { isLoading: googleLoading } = useGoogleAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setFieldErrors({})

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors
      setFieldErrors({
        email: flattened.email?.[0] ?? "",
        password: flattened.password?.[0] ?? "",
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
        const errorMessage = Array.isArray(data.message) ? data.message.join(", ") : (data.message || "Email ou mot de passe incorrect.")
        setError(errorMessage)
        
        // Enregistrer la tentative de login échouée
        await historyService.recordLoginAttempt({
          loginMethod: 'email',
          status: 'failed',
          failureReason: errorMessage,
          used2FA: false,
        })
        
        return
      }

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

      console.log('Login session set:', data)
      
      // Vérifier si refreshToken est présent
      if (!data.refreshToken) {
        console.warn('Refresh token missing from login response')
        setError('Login successful but session may not persist properly')
      }
      
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || '', // Utiliser string vide si manquant
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
        user: data.user,
      })

      // Enregistrer la tentative de login réussie
      await historyService.recordLoginAttempt({
        loginMethod: 'email',
        status: 'success',
        used2FA: false, // Sera mis à jour si 2FA est complété
      })

      navigate("/", { replace: true })
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez que le backend est démarré.")
      
      // Enregistrer la tentative de login échouée (erreur serveur)
      await historyService.recordLoginAttempt({
        loginMethod: 'email',
        status: 'failed',
        failureReason: 'Server error',
        used2FA: false,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { signInWithGoogleRedirect } = await import('@/hooks/useGoogleAuth');
      signInWithGoogleRedirect();
    } catch (error) {
      console.error('Google sign-in failed:', error);
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
            <Button variant="outline" className="h-12 border-slate-200 font-medium bg-white" onClick={handleGoogleSignIn}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {googleLoading ? 'Connecting...' : 'Google'}
            </Button>

            <Button variant="outline" className="h-12 border-slate-200 font-medium bg-white">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.073 21.376c-1.447 0-2.626-1.18-2.626-2.626s1.18-2.627 2.626-2.627c1.448 0 2.627 1.181 2.627 2.627s-1.18 2.626-2.627 2.626zm-10.146 0c-1.448 0-2.627-1.18-2.627-2.626s1.18-2.627 2.627-2.627c1.447 0 2.626 1.181 2.626 2.627s-1.18 2.626-2.627 2.626zm1.586-15.402c2.31 0 4.182 1.873 4.182 4.182 0 2.31-1.873 4.182-4.182 4.182-2.31 0-4.182-1.872-4.182-4.182 0-2.309 1.872-4.182 4.182-4.182zm0-1.974c-3.4 0-6.156 2.756-6.156 6.156s2.756 6.156 6.156 6.156 6.156-2.756 6.156-6.156-2.756-6.156-6.156-6.156z" />
                <path d="M18.71 14.45c-.05.1-.1.19-.15.29-.7.15-1.38.56-1.38 1.48 0 1.07.9 1.53 1.37 1.77-.11.35-.41.87-.9 1.58-.45.63-.92 1.25-1.63 1.26-.7 0-.91-.43-1.72-.43-.8 0-1.04.42-1.7.44-.7.01-1.2-.66-1.65-1.31-.92-1.33-1.62-3.75-.68-5.38.47-.81 1.3-1.32 2.21-1.33.69 0 1.34.48 1.76.48.42 0 1.21-.6 2.04-.51.35.01.66.13.91.33-.08.07-.4.32-.4.81 0 .6.49.88.58.93zM15.98 8.56c-.44 0-.84-.24-1.08-.6-.35-.55-.26-1.28.21-1.73.44-.43 1.11-.53 1.63-.2.35.22.56.59.56 1-.01.83-.8 1.53-1.32 1.53z"/>
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
