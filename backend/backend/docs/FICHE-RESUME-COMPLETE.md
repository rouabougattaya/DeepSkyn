# DeepSkyn – Fiche résumé complète (Authentification & sécurité)

## 1. Livrable – Checklist

| Zone | Élément | Statut |
|------|---------|--------|
| **Backend** | auth, email-security, routine, session, user | ✅ |
| **Backend** | POST /auth/register, POST /auth/login, bcrypt, access/refresh | ✅ |
| **Backend** | Refresh rotation, blacklist (session supprimée = token invalide) | ✅ |
| **Frontend** | lib (authSession), pages (Login/Register), Zod, erreurs UX | ✅ |
| **Feature** | Détection emails suspects (liste + format + option Gemini) | ✅ |

---

## 2. Inscription (Register)

1. Client envoie `email, password, firstName, lastName` → `POST /auth/register`
2. **Email suspect** : `EmailSecurityService.isSuspicious()` (domaines jetables + format) → 400 si suspect
3. **Doublon** : si email déjà pris → 409 Conflict
4. **Mot de passe** : hash bcrypt (12 rounds), jamais en clair
5. **Création user** : TypeORM, rôle USER
6. **Création session** : tokens opaques (access + refresh), hash en base
7. **Réponse** : `accessToken`, `refreshToken`, dates d’expiration, `user`

---

## 3. Login

1. Client envoie `email, password` → `POST /auth/login`
2. **Recherche user** par email (normalisé lowercase, trim)
3. **Message unique** : si user absent ou mot de passe faux → « Email ou mot de passe incorrect » (pas de fuite d’info)
4. **Vérification** : `bcrypt.compare(password, user.passwordHash)`
5. **Création session** : même logique que register (tokens opaques, hash en base)
6. **Réponse** : tokens + user → stockage front (localStorage) + redirection

---

## 4. Sessions – Access & Refresh (sans JWT)

| | Access Token | Refresh Token |
|---|--------------|---------------|
| **Durée** | 15 min | 7 jours |
| **Usage** | Chaque requête API : `Authorization: Bearer <token>` | Uniquement `POST /auth/refresh` pour renouveler |
| **Stockage** | Hash bcrypt + lookup SHA-256 en base | Idem |
| **Révocation** | Suppression session en base → token inutile | Idem |

- Tokens **opaques** : `crypto.randomBytes(32).toString('hex')` (64 caractères hex)
- Jamais stockés en clair ; uniquement hash en base
- Pas de JWT → révocation simple (supprimer la ligne)

---

## 5. Rotation des sessions

À chaque **refresh** :
1. Valider le refresh token (lookup + expiration + bcrypt)
2. **Supprimer** l’ancienne session en base
3. **Créer** une nouvelle session (nouveaux tokens)
4. Retourner nouveaux tokens au client

→ Ancien refresh token **immédiatement invalide** ; limite le vol de session.

---

## 6. Routes protégées – Guard global

- **SessionGuard** en `APP_GUARD` : toutes les routes protégées par défaut
- **@Public()** : login, register, refresh, GET / → accessibles sans token
- Sans token ou token invalide → **401 Unauthorized**
- Guard attache `user` et `session` au request → `@CurrentUser()`, `@CurrentSession()`

---

## 7. Architecture

| Composant | Rôle |
|-----------|------|
| **AuthService** | Orchestration : login, register, refresh, logout ; délègue à SessionService |
| **SessionService** | Création, validation (access/refresh), révocation, isSuspiciousSession (IP/UA) |
| **SessionGuard** | Extraction Bearer, validation via SessionService, attache user/session |
| **EmailSecurityService** | Liste domaines jetables + format suspect ; option Gemini si `GEMINI_API_KEY` |

**Entité Session** : `accessTokenHash`, `refreshTokenHash`, `accessTokenLookup`, `refreshTokenLookup`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `ipAddress`, `userAgent`

---

## 8. Détection emails suspects

- **Domaines jetables** : 10minutemail, mailinator, guerrillamail, tempmail, yopmail, etc.
- **Format suspect** : vide, plusieurs `@`, points consécutifs, pas de TLD, longueurs invalides
- **Résultat** : `{ suspicious: boolean, reason?: 'disposable' | 'format' }`
- **Message API** : générique (« Cet email n'est pas accepté ») pour ne pas aider un attaquant
- **Option Gemini** : classification spam/fake si `GEMINI_API_KEY` défini

---

## 9. Sécurité – Audit et corrections

**Points corrects** : bcrypt (12 rounds), messages non révélateurs, rotation, expiration, révocation, guard global, IP/User-Agent en session, séparation responsabilités.

**Corrections appliquées** :
- **Rate limiting** : login 5/min, register 3/min, refresh 10/min (ThrottlerModule)
- **Exception filter global** : réponse JSON homogène ; en prod, pas de stack trace sur 500
- **ValidationPipe** : `whitelist`, `forbidNonWhitelisted`, `transform`

**Pistes** : RolesGuard si besoin, rejet sessions suspectes (IP/UA) dans le Guard.

---

## 10. Fichiers principaux

| Fichier | Rôle |
|---------|------|
| `auth/auth.service.ts` | login, register, refresh, logout |
| `auth/auth.controller.ts` | POST login/register/refresh, GET me, POST logout |
| `auth/guards/session.guard.ts` | Validation Bearer, @Public() |
| `auth/decorators/` | @Public, @CurrentUser, @CurrentSession |
| `session/session.service.ts` | createSession, validateAccessToken, validateRefreshToken, revokeSession |
| `session/session.entity.ts` | Modèle Session |
| `email-security/email-security.service.ts` | isSuspicious() |
| `lib/authSession.ts` (front) | setSession, authFetch (refresh sur 401), logout |

---

## Phrase de résumé soutenance

*« Authentification par sessions (pas de JWT) : register/login avec validation, bcrypt, tokens opaques stockés en hash en base, access (15 min) + refresh (7 j), rotation au refresh, guard global, routes @Public pour login/register/refresh, détection emails suspects, rate limiting, révocation par suppression de session. »*
