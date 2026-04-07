# Tâche 5 : Authentification, Sécurité et Google Modern

Système de connexion robuste incluant les réseaux sociaux et la reconnaissance faciale.

## 1. Backend (Identité)

### Service d'Authentification : `AuthService`
- **Fichier** : `backend/src/auth/auth.service.ts`
- **Méthodes clés** :
  - `loginWithGoogleModern` : Valide les tokens OAuth2 de Google.
  - `loginFace` : Comparaison de "embeddings" faciaux (seuil de distance 0.45).
  - `issueTokens` : Génère les duo JWT (Access Token + Refresh Token dans un cookie HTTP-only).

### Sécurité Admin : `TwoFactorService`
- **Fichier** : `backend/src/twofactor/`
- **Rôle** : Gère la double authentification et le WebAuthn pour les administrateurs (biométrie).

## 2. Frontend (Expérience utilisateur)

### Composant de Login : `GoogleLoginButton`
- **Fichier** : `frontend/src/components/auth/GoogleLoginButton.tsx`
- **Rôle** : Utilise la librairie officielle `@react-oauth/google` pour une connexion en un clic.

### Dashboard : `MainLayout`
- **Fichier** : `frontend/src/layouts/MainLayout.tsx`
- **Rôle** : Vérifie l'état de la session au chargement et redirige vers `/login` si le token est expiré.

---
*Sécurité : Le système utilise une approche "Zero Trust" où chaque requête sensible vérifie la validité du token dans les cookies sécurisés.*
