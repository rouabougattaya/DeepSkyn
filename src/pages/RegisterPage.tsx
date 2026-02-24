"use client"

import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Eye, EyeOff } from "lucide-react"

import { loadFaceModels, getFaceDescriptor } from "@/lib/face"
import { setSession } from "@/lib/authSession"
import { registerSchema } from "@/lib/schemas/auth"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export default function RegisterPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [cameraOpen, setCameraOpen] = useState(false)
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  /* ================= LOAD MODELS ================= */

  useEffect(() => {
    loadFaceModels()
  }, [])

  /* ================= CAMERA ================= */

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })

      setCameraOpen(true)

      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      }, 100)
    } catch (err) {
      setError("Impossible d'accéder à la caméra.")
    }
  }

  const stopCamera = () => {
    if (!videoRef.current) return
    const stream = videoRef.current.srcObject as MediaStream
    stream?.getTracks().forEach((track) => track.stop())
    setCameraOpen(false)
  }

  const captureFace = async () => {
    if (!videoRef.current) return

    setError("")
    const descriptor = await getFaceDescriptor(videoRef.current)

    if (!descriptor) {
      setError("Aucun visage détecté. Essayez avec plus de lumière.")
      return
    }

    setFaceDescriptor(descriptor)
    stopCamera()
  }

  /* ================= REGISTER ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!faceDescriptor) {
      setError("Veuillez capturer votre visage avant l'inscription.")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          faceDescriptor,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Erreur lors de l'inscription.")
        return
      }

      setSession(data)
      navigate("/", { replace: true })
    } catch {
      setError("Impossible de joindre le serveur.")
    } finally {
      setIsLoading(false)
    }
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center p-4">
      
      {/* Header */}
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
            Inscrivez-vous avec reconnaissance faciale
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-12 bg-white border-slate-200 focus:ring-[#0d9488]"
            />
            <Input
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-12 bg-white border-slate-200 focus:ring-[#0d9488]"
            />
          </div>

          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 bg-white border-slate-200 focus:ring-[#0d9488]"
          />

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-white border-slate-200 pr-10 focus:ring-[#0d9488]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* CAMERA SECTION */}

          {!cameraOpen && !faceDescriptor && (
            <Button
              type="button"
              onClick={openCamera}
              className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white rounded-lg"
            >
              Activer la caméra
            </Button>
          )}

          {cameraOpen && (
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-[300px] object-cover rounded-xl border border-slate-200"
              />
              <Button
                type="button"
                onClick={captureFace}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Capturer le visage
              </Button>
            </div>
          )}

          {faceDescriptor && (
            <p className="text-green-600 text-center text-sm">
              ✅ Visage capturé avec succès
            </p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white font-semibold rounded-lg"
          >
            {isLoading ? "Inscription..." : "S'inscrire"}
          </Button>
        </form>
<div className="text-center">
  <button
    type="button"
    onClick={() => navigate("/auth/register-fingerprint")}
    className="text-sm text-[#0d9488] hover:underline font-semibold"
  >
    Utiliser l'empreinte digitale à la place
  </button>
</div>
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