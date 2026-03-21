/**
 * Protège les routes admin : vérifie que l'utilisateur est connecté ET admin
 */

import { Navigate, useLocation } from 'react-router-dom'
import { getUser } from '@/lib/authSession'
import type { UserRole } from '@/types/admin'

interface ProtectedAdminRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole | UserRole[]
}

export function ProtectedAdminRoute({
  children,
  requiredRole = 'admin',
}: ProtectedAdminRouteProps) {
  const location = useLocation()
  const user = getUser()

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  // Convertir en tableau si nécessaire
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

  // Normaliser le rôle en minuscules pour la comparaison
  const userRole = ((user.role || 'user') as string).toLowerCase() as UserRole

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
