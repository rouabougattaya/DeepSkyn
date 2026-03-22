# 🧪 Guide de Test JWT - Console Browser

## Quickstart

### 1️⃣ Importer le fichier de test
Ouvrez la console du navigateur (F12) et collez:

```javascript
// Charger le fichier de test
const script = document.createElement('script');
script.src = '/src/utils/jwt-test.ts';
document.body.appendChild(script);
```

Ou si vous utilisez Vite (React):
```javascript
import * as JwtTest from '@/utils/jwt-test.ts';
```

### 2️⃣ Tests disponibles

#### A. **Inscription Complète**
```javascript
await testRegister()
```

**Output attendu:**
```
🔵 TEST REGISTER...
✅ Status: 201
📦 Response: { success: true, accessToken: "eyJ...", ... }
🔑 Access Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...
🔄 Refresh Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...
👤 User: { id: "...", email: "test@example.com", firstName: "Jean", lastName: "Dupont" }
⏰ Access Token Expires At: 2026-02-22T20:04:55.000Z
⏰ Refresh Token Expires At: 2026-02-01T20:04:55.000Z
🔓 Access Token Payload: { sub: "...", email: "test@...", tokenType: "access", exp: 1234567890, iat: 1234567890 }
💾 Tokens sauvegardés en sessionStorage
```

#### B. **Connexion**
```javascript
await testLogin('test@example.com')
```

**Output attendu:**
```
🔵 TEST LOGIN...
✅ Status: 200
💾 Tokens sauvegardés
🔓 Token Payload: { ... }
⏱️ Expires in: 20:04:55
```

#### C. **Route Protégée** (Récupérer le profil)
```javascript
await testProtectedRoute()
```

**Output attendu:**
```
🔵 TEST PROTECTED ROUTE (/auth/me)...
🔑 Using token: eyJhbGciOiJIUzI1NiIsIn...
📊 Status: 200
✅ Profile récupéré: { id: "...", email: "...", firstName: "...", lastName: "...", role: "USER" }
```

#### D. **Refresh Token** (Renouvellement)
```javascript
await testRefresh()
```

**Output attendu:**
```
🔵 TEST TOKEN REFRESH...
📡 Getting CSRF token...
🔒 CSRF Token: ...
🔄 Refreshing token...
✅ Status: 200
✨ New Access Token: eyJhbGciOiJIUzI1NiIsIn...
🔓 New Token Payload: { ... }
⏱️ New token expires in: 20:05:30
💾 Nouveau token sauvegardé
```

#### E. **Logout** (Déconnexion)
```javascript
await testLogout()
```

**Output attendu:**
```
🔵 TEST LOGOUT...
✅ Status: 200
📦 Response: { success: true, message: "Déconnexion réussie." }
🔓 Déconnexion réussie
🗑️ Tokens supprimés
```

#### F. **Décoder un Token**
```javascript
decodeToken(sessionStorage.getItem('accessToken'))
```

**Output attendu:**
```
🔓 Décoding JWT...
📋 Header: { alg: "HS256", typ: "JWT" }
📋 Payload: { 
  sub: "user-id-uuid", 
  email: "test@example.com", 
  firstName: "Jean", 
  lastName: "Dupont", 
  role: "USER", 
  tokenType: "access", 
  version: 1, 
  iat: 1234567890, 
  exp: 1234568790 
}
⏰ Expires At: 22/02/2026 20:04:55
⏱️ Time Left: 899 secondes
```

#### G. **Afficher les tokens stockés**
```javascript
showStoredTokens()
```

**Output attendu:**
```
=================================
📦 STORED IN SESSION STORAGE
=================================
📧 Email: test@example.com
🔑 Token: eyJhbGciOiJIUzI1NiIsIn...
🔓 Décoding JWT...
📋 Header: { alg: "HS256", typ: "JWT" }
📋 Payload: { ... }
```

#### H. **Test Complet** (Séquence complète)
```javascript
await runFullTest()
```

**Effectue:**
1. ✅ Inscription
2. ✅ Récupération du profil
3. ✅ Refresh du token
4. ✅ Logout

---

## 🔍 Ce que vous devriez vérifier

### ✅ Access Token (15 minutes)
```javascript
const payload = JSON.parse(atob(token.split('.')[1]));
payload.tokenType === 'access'  // ✅ doit être "access"
payload.exp - payload.iat === 900  // ✅ doit être 900 secondes (15 min)
```

### ✅ Refresh Token (7 jours)
```javascript
// Les 7 jours = 604800 secondes
// Stocké en HttpOnly cookie (pas visible en JS)
```

### ✅ Routes Protégées
```javascript
// Sans token → 401 Unauthorized
// Avec token expiré → 401 Unauthorized
// Avec token valide → 200 OK + données
```

### ✅ Rotation de Token
```javascript
// Ancien refresh token ne fonctionne plus après refresh
// Nouveau refresh token reçu
// Version incrémentée automatiquement
```

### ✅ CSRF Protection
```javascript
// Routes publiques (/auth/login, /auth/register) → pas de CSRF requis
// Routes protégées (/auth/logout) → CSRF requis
```

---

## 🚨 Erreurs Courantes

### ❌ "401 Unauthorized"
```
Cause: Token expiré ou invalide
Solution: testRegister() ou testLogin()
```

### ❌ "CSRF token mismatch"
```
Cause: X-CSRF-Token ne correspond pas au cookie XSRF-TOKEN
Solution: Les tests font ça automatiquement, ne pas modifier
```

### ❌ "User not found"
```
Cause: Token valide mais user a été supprimé
Solution: testRegister() pour créer un nouvel utilisateur
```

---

## 📊 Structure du Token JWT

### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload (Access Token)
```json
{
  "sub": "uuid-user-id",
  "email": "test@example.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "role": "USER",
  "tokenType": "access",
  "version": 1,
  "iat": 1708619095,
  "exp": 1708619995
}
```

### Signature
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  JWT_ACCESS_SECRET
)
```

---

## 🎯 Commandes Rapides

```javascript
// Scenario 1: Inscription → Accès → Logout
await testRegister()
await testProtectedRoute()
await testLogout()

// Scenario 2: Login → Refresh → Logout
await testLogin('test@example.com')
await testRefresh()
await testLogout()

// Scenario 3: Tout tester
await runFullTest()

// Debug: Voir les tokens
showStoredTokens()

// Debug: Décoder manuellement
decodeToken(sessionStorage.getItem('accessToken'))
```

---

## 💡 Tips

1. **Tokens stockés en sessionStorage** - perdus après fermeture du navigateur
2. **Refresh token en HttpOnly cookie** - invisible en JS (sécurité)
3. **Access token valide 15 minutes** - refresh automatiquement si nécessaire
4. **Chaque test génère un nouvel utilisateur** - emails aléatoires avec timestamp
5. **CORS avec credentials: true** - nécessaire pour les cookies

---

## ✨ Customisation

### Changer l'email pour login
```javascript
await testLogin('ton-email@example.com')
```

### Changer le serveur
Éditer la ligne dans jwt-test.ts:
```javascript
const baseUrl = 'http://localhost:3000'; // ou ton URL
```

### Voir tous les cookies
```javascript
document.cookie  // Affiche les cookies du navigateur
```

---

**Bonne chance avec vos tests JWT! 🚀**
