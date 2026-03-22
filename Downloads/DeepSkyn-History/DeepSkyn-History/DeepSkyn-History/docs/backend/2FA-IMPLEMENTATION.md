## Système d'Authentification à Deux Facteurs (2FA) - DeepSkyn

### Présentation

Ce système 2FA utilise **TOTP (Time-based One-Time Password)** avec QR Code, compatible avec:
- Google Authenticator
- Microsoft Authenticator
- Authy
- FreeOTP
- Tous les autres authenticators standards

### Installation des dépendances

Les dépendances requises sont déjà installées dans `backend/package.json`:
```json
{
  "otplib": "^13.3.0",
  "qrcode": "^1.5.4"
}
```

### Architecture

#### Backend (NestJS)

**Fichiers créés:**
- `src/twofactor/twofactor.service.ts` - Service TOTP et QR Code
- `src/twofactor/twofactor.controller.ts` - API endpoints
- `src/twofactor/twofactor.module.ts` - Module NestJS
- `src/twofactor/twofactor.dto.ts` - DTOs de validation

**Modifications:**
- `src/user/user.entity.ts` - Ajout des champs `totpSecret` et `isTwoFAEnabled`
- `src/auth/auth.service.ts` - Intégration du flow 2FA lors du login
- `src/auth/auth.controller.ts` - Support du paramètre `req` pour gestion de session temporaire
- `src/auth/auth.module.ts` - Import du `TwoFactorModule`

#### Frontend (React + TypeScript)

**Composants créés:**
- `src/components/TwoFactorSetup.tsx` - Activation du 2FA avec QR Code
- `src/components/TwoFactorVerify.tsx` - Vérification du code lors du login
- `src/components/SettingsPanel.tsx` - Gestion des paramètres 2FA

**Pages créées:**
- `src/pages/TwoFactorPage.tsx` - Page de vérification 2FA après login
- `src/pages/TwoFactorSettingsPage.tsx` - Page d'activation du 2FA
- `src/pages/SettingsPage.tsx` - Page des paramètres utilisateur

**Modifications:**
- `src/components/Login.tsx` - Support de la redirection 2FA
- `src/pages/LoginPage.tsx` - Support des cookies et du flow 2FA
- `src/components/Navbar.tsx` - Lien vers paramètres
- `src/App.tsx` - Nouvelles routes 2FA et Settings

### Endpoints API

#### GET `/auth/2fa/setup`
**Authentification:** Requise (SessionGuard)
**Réponse:**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "message": "Scannez le code QR avec votre application Authenticator"
}
```

#### POST `/auth/2fa/enable`
**Authentification:** Requise (SessionGuard)
**Body:**
```json
{
  "verificationCode": "123456",
  "secret": "JBSWY3DPEBLW64TMMQ======"
}
```
**Réponse:**
```json
{
  "success": true,
  "message": "2FA activé avec succès!"
}
```

#### POST `/auth/2fa/verify`
**Authentification:** Non requise (utilise la session temporaire)
**Body:**
```json
{
  "code": "123456"
}
```
**Réponse:**
```json
{
  "success": true,
  "message": "2FA vérifié avec succès!"
}
```

#### POST `/auth/2fa/disable`
**Authentification:** Requise (SessionGuard)
**Body:**
```json
{
  "password": "monMotDePasse123"
}
```
**Réponse:**
```json
{
  "success": true,
  "message": "2FA désactivé avec succès!"
}
```

#### GET `/auth/2fa/status`
**Authentification:** Requise (SessionGuard)
**Réponse:**
```json
{
  "success": true,
  "isTwoFAEnabled": true
}
```

### Flow d'authentification

#### 1. Activation du 2FA par l'utilisateur

```
GET /settings/2fa
  → TwoFactorSetup affiche un bouton "Configurer"
  → Click → GET /auth/2fa/setup
  → Récupère secret + QR Code
  → Affiche le QR Code pour scanning
  → Utilisateur entre le code à 6 chiffres
  → POST /auth/2fa/enable (avec secret + code)
  → Backend valide et sauvegarde le secret
  → Succès → Redirection /settings
