# Sécurité, architecture et bonnes pratiques – Corrections et explications pour soutenance

## Contexte

- **Pas de JWT** : tokens opaques uniquement (`crypto.randomBytes`), stockés en hash en base.
- **Session-based** : une ligne en base par session ; validation et révocation côté serveur.

Ce document décrit les **failles identifiées**, les **corrections apportées**, l’**architecture** retenue et des **points pour la soutenance technique**.

---

## 1. Failles de sécurité identifiées et corrections

### 1.1 Validation de l’access token (Guard manquant)

**Faille** : Aucun Guard ne validait l’access token sur les routes protégées. Un token expiré ou invalide n’était pas rejeté de façon centralisée ; les routes “protégées” ne l’étaient pas réellement.

**Correction** :
- **SessionGuard** : extrait le `Authorization: Bearer <token>`, appelle **SessionService.validateAccessToken(token)** (lookup par empreinte SHA-256 + vérification expiration + `bcrypt.compare`), attache `user` et `session` à la requête, sinon renvoie 401.
- Les routes qui doivent être protégées utilisent `@UseGuards(SessionGuard)` et peuvent utiliser `@CurrentUser()` / `@CurrentSession()`.

### 1.2 Lookup de l’access token (performance et cohérence)

**Faille** : Seul le refresh token avait un champ `refreshTokenLookup` pour retrouver rapidement la session. Pour l’access token, il aurait fallu parcourir les sessions et faire un `bcrypt.compare` par session (coûteux et non scalable).

**Correction** :
- Ajout de **accessTokenLookup** (SHA-256 de l’access token) dans l’entité **Session**, comme pour le refresh.
- **SessionService.validateAccessToken** : recherche par `accessTokenLookup`, puis vérification de l’expiration et `bcrypt.compare` une seule fois. Comportement prêt pour la production.

### 1.3 Révocation (logout) inexistante

**Faille** : Aucun endpoint de déconnexion. Le client pouvait supprimer les tokens en local, mais la session restait valide en base ; un token volé aurait pu continuer à être utilisé.

**Correction** :
- **POST /auth/logout** protégé par **SessionGuard** : récupère la session courante via le Bearer token, appelle **SessionService.revokeSession(session.id)** (suppression de la ligne en base), puis retourne 200.
- Côté client : **logout()** dans `authSession.ts` appelle cet endpoint puis **clearSession()** pour une déconnexion propre.

### 1.4 Pas de métadonnées de session (IP / User-Agent)

**Faille** : Impossible de détecter une utilisation suspecte (même compte depuis une autre IP ou un autre navigateur) ni d’auditer les sessions.

**Correction** :
- Champs **ipAddress** et **userAgent** (optionnels) sur l’entité **Session**, renseignés à la **création** de la session (login, register, refresh).
- **SessionService.isSuspiciousSession(session, currentIp, currentUserAgent)** : compare IP et User-Agent actuels à ceux enregistrés ; peut servir à alerter, exiger une reconnexion ou à du logging, sans bloquer par défaut.

### 1.5 Expiration des tokens

**Faille** : Les dates d’expiration étaient stockées mais la validation centralisée (Guard + SessionService) devait les appliquer systématiquement.

**Correction** :
- **SessionService.validateAccessToken** : vérifie `session.accessTokenExpiresAt < new Date()` avant d’accepter la session.
- **SessionService.validateRefreshToken** : vérifie `session.refreshTokenExpiresAt < new Date()`.
- Une session expirée est traitée comme invalide (401 / “Session expirée ou invalide”).

### 1.6 Constantes et responsabilités mélangées

**Faille** : Durées des tokens et constantes bcrypt dupliquées ou mélangées entre auth et session ; risque d’incohérence et code peu maintenable.

**Correction** :
- **session/session.constants.ts** : `ACCESS_TOKEN_TTL_MS`, `REFRESH_TOKEN_TTL_MS`, `SALT_ROUNDS`, `TOKEN_BYTES` utilisés uniquement par **SessionService**.
- **AuthService** garde son propre `SALT_ROUNDS` pour le hash des **mots de passe** (responsabilité distincte de celle des tokens).

---

## 2. Architecture et séparation des responsabilités

### 2.1 Rôles des composants

| Composant | Responsabilité |
|----------|----------------|
| **AuthService** | Orchestration : login (vérif user + mot de passe), register (email suspect + création user), refresh (délègue à SessionService + rotation), logout (révocation). Ne gère pas la persistance des sessions. |
| **SessionService** | Gestion des sessions uniquement : création (tokens, hash, lookups, IP/UA), validation access/refresh (lookup + expiration + bcrypt), révocation (une session ou toutes pour un user), détection suspecte (IP/UA). |
| **SessionGuard** | Vérification de l’access token sur les routes protégées : extraction Bearer, appel SessionService.validateAccessToken, attache user/session à la requête, sinon 401. |
| **AuthController** | Entrée HTTP : passe les métadonnées (IP, User-Agent) aux services ; logout protégé par SessionGuard et utilisation de @CurrentSession(). |

### 2.2 Flux de données

- **Login / Register** : Controller récupère `req.ip` et `req.headers['user-agent']` → AuthService → SessionService.createSession(user, metadata) → retour tokens + user au client.
- **Refresh** : Controller passe métadonnées → AuthService.refresh → SessionService.validateRefreshToken → SessionService.revokeSession → SessionService.createSession (rotation) → retour nouveaux tokens.
- **Requête protégée** : SessionGuard valide le Bearer via SessionService.validateAccessToken → request.user et request.session renseignés → contrôleur peut utiliser @CurrentUser() / @CurrentSession().
- **Logout** : SessionGuard valide le token → AuthService.logout(session.id) → SessionService.revokeSession(sessionId) → session supprimée en base.

### 2.3 Modules

- **SessionModule** : TypeORM (Session), SessionService, export de SessionService.
- **AuthModule** : TypeORM (User), SessionModule, AuthService, AuthController, SessionGuard. Pas de logique de session en base dans AuthService, uniquement délégation à SessionService.

---

## 3. Bonnes pratiques appliquées

- **Tokens** : uniquement `crypto.randomBytes(TOKEN_BYTES)` (pas de JWT) ; jamais stockés en clair en base (hash bcrypt + lookups SHA-256).
- **Rotation au refresh** : ancienne session supprimée, nouvelle session créée ; ancien refresh token immédiatement invalide.
- **Expiration** : vérifiée à chaque validation (access et refresh).
- **Révocation** : logout révoque la session en base ; possibilité d’ajouter “déconnecter tous les appareils” via revokeAllForUser(userId).
- **Pas de log des tokens** : seuls les hash et lookups sont en base ; les tokens ne doivent jamais être loggés.
- **Messages d’erreur** : messages génériques côté API (ex. “Session expirée ou invalide”) pour ne pas aider un attaquant.
- **Constantes** : centralisées (session.constants.ts) pour éviter les magic numbers et les incohérences.

---

## 4. Résumé pour la soutenance technique

- **Sécurité** : Guard pour protéger les routes ; validation de l’access token par lookup + expiration + bcrypt ; logout qui révoque la session ; rotation du refresh token ; détection de sessions suspectes (IP/User-Agent) ; expiration correcte des sessions.
- **Architecture** : AuthService (orchestration auth), SessionService (gestion des sessions), SessionGuard (protection des routes), séparation claire des responsabilités et modules dédiés.
- **Production-ready** : pas de JWT ; tokens opaques et révocables ; constantes centralisées ; code structuré pour être testable et maintenable.

**En une phrase** : *« On a corrigé les failles (Guard manquant, pas de logout, pas de lookup access token, pas de métadonnées), séparé AuthService et SessionService, ajouté un Guard de session et un logout qui révoque la session en base, avec rotation du refresh token et détection de sessions suspectes (IP/User-Agent), le tout sans JWT et avec des tokens uniquement aléatoires. »*
