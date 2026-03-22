/**
 * Modale de confirmation pour la suppression d'un utilisateur
 */

import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import type { AdminUser } from '@/types/admin'

interface DeleteUserModalProps {
  user: AdminUser | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (user: AdminUser) => Promise<void>
}

export function DeleteUserModal({
  user,
  isOpen,
  onClose,
  onConfirm,
}: DeleteUserModalProps) {
  const [confirmEmail, setConfirmEmail] = useState('')
  const [error, setError] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)

  if (!isOpen || !user) return null

  const handleConfirm = async () => {
    if (confirmEmail !== user.email) {
      setError('L\'email ne correspond pas')
      return
    }

    setError('')
    setIsConfirming(true)

    try {
      await onConfirm(user)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Supprimer l'utilisateur</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="text-red-400 hover:text-red-600 transition disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="space-y-4 px-6 py-4">
          {/* Avertissement */}
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm font-semibold text-red-900">
              ⚠️ Cette action est irréversible
            </p>
            <p className="text-sm text-red-700 mt-2">
              Tous les données de cet utilisateur seront supprimées définitivement.
            </p>
          </div>

          {/* Info utilisateur */}
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm text-slate-600">Utilisateur à supprimer</p>
            <p className="font-semibold text-slate-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>

          {/* Confirmation par email */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">
              Confirmer en saisissant l'email
            </p>
            <Input
              type="email"
              placeholder={user.email}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              disabled={isConfirming}
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              Tapez "{user.email}" pour confirmer la suppression
            </p>
          </div>

          {/* Message erreur */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isConfirming}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || confirmEmail !== user.email}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConfirming ? 'Suppression...' : 'Supprimer définitivement'}
          </Button>
        </div>
      </div>
    </div>
  )
}
