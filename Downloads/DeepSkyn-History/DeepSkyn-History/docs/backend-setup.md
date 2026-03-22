# 🚀 Backend Express pour DeepSkyn OAuth

## Installation rapide

```bash
# 1. Créer dossier backend
mkdir deepskyn-backend
cd deepskyn-backend

# 2. Initialiser projet
npm init -y
npm install express cors dotenv jsonwebtoken bcryptjs
npm install -D @types/node @types/express @types/jsonwebtoken @types/bcryptjs typescript ts-node nodemon
```

## 3. Créer `server.ts`

```typescript
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Mock database (remplacer par MongoDB/PostgreSQL)
const users = [
  {
    id: '1',
    email: 'demo@deepskyn.com',
    password: '$2a$10$...', // bcrypt hash de 'demo123'
    name: 'Demo User',
    authMethod: 'email',
    createdAt: new Date(),
  }
];

// Routes
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '24h' });
  res.json({ user: { ...user, password: undefined }, token });
});

app.post('/api/auth/oauth/google', async (req, res) => {
  const { code } = req.body;
  
  // 1. Échanger code contre token Google
  const googleResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });
  
  const googleData = await googleResponse.json();
  
  // 2. Obtenir infos utilisateur Google
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${googleData.access_token}` },
  });
  
  const googleUser = await userResponse.json();
  
  // 3. Account linking
  let user = users.find(u => u.email === googleUser.email);
  
  if (!user) {
    // Créer nouvel utilisateur
    user = {
      id: Date.now().toString(),
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      authMethod: 'google',
      createdAt: new Date(),
    };
    users.push(user);
  } else {
    // Lier compte Google
    user.picture = googleUser.picture;
  }
  
  // 4. Générer token
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '24h' });
  res.json({ user, token });
});

app.listen(3000, () => console.log('Backend running on http://localhost:3000'));
```

## 4. Variables d'environnement

```env
# backend/.env
GOOGLE_CLIENT_ID=votre-client-id-google
GOOGLE_CLIENT_SECRET=votre-client-secret-google
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback/google
JWT_SECRET=votre-secret-jet-tres-long
```

## 5. Lancer le backend

```bash
npx ts-node server.ts
```

## 6. Mettre à jour frontend

Dans `src/services/authService.ts`, remplacer les appels mockApi par de vrais appels fetch vers `http://localhost:3000/api/auth/*`

---

## 🤖 AI Integration (Optionnel)

Pour la vérification d'identité avec AI:

```typescript
// Ajouter dans le backend
import axios from 'axios';

const verifyIdentityWithAI = async (user: any) => {
  try {
    // 1. Analyser la photo avec une API AI (ex: Vision API)
    const photoAnalysis = await analyzePhoto(user.picture);
    
    // 2. Vérifier cohérence nom/photo
    const nameConsistency = await verifyNamePhotoMatch(user.name, photoAnalysis);
    
    // 3. Calculer score de confiance
    const trustScore = calculateTrustScore({
      emailDomain: user.email.split('@')[1],
      photoQuality: photoAnalysis.quality,
      nameConsistency,
      hasProfilePicture: !!user.picture,
    });
    
    return {
      verified: trustScore > 0.7,
      score: trustScore,
      details: { photoAnalysis, nameConsistency }
    };
  } catch (error) {
    console.error('AI verification failed:', error);
    return { verified: false, score: 0, error: error.message };
  }
};

// Intégrer dans la route OAuth
app.post('/api/auth/oauth/google', async (req, res) => {
  // ... code existant ...
  
  // Ajouter vérification AI
  const aiVerification = await verifyIdentityWithAI(googleUser);
  
  res.json({ 
    user, 
    token, 
    aiVerification 
  });
});
```

---

## 🎯 **Résultat final**

Avec ce backend simple, vous aurez:
- ✅ **OAuth Google** fonctionnel
- ✅ **Account linking** automatique  
- ✅ **Tokens JWT** sécurisés
- ✅ **API endpoints** prêts
- 🤖 **AI verification** (optionnel)

**Le backend Express prend ~15 minutes à mettre en place!** 🚀
