/**
 * Layout pour les pages admin
 * Inclus la navigation et le contenu principal
 */

import { AdminNavigation } from './AdminNavigation'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNavigation />

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>
    </div>
  )
}
