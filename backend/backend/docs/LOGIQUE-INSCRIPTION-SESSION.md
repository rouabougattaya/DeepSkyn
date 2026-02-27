# Logique du flux d'inscription et des sessions (sans JWT)

## Vue d'ensemble

L’utilisateur remplit le formulaire d’inscription sur le frontend → le frontend envoie les données au backend → le backend crée l’utilisateur, crée une session, et renvoie des **tokens opaques** (pas de JWT). Le frontend stocke ces tokens et redirige vers l’accueil.

---

## 1. Point d’entrée backend : `main.ts`

```ts
import 'dotenv/config';        // Charge le .env (DATABASE_URL, etc.) avant tout
import { NestFactory } from '@nestjs/core';
// ...
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));  // Valide les DTO (RegisterDto)
app.enableCors({ origin: 'http://localhost:5173', credentials: true });  // Autorise le front React
await app.listen(process.env.PORT ?? 3000);
```

**Rôle :**
- Charger les variables d’environnement (`.env`) au tout début.
- Créer l’app NestJS, activer la **validation globale** (pour `RegisterDto`) et le **CORS** pour que le front (port 5173) puisse appeler l’API (port 3000).

Sans `dotenv/config`, `process.env.DATABASE_URL` serait vide. Sans CORS, le navigateur bloquerait les requêtes du front vers le backend.

---

## 2. Frontend : routage dans `App.tsx`

```tsx
<Router>
  <Routes>
    <Route path="/" element={<><Navbar /><Home /></>} />
    <Route path="/auth/login" element={<LoginPage />} />
    <Route path="/auth/register" element={<RegisterPage />} />
  </Routes>
</Router>
```

**Rôle :**
- Définir les URLs : `/` = accueil, `/auth/login` = login, `/auth/register` = inscription.
- Quand l’utilisateur va sur `/auth/register` ou clique sur « S’inscrire », React Router affiche `RegisterPage`.

---

## 3. Frontend : formulaire et appel API dans `RegisterPage.tsx`

### État du formulaire
- `email`, `password`, `firstName`, `lastName` : champs du formulaire.
- `isLoading` : désactive le bouton pendant la requête.
- `error` : message d’erreur à afficher (réseau ou erreur API).

### Soumission du formulaire (`handleSubmit`)

1. **Bloquer le rechargement** : `e.preventDefault()`.
2. **Appel HTTP** :  
   `POST http://localhost:3000/auth/register`  
   avec le body JSON : `{ email, password, firstName, lastName }`.
3. **Réponse OK** :
   - Enregistrer en `localStorage` : `accessToken`, `refreshToken`, `user`.
   - Rediriger vers `/` avec `navigate("/")`.
4. **Réponse erreur** (ex. 409 email déjà pris) :  
   Mettre le message dans `error` pour l’afficher sous le formulaire.
5. **Erreur réseau** (catch) :  
   Afficher « Impossible de joindre le serveur... ».

**Pourquoi `localStorage` ?**  
Pour que les autres pages puissent ensuite envoyer `accessToken` dans l’en-tête des requêtes (ex. `Authorization: Bearer <accessToken>`) pour prouver que l’utilisateur est connecté. Le refresh token servira plus tard à renouveler l’access token sans ressaisir le mot de passe.

---

## 4. Backend : entrée API dans `auth.controller.ts`

```ts
@Controller('auth')
export class AuthController {
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<SessionTokens> {
    return this.authService.register(dto);
  }
}
```

**Rôle :**
- Exposer **POST /auth/register**.
- Récupérer le body dans un `RegisterDto` (validé par le `ValidationPipe` déclaré dans `main.ts`).
- Déléguer toute la logique à `AuthService.register(dto)` et renvoyer le résultat (tokens + user) au client.

---

## 5. Backend : validation des données dans `auth/dto/register.dto.ts`

```ts
export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @MinLength(1) @MaxLength(100) firstName: string;
  @IsString() @MinLength(1) @MaxLength(100) lastName: string;
}
```

**Rôle :**
- S’assurer que le body contient un email valide, un mot de passe d’au moins 8 caractères, un prénom et un nom non vides.
- Si la validation échoue, Nest renvoie automatiquement une erreur 400 avec les messages, sans appeler le service.

---

## 6. Backend : logique métier dans `auth.service.ts`

### 6.1 Méthode `register(dto: RegisterDto)`

