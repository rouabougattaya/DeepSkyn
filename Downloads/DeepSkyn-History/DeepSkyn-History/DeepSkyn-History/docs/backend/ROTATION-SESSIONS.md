# Rotation des sessions (session-based, sans JWT)

## Contexte

En authentification **basée sur les sessions** (pas JWT), la **rotation** consiste à invalider l’ancienne session et à en créer une nouvelle à chaque refresh. Ainsi, chaque utilisation du refresh token produit une **nouvelle** session en base et de **nouveaux** tokens ; l’ancien refresh token ne peut plus servir.

---

## 1. Méthode refresh avec rotation

### Comportement attendu

Lors d’un **refresh** :

1. **Supprimer l’ancienne session** (la ligne en base correspondant au refresh token présenté).
2. **Créer une nouvelle session** (nouvelle ligne en base, nouveaux access et refresh tokens).
3. Retourner au client les **nouveaux** tokens (et les infos user).

L’ancien refresh token et l’ancien access token deviennent **immédiatement inutilisables** : la session qui les portait n’existe plus.

### Implémentation (backend)

**Fichier** : `auth/auth.service.ts` → méthode `refresh(refreshToken: string)`.

1. **Valider le refresh token**
   - Récupérer la session par `refreshTokenLookup` (SHA-256 du token).
   - Vérifier que la session existe et que `refreshTokenExpiresAt` est dans le futur.
   - Vérifier le token avec `bcrypt.compare(refreshToken, session.refreshTokenHash)`.
   - Si une étape échoue → `UnauthorizedException` (« Session expirée ou invalide »).

2. **Récupérer l’utilisateur**
   - `user = session.user` (relation chargée).

3. **Supprimer l’ancienne session**
   - `await this.sessionRepository.remove(session)`.
   - La ligne est supprimée de la table `session`. Tous les tokens (access et refresh) liés à cette session sont dès lors invalides.

4. **Créer une nouvelle session**
   - `return this.createSession(user)`.
   - `createSession` génère de nouveaux tokens, crée une **nouvelle** ligne en base et retourne les tokens + user au client.

5. **Retour**
   - Le client reçoit le même type de réponse que pour login/register : `accessToken`, `refreshToken`, dates d’expiration, `user`. Il doit **remplacer** les anciens tokens par ceux-ci (le front le fait déjà via `setSession` après un appel à `POST /auth/refresh`).

### Flux résumé

```
Client envoie refreshToken (ex. après 401 sur une requête protégée)
       │
       ▼
POST /auth/refresh { refreshToken }
       │
       ▼
AuthService.refresh(refreshToken)
       │
       ├─ 1) Trouver session par refreshTokenLookup
       ├─ 2) Vérifier expiration + bcrypt.compare(refreshToken, session.refreshTokenHash)
       ├─ 3) sessionRepository.remove(session)   ← ancienne session supprimée
       └─ 4) return createSession(user)         ← nouvelle session créée (nouvelle ligne)
       │
       ▼
Client reçoit { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, user }
       │
       ▼
Client met à jour le stockage (ex. setSession) et réessaie la requête avec le nouvel accessToken
```

### Fichiers concernés

| Fichier | Rôle |
|--------|------|
| **auth/auth.service.ts** | `refresh()` : validation → `remove(session)` → `createSession(user)`. |
| **auth/auth.controller.ts** | `POST /auth/refresh` appelle `AuthService.refresh(dto.refreshToken)`. |
| **session/session.entity.ts** | Modèle de la session (une ligne = une session ; supprimée puis recréée au refresh). |
| **Front** `lib/authSession.ts` | Après 401, appelle `POST /auth/refresh`, puis `setSession(data)` avec la réponse et retry. |

---

## 2. Protection contre le vol de session

### Risque sans rotation

Si, lors du refresh, on se contentait de **mettre à jour** la même session (même ligne) avec de nouveaux tokens :

- Un **attaquant** qui aurait volé l’ancien refresh token pourrait continuer à l’utiliser tant que la session existe et que le refresh n’a pas expiré.
- Le **titulaire légitime** et l’attaquant partageraient en pratique la même session tant qu’aucun des deux n’a encore fait de refresh.

Avec une simple mise à jour, on ne peut pas invalider l’ancien refresh token au moment où le légitime en demande un nouveau, sans mécanisme supplémentaire (ex. compteur, liste noire).

### Effet de la rotation (supprimer + créer)

Avec la **rotation** telle qu’implémentée :

1. **À chaque refresh**, l’ancienne session est **supprimée** et une **nouvelle** session est créée.
2. Seul le **dernier** refresh token émis est valide (il est le seul à avoir une ligne en base).
3. Dès que le **titulaire légitime** utilise son refresh token :
   - L’ancienne session est supprimée.
   - Une nouvelle session (et un nouveau refresh token) est créée.
   - L’**ancien** refresh token (celui que l’attaquant aurait pu voler) ne correspond plus à aucune ligne → il devient **invalide**.

### Scénario de vol

- **Attaquant** intercepte un refresh token (ex. fuite côté client, réseau, etc.).
- **Légitime** fait un refresh avant ou après l’attaquant :
  - Si le **légitime** refresh en premier : sa session est supprimée et une nouvelle est créée. L’attaquant ne peut plus utiliser l’ancien refresh token (session supprimée).
  - Si l’**attaquant** refresh en premier : une nouvelle session est créée pour lui ; le refresh token du légitime devient invalide. Au prochain refresh du légitime, il recevra « Session expirée ou invalide » et devra se **reconnecter** (login). On détecte ainsi une utilisation concurrente du même refresh token.

En résumé : **une seule utilisation valide du refresh token** à la fois ; la rotation **limite les dégâts** en cas de vol et **détecte** l’usage concurrent (le second utilisateur doit se reconnecter).

### Bonnes pratiques côté client

- Le front doit **toujours** remplacer les tokens par ceux renvoyés par `POST /auth/refresh` (déjà le cas avec `setSession` dans `authSession.ts`).
- Ne pas réutiliser l’ancien refresh token après un refresh réussi : seul le nouveau doit être conservé.

---

## 3. Résumé

| Élément | Description |
|--------|-------------|
| **Rotation** | À chaque refresh : **suppression** de l’ancienne session + **création** d’une nouvelle session (nouveaux tokens). |
| **Méthode** | `refresh()` : valider le refresh token → `sessionRepository.remove(session)` → `createSession(user)`. |
| **Protection** | L’ancien refresh token ne peut plus être utilisé ; en cas de vol, une seule utilisation « gagnante » ; l’autre partie doit se reconnecter. |
| **Sans JWT** | Tokens opaques stockés en hash en base ; révocables et remplacés à chaque refresh. |

*« Rotation des sessions : au refresh, on supprime l’ancienne session et on en crée une nouvelle, ce qui invalide immédiatement l’ancien refresh token et limite la portée d’un vol de session. »*
