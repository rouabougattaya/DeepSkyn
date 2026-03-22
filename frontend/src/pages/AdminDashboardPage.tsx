/**
 * Page Dashboard pour l'admin
 * Affiche les statistiques et accès rapides
 */

import { useState, useEffect } from 'react'
import { Users, UserCheck, TrendingUp, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getAdminStats } from '@/services/adminService'
import BiometricRegistration from '@/components/admin/BiometricRegistration'
import type { AdminDashboardStats } from '@/types/admin'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getAdminStats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const StatCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    color,
  }: {
    icon: React.ComponentType<{ className?: string }>
    title: string
    value: string | number
    subtitle?: string
    color: 'teal' | 'blue' | 'emerald' | 'amber' | 'red'
  }) => {
    const colors = {
      teal: 'bg-teal-50 text-teal-600',
      blue: 'bg-blue-50 text-blue-600',
      emerald: 'bg-emerald-50 text-emerald-600',
      amber: 'bg-amber-50 text-amber-600',
      red: 'bg-red-50 text-red-600',
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-3xl font-bold text-slate-900">{value}</p>
              {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <div className={`rounded-lg p-3 ${colors[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord Admin</h1>
          <p className="text-slate-600 mt-2">Vue d'ensemble de votre plateforme</p>
        </div>
        <Button
          onClick={loadStats}
          variant="outline"
          className="sm:self-start"
        >
          Actualiser
        </Button>
      </div>

      {/* Message erreur */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Erreur</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Contenu chargement */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600"></div>
        </div>
      ) : stats ? (
        <>
          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={Users}
              title="Utilisateurs totaux"
              value={stats.totalUsers}
              color="teal"
            />
            <StatCard
              icon={UserCheck}
              title="Administrateurs"
              value={stats.totalAdmins}
              color="blue"
            />
            <StatCard
              icon={TrendingUp}
              title="Modérateurs"
              value={stats.totalModerators}
              color="emerald"
            />
            <StatCard
              icon={TrendingUp}
              title="Nouveaux utilisateurs"
              value={stats.newUsersThisMonth}
              subtitle="ce mois"
              color="amber"
            />
            <StatCard
              icon={UserCheck}
              title="Utilisateurs actifs"
              value={stats.activeUsersThisMonth}
              subtitle="ce mois"
              color="teal"
            />
            <StatCard
              icon={TrendingUp}
              title="Connexions totales"
              value={stats.totalLogins}
              color="blue"
            />
          </div>

          {/* Biometric Registration */}
          <BiometricRegistration />

          {/* Actions rapides */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions rapides</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link to="/admin/users">
                <Button
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Gérer utilisateurs
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full"
                disabled
              >
                Logs système
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled
              >
                Backups
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled
              >
                Settings
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
            <h3 className="font-semibold text-slate-900 mb-3">ℹ️ À propos du backoffice</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>• Gérez tous les utilisateurs de votre plateforme</li>
              <li>• Modifiez les rôles et les permissions en temps réel</li>
              <li>• Consultez l'historique des actions effectuées</li>
              <li>• Exportez les données utilisateur si nécessaire</li>
            </ul>
          </div>
        </>
      ) : null}
    </div>
  )
}
