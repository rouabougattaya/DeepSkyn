# Authentification DeepSkyn – Résumé pour la soutenance

## Contexte

- **Pas de JWT** : on utilise des **sessions** côté serveur et des **tokens opaques** (chaînes aléatoires).
- **Login classique** : email + mot de passe uniquement (Google OAuth géré ailleurs).

---

## Inscription (Register)

### 1. Flux global

1. Le client envoie **email, password, firstName, lastName** à `POST /auth/register`.
2. Le serveur **vérifie** que l’email n’existe pas déjà.
3. Le mot de passe est **hashé avec bcrypt** (jamais stocké en clair).
4. Un **utilisateur** est créé en base (TypeORM).
5. Une **session** est créée : on génère deux tokens (access + refresh), on stocke **uniquement leur hash** en base.
6. Le serveur renvoie au client : **accessToken**, **refreshToken**, dates d’expiration, et infos **user** (id, email, firstName, lastName).

### 2. Rôle de chaque brique

| Élément | Rôle |
|--------|------|
| **bcrypt** | Hash du mot de passe (sécurité) et hash des tokens en base (on ne stocke jamais les tokens en clair). |
| **User (TypeORM)** | Création du compte : email, passwordHash, firstName, lastName, rôle USER. |
| **Session (TypeORM)** | Une ligne par session : userId, hash du access token, hash du refresh token, dates d’expiration. |
| **Access token** | Chaîne aléatoire (ex. 64 caractères hex). Utilisé dans l’en-tête des requêtes pour identifier la session. Durée de vie courte (ex. 15 min). |
| **Refresh token** | Autre chaîne aléatoire. Servira à obtenir un nouveau access token sans se reconnecter. Durée de vie longue (ex. 7 jours). |

### 3. Pourquoi pas de JWT ?

- Les JWT sont **auto-signés** : tant qu’ils sont valides, on ne peut pas les révoquer facilement sans une blacklist.
- Avec des **tokens opaques** stockés en base (en hash), chaque requête peut vérifier en base que la session existe et n’est pas expirée → **révocation simple** (suppression de la session).

### 4. Fichiers principaux

- **DTO** : `auth/dto/register.dto.ts` (validation email, password, firstName, lastName).
- **Service** : `auth/auth.service.ts` → `register()` (hash bcrypt, création user, création session, génération des tokens).
- **Controller** : `auth/auth.controller.ts` → `POST /auth/register`.
- **Entités** : `user/user.entity.ts`, `session/session.entity.ts`.

---

## Login (connexion email / mot de passe)

### 1. Objectifs

- **Vérifier l'email** : recherche d'un utilisateur en base ; si aucun → 401.
- **Vérifier le mot de passe** : `bcrypt.compare(password, user.passwordHash)` ; si invalide → 401.
- **Créer une session** : même mécanisme qu'à l'inscription (une ligne en table `session`).
- **Générer Access Session Token** : chaîne aléatoire (opaque), courte durée (ex. 15 min). **Sans JWT.**
- **Générer Refresh Session Token** : autre chaîne aléatoire, longue durée (ex. 7 jours). **Sans JWT.**

### 2. Méthode Login

1. Le client envoie **email** et **password** à `POST /auth/login`.
2. Le serveur cherche l'utilisateur par email (normalisé : lowercase, trim). Si absent → `UnauthorizedException` (« Email ou mot de passe incorrect »).
3. Comparaison du mot de passe avec `bcrypt.compare`. Si faux → même message (pour ne pas révéler si l'email existe).
4. Appel à `createSession(user)` : génération de deux tokens opaques, hash en base, création d'une ligne `Session`.
5. Le serveur renvoie : **accessToken**, **refreshToken**, dates d'expiration, **user** (id, email, firstName, lastName).

### 3. Création de session (Login et Register)

La **création de session** est identique après login ou après register :

- Deux tokens **opaques** (aléatoires, pas JWT) sont générés.
- Ils sont **hashés** avec bcrypt ; seuls les hash sont stockés en base.
- Une ligne **Session** est créée : `userId`, `accessTokenHash`, `refreshTokenHash`, dates d'expiration.
- Le client reçoit les tokens en clair pour les envoyer dans `Authorization: Bearer <accessToken>`.

### 4. Explication pour la soutenance

- **Pas de JWT** : on utilise des tokens **opaques** (chaînes aléatoires). Le serveur les stocke en hash en base ; il peut vérifier une requête et **révoquer** une session en supprimant la ligne.
- **Sécurité** : message d'erreur unique (« Email ou mot de passe incorrect ») pour ne pas indiquer si l'email existe.
- **Frontend** : après succès, stockage de `accessToken`, `refreshToken` et `user` en `localStorage`, puis redirection vers l'accueil.

### 5. Fichiers Login

- **DTO** : `auth/dto/login.dto.ts` (email, password min 8 caractères).
- **Service** : `auth/auth.service.ts` → `login()` (vérif email, bcrypt.compare, `createSession()`).
- **Controller** : `auth/auth.controller.ts` → `POST /auth/login`.
- **Front** : `LoginPage.tsx` / `components/Login.tsx` (formulaire, POST /auth/login, stockage tokens, redirection).

---

## Résumé en une phrase

**Inscription :** *« À l’inscription, on hash le mot de passe avec bcrypt, on crée l’utilisateur et une session en base, et on renvoie au client un access token et un refresh token (tokens opaques, pas de JWT) ; les tokens sont stockés en hash en base pour pouvoir les révoquer. »*

**Login :** *« On vérifie l'email et le mot de passe (bcrypt), on crée une session avec les mêmes tokens opaques (access + refresh), on renvoie les tokens et les infos user au client ; toujours sans JWT. »*
