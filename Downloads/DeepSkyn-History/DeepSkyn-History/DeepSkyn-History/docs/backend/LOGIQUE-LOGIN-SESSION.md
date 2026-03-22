# Logique du flux Login et création de session (sans JWT)

## Vue d'ensemble

L'utilisateur saisit **email** et **mot de passe** sur la page de connexion → le frontend envoie ces données au backend → le backend **vérifie l'email**, **vérifie le mot de passe** (bcrypt), **crée une session** et renvoie des **tokens opaques** (access + refresh). Le frontend stocke les tokens et redirige vers l'accueil.

**Pas de JWT** : tokens aléatoires stockés en hash en base, révocables à tout moment.

---

## 1. Objectifs du Login

| Objectif | Réalisation |
|----------|-------------|
| **Vérifier l'email** | Recherche d'un utilisateur en base avec `email` (normalisé : lowercase, trim). Si aucun → erreur 401. |
| **Vérifier le mot de passe** | Comparaison avec `bcrypt.compare(password, user.passwordHash)`. Si invalide → erreur 401. |
| **Créer une session** | Une nouvelle ligne en table `session` : `userId`, hash de l'access token, hash du refresh token, dates d'expiration. |
| **Générer Access Session Token** | Chaîne aléatoire (ex. 64 caractères hex). Durée de vie courte (ex. 15 min). Envoyé dans `Authorization: Bearer <token>`. |
| **Générer Refresh Session Token** | Autre chaîne aléatoire. Durée de vie longue (ex. 7 jours). Sert à renouveler l'access token sans ressaisir le mot de passe. |

---

## 2. Méthode Login (backend)

### Point d'entrée : `POST /auth/login`

**Controller** (`auth.controller.ts`) :

```ts
@Post('login')
@HttpCode(HttpStatus.OK)
async login(@Body() dto: LoginDto): Promise<SessionTokens> {
  return this.authService.login(dto);
}
```

**DTO** (`auth/dto/login.dto.ts`) :

```ts
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;
}
```

**Service** (`auth.service.ts` – méthode `login`) :

1. **Vérifier l'email**  
   `userRepository.findOne({ where: { email: dto.email.toLowerCase().trim() }, select: ['id', 'email', 'firstName', 'lastName', 'passwordHash'] })`.  
   Si `user` est null → `UnauthorizedException('Email ou mot de passe incorrect.')` (message volontairement identique pour email ou mot de passe, afin de ne pas révéler si l'email existe).

2. **Vérifier le mot de passe**  
   `bcrypt.compare(dto.password, user.passwordHash)`.  
   Si faux → `UnauthorizedException('Email ou mot de passe incorrect.')`.

3. **Créer la session et générer les tokens**  
   `return this.createSession(user)`.  
   Même logique qu'à l'inscription : génération de deux tokens aléatoires, hash en base, création d'une ligne `Session`, retour au client des tokens en clair + dates d'expiration + infos user.

---

## 3. Création de session (partagée Register / Login)

La méthode `createSession(user: User)` est utilisée à la fois après **register** et après **login**.

### Étapes

1. **Générer deux tokens opaques** (pas JWT) :  
   `accessToken` et `refreshToken` = `randomBytes(32).toString('hex')` (64 caractères hex).

2. **Calculer les dates d'expiration** :  
   - Access : 15 minutes.  
   - Refresh : 7 jours.

3. **Hasher les tokens** avec bcrypt :  
   `accessTokenHash`, `refreshTokenHash`.  
   En base on ne stocke **que** ces hash (jamais les tokens en clair).

4. **Créer et sauvegarder une ligne `Session`** :  
   `userId`, `accessTokenHash`, `refreshTokenHash`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`.

5. **Retourner au client** :  
   `{ accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, user: { id, email, firstName, lastName } }`.

### Modèle Session (rappel)

Une ligne = une session (un appareil/navigateur connecté). Le serveur pourra plus tard vérifier un token reçu en le hashant et en comparant au hash stocké, et révoquer une session en supprimant la ligne.

---

## 4. Frontend : formulaire et appel API

### LoginPage.tsx / Login.tsx

- **État** : `email`, `password`, `showPassword`, `isLoading`, `error`.
- **Soumission** :
  1. `POST http://localhost:3000/auth/login` (ou `VITE_API_URL`) avec body `{ email, password }`.
  2. **Réponse OK** : stockage en `localStorage` de `accessToken`, `refreshToken`, `user` ; `navigate("/")`.
  3. **Réponse erreur** (ex. 401) : affichage du message dans `error` (ex. « Email ou mot de passe incorrect. »).
  4. **Erreur réseau** : message « Impossible de joindre le serveur... ».

Les tokens stockés permettent aux autres requêtes d'envoyer `Authorization: Bearer <accessToken>` pour prouver l'identité de l'utilisateur.

---

## 5. Schéma du flux Login

```
[Utilisateur] saisit email + mot de passe
       │
       ▼
[LoginPage / Login] handleSubmit → POST /auth/login (body { email, password })
       │
       ▼
[AuthController] login(@Body() dto) → AuthService.login(dto)
       │
       ▼
[AuthService] 1) user = findOne({ email })
              2) Si pas de user → UnauthorizedException
              3) bcrypt.compare(password, user.passwordHash) → si faux → UnauthorizedException
              4) createSession(user) :
                  - Génère accessToken + refreshToken (aléatoires)
                  - Hash des tokens → sessionRepository.save(session)
                  - Retourne { accessToken, refreshToken, expires, user }
       │
       ▼
[Frontend] Reçoit la réponse
       │
       ├─ OK → localStorage (accessToken, refreshToken, user) + navigate("/")
       └─ Erreur → setError(message)
```

---

## 6. Fichiers concernés

| Fichier | Rôle |
|--------|------|
| **auth/dto/login.dto.ts** | Validation email + mot de passe (min 8 caractères). |
| **auth/auth.service.ts** | `login()` : vérification email, bcrypt.compare, `createSession()`. |
| **auth/auth.controller.ts** | `POST /auth/login` → délègue à `AuthService.login()`. |
| **session/session.entity.ts** | Modèle Session (userId, hash des tokens, dates d'expiration). |
| **LoginPage.tsx** / **Login.tsx** | Formulaire, POST /auth/login, stockage tokens + user, redirection ou affichage d'erreur. |

---

## Résumé en une phrase

*« Au login, on vérifie l'email et le mot de passe (bcrypt), on crée une session en base avec des tokens opaques (access + refresh), on renvoie ces tokens et les infos user au client ; pas de JWT, les tokens sont stockés en hash en base pour permettre la révocation. »*
