/**
 * Page des paramètres admin (placeholder)
 */

import { Settings, AlertCircle } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-teal-600" />
          <h1 className="text-3xl font-bold text-slate-900">Paramètres Admin</h1>
        </div>
        <p className="text-slate-600">
          Configurez les paramètres globaux de votre plateforme
        </p>
      </div>

      {/* Contenu */}
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Paramètres en construction
        </h2>
        <p className="text-slate-600">
          Cette section sera bientôt disponible. Vous pourrez ici configurer :
        </p>
        <ul className="mt-4 text-sm text-slate-600 space-y-2">
          <li>• Configuration des emails</li>
          <li>• Paramètres de sécurité</li>
          <li>• Politiques de conservation des données</li>
          <li>• Intégrations externes</li>
          <li>• Maintenance du système</li>
        </ul>
      </div>
    </div>
  )
}
