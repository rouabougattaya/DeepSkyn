# Routes protégées – Guard global et correction de la faille

## 1. Pourquoi la faille existait

### Comportement avant correction

- Le **SessionGuard** existait et validait correctement l’access token (lookup + expiration + bcrypt).
- Il n’était appliqué **que** sur une seule route : **POST /auth/logout**, via `@UseGuards(SessionGuard)`.
- Toutes les **autres** routes (y compris GET /, et tout autre contrôleur) n’avaient **aucun** guard : aucune vérification du token, pas d’exigence d’authentification.

Conséquence : **toute requête vers une URL autre que /auth/logout était acceptée sans token**. Un client pouvait par exemple appeler GET /auth/me (si la route existait) ou n’importe quelle autre route sans envoyer de Bearer token, et le backend ne bloquait pas. Les routes n’étaient donc pas sécurisées côté backend, sauf logout.

### Cause technique

En NestJS, un guard ne s’applique que là où il est déclaré :

- Soit **localement** avec `@UseGuards(SessionGuard)` sur une méthode ou un contrôleur.
- Soit **globalement** avec `APP_GUARD` et `useClass: SessionGuard`.

Sans `APP_GUARD`, seules les routes qui avaient explicitement `@UseGuards(SessionGuard)` étaient protégées. Le reste du backend était ouvert.

---

## 2. Correction : Guard global + @Public()

### Principe

- **Par défaut, toute requête doit être authentifiée** : le **SessionGuard** est enregistré comme **guard global** (`APP_GUARD`). Il s’exécute sur **chaque** requête.
- Les routes qui doivent rester **accessibles sans connexion** (login, register, refresh, racine de l’API) sont marquées avec le décorateur **@Public()**. Le guard lit cette métadonnée et **ne fait pas** la vérification du token pour ces routes.

Résultat : toute route **non marquée @Public()** exige un **Authorization: Bearer <accessToken>** valide (session en base, non expirée). Sinon : **401 Unauthorized**.

### Implémentation

1. **SessionGuard** (déjà existant, légèrement modifié)  
   - Utilise le **Reflector** pour lire la métadonnée `IS_PUBLIC_KEY`.  
   - Si la route (ou le contrôleur) est marquée **@Public()** → `canActivate` retourne `true` sans vérifier le token.  
   - Sinon : extraction du Bearer token, appel à **SessionService.validateAccessToken** (lookup + expiration + bcrypt). Si token manquant ou invalide → **UnauthorizedException**. Sinon : attache `user` et `session` au `request`, retourne `true`.

2. **Décorateur @Public()**  
   - Fichier : `auth/decorators/public.decorator.ts`.  
   - Utilise `SetMetadata(IS_PUBLIC_KEY, true)`.  
   - À mettre sur : **login**, **register**, **refresh**, et éventuellement la racine **GET /** (pour ne pas exiger un token sur la page d’accueil de l’API).

3. **Enregistrement du guard global**  
   - Dans **AuthModule** :  
     `providers: [..., { provide: APP_GUARD, useClass: SessionGuard }]`.  
   - Ainsi, **toutes** les routes de l’application passent par le SessionGuard, sauf si elles sont @Public().

4. **Exemple de route protégée**  
   - **GET /auth/me** : pas de @Public(), donc protégée. Retourne l’utilisateur courant (id, email, firstName, lastName) en s’appuyant sur **@CurrentUser()** (rempli par le guard).  
   - Sans token ou avec token invalide/expiré → 401. Avec token valide → 200 et infos user.

---

## 3. Code du Guard (résumé)

- **Fichier** : `auth/guards/session.guard.ts`
- **Comportement** :
  - Lire `IS_PUBLIC_KEY` (Reflector) sur la méthode et la classe.
  - Si `@Public()` → autoriser sans token.
  - Sinon : extraire le Bearer, appeler `SessionService.validateAccessToken(token)`.
  - Si pas de token ou session invalide/expirée → lancer **UnauthorizedException**.
  - Sinon : attacher `user` et `session` au `request`, retourner `true`.

---

## 4. Exemple d’utilisation sur une route protégée

### Route protégée (nécessite un token valide)

```ts
// Dans un contrôleur – pas de @Public()
@Get('me')
async me(@CurrentUser() user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}
```

- **Sans** en-tête `Authorization: Bearer <accessToken>` ou avec token invalide/expiré → **401**.  
- **Avec** token valide → **200** et données utilisateur.

### Route publique (accessible sans token)

```ts
@Public()
@Post('login')
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}
```

### Protéger tout un contrôleur

- Ne pas mettre @Public() sur le contrôleur.  
- Toutes les méthodes du contrôleur exigeront alors un token, sauf celles qui ont @Public().

---

## 5. Récap pour la soutenance

- **Faille** : le guard n’était utilisé que sur logout ; le reste du backend acceptait les requêtes sans authentification.  
- **Cause** : pas de guard global, protection uniquement locale.  
- **Correction** : guard global (APP_GUARD) + @Public() pour les routes qui doivent rester ouvertes (login, register, refresh, racine).  
- **Résultat** : toute route non @Public() exige un access token valide ; sinon 401. Exemple de route protégée : GET /auth/me.

*« On a rendu le SessionGuard global et introduit @Public() pour les routes d’auth et la racine. Par défaut, toute requête est bloquée si elle n’envoie pas un Bearer token valide ; seules les routes marquées @Public() sont accessibles sans connexion. »*
