"use client"

import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles } from "lucide-react"

import { loadFaceModels, getFaceDescriptor } from "../lib/face"
import { setSession } from "@/lib/authSession"

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"

export default function LoginFacePage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [email, setEmail] = useState("")
  const [cameraOpen, setCameraOpen] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadModels = async () => {
      try {
        await loadFaceModels()
      } catch (error) {
        console.error("Failed to load face models:", error)
        setError("Error while loading face recognition models.")
      }
    }
    loadModels()
  }, [])

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

    } catch {
      setError("Unable to access the camera.")
    }
  }

  const stopCamera = () => {
    if (!videoRef.current) return
    const stream = videoRef.current.srcObject as MediaStream
    stream?.getTracks().forEach((track) => track.stop())
  }

  const handleFaceLogin = async () => {
    if (!videoRef.current) return

    setIsLoading(true)
    setError("")

    const descriptor = await getFaceDescriptor(videoRef.current)

    if (!descriptor) {
      setError("Face not detected.")
      setIsLoading(false)
      return
    }

    console.log(`[FaceLogin] Captured descriptor length: ${descriptor.length}`);

    try {
      const res = await fetch(`${API_URL}/auth/login-face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          liveDescriptor: descriptor,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Face not recognized.")
        setIsLoading(false)
        return
      }

      setSession(data)
      stopCamera()
      navigate("/", { replace: true })

    } catch {
      setError("Server error.")
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
            Face Recognition Login
          </h1>
          <p className="text-slate-500 text-sm">
            Sign in using your registered face
          </p>
        </div>

        <div className="space-y-6">

          {/* EMAIL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-white border-slate-200 focus:ring-[#0d9488]"
            />
          </div>

          {/* CAMERA */}
          {!cameraOpen && (
            <Button
              onClick={openCamera}
              className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white font-semibold rounded-lg"
            >
              Open camera
            </Button>
          )}

          {cameraOpen && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-[300px] rounded-lg object-cover border"
              />

              <Button
                onClick={handleFaceLogin}
                className="w-full h-12 bg-green-600 text-white font-semibold rounded-lg"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in with face"}
              </Button>
            </>
          )}

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
            Back to classic login
          </Button>

        </div>
      </div>
    </div>
  )
}