/**
 * Modale pour modifier le rôle d'un utilisateur
 */

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AdminUser, UserRole } from '@/types/admin'

interface EditUserModalProps {
  user: AdminUser | null
  isOpen: boolean
  onClose: () => void
  onSave: (user: AdminUser, newRole: UserRole) => Promise<void>
}

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'user', label: 'Utilisateur', description: 'Accès standard à l\'application' },
  {
    value: 'moderator',
    label: 'Modérateur',
    description: 'Peut modérer le contenu et les utilisateurs',
  },
  { value: 'admin', label: 'Administrateur', description: 'Accès complet à l\'administration' },
]

export function EditUserModal({
  user,
  isOpen,
  onClose,
  onSave,
}: EditUserModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user?.role || 'user')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen || !user) return null

  const handleSave = async () => {
    if (selectedRole === user.role) {
      onClose()
      return
    }

    setError('')
    setIsSaving(true)

    try {
      await onSave(user, selectedRole)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Modifier le rôle</h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 transition disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="space-y-4 px-6 py-4">
          {/* Info utilisateur */}
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm text-slate-600">Utilisateur</p>
            <p className="font-semibold text-slate-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>

          {/* Sélection de rôle */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Sélectionner le nouveau rôle</p>
            {ROLES.map((role) => (
              <label key={role.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={() => setSelectedRole(role.value)}
                  className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{role.label}</p>
                  <p className="text-xs text-slate-500">{role.description}</p>
                  {selectedRole === role.value && user.role === role.value && (
                    <p className="text-xs text-amber-600 mt-1">Rôle actuel</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Message erreur */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Avertissement si changement */}
          {selectedRole !== user.role && (
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-amber-700">
                ⚠️ Cet utilisateur passera de{' '}
                <span className="font-semibold">{user.role}</span> à{' '}
                <span className="font-semibold">{selectedRole}</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedRole === user.role}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
    </div>
  )
}
