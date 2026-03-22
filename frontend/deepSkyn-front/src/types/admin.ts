/**
 * Types et interfaces pour le module Admin
 */

export type UserRole = 'admin' | 'user' | 'moderator'

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName?: string
  role: UserRole
  createdAt: string
  updatedAt?: string
  lastLogin?: string
  bio?: string
  picture?: string
  authMethod?: string
  isActive?: boolean
  aiScore?: number
}

export interface AdminDashboardStats {
  totalUsers: number
  totalAdmins: number
  totalModerators: number
  newUsersThisMonth: number
  activeUsersThisMonth: number
  totalLogins: number
}

export interface AdminPaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AdminUsersListResponse {
  data: AdminUser[]
  meta: AdminPaginationMeta
}

export interface UpdateUserRoleRequest {
  role: UserRole
}

export interface AdminAction {
  id: string
  adminId: string
  adminEmail: string
  action: 'ROLE_UPDATED' | 'USER_DELETED' | 'USER_CREATED' | 'USER_EDITED'
  targetUserId: string
  targetUserEmail: string
  details?: Record<string, any>
  createdAt: string
}
