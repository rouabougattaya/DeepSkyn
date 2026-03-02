# Session : Access Token et Refresh Token (sans JWT)

## Contexte

Authentification **basée sur les sessions** : pas de JWT. Les tokens sont des **chaînes aléatoires opaques** générées côté serveur, dont on stocke **uniquement le hash** en base de données.

---

## 1. Méthode de création de session

La création de session est centralisée dans **`AuthService.createSession(user)`**. Elle est appelée après un **login** ou un **register** réussi.

### Étapes

1. **Génération de deux tokens opaques** (aléatoires, pas JWT)  
   - `accessToken` = `randomBytes(32).toString('hex')` (64 caractères hexadécimaux).  
   - `refreshToken` = même procédé, chaîne différente.

2. **Calcul des dates d’expiration**  
   - Access : `Date.now() + 15 * 60 * 1000` → **15 minutes**.  
   - Refresh : `Date.now() + 7 * 24 * 60 * 60 * 1000` → **7 jours**.

3. **Hash des tokens** (bcrypt)  
   - On ne stocke **jamais** les tokens en clair en base.  
   - On enregistre `accessTokenHash` et `refreshTokenHash`.  
   - Pour le refresh, on stocke aussi un **lookup** (SHA-256 du refresh token) pour retrouver la session sans parcourir toute la table.

4. **Création d’une ligne `Session`** en base  
   - `userId`, `accessTokenHash`, `refreshTokenHash`, `refreshTokenLookup`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `createdAt`.

5. **Retour au client**  
   - Les tokens **en clair** + les dates d’expiration + les infos **user** (id, email, firstName, lastName).  
   - Le client stocke ces valeurs (ex. `localStorage`) et envoie l’access token dans `Authorization: Bearer <accessToken>` à chaque requête API.

### Fichiers concernés

- **Service** : `auth/auth.service.ts` → `createSession(user)`.
- **Entité** : `session/session.entity.ts` (modèle Session avec les hash et dates d’expiration).

---

## 2. Différence Access / Refresh

| Critère | Access Token | Refresh Token |
|--------|---------------|----------------|
| **Durée de vie** | **Courte** (ex. 15 minutes). | **Longue** (ex. 7 jours). |
| **Usage** | Envoyé à **chaque requête** API dans l’en-tête `Authorization: Bearer <accessToken>`. | Utilisé **uniquement** pour obtenir un **nouveau couple** access + refresh quand l’access a expiré (endpoint `POST /auth/refresh`). |
| **Exposition** | Très souvent envoyé au serveur → si volé, la fenêtre d’abus est limitée (15 min). | Envoyé rarement (uniquement lors du refresh) → moins exposé. |
| **Révocation** | En supprimant ou mettant à jour la session en base, l’access (vérifié via son hash) devient invalide. | Idem : la session en base lie les deux ; révoquer la session invalide access et refresh. |
| **Stockage côté client** | `localStorage` (ou mémoire) ; utilisé par le front pour les appels API. | `localStorage` ; utilisé uniquement pour appeler `/auth/refresh` quand l’access expire ou renvoie 401. |

En résumé : **Access = courte durée, usage fréquent**. **Refresh = longue durée, usage rare**, uniquement pour renouveler les tokens sans redemander le mot de passe.

---

## 3. Stockage en base de données

- **Table** : `session` (entité `Session`).
- **Contenu** (par session) :
  - `id`, `userId`, `createdAt`.
  - `accessTokenHash`, `refreshTokenExpiresAt` : hash bcrypt des tokens (jamais les tokens en clair).
  - `accessTokenExpiresAt`, `refreshTokenExpiresAt` : dates d’expiration.
  - `refreshTokenLookup` : empreinte SHA-256 du refresh token, pour retrouver rapidement la session lors d’un `POST /auth/refresh`.

Le serveur **vérifie** un access token en comparant le hash du token reçu au `accessTokenHash` de la session (et en vérifiant `accessTokenExpiresAt`). Pour le refresh, il utilise `refreshTokenLookup` pour trouver la session, puis vérifie le token avec `refreshTokenHash` et la date `refreshTokenExpiresAt`.

---

## 4. Explication sécurité (sans JWT)

### Pourquoi pas de JWT ?

- Les JWT sont **auto-signés** : le serveur n’a pas besoin de base pour valider la signature. Conséquence : **révocation difficile** sans blacklist ou mécanisme annexe.
- Avec des **tokens opaques** et un **stockage en base** (hash des tokens), chaque requête peut vérifier que la session existe, n’est pas expirée et n’a pas été révoquée. **Révoquer = supprimer ou invalider la ligne** en base.

### Rôle du stockage en base

- **Vérification** : pour chaque requête protégée, le serveur peut contrôler que l’access token correspond à une session valide (hash + date).
- **Révocation** : déconnexion, changement de mot de passe, « déconnecter tous les appareils » = suppression ou mise à jour des lignes `Session`.
- **Traçabilité** : on sait combien de sessions (appareils) sont actives par utilisateur.

### Courte durée de l’access token

- Si un **access token** est intercepté, il n’est utilisable que pendant **15 minutes**.
- Le **refresh token** n’est envoyé qu’à l’endpoint dédié ; il n’est pas exposé à chaque requête.

### Hash des tokens en base

- On ne stocke **jamais** les tokens en clair.
- Stocker uniquement les **hash** (bcrypt pour access/refresh, SHA-256 pour le lookup du refresh) évite qu’une fuite de base ne donne des tokens utilisables.

---

## 5. Flux résumé

```
[Login/Register] réussi
       │
       ▼
createSession(user) → génère accessToken + refreshToken (opaques)
       │
       ├→ Hash + dates → une ligne Session en base
       └→ Retour client : accessToken, refreshToken, expires, user
       │
       ▼
[Client] stocke tokens + user (ex. localStorage)
       │
       ├→ Requêtes API : Authorization: Bearer <accessToken>
       │   → Serveur vérifie hash + accessTokenExpiresAt en base
       │
       └→ Si 401 (token expiré/invalide) → POST /auth/refresh { refreshToken }
           → Serveur : lookup session, vérifie hash + expiration, supprime ancienne session, crée nouvelle session (rotation)
           → Client remplace les tokens (setSession) et réessaie la requête
```

---

## 6. Fichiers principaux

| Fichier | Rôle |
|--------|------|
| **session/session.entity.ts** | Modèle Session : userId, accessTokenHash, refreshTokenHash, refreshTokenLookup, dates d’expiration. |
| **auth/auth.service.ts** | `createSession()`, `refresh()` : création session ; refresh = suppression ancienne + nouvelle session (voir **ROTATION-SESSIONS.md**). |
| **auth/auth.controller.ts** | `POST /auth/refresh` : reçoit refreshToken, renvoie nouveaux tokens. |
| **Front** `deepSkyn-front/src/lib/authSession.ts` | `setSession`, `clearSession`, `getAccessToken`, `getUser`, `authFetch` : Bearer accessToken, refresh sur 401 puis retry. |

---

## Résumé en une phrase

*« Access token (courte durée) et refresh token (longue durée) sont des tokens opaques, pas des JWT ; ils sont stockés en base sous forme de hash ; l’access sert à chaque requête, le refresh sert uniquement à en obtenir de nouveaux ; tout est révocable côté serveur. »*
