# Livrable : authentification complète sécurisée – Checklist

## Backend (`backend/backend/src`)

| Élément | Statut | Détail |
|--------|--------|--------|
| **auth** | ✅ | AuthModule, AuthService, AuthController, DTOs, SessionGuard, décorateurs (Public, CurrentUser, CurrentSession). |
| **email-security** | ✅ | EmailSecurityService (liste domaines jetables + format). Option Gemini si `GEMINI_API_KEY` défini. |
| **routine** | ✅ | routine.entity.ts + RoutineModule (TypeORM). |
| **session** | ✅ | SessionModule, SessionService, Session entity (access/refresh hash, lookups, IP/User-Agent). |
| **user** | ✅ | user.entity.ts, DTOs create/update. |
| **POST /auth/register** | ✅ | @Public(), rate limit 3/min, validation DTO, email suspect, bcrypt, session. |
| **POST /auth/login** | ✅ | @Public(), rate limit 5/min, bcrypt.compare, session. |
| **Hash bcrypt** | ✅ | Mots de passe (SALT_ROUNDS 12) ; tokens hashés en base. |
| **Access / Refresh** | ✅ | crypto.randomBytes, lookups SHA-256, expiration, rotation au refresh. |
| **Refresh token rotation** | ✅ | Ancienne session supprimée, nouvelle créée ; ancien refresh invalide. |
| **Blacklist DB** | ✅ | Équivalent : session supprimée en base = token inutilisable (pas de table blacklist séparée). |

## Frontend (`deepSkyn-front/src`)

| Élément | Statut | Détail |
|--------|--------|--------|
| **lib** | ✅ | authSession.ts (tokens, setSession, clearSession, authFetch, logout). |
| **pages** | ✅ | LoginPage, RegisterPage. |
| **Validation Zod** | ✅ | Schémas dans lib/schemas/auth.ts ; validation côté client avant envoi. |
| **Gestion erreurs UX** | ✅ | Messages par champ + bandeau erreur API, désactivation submit pendant chargement. |

## Feature avancée

| Élément | Statut | Détail |
|--------|--------|--------|
| **Refresh token rotation** | ✅ | Backend : revokeSession puis createSession à chaque refresh. |
| **Blacklist DB** | ✅ | Révocation = suppression de la session en base (token inutilisable). |
| **Détection emails suspects (Gemini)** | ✅ | Optionnel : si `GEMINI_API_KEY` est défini, classification spam/fake via Gemini en plus de la liste + format. |

## Livrable

**Authentification complète sécurisée** : register/login avec validation (backend + front Zod), sessions (access/refresh, rotation, expiration, révocation), détection emails suspects (liste + format + option Gemini), rate limiting, guard global, erreurs UX sur Login/Register.
