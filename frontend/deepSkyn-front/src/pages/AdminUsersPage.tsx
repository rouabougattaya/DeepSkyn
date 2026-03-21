/**
 * Page de gestion des utilisateurs pour l'admin
 */

import { useState, useEffect } from 'react'
import { Users, AlertCircle, UserPlus } from 'lucide-react'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'
import { ViewUserModal } from '@/components/admin/ViewUserModal'
import { EditUserModal } from '@/components/admin/EditUserModal'
import { DeleteUserModal } from '@/components/admin/DeleteUserModal'
import { CreateUserModal } from '@/components/admin/CreateUserModal'
import {
  getAdminUsers,
  updateUserRole,
  deleteAdminUser,
} from '@/services/adminService'
import type { AdminUser, UserRole } from '@/types/admin'

export default function AdminUsersPage() {
  // État des données
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // État pagination et filtres
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>(undefined)

  // État modales
  const [viewUser, setViewUser] = useState<AdminUser | null>(null)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  /** Charge la liste des utilisateurs */
  const loadUsers = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await getAdminUsers(currentPage, 10, searchTerm, selectedRole)
      setUsers(response.data)
      setTotalPages(response.meta.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  /** Charge les utilisateurs au montage et lors des changements de filtres */
  useEffect(() => {
    loadUsers()
  }, [currentPage, searchTerm, selectedRole])

  /** Gère la modification du rôle */
  const handleEditRole = async (user: AdminUser, newRole: UserRole) => {
    try {
      setError('')
      await updateUserRole(user.id, { role: newRole })

      // Mettre à jour localement
      setUsers(users.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)))

      setSuccess(`Rôle de ${user.firstName} mis à jour en "${newRole}"`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      throw err
    }
  }

  /** Gère la suppression d'un utilisateur */
  const handleDeleteUser = async (user: AdminUser) => {
    try {
      setError('')
      await deleteAdminUser(user.id)

      // Supprimer localement
      setUsers(users.filter((u) => u.id !== user.id))

      setSuccess(`${user.firstName} a été supprimé`)
      setTimeout(() => setSuccess(''), 3000)

      // Recharger si besoin
      if (users.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
    } catch (err) {
      throw err
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-teal-600" />
            <h1 className="text-3xl font-bold text-slate-900">Gestion des utilisateurs</h1>
          </div>
          <p className="text-slate-600">
            Gérez les utilisateurs, les rôles et les permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Créer un utilisateur
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Erreur</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-sm text-emerald-700">✓ {success}</p>
        </div>
      )}

      {/* Tableau utilisateurs */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <AdminUsersTable
          users={users}
          isLoading={isLoading}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onSearch={setSearchTerm}
          onFilterRole={setSelectedRole}
          onView={setViewUser}
          onEdit={setEditUser}
          onDelete={setDeleteUser}
          onRefresh={loadUsers}
        />
      </div>

      {/* Modales */}
      <ViewUserModal
        user={viewUser}
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
      />

      <EditUserModal
        user={editUser}
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        onSave={handleEditRole}
      />

      <DeleteUserModal
        user={deleteUser}
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDeleteUser}
      />

      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadUsers}
      />
    </div>
  )
}
