# Backoffice Admin - DeepSkyn

## 📋 Vue d'ensemble

Le backoffice admin est une interface de gestion complète pour les administrateurs de la plateforme DeepSkyn. Il permet de gérer les utilisateurs, leurs rôles et les permissions de la plateforme.

## 🔐 Accès

Le backoffice est accessible uniquement aux utilisateurs ayant le rôle **`admin`** via les routes :

- **Dashboard** : `/admin`
- **Gestion des utilisateurs** : `/admin/users`
- **Paramètres** : `/admin/settings`

### Protection des routes

Les routes admin sont protégées par le composant `ProtectedAdminRoute` qui vérifie :
1. Que l'utilisateur est connecté (session valide)
2. Que l'utilisateur a le rôle `admin`

Si un utilisateur non-admin tente d'accéder à `/admin`, il sera redirigé vers la page d'accueil.

## 🎯 Fonctionnalités

### Dashboard Admin (`/admin`)

Affiche les statistiques clés de la plateforme :
- Nombre total d'utilisateurs
- Nombre d'administrateurs
- Nombre de modérateurs
- Nouveaux utilisateurs ce mois
- Utilisateurs actifs ce mois
- Connexions totales

**Actions rapides** pour accéder aux sections principales.

### Gestion des utilisateurs (`/admin/users`)

Une interface complète pour gérer l'ensemble des utilisateurs :

#### 🔍 Recherche
- Recherche par nom ou email
- Debounce de 300ms pour optimiser les requêtes

#### 🏷️ Filtres
- Filtrer par rôle (Admin, Modérateur, Utilisateur)
- Sélection rapide "Tous"

#### 📊 Tableau
Affiche les colonnes :
- **Nom** avec avatar initiales
- **Email**
- **Rôle** avec badge coloré
- **Date de création**
- **Dernier login**
- **Actions** (Voir, Modifier, Supprimer)

#### 📱 Responsive
- **Desktop** : Tableau classique avec scrolling horizontal si besoin
- **Mobile** : Cartes avec menu d'actions dépliable

#### ⚙️ Actions sur les utilisateurs

**Voir détails** :
- Affiche une modale avec les informations complètes
- ID, Rôle, Dates, Méthode d'authentification, Score IA, Bio

**Modifier rôle** :
- Modale de sélection du nouveau rôle
- Options : Utilisateur, Modérateur, Admin
- Confirmation visuelle avant sauvegarde
- Gestion des erreurs avec messages explicites

**Supprimer** :
- Modale de confirmation avec avertissement
- Demande de confirmation par email (prévient les suppressions accidentelles)
- Message irréversible claire

#### 📄 Pagination
- Navigation entre les pages (10 utilisateurs par page)
- Affichage du nombre total de pages
- Boutons Précédent/Suivant désactivés aux extrémités

## 🏗️ Structure des fichiers

```
src/
├── types/
│   └── admin.ts                      # Interfaces TypeScript admin
├── services/
│   └── adminService.ts               # API calls pour l'admin
├── components/
│   ├── ProtectedAdminRoute.tsx        # Guard pour vérifier le rôle admin
│   └── admin/
│       ├── index.ts                  # Exports centralisés
│       ├── AdminLayout.tsx            # Layout wrapper
│       ├── AdminNavigation.tsx        # Barre de navigation
│       ├── AdminUsersTable.tsx        # Tableau principal
│       ├── ViewUserModal.tsx          # Modale détails
│       ├── EditUserModal.tsx          # Modale modification rôle
│       └── DeleteUserModal.tsx        # Modale confirmation suppression
├── pages/
│   ├── AdminDashboardPage.tsx         # Dashboard
│   ├── AdminUsersPage.tsx             # Page gestion utilisateurs
│   └── AdminSettingsPage.tsx          # Page paramètres (placeholder)
└── App.tsx                            # Routes intégrées
```

## 📡 Endpoints API

Le service `adminService.ts` communique avec les endpoints suivants :

