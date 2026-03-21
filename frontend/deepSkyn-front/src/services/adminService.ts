/**
 * Service API pour les opérations Admin
 * Communique avec le backend /api/admin/*
 */

import { authFetch } from '@/lib/authSession'
import type {
  AdminUser,
  AdminDashboardStats,
  AdminUsersListResponse,
  UpdateUserRoleRequest,
} from '@/types/admin'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

/**
 * Récupère les statistiques du dashboard admin
 */
export async function getAdminStats(): Promise<AdminDashboardStats> {
  const res = await authFetch(`${API_URL}/admin/stats`, {
    method: 'GET',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err?.message || 'Failed to fetch admin stats')
  }

  return res.json()
}

/**
 * Récupère la liste des utilisateurs avec pagination et filtres
 */
export async function getAdminUsers(
  page: number = 1,
  limit: number = 10,
  search?: string,
  role?: string
): Promise<AdminUsersListResponse> {
  const params = new URLSearchParams()
  params.append('page', page.toString())
  params.append('limit', limit.toString())
  if (search) params.append('search', search)
  if (role) params.append('role', role)

  const res = await authFetch(`${API_URL}/admin/users?${params.toString()}`, {
    method: 'GET',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err?.message || 'Failed to fetch users')
  }

  return res.json()
}

/**
 * Récupère les détails d'un utilisateur spécifique
 */
export async function getAdminUserDetail(userId: string): Promise<AdminUser> {
  const res = await authFetch(`${API_URL}/admin/users/${userId}`, {
    method: 'GET',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err?.message || 'Failed to fetch user details')
  }

  return res.json()
}

/**
 * Met à jour le rôle d'un utilisateur
 */
export async function updateUserRole(
  userId: string,
  request: UpdateUserRoleRequest
): Promise<AdminUser> {
  const res = await authFetch(`${API_URL}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err?.message || 'Failed to update user role')
  }

  return res.json()
}

/**
 * Met à jour les informations d'un utilisateur
 */
export async function updateAdminUser(
  userId: string,
  updates: Partial<AdminUser>
): Promise<AdminUser> {
  const res = await authFetch(`${API_URL}/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err?.message || 'Failed to update user')
  }

  return res.json()
}

/**
 * Supprime un utilisateur
 */
export async function deleteAdminUser(userId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/admin/users/${userId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err?.message || 'Failed to delete user')
  }
}

/**
 * Crée un nouvel utilisateur (admin peut créer des admins)
 */
export interface CreateUserRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: 'USER' | 'ADMIN'
  bio?: string
}

export async function createAdminUser(data: CreateUserRequest): Promise<{ message: string; user: AdminUser }> {
  const res = await authFetch(`${API_URL}/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err?.message || 'Erreur lors de la création')
  }

  return res.json()
}

/**
 * Exporte les utilisateurs en CSV (facultatif)
 */
export async function exportUsersCSV(): Promise<Blob> {
  const res = await authFetch(`${API_URL}/admin/users/export/csv`, {
    method: 'GET',
  })

  if (!res.ok) {
    throw new Error('Failed to export users')
  }

  return res.blob()
}