1. **Vérifier l’email**  
   `userRepository.findOne({ where: { email: dto.email } })`.  
   Si un utilisateur existe déjà → `ConflictException` (« Un compte existe déjà avec cet email ») → le front reçoit une erreur et l’affiche.

2. **Hasher le mot de passe**  
   `bcrypt.hash(dto.password, 12)`.  
   On ne stocke **jamais** le mot de passe en clair, seulement le hash.

3. **Créer et enregistrer l’utilisateur**  
   `userRepository.create({ email, passwordHash, firstName, lastName, role: 'USER', ... })` puis `save(user)`.  
   L’utilisateur est persisté en base (table `user`).

4. **Créer une session et obtenir les tokens**  
   `return this.createSession(user)`.  
   Le client reçoit ainsi des tokens + infos user juste après l’inscription (connexion automatique).

### 6.2 Méthode `createSession(user: User)`

1. **Générer deux tokens aléatoires** (opaque, pas JWT) :  
   `accessToken` et `refreshToken` = `randomBytes(32).toString('hex')` (64 caractères hex).
2. **Calculer les dates d’expiration** :  
   access 15 min, refresh 7 jours.
3. **Hasher les tokens** avec bcrypt :  
   `accessTokenHash`, `refreshTokenHash`.  
   En base on ne stocke **que** ces hash, jamais les tokens en clair (sécurité + possibilité de révoquer une session).
4. **Créer et sauvegarder une ligne `Session`** en base :  
   `userId`, `accessTokenHash`, `refreshTokenHash`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`.
5. **Retourner au client** :  
   les tokens en clair + dates d’expiration + infos user (id, email, firstName, lastName).  
   Le client garde les tokens ; le serveur garde les hash pour vérifier plus tard (login, refresh, guards).

**Pourquoi des tokens opaques et pas JWT ?**  
Avec des tokens stockés (en hash) en base, on peut invalider une session en supprimant la ligne. Avec un JWT, tant qu’il est valide, il reste utilisable tant qu’on n’a pas mis en place une blacklist ou un mécanisme équivalent.

---

## 7. Backend : modèle de données dans `session/session.entity.ts`

```ts
@Entity()
export class Session {
  id: string;           // UUID
  userId: string;       // Lien vers User
  accessTokenHash: string;
  refreshTokenHash: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  createdAt: Date;
}
```

**Rôle :**
- Une ligne = une session (un appareil/navigateur connecté).
- `userId` : à quel utilisateur appartient la session.
- Les hash permettent de vérifier un token reçu (on hash le token reçu et on compare au hash stocké) sans garder le token en clair en base.

---

## Schéma du flux complet

```
[Utilisateur] remplit formulaire (email, password, firstName, lastName)
       │
       ▼
[RegisterPage] handleSubmit → POST /auth/register (body JSON)
       │
       ▼
[main.ts] CORS autorise la requête ; ValidationPipe est actif
       │
       ▼
[AuthController] register(@Body() dto) → AuthService.register(dto)
       │
       ▼
[AuthService] 1) Email déjà pris ? → 409
             2) bcrypt.hash(password)
             3) userRepository.save(user)
             4) createSession(user) :
                 - Génère accessToken + refreshToken (aléatoires)
                 - Hash des tokens → sessionRepository.save(session)
                 - Retourne { accessToken, refreshToken, expires, user }
       │
       ▼
[RegisterPage] Reçoit la réponse
       │
       ├─ OK → localStorage (accessToken, refreshToken, user) + navigate("/")
       └─ Erreur → setError(message)
```

---

## Résumé des rôles par fichier

| Fichier | Rôle |
|--------|------|
| **main.ts** | Charger `.env`, créer l’app, ValidationPipe, CORS, écouter le port. |
| **App.tsx** | Router : routes `/`, `/auth/login`, `/auth/register`. |
| **RegisterPage.tsx** | Formulaire d’inscription, POST /auth/register, stockage tokens + user, redirection ou affichage d’erreur. |
| **auth.controller.ts** | Exposer POST /auth/register, passer le body au service. |
| **register.dto.ts** | Validation (email, password 8+, firstName, lastName). |
| **auth.service.ts** | Vérifier email unique, hasher mot de passe, créer User, créer Session (tokens hashés), renvoyer tokens + user. |
| **session.entity.ts** | Modèle Session en base (userId, hash des tokens, dates d’expiration). |

Ainsi, la logique va du formulaire (RegisterPage) à l’API (controller → DTO → service) puis à la base (User + Session), et le résultat remonte au client sous forme de tokens et d’infos user pour une connexion immédiate après inscription.