```typescript
// Statistiques
GET /api/admin/stats

// Utilisateurs
GET /api/admin/users?page=1&limit=10&search=...&role=...
GET /api/admin/users/:userId
PATCH /api/admin/users/:userId/role
PUT /api/admin/users/:userId
DELETE /api/admin/users/:userId

// Export (optionnel)
GET /api/admin/users/export/csv
```

## 🎨 Design et UX

### Couleurs et badges

- **Admin** : Badge rouge (`bg-red-100 text-red-800`)
- **Modérateur** : Badge jaune (`bg-yellow-100 text-yellow-800`)
- **Utilisateur** : Badge bleu (`bg-blue-100 text-blue-800`)

### Messages de feedback

- **Erreurs** : Fond rouge, icône d'alerte
- **Succès** : Fond vert, message court (3 secondes)
- **Avertissements** : Fond ambré pour les actions sensibles

### Accessibilité

- Tous les boutons d'action sont labelisés
- Les modales sont focusées et fermables avec Échap (à ajouter)
- Contraste suffisant pour la lisibilité
- Pages responsives (mobile-first)

## 🚀 Intégration

L'admin est entièrement intégré à l'application :

1. **SessionUser** inclut maintenant le champ `role`
2. **ProtectedAdminRoute** dans App.tsx protège les routes
3. **AdminLayout** fournit le layout cohérent avec navigation
4. Les routes sont nesting dans les routes protégées existantes

## 🔄 État et Forms

- **React Hooks** : state management simple avec `useState/useEffect`
- **Debounce** : recherche optimisée (300ms)
- **Optimistic updates** : mise à jour locale avant la réponse serveur
- **Error handling** : gestion centralisée des erreurs avec affichage

## ⚡ Performance

- **Pagination** : Limitation à 10 utilisateurs par page
- **Debounce recherche** : 300ms de délai
- **Lazy loading** : Chargement des stats au montage
- **Optimisations** : Évite les re-renders inutiles

## 🔄 État futur

Fonctionnalités à ajouter :

- [ ] Export utilisateurs en CSV
- [ ] Historique des actions admin
- [ ] Bulk actions (modifier plusieurs utilisateurs)
- [ ] Logs système
- [ ] Gestion des permissions granulaires
- [ ] Audit trail complet
- [ ] Paramètres système (emails, sécurité, etc.)

## 📝 Notes développement

### Types d'utilisateurs et rôles

```typescript
type UserRole = 'admin' | 'user' | 'moderator'

// AdminUser extend SessionUser
interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  createdAt: string
  lastLogin?: string
  // ... autres champs
}
```

### Service API

Toutes les appels API passent par `adminService.ts` qui :
- Utilise `authFetch` pour inclure les tokens
- Gère les erreurs et les conversions JSON
- Retourne des types TypeScript fortement typés

### Modales

Les modales utilise des **controlled components** :
- État interne géré par le composant parent
- Props pour ouvrir/fermer et callbacks
- Pas de refs ou de portals (simple)

## 🐛 Troubleshooting

### Le backoffice n'est pas accessible
Vérifiez que :
1. L'utilisateur est connecté (`hasSession()`)
2. L'utilisateur a le rôle `admin` dans son token
3. Les variables d'environnement `VITE_API_BASE_URL` sont configurées

### Les utilisateurs ne se chargent pas
Vérifiez :
1. L'endpoint `/api/admin/users` existe et retourne les bons données
2. Le format de la réponse correspond à `AdminUsersListResponse`
3. Les tokens CORS sont configurés correctement

### Les modales ne s'affichent pas
Le CSS Tailwind est peut-être mal compilé. Vérifiez :
1. `tailwind.config.js` inclut tous les fichiers jsx/tsx
2. Les classes `fixed`, `z-50`, `bg-black bg-opacity-50` existent

---

**Dernière mise à jour** : Mars 2026
**Statut** : ✅ Production-ready