```

#### 2. Login avec 2FA

```
POST /auth/login (email + password)
  → Backend valide email/password
  → Si 2FA activé:
    - Crée tempTwoFAData en session (userId + totpSecret)
    - Retourne: { success: true, requiresTwoFa: true, user: {...} }
  → Frontend redirige vers /auth/2fa
  → TwoFactorVerify affiche champ code à 6 chiffres
  → POST /auth/2fa/verify (code)
  → Backend valide le code avec le secret en tempTwoFAData
  → Si valide:
    - Supprime tempTwoFAData
    - Ajoute userId en session
    - Retourne: { success: true, message: "..." }
  → Frontend établit la session complète
  → Redirection vers /
```

#### 3. Désactivation du 2FA

```
POST /auth/2fa/disable (password)
  → Backend valide le password
  → Supprime totpSecret et isTwoFAEnabled
  → Retourne succès
  → Frontend met à jour le statut
```

### Sécurité

#### Points clés:

1. **Secret TOTP stocké côté serveur** - Jamais envoyé après l'activation
2. **Codes temporaires** - Valables 30 secondes (avec fenêtre de ±1)
3. **Vérification du mot de passe** - Requise pour désactiver le 2FA
4. **Session temporaire** - `tempTwoFAData` utilisée uniquement pendant la vérification
5. **Credentials include** - Cookies envoyés avec les requêtes pour gestion de session

### Variables d'environnement

Backend:
```
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=development
```

Frontend:
```
VITE_API_URL=http://localhost:3000
```

### Utilisation

#### Pour l'utilisateur:

1. **Activer 2FA:**
   - Aller à `/settings`
   - Cliquer sur "Activer le 2FA"
   - Scanner le QR Code avec son app Authenticator
   - Entrer le code pour confirmer

2. **Se connecter avec 2FA:**
   - Entrer email/password sur `/auth/login`
   - Entrer le code de son app Authenticator
   - Accès garanti

3. **Désactiver 2FA:**
   - Aller à `/settings`
   - Cliquer sur "Désactiver le 2FA"
   - Entrer son mot de passe
   - Confirmer

#### Pour le développeur:

1. **Démarrer le backend:**
   ```bash
   cd backend/backend
   npm install
   npm run start:dev
   ```

2. **Démarrer le frontend:**
   ```bash
   cd deepSkyn-front
   npm install
   npm run start:dev
   ```

3. **Tester avec un compte:**
   - Créer un compte via `/auth/register`
   - Aller à `/settings`
   - Activer 2FA
   - Se déconnecter et reconnecter pour tester le flow

### Codes d'erreur

| Code | Message | Cause |
|------|---------|-------|
| 400 | "Le code doit contenir exactement 6 chiffres" | Code invalide |
| 401 | "Code de vérification incorrect" | Code TOTP invalide |
| 401 | "Session 2FA invalide" | `tempTwoFAData` non trouvée |
| 403 | "Mot de passe incorrect" | Lors de la désactivation |

### Troubleshooting

**Le QR Code n'apparaît pas:**
- Vérifier que le backend est en cours d'exécution
- Vérifier les logs du backend pour les erreurs de génération

**Le code ne valide pas:**
- Vérifier l'heure du serveur et du téléphone (TOTP est basée sur le temps)
- La fenêtre d'acceptation est de ±30 secondes

**Session perdue après vérification 2FA:**
- Vérifier que `credentials: 'include'` est présent dans les fetch
- Vérifier que le backend accepte les cookies (CORS + session)

### Dépendances utilisées

- **otplib**: Génération et vérification des codes TOTP
- **qrcode**: Génération des QR Codes au format Data URL

Pas de dépendance S
