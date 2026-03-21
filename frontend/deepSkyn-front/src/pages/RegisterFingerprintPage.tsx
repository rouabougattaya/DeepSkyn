"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Eye, EyeOff, Fingerprint } from "lucide-react"
import { setSession } from "@/lib/authSession"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export default function RegisterFingerprintPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

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

  /* ================= FINGERPRINT ================= */

  const registerFingerprint = async () => {
    setError("")
    setIsLoading(true)

    try {
      if (!window.PublicKeyCredential) {
        setError("WebAuthn not supported by this browser.")
        return
      }

      const available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()

      if (!available) {
        setError("No biometric authenticator available.")
        return
      }

      // 1️⃣ Demander options backend
      const optionsRes = await fetch(
        `${API_URL}/api/auth/register-fingerprint/options`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
          credentials: "include",
        }
      )

      const options = await optionsRes.json()

      if (!optionsRes.ok) {
        setError(options.message || "Biometric generation error")
        return
      }

      // 🔥 CONVERSION OBLIGATOIRE
      options.challenge = base64ToUint8Array(options.challenge)
      options.user.id = base64ToUint8Array(options.user.id)

      if (options.excludeCredentials) {
        options.excludeCredentials = options.excludeCredentials.map((cred: any) => ({
          ...cred,
          id: base64ToUint8Array(cred.id),
        }))
      }

      // 2️⃣ Créer credential
      const credential = await navigator.credentials.create({
        publicKey: options,
      }) as PublicKeyCredential

      if (!credential) {
        setError("Credential creation failed")
        return
      }

      // 🔥 Conversion réponse pour backend
      // 🔥 Conversion ArrayBuffer → base64url
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

      const response = credential.response as AuthenticatorAttestationResponse

      const credentialData = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: bufferToBase64url(response.attestationObject),
          clientDataJSON: bufferToBase64url(response.clientDataJSON),
        },
      }
      // 3️⃣ Vérification backend
      const verifyRes = await fetch(
        `${API_URL}/api/auth/register-fingerprint/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: credentialData,
            email,
            password,
            firstName,
            lastName,
          }),
          credentials: "include",
        }
      )

      const data = await verifyRes.json()

      if (!verifyRes.ok) {
        setError(data.message || "Verification error")
        return
      }

      setSession(data)
      navigate("/", { replace: true })

    } catch (err) {
      console.error(err)
      setError("WebAuthn error")
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

      <div className="w-full max-w-[440px] mt-12">
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-bold text-slate-900 mb-2">
            Create Account
          </h1>
          <p className="text-slate-500 text-sm">
            Sign up with fingerprint
          </p>
        </div>

        <div className="space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Button
            type="button"
            onClick={registerFingerprint}
            disabled={isLoading}
            className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white font-semibold rounded-lg flex items-center gap-2"
          >
            <Fingerprint size={18} />
            {isLoading ? "Verifying..." : "Register fingerprint"}
          </Button>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            Already have an account?{" "}
            <Link
              to="/auth/login"
              className="text-[#0d9488] hover:underline font-semibold"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}