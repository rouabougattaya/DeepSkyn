import { useState, useEffect } from 'react'
import { Fingerprint, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"

export default function BiometricRegistration() {
  const [hasBiometric, setHasBiometric] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    checkBiometricStatus()
  }, [])

  const checkBiometricStatus = async () => {
    setIsCheckingStatus(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/admin/biometric/status`, {
        credentials: 'include',
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      })
      const data = await res.json()
      setHasBiometric(data.hasBiometric || false)
    } catch (err) {
      console.error('Failed to check biometric status:', err)
    } finally {
      setIsCheckingStatus(false)
    }
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

  const handleRegisterBiometric = async () => {
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')

      // 0. Get CSRF token first
      const csrfRes = await fetch(`${API_URL}/auth/csrf-token`, {
        credentials: 'include',
      })
      const csrfData = await csrfRes.json()
      const csrfToken = csrfData.csrfToken || ''
      // Continue even if CSRF token is empty — backend will reject if it's needed

      // 1. Get registration options
      const optionsHeaders: Record<string, string> = {
        'X-CSRF-Token': csrfToken,
      }
      if (token) {
        optionsHeaders['Authorization'] = `Bearer ${token}`
      }

      const optionsRes = await fetch(`${API_URL}/admin/biometric/register/options`, {
        method: 'POST',
        credentials: 'include',
        headers: optionsHeaders,
      })

      const optionsData = await optionsRes.json()

      if (!optionsRes.ok) {
        console.error('Options error:', optionsData)
        throw new Error(optionsData.message || optionsData.error || 'email non disponible')
      }

      const options = optionsData

      // 2. Convert challenge
      options.challenge = base64ToUint8Array(options.challenge)

      if (options.user?.id) {
        options.user.id = base64ToUint8Array(options.user.id)
      }

      // 3. Get credential from browser
      const credential = await (navigator.credentials as any).create({
        publicKey: options,
      })

      if (!credential) {
        throw new Error('Enregistrement annulé par l\'utilisateur')
      }

      const response = credential.response as AuthenticatorAttestationResponse

      // 4. Prepare credential data
      const credentialData = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64url(response.clientDataJSON),
          attestationObject: bufferToBase64url(response.attestationObject),
        },
      }

      // 5. Verify on backend
      const verifyHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      }
      if (token) {
        verifyHeaders['Authorization'] = `Bearer ${token}`
      }

      const verifyRes = await fetch(`${API_URL}/admin/biometric/register/verify`, {
        method: 'POST',
        headers: verifyHeaders,
        credentials: 'include',
        body: JSON.stringify({ credential: credentialData }),
      })

      const data = await verifyRes.json()

      if (!verifyRes.ok) {
        throw new Error(data.message || 'Enregistrement échoué')
      }

      setSuccess('Empreinte enregistrée avec succès! 🎉')
      setHasBiometric(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveBiometric = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre empreinte?')) {
      return
    }

    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')

      // Get CSRF token first
      const csrfRes = await fetch(`${API_URL}/auth/csrf-token`, {
        credentials: 'include',
      })
      const csrfData = await csrfRes.json()
      const csrfToken = csrfData.csrfToken || ''
      // Continue even if CSRF token is empty — backend will reject if it's needed

      const deleteHeaders: Record<string, string> = {
        'X-CSRF-Token': csrfToken,
      }
      if (token) {
        deleteHeaders['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${API_URL}/admin/biometric`, {
        method: 'DELETE',
        credentials: 'include',
        headers: deleteHeaders,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Suppression échouée')
      }

      setSuccess('Empreinte supprimée avec succès')
      setHasBiometric(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingStatus) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-teal-600" />
            Authentification Biométrique
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Enregistrez votre empreinte digitale pour une connexion plus rapide
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <div className="space-y-4">
        {hasBiometric ? (
          <>
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-teal-900">Empreinte enregistrée</p>
                <p className="text-sm text-teal-700 mt-1">
                  Vous pouvez maintenant vous connecter via /auth/login-empreinte
                </p>
              </div>
            </div>
            <Button
              onClick={handleRemoveBiometric}
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:text-red-700"
              disabled={isLoading}
            >
              {isLoading ? 'Suppression en cours...' : 'Supprimer l\'empreinte'}
            </Button>
          </>
        ) : (
          <>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Aucune empreinte enregistrée</p>
                <p className="text-sm text-amber-700 mt-1">
                  Enregistrez votre empreinte pour accéder à la connexion rapide
                </p>
              </div>
            </div>
            <Button
              onClick={handleRegisterBiometric}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Enregistrement en cours...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  Enregistrer mon empreinte
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
