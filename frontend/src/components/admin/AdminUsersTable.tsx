/**
 * Composant tableau pour afficher et gérer les utilisateurs
 * Inclus: recherche, filtres, pagination, actions
 */

import { useState, useEffect } from 'react'
import { Search, Trash2, Edit2, Eye, AlertCircle, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AdminUser, UserRole } from '@/types/admin'

interface AdminUsersTableProps {
  users: AdminUser[]
  isLoading: boolean
  totalPages: number
  currentPage: number
  onPageChange: (page: number) => void
  onSearch: (term: string) => void
  onFilterRole: (role?: UserRole) => void
  onView: (user: AdminUser) => void
  onEdit: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
  onRefresh: () => void
}

const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800' },
  { value: 'moderator', label: 'Modérateur', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'user', label: 'Utilisateur', color: 'bg-blue-100 text-blue-800' },
]

export function AdminUsersTable({
  users,
  isLoading,
  totalPages,
  currentPage,
  onPageChange,
  onSearch,
  onFilterRole,
  onView,
  onEdit,
  onDelete,
  onRefresh,
}: AdminUsersTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>(undefined)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  /** Gère la recherche avec debounce */
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, onSearch])

  const handleRoleFilter = (role?: UserRole) => {
    setSelectedRole(role)
    onFilterRole(role)
  }

  const getRoleColor = (role: UserRole) => {
    return ROLES.find((r) => r.value === role)?.color || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche et filtres */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={selectedRole ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleRoleFilter(undefined)}
            className={selectedRole ? '' : 'bg-slate-100'}
          >
            Tous ({users.length})
          </Button>
          {ROLES.map((role) => (
            <Button
              key={role.value}
              variant={selectedRole === role.value ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                handleRoleFilter(selectedRole === role.value ? undefined : role.value)
              }
            >
              {role.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tableau mobile-friendly */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-500">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <>
            {/* Version desktop: tableau */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                      Date création
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                      Dernier login
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                            {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                            {(user.lastName?.[0] || '').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {user.firstName || ''} {user.lastName || ''}
                              {(!user.firstName && !user.lastName) && user.email}
                            </p>
                            {user.authMethod && (
                              <p className="text-xs text-slate-500">{user.authMethod}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getRoleColor(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const plan = (user as any).plan || 'FREE';
                          const planColors: Record<string, string> = {
                            FREE: 'bg-slate-100 text-slate-600',
                            PRO: 'bg-teal-100 text-teal-700',
                            PREMIUM: 'bg-purple-100 text-purple-700',
                          };
                          return (
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${planColors[plan] || planColors.FREE}`}>
                              {plan}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(user.lastLogin)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onView(user)}
                            className="p-2 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition"
                            title="Voir"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => onEdit(user)}
                            className="p-2 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition"
                            title="Modifier"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => onDelete(user)}
                            className="p-2 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Version mobile: cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {users.map((user) => (
                <div key={user.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                        {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                        {(user.lastName?.[0] || '').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {user.firstName || ''} {user.lastName || ''}
                          {(!user.firstName && !user.lastName) && user.email}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setExpandedRowId(expandedRowId === user.id ? null : user.id)
                      }
                      className="p-2 hover:bg-slate-100 rounded transition"
                    >
                      <MoreVertical size={18} className="text-slate-400" />
                    </button>
                  </div>

                  {/* Info supplémentaire */}
                  <div className="mt-3 ml-13 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Plan:</span>
                      {(() => {
                        const plan = (user as any).plan || 'FREE';
                        const planColors: Record<string, string> = {
                          FREE: 'bg-slate-100 text-slate-600',
                          PRO: 'bg-teal-100 text-teal-700',
                          PREMIUM: 'bg-purple-100 text-purple-700',
                        };
                        return <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ${planColors[plan] || planColors.FREE}`}>{plan}</span>;
                      })()}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rôle:</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getRoleColor(user.role)}`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Créé:</span>
                      <span className="text-slate-900">{formatDate(user.createdAt)}</span>
                    </div>
                    {user.lastLogin && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dernier login:</span>
                        <span className="text-slate-900">{formatDate(user.lastLogin)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions mobile */}
                  {expandedRowId === user.id && (
                    <div className="mt-3 flex gap-2 pt-3 border-t border-slate-200">
                      <button
                        onClick={() => {
                          onView(user)
                          setExpandedRowId(null)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                      >
                        <Eye size={16} />
                        Voir
                      </button>
                      <button
                        onClick={() => {
                          onEdit(user)
                          setExpandedRowId(null)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition"
                      >
                        <Edit2 size={16} />
                        Modifier
                      </button>
                      <button
                        onClick={() => {
                          onDelete(user)
                          setExpandedRowId(null)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded bg-red-50 text-red-600 hover:bg-red-100 transition"
                      >
                        <Trash2 size={16} />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-600">
            Page {currentPage} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Actions batch */}
      {!isLoading && (
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Actualiser
          </Button>
        </div>
      )}
    </div>
  )
}
