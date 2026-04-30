# DeepSkyn - Intelligence Cutanée & Digital Twin

DeepSkyn est une application full-stack innovante conçue pour le diagnostic cutané, le suivi dermatologique personnalisé et le coaching IA. Ce projet combine une architecture robuste en micro-services (Backend NestJS) avec une interface utilisateur réactive (React + Vite).

---

## 🏗️ Architecture du Projet

Le dépôt est organisé en deux parties principales :

- **`backend/`** : API REST développée avec **NestJS**.
  - **Base de données** : PostgreSQL (gérée par TypeORM).
  - **Moteur IA** : Intégration hybride (OpenRouter, Gemini, Python scripts).
  - **Calculs** : Moteur de scoring pour les métriques cutanées.
- **`frontend/`** : Interface utilisateur moderne avec **React + Vite**.
  - **Styling** : Tailwind CSS.
  - **Composants** : Lucide-React pour l'iconographie, Recharts pour les graphiques.

---

## 📁 Fonctionnalités Clés & Organisation du Code

### 1. Analyse Cutanée & Scoring (Task 1)
- **Backend** : [backend/src/scoring.service.ts](backend/src/scoring.service.ts)
  - Calcule les scores d'hydratation, d'acné et de sébum.
  - Normalisation des données sur une échelle de 0-100.
- **Frontend** : [frontend/src/components/metrics/MetricsCharts.tsx](frontend/src/components/metrics/MetricsCharts.tsx)
  - Visualisation temporelle de l'évolution de la peau de l'utilisateur.

### 2. Recommandations de Produits (Task 2)
- **Logique Hybride** : [backend/src/recommendation/recommendation.service.ts](backend/src/recommendation/recommendation.service.ts)
  - Utilise un script Python (`recommend.py`) pour le matching complexe.
  - Fallback automatique vers des requêtes SQL si le moteur Python est indisponible.

### 3. Paiements & Abonnements (Task 3)
- **Intégration Stripe** : [backend/src/payment/payment.controller.ts](backend/src/payment/payment.controller.ts)
  - Gestion des sessions de paiement ("Checkout").
  - Webhooks pour la mise à jour automatique des comptes (FREE/PRO/PREMIUM).

### 4. Messagerie & Chat IA (Task 4)
- **Infrastructure** : [backend/src/chat/chat.service.ts](backend/src/chat/chat.service.ts)
  - Système de transport de messages sécurisé.
  - Historique des discussions stocké en base de données pour la continuité du coaching.

### 5. Sécurité & Authentification (Task 5)
- **Multi-Facteurs** : [backend/src/auth/auth.service.ts](backend/src/auth/auth.service.ts)
  - Connexion Google Modern (OAuth2).
  - Reconnaissance faciale (Face Login) avec seuil de tolérance de 0.45.
  - JWT sécurisés (Access & Refresh Tokens) via Cookies HTTP-Only.

---

## 🛠️ Installation Locative

### Prérequis
- **Node.js** (v18 ou supérieur)
- **PostgreSQL** (Base de données active)
- **Python 3.x** (Facultatif, pour le moteur de recommandation avancé)

### Étapes d'installation

1. **Clonage du dépôt** :
   ```bash
   git clone <votre-url-repo>
   cd DeepSkyn
   ```

2. **Configuration du Backend** :
   ```bash
   cd backend
   cp .env.example .env
   # Configurez votre DB_PASSWORD et vos clés API (Stripe, OpenRouter)
   npm install
   npm run start:dev
   ```

3. **Configuration du Frontend** :
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

---

## 🔐 Sécurité

- Les variables d'environnement sensibles (clés privées Stripe, mots de passe base de données) ne doivent jamais être poussées sur le dépôt.
- Utilisez le fichier `.env.example` pour les nouveaux paramètres requis par l'équipe.

---

## 🚀 Autres Outils transversaux

- **Météo dynamique** : Adaptation des conseils via l'API Open-Meteo pour l'indice UV et l'humidité.
- **Exports Rapport** : Génération de documents PDF (jspdf) et Excel (xlsx) directement depuis le dashboard.
- **Biométrie Admin** : Protection des accès privilégiés par WebAuthn.

