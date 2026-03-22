/**
 * Modale pour voir les détails d'un utilisateur
 */

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AdminUser } from '@/types/admin'

interface ViewUserModalProps {
  user: AdminUser | null
  isOpen: boolean
  onClose: () => void
}

export function ViewUserModal({ user, isOpen, onClose }: ViewUserModalProps) {
  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Détails de l'utilisateur</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="space-y-4 px-6 py-4">
          {/* Avatar et info principales */}
          <div className="text-center">
            <div className="mb-3 flex justify-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>

          {/* Infos détaillées */}
          <div className="space-y-3 border-y border-slate-200 py-4">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Rôle:</span>
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                user.role === 'admin'
                  ? 'bg-red-100 text-red-800'
                  : user.role === 'moderator'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
              }`}>
                {user.role}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-slate-600">ID:</span>
              <span className="text-sm font-mono text-slate-900">{user.id.slice(0, 8)}...</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Créé:</span>
              <span className="text-sm text-slate-900">
                {new Date(user.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>

            {user.lastLogin && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Dernier login:</span>
                <span className="text-sm text-slate-900">
                  {new Date(user.lastLogin).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}

            {user.authMethod && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Méthode auth:</span>
                <span className="text-sm text-slate-900">{user.authMethod}</span>
              </div>
            )}

            {user.aiScore !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Score IA:</span>
                <span className="text-sm font-semibold text-teal-600">{user.aiScore}</span>
              </div>
            )}

            {user.bio && (
              <div className="space-y-1">
                <span className="text-sm text-slate-600">Bio:</span>
                <p className="text-sm text-slate-900 italic">{user.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  )
}
