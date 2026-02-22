import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { hasSession, clearSession } from "@/lib/authSession"
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout"

/**
 * Protège les routes : si l'utilisateur n'a pas de session (non connecté),
 * redirige vers la page de login. Sinon affiche le contenu (children).
 * Après 1 heure d'inactivité, déconnecte et redirige vers login.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()

  useInactivityTimeout(() => {
    clearSession()
    navigate("/auth/login", { replace: true, state: { from: location } })
  })

  if (!hasSession()) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}
