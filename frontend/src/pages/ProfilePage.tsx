"use client"

import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, Trash2 } from "lucide-react"
import { authFetch, getAccessToken, clearSession, updateSessionUser } from "@/lib/authSession"
import { aiService } from "@/services/aiService"
type MeUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  bio: string | null
  aiScore?: number
  googleName?: string
  picture?: string
  authMethod?: string
  role?: "USER" | "ADMIN"
  createdAt?: string
  updatedAt?: string
}

type FieldErrors = {
  firstName?: string
  lastName?: string
  bio?: string
}

function validateProfile(dto: { firstName: string; lastName: string; bio: string }) {
  const errors: FieldErrors = {}
  if (!dto.firstName.trim()) errors.firstName = "First name is required."
  if (dto.firstName.trim().length > 50) errors.firstName = "First name: 50 characters max."
  if (!dto.lastName.trim()) errors.lastName = "Last name is required."
  if (dto.lastName.trim().length > 50) errors.lastName = "Last name: 50 characters max."
  if (dto.bio.length > 500) errors.bio = "Bio: 500 characters max."
  return errors
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const accessToken = getAccessToken()

  const [me, setMe] = useState<MeUser | null>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [bio, setBio] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loadingMe, setLoadingMe] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isFirstLogin, setIsFirstLogin] = useState(false)

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: "" }))
  }

  // Si pas connecté
  useEffect(() => {
    if (!accessToken) navigate("/auth/login", { replace: true })
  }, [accessToken, navigate])

  // Charger profil
  useEffect(() => {
    const run = async () => {
      setLoadingMe(true)
      setError("")
      setSuccess("")

      try {
        // Pour Google login, utiliser les données localStorage directement
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          setMe(userData);

          // Charger les données existantes
          const initialFirstName = userData.firstName ?? ""
          const initialLastName = userData.lastName ?? ""
          const initialBio = userData.bio ?? ""

          // Si les champs sont vides mais qu'on a un nom complet (ex: Google)
          if (!initialFirstName && !initialLastName && userData.name) {
            const nameParts = userData.name.split(' ')
            setFirstName(nameParts[0] || "")
            setLastName(nameParts.slice(1).join(' ') || "")
          } else {
            setFirstName(initialFirstName)
            setLastName(initialLastName)
          }

          setBio(initialBio)

          // Determine if it's a first login
          const hasProfileData = !!(userData.firstName && userData.lastName);
          if (!hasProfileData) {
            setIsFirstLogin(true)
          }
        }
      } catch {
        setError("Unable to reach the server. Please check the backend.")
      } finally {
        setLoadingMe(false)
      }
    }

    run()
  }, [])

  // handleSave
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setFieldErrors({})

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      bio,
    }

    const vErrors = validateProfile(payload)
    if (vErrors.firstName || vErrors.lastName || vErrors.bio) {
      setFieldErrors(vErrors)
      return
    }

    setSaving(true)
    try {
      const newName = `${payload.firstName} ${payload.lastName}`;

      // Recalculer le score AI basé sur le nouveau nom
      const { score: newScore, bioStatus } = aiService.calculateTrustScore({
        name: newName,
        email: me?.email || '',
        bio: payload.bio,
        picture: me?.picture,
        googleName: me?.googleName
      });

      // Sauvegarder directement dans localStorage pour le moment
      const updatedUser = {
        ...me,
        firstName: payload.firstName,
        lastName: payload.lastName,
        name: newName,
        bio: payload.bio,
        aiScore: newScore
      } as MeUser;

      localStorage.setItem('user', JSON.stringify(updatedUser));
      updateSessionUser({ firstName: payload.firstName, lastName: payload.lastName });

      // Synchroniser avec historyService pour que la page historique soit à jour
      const { historyService } = await import('@/services/historyService');
      const used2FA = await historyService.was2FAUsedRecently();

      // On simule un "login" success pour rafraîchir le score global
      historyService.updateUserScoreSimple(
        'success',
        used2FA,
        newScore,
        {
          nameConsistency: newScore < 0.6 ? 0.4 : 1.0,
          bioStatus: bioStatus
        }
      );

      setMe(updatedUser);
      setSuccess("Profile updated ✅")

      if (me?.googleName && newName.toLowerCase().trim() !== me.googleName.toLowerCase().trim()) {
        setError("Note: Your name differs from your Google name. Your trust score has been adjusted.");
      }
    } catch (err: any) {
      setError(err?.message || "Network error.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setError("")
    setSuccess("")
    const ok = window.confirm("⚠️ Permanently delete your account?")
    if (!ok) return

    setDeleting(true)
    try {
      const res = await authFetch("/users/me", {
        method: "DELETE",
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message.join(", ") : (data.message || "Error deleting account."))
        return
      }

      clearSession()
      navigate("/auth/login", { replace: true })
    } catch {
      setError("Unable to reach the server.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center p-4">
      <div className="w-full max-w-[560px] mt-6">
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-bold text-slate-900 mb-2">
            {isFirstLogin ? "Complete your profile" : "My Profile"}
          </h1>
          <p className="text-slate-500 text-sm">
            {isFirstLogin
              ? "Welcome! Please complete your information to get started"
              : "Edit your personal information"
            }
          </p>
        </div>

        {loadingMe ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <p className="text-slate-600">Loading...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            {(error || success) && (
              <p className={`text-sm p-3 rounded-lg ${error && !success ? "text-red-600 bg-red-50" : (error && success ? "text-yellow-700 bg-yellow-50" : "text-emerald-700 bg-emerald-50")}`}>
                {error || success}
              </p>
            )}

            {me?.aiScore !== undefined && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Identity Score</p>
                  <p className="text-sm text-slate-600">Based on information consistency</p>
                </div>
                <div className={`text-2xl font-black ${me.aiScore > 0.7 ? "text-[#0d9488]" : me.aiScore > 0.4 ? "text-yellow-600" : "text-red-600"}`}>
                  {Math.round(me.aiScore * 100)}%
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">First Name</label>
                <Input
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); clearFieldError("firstName") }}
                  className={`h-12 bg-white border-slate-200 focus:ring-[#0d9488] ${fieldErrors.firstName ? "border-red-500" : ""}`}
                />
                {fieldErrors.firstName && <p className="text-sm text-red-600">{fieldErrors.firstName}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Last Name</label>
                <Input
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); clearFieldError("lastName") }}
                  className={`h-12 bg-white border-slate-200 focus:ring-[#0d9488] ${fieldErrors.lastName ? "border-red-500" : ""}`}
                />
                {fieldErrors.lastName && <p className="text-sm text-red-600">{fieldErrors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Email</label>
              <Input value={me?.email ?? ""} disabled className="h-12 bg-slate-50 border-slate-200 text-slate-500" />
              <p className="text-xs text-slate-400">Email cannot be changed.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Bio (500 max)</label>
              <textarea
                value={bio}
                onChange={(e) => { setBio(e.target.value); clearFieldError("bio") }}
                className={`w-full min-h-[120px] rounded-lg border bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] border-slate-200 ${fieldErrors.bio ? "border-red-500" : ""
                  }`}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                {fieldErrors.bio ? <p className="text-sm text-red-600">{fieldErrors.bio}</p> : <span />}
                <p className="text-xs text-slate-400">{bio.length}/500</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1 h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white font-semibold rounded-lg"
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>

              <Button type="button" variant="destructive" className="h-12 rounded-lg" onClick={handleDelete} disabled={deleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>

            {/* Go to homepage after profile completed */}
            {success && (
              <div className="mt-4">
                <Link to="/" className="w-full">
                  <Button className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg">
                    Go to homepage →
                  </Button>
                </Link>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}