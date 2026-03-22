# Audit complet sécurité et routage – Backend NestJS (sessions, pas JWT)

## Contexte

- **Stack** : NestJS, TypeORM, PostgreSQL, bcrypt, sessions en base, tokens opaques (`crypto.randomBytes`).
- **Périmètre** : backend uniquement ; niveau production / soutenance technique.

---

# PARTIE 1 – CE QUI EST CORRECT

## Authentification

| Point | Statut | Détail |
|-------|--------|--------|
| **1. Register** | OK | Email suspect (EmailSecurityService), doublon email (ConflictException), mot de passe hashé bcrypt (12 rounds), pas de fuite d’info. |
| **2. Login** | OK | Message unique « Email ou mot de passe incorrect » (pas de fuite email existant), bcrypt.compare, création session avec métadonnées. |
| **3. Hash password** | OK | bcrypt, SALT_ROUNDS = 12, jamais stocké en clair. |
| **4. Gestion erreurs auth** | OK | UnauthorizedException / BadRequestException / ConflictException avec messages génériques côté client. |
| **5. Rotation refresh** | OK | Ancienne session supprimée, nouvelle créée ; ancien refresh token immédiatement invalide. |
| **6. Expiration sessions** | OK | accessTokenExpiresAt et refreshTokenExpiresAt vérifiés dans validateAccessToken / validateRefreshToken. |
| **7. Révocation** | OK | revokeSession(sessionId), revokeAllForUser(userId) ; logout appelle revokeSession. |

## Routes et protection

| Point | Statut | Détail |
|-------|--------|--------|
| **8. Guard sur routes sensibles** | OK | SessionGuard en APP_GUARD : toute route est protégée par défaut. |
| **9. Routes protégées sans session** | OK | Pas de token ou token invalide → 401 ; seules les routes @Public() (login, register, refresh, GET /) sont accessibles sans token. |
| **10. User attaché au request** | OK | Guard attache user et session via REQUEST_USER_KEY / REQUEST_SESSION_KEY ; @CurrentUser() / @CurrentSession() les exposent. |
| **11. Rôles** | Partiel | Entité User a un champ `role` (USER | ADMIN) mais aucun RolesGuard ni vérification de rôle dans les contrôleurs. À ajouter si des routes réservées aux admins existent. |

## Architecture

| Point | Statut | Détail |
|-------|--------|--------|
| **21. Séparation responsabilités** | OK | AuthService (orchestration), SessionService (sessions), EmailSecurityService (emails suspects), Guard (validation token). |
| **22. Clean architecture** | OK | Modules Auth, Session, EmailSecurity ; DTOs validés ; pas de logique métier dans les contrôleurs. |
| **23. AuthModule** | OK | Contrôleur, service, guard, décorateurs, DTOs ; dépend de SessionModule et EmailSecurityModule. |
| **24. Exceptions** | Partiel | Nest renvoie des réponses HTTP standard pour les exceptions ; pas de filtre global pour uniformiser le format ou masquer les détails internes en production. |

---

# PARTIE 2 – FAILLES ET POINTS FAIBLES

## 12. IDOR (Insecure Direct Object Reference)

**Risque** : Aucun contrôleur n’expose actuellement de route du type `GET /users/:id` ou `PATCH /sessions/:id`. Dès qu’une telle route existera, il faudra **vérifier que l’utilisateur authentifié a le droit d’accéder à la ressource** (ex. `req.user.id === resource.userId` ou rôle admin).

**Recommandation** : Pour toute route prenant un `id` en paramètre ou en body, vérifier systématiquement l’ownership ou le rôle (ex. décorateur ou guard `ResourceOwnerGuard`).

---

## 13. Accès direct par URL

**Statut** : **Corrigé** par le guard global. Toute requête vers une route non @Public() sans Bearer token valide reçoit 401. Un accès direct par URL (navigateur ou outil) vers une route protégée sans token est donc bloqué.

---

## 14. Bypass via Postman

**Statut** : **Mitigé**. Sans token valide → 401. Avec un token volé ou rejoué, l’attaquant peut accéder tant que la session est valide. Mesures déjà en place : tokens opaques, hash en base, expiration, rotation au refresh, possibilité de stocker IP/User-Agent pour détection. **Rate limiting** (voir point 20) limite le brute-force et les abus.

---

## 15. Validation des headers

**Risque** : Le Guard exige `Authorization: Bearer <token>`. Si le client envoie plusieurs en-têtes `Authorization`, le comportement dépend d’Express (souvent seul le premier est lu). Pas de normalisation explicite.

**Recommandation** : Conserver l’extraction actuelle (premier `Authorization`). Pour une approche plus stricte, rejeter la requête si plusieurs en-têtes `Authorization` sont présents (middleware ou guard).

---

## 16. Gestion des tokens

**Statut** : **Correct**. Tokens générés avec `crypto.randomBytes(32)`, stockés en base uniquement en hash (bcrypt) + lookups SHA-256, jamais loggés. Révocation par suppression de la session. Pas de JWT donc pas d’exposition de payload.

---

## 17. Session hijacking

**Risque** : Si un attaquant vole l’access token (ex. XSS, réseau non sécurisé), il peut l’utiliser jusqu’à expiration (15 min). IP/User-Agent sont enregistrés et `isSuspiciousSession` existe mais **n’est pas utilisé dans le Guard** pour bloquer une requête.

**Recommandation** : En production, option pour **rejeter** les requêtes dont la session est considérée suspecte (IP ou User-Agent différent), ou au minimum logger et alerter. Implémentation possible dans le Guard : si `isSuspiciousSession` alors 401 + message « Reconnexion requise ».

---

## 18. Vérification IP / User-Agent

**Statut** : **Enregistrement OK, pas d’application**. IP et User-Agent sont stockés à la création de session. `SessionService.isSuspiciousSession` permet de détecter un changement. **Manque** : aucune décision (blocage ou log) dans le Guard. Voir point 17.

---

## 19. CSRF

**Statut** : **Risque limité**. L’API utilise `Authorization: Bearer` (header) et non des cookies de session pour l’auth. Les requêtes cross-site classiques (formulaires GET/POST sans header) n’envoient pas le token. Donc pas de CSRF au sens classique. Si plus tard des cookies sont utilisés pour le token, il faudra SameSite + CSRF token ou double submit.

---

## 20. Rate limiting absent

**Faille** : **Aucun rate limiting** sur login, register, refresh. Un attaquant peut tenter des milliers de requêtes (brute-force mot de passe, énumération d’emails, surcharge).

**Correction** : Ajout de **ThrottlerModule** (NestJS) : limite globale et/ou limites plus strictes sur POST /auth/login, /auth/register, /auth/refresh. Voir implémentation ci-dessous.

---

## 24 (bis). Gestion centralisée des exceptions

**Faille** : Pas de **filtre d’exception global**. En production, une erreur non gérée peut exposer une stack trace ou un message interne dans la réponse.

**Correction** : **ExceptionFilter** global qui : transforme toutes les exceptions en réponse JSON homogène (statusCode, message, error) ; en production, ne renvoie pas la stack et utilise un message générique pour les erreurs 500.

---

## Validation des entrées

**Faille** : `ValidationPipe` avec `whitelist: true` supprime les propriétés non décorées, mais **pas `forbidNonWhitelisted: true`**. Un client peut envoyer des champs inconnus (ex. `role`, `isAdmin`) sans erreur ; ils sont ignorés mais pas rejetés.

**Correction** : Activer **forbidNonWhitelisted: true** pour renvoyer 400 si des propriétés non prévues sont envoyées. Renforce la sécurité et la clarté des contrats d’API.

---

# PARTIE 3 – CORRECTIONS IMPLÉMENTÉES

1. **Rate limiting**  
   - **ThrottlerModule** (global) : 100 requêtes / minute par défaut.  
   - **Limites renforcées sur l’auth** :  
     - POST /auth/login : 5 req / 60 s  
     - POST /auth/register : 3 req / 60 s  
     - POST /auth/refresh : 10 req / 60 s  
   - Réduction du risque de brute-force et d’abus (énumération, surcharge).

2. **Exception filter global** (`common/filters/http-exception.filter.ts`)  
   - Toutes les exceptions passent par ce filtre.  
   - Réponse JSON homogène : `statusCode`, `error`, `message`, `timestamp`, `path`.  
   - En **production** : message générique pour les erreurs 500, pas de stack trace.  
   - En **développement** : message d’erreur détaillé pour faciliter le debug.

3. **ValidationPipe** (`main.ts`)  
   - `whitelist: true` : suppression des propriétés non décorées.  
   - **`forbidNonWhitelisted: true`** : renvoi 400 si le body contient des champs non prévus (ex. `role`, `isAdmin` envoyés par un client malveillant).  
   - `transform: true` : transformation des types (ex. string → number pour les query params).

4. **Documentation**  
   - Ce document sert de base pour la soutenance (points forts, failles, corrections).

---

# PARTIE 4 – SYNTHÈSE POUR SOUTENANCE

- **Points forts** : Auth par sessions (pas de JWT), hash bcrypt, messages d’erreur non révélateurs, rotation des refresh tokens, expiration vérifiée, révocation, guard global par défaut, IP/User-Agent enregistrés, séparation des responsabilités.
- **Failles traitées** : Rate limiting (brute-force, abus), gestion d’exceptions centralisée (pas de fuite d’info), validation stricte des body (forbidNonWhitelisted).
- **Pistes** : Rôles (RolesGuard) si besoin, rejet des sessions suspectes (IP/User-Agent) dans le Guard, renforcement CORS/Helmet en production.

*« L’audit confirme que l’authentification et le routage sont solides (sessions, guard global, rotation, expiration, révocation). Les correctifs apportés concernent le rate limiting, la gestion centralisée des exceptions et la validation stricte des entrées, pour un niveau prêt pour la production. »*
