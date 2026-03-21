"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Fingerprint } from "lucide-react"
import { setSession } from "@/lib/authSession"

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"

export default function LoginFingerprintPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const bufferToBase64url = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer)
    let binary = ""
    bytes.forEach((b) => (binary += String.fromCharCode(b)))

    const base64 = window.btoa(binary)

    return base64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
  }

  const base64ToUint8Array = (base64: string) => {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4)
    const base64Safe = (base64 + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/")

    const raw = window.atob(base64Safe)
    const output = new Uint8Array(raw.length)

    for (let i = 0; i < raw.length; ++i) {
      output[i] = raw.charCodeAt(i)
    }

    return output
  }

  const handleBiometricLogin = async () => {
    setError("")
    
    if (!email.trim()) {
      setError("Veuillez entrer votre email")
      return
    }

    setIsLoading(true)

    try {
      // 1. Get login options with email filter
      const optionsRes = await fetch(`${API_URL}/auth/login-fingerprint/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })

      if (!optionsRes.ok) {
        const errorData = await optionsRes.json()
        throw new Error(errorData.message || "Authentification non disponible")
      }

      const options = await optionsRes.json()
      const tempId = options.tempId

      // Convert challenge to Uint8Array
      options.challenge = base64ToUint8Array(options.challenge)

      // Convert allowCredentials IDs to Uint8Array if they exist
      if (options.allowCredentials && Array.isArray(options.allowCredentials)) {
        options.allowCredentials = options.allowCredentials.map((cred: any) => ({
          ...cred,
          id: base64ToUint8Array(cred.id)
        }))
      }

      // 2. Get credential from browser
      const credential = await (navigator.credentials as any).get({ 
        publicKey: options 
      })

      if (!credential) {
        throw new Error("Authentification annulée par l'utilisateur")
      }

      const response = credential.response as AuthenticatorAssertionResponse

      // 3. Prepare credential data for backend
      const credentialData = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          authenticatorData: bufferToBase64url(response.authenticatorData),
          clientDataJSON: bufferToBase64url(response.clientDataJSON),
          signature: bufferToBase64url(response.signature),
          userHandle: response.userHandle
            ? bufferToBase64url(response.userHandle)
            : null,
        },
      }

      // 4. Verify credential
      const verifyRes = await fetch(`${API_URL}/auth/login-fingerprint/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          credential: credentialData,
          tempId
        })
      })

      const data = await verifyRes.json()

      if (!verifyRes.ok) {
        throw new Error(data.message || "Authentification échouée")
      }

      // 5. Set session and redirect
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || "",
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
        user: data.user
      })

      localStorage.setItem("token", data.accessToken)
      navigate("/admin", { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur d'authentification"
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center p-4">
      {/* Logo */}
      <div className="w-full max-w-7xl flex justify-start p-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 overflow-hidden rounded-xl bg-transparent flex items-center justify-center">
            <img src="/logo.png" alt="DeepSkyn Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">DeepSkyn</span>
        </Link>
      </div>

      <div className="w-full max-w-[440px] mt-20">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
              <Fingerprint className="w-10 h-10 text-teal-600" />
            </div>
          </div>
          <h1 className="text-[32px] font-bold text-slate-900 mb-2">
            Connexion Admin
          </h1>
          <p className="text-slate-500 text-sm">
            Utilisez votre empreinte digitale pour accéder au dashboard
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Email Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Votre email admin
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            disabled={isLoading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:bg-slate-100"
          />
        </div>

        {/* Fingerprint Button */}
        <Button
          onClick={handleBiometricLogin}
          disabled={isLoading || !email.trim()}
          className="w-full h-14 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg flex items-center justify-center gap-3 text-lg mb-6"
        >
          <Fingerprint className="w-6 h-6" />
          {isLoading ? "Scan en cours..." : "Utiliser mon empreinte"}
        </Button>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#f8fafc] px-3 text-slate-400 font-medium">
              Ou
            </span>
          </div>
        </div>

        {/* Back to login */}
        <Button
          variant="outline"
          className="w-full h-12 border-slate-200 text-slate-900"
          onClick={() => navigate("/auth/login")}
        >
          Retour à la connexion classique
        </Button>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            ℹ️ Votre email est récupéré automatiquement. L'empreinte doit d'abord être enregistrée depuis le dashboard admin.
          </p>
        </div>
      </div>
    </div>
  )
}
