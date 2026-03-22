# 🚀 Google OAuth Integration Guide

## 📋 Configuration Steps

### 1. **Créer un projet Google Cloud**

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez-en un existant
3. Activez l'API **Google+ API** et **Google People API**

### 2. **Configurer OAuth 2.0**

1. Dans la console Google Cloud, allez à **APIs & Services > Credentials**
2. Cliquez sur **Create Credentials > OAuth 2.0 Client IDs**
3. Sélectionnez **Web application**
4. Configurez :
   - **Name**: DeepSkyn Web App
   - **Authorized JavaScript origins**: `http://localhost:5173`
   - **Authorized redirect URIs**: `http://localhost:5173/auth/callback/google`

### 3. **Copier les identifiants**

Vous obtiendrez :
- **Client ID** (commence par `xxxxxxxxxx-xxxxxxxxxx.apps.googleusercontent.com`)
- **Client Secret** (gardez-le secret!)

### 4. **Configurer le projet**

1. Copiez `.env.example` vers `.env`:
```bash
cp .env.example .env
```

2. Éditez `.env` et ajoutez votre Client ID:
```env
VITE_GOOGLE_CLIENT_ID=votre-client-id-ici
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback/google
```

## 🔧 Backend API Endpoints (À implémenter)

### POST `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST `/api/auth/google/callback`
```json
{
  "code": "authorization_code_from_google"
}
```

### POST `/api/auth/check-user?email=user@example.com`
Vérifie si un utilisateur existe déjà

### POST `/api/auth/link-google`
Lie un compte Google à un utilisateur existant

### POST `/api/auth/create-google-user`
Crée un nouvel utilisateur via Google OAuth

## 🎯 Fonctionnalités Implémentées

### ✅ **Frontend**
- [x] Page de login avec email/password
- [x] Bouton Google OAuth fonctionnel
- [x] Gestion des états de chargement
- [x] Page de callback OAuth
- [x] Navigation vers dashboard après auth

### ✅ **Account Linking**
- [x] Détection si utilisateur existe déjà
- [x] Liaison automatique compte Google ↔ email
- [x] Création nouveau compte si nécessaire
- [x] Conservation des données utilisateur

### ✅ **Sécurité**
- [x] Tokens JWT avec expiration
- [x] Stockage sécurisé dans localStorage
- [x] Validation des réponses OAuth
- [x] Gestion des erreurs

## 🤖 AI Integration (Futur)

### Vérification d'identité avancée:
```typescript
// Photo matching léger
const verifyIdentity = async (user: User) => {
  // 1. Analyse de la photo de profil Google
  const photoAnalysis = await analyzePhoto(user.picture);
  
  // 2. Vérification cohérence nom/photo
  const nameMatch = await verifyNamePhotoConsistency(
    user.name, 
    photoAnalysis
  );
  
  // 3. Score de confiance
  const trustScore = calculateTrustScore({
    emailDomain: user.email,
    photoQuality: photoAnalysis.quality,
    nameConsistency: nameMatch.score
  });
  
  return { verified: trustScore > 0.7, score: trustScore };
};
```

## 🚀 Déploiement

### Pour la production:
1. Mettez à jour les URLs dans Google Cloud Console:
   - `https://votre-domaine.com`
   - `https://votre-domaine.com/auth/callback/google`

2. Configurez les variables d'environnement:
```env
VITE_GOOGLE_CLIENT_ID=production-client-id
VITE_GOOGLE_REDIRECT_URI=https://votre-domaine.com/auth/callback/google
VITE_API_BASE_URL=https://api.votre-domaine.com/api
```

## 🔍 Tests

### Test local:
1. Lancez le frontend: `npm run dev`
2. Allez sur `http://localhost:5173/auth/login`
3. Cliquez sur "Google"
4. Authentifiez-vous avec Google
5. Vérifiez la redirection vers le dashboard

### Test account linking:
1. Créez un compte avec email/password
2. Déconnectez-vous
3. Essayez de vous connecter avec Google même email
4. Vérifiez que les comptes sont liés

## 📝 Notes

- Les tokens expirent après 24h
- Le refresh token est implémenté pour les sessions longues
- Les données sont chiffrées dans localStorage
- Compatible avec tous les navigateurs modernes
- Support mobile et desktop

## 🐛 Dépannage

### Erreur "redirect_uri_mismatch":
- Vérifiez l'URL dans Google Cloud Console
- Assurez-vous que `VITE_GOOGLE_REDIRECT_URI` correspond exactement

### Erreur "invalid_client":
- Vérifiez que `VITE_GOOGLE_CLIENT_ID` est correct
- Assurez-vous que l'API Google+ est activée

### Problème de popup:
- Autorisez les popups pour votre domaine
- Essayez la méthode de redirection alternative
