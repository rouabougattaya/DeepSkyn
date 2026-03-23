/**
 * Barre de navigation pour le backoffice admin
 */

import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react'
import { getUser, logout } from '@/lib/authSession'

export function AdminNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = getUser()

  const handleLogout = async () => {
    await logout()
    navigate('/auth/login', { replace: true })
  }

  // Vérifier que c'est un admin
  if (user?.role !== 'admin') {
    return null
  }

  const links = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/admin/users',
      label: 'Utilisateurs',
      icon: Users,
    },
    {
      href: '/admin/settings',
      label: 'Paramètres',
      icon: Settings,
    },
  ]

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-8">
          <div className="flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = location.pathname === link.href

              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    isActive
                      ? 'bg-teal-100 text-teal-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm">{link.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Bouton retour login */}
          <div className="ml-auto">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut size={18} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
