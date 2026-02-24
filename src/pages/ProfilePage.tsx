"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, Trash2 } from "lucide-react"
import { authFetch, getAccessToken, clearSession, updateSessionUser } from "@/lib/authSession"
type MeUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  bio: string | null
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
  if (!dto.firstName.trim()) errors.firstName = "Prénom obligatoire."
  if (dto.firstName.trim().length > 50) errors.firstName = "Prénom: 50 caractères max."
  if (!dto.lastName.trim()) errors.lastName = "Nom obligatoire."
  if (dto.lastName.trim().length > 50) errors.lastName = "Nom: 50 caractères max."
  if (dto.bio.length > 500) errors.bio = "Bio: 500 caractères max."
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
        const res = await authFetch("/users/me", { method: "GET" })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          setError(Array.isArray(data.message) ? data.message.join(", ") : (data.message || "Erreur chargement profil."))
          return
        }

        setMe(data)
        
        setFirstName(data.firstName ?? "")
        setLastName(data.lastName ?? "")
        setBio(data.bio ?? "")
      } catch {
        setError("Impossible de joindre le serveur. Vérifie le backend.")
      } finally {
        setLoadingMe(false)
      }
    }

    run()
  }, [])

  // CSRF token
  const getCsrfToken = async (): Promise<string> => {
    const res = await authFetch("/auth/csrf-token", { method: "GET" })
    const data = await res.json().catch(() => ({}))
    const token = data?.csrfToken || res.headers.get("X-CSRF-Token")
    if (!token) throw new Error("CSRF token introuvable")
    return token
  }

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
      const csrfToken = await getCsrfToken()

      const res = await authFetch("/users/me", {
        method: "PATCH",
        headers: {
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message.join(", ") : (data.message || "Erreur update profil."))
        return
      }

     setMe(data)
updateSessionUser({ firstName: data.firstName, lastName: data.lastName })
setSuccess("Profil mis à jour ✅")
    } catch (err: any) {
      setError(err?.message || "Erreur réseau.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setError("")
    setSuccess("")
    const ok = window.confirm("⚠️ Supprimer votre compte définitivement ?")
    if (!ok) return

    setDeleting(true)
    try {
      const csrfToken = await getCsrfToken()

      const res = await authFetch("/users/me", {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message.join(", ") : (data.message || "Erreur suppression compte."))
        return
      }

      clearSession()
      navigate("/auth/login", { replace: true })
    } catch {
      setError("Impossible de joindre le serveur.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center p-4">
      <div className="w-full max-w-[560px] mt-6">
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-bold text-slate-900 mb-2">Mon profil</h1>
          <p className="text-slate-500 text-sm">Modifiez vos informations personnelles</p>
        </div>

        {loadingMe ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <p className="text-slate-600">Chargement...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            {(error || success) && (
              <p className={`text-sm p-3 rounded-lg ${error ? "text-red-600 bg-red-50" : "text-emerald-700 bg-emerald-50"}`}>
                {error || success}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Prénom</label>
                <Input
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); clearFieldError("firstName") }}
                  className={`h-12 bg-white border-slate-200 focus:ring-[#0d9488] ${fieldErrors.firstName ? "border-red-500" : ""}`}
                />
                {fieldErrors.firstName && <p className="text-sm text-red-600">{fieldErrors.firstName}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Nom</label>
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
              <p className="text-xs text-slate-400">L’email ne peut pas être modifié.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Bio (500 max)</label>
              <textarea
                value={bio}
                onChange={(e) => { setBio(e.target.value); clearFieldError("bio") }}
                className={`w-full min-h-[120px] rounded-lg border bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] border-slate-200 ${
                  fieldErrors.bio ? "border-red-500" : ""
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
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>

              <Button type="button" variant="destructive" className="h-12 rounded-lg" onClick={handleDelete} disabled={deleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}