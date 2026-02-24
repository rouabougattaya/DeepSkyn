"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Fingerprint } from "lucide-react"
import { setSession } from "@/lib/authSession"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export default function LoginFingerprintPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  /* ================= UTIL ================= */

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

  /* ================= LOGIN ================= */

  const handleFingerprintLogin = async () => {
  setError("")

  if (!email) {
    setError("Veuillez entrer votre email.")
    return
  }

  if (!window.PublicKeyCredential) {
    setError("WebAuthn non supporté par ce navigateur.")
    return
  }

  try {
    setIsLoading(true)

    // 1️⃣ Récupérer les options du backend
    const res = await fetch(`${API_URL}/auth/login-fingerprint/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    const options = await res.json()

    if (!res.ok) {
      setError(options.message || "Erreur biométrique")
      return
    }

    // 🔥 Conversion obligatoire
    options.challenge = base64ToUint8Array(options.challenge)

    if (options.allowCredentials) {
      options.allowCredentials = options.allowCredentials.map((cred: any) => ({
        ...cred,
        id: base64ToUint8Array(cred.id),
      }))
    }

    // ✅ FORCER la vérification utilisateur
    options.userVerification = "required"

    // 🚀 CETTE LIGNE OUVRE WINDOWS HELLO
    const credential = await navigator.credentials.get({
      publicKey: options,
    }) as PublicKeyCredential | null

    if (!credential) {
      setError("Authentification annulée.")
      return
    }

    const response = credential.response as AuthenticatorAssertionResponse

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

    // 3️⃣ Vérification backend
    const verifyRes = await fetch(
      `${API_URL}/auth/login-fingerprint/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, credential: credentialData }),
      }
    )

    const data = await verifyRes.json()

    if (!verifyRes.ok) {
      setError(data.message || "Empreinte non reconnue")
      return
    }

    setSession(data)
    navigate("/", { replace: true })

  } catch (err: any) {
    console.error(err)

    if (err.name === "NotAllowedError") {
      setError("Authentification annulée ou refusée.")
    } else {
      setError("Erreur WebAuthn")
    }

  } finally {
    setIsLoading(false)
  }
}
  /* ================= UI ================= */

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

      <div className="w-full max-w-[440px] mt-20">
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-bold text-slate-900 mb-2">
            Connexion par empreinte
          </h1>
          <p className="text-slate-500 text-sm">
            Connectez-vous avec votre empreinte digitale
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">
              Adresse Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-white border-slate-200 focus:ring-[#0d9488]"
            />
          </div>

          <Button
            onClick={handleFingerprintLogin}
            disabled={isLoading}
            className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white font-semibold rounded-lg flex items-center justify-center gap-2"
          >
            <Fingerprint size={18} />
            {isLoading ? "Connexion..." : "Se connecter avec empreinte"}
          </Button>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}

          <Button
            variant="outline"
            onClick={() => navigate("/auth/login")}
            className="w-full h-12"
          >
            Retour au login classique
          </Button>
        </div>
      </div>
    </div>
  )
}