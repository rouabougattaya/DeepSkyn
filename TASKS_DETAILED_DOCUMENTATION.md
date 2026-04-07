# DeepSkyn - Documentation detaillee par tache

Date: 2026-04-07

Ce document est une documentation dediee a tes taches par module.
Pour chaque tache, tu trouveras:
- Les pages frontend utilisees
- Les services frontend utilises
- Les endpoints backend
- L explication du code principal

---

## 1) Module Skin Analyse - Calcul metrique

### 1.1 Pages frontend utilisees
- `frontend/src/pages/AnalysisPage.tsx`
- `frontend/src/pages/SkinAnalysisPage.tsx`
- `frontend/src/pages/SkinHistoryPage.tsx`
- `frontend/src/pages/SkinAnalysisDetailPage.tsx`
- `frontend/src/pages/ComparisonPage.tsx`
- `frontend/src/pages/SkinDigitalTwinPage.tsx`
- `frontend/src/pages/DashboardPage.tsx` (affichage KPI/metriques)

### 1.2 Services frontend utilises
- `frontend/src/services/analysisService.ts`
  - `getAnalysisById(analysisId)`
  - `recalculateScore(analysisId, weights)`
  - `getInsights()`
- `frontend/src/services/dashboardService.ts`
  - `getMetrics()`
  - `getTrends()`
  - `getMonthlyData(months)`

### 1.3 Endpoints backend utilises
- `GET /api/analysis/user`
- `GET /api/analysis/:id`
- `POST /api/analysis/recalculate/:id`
- `GET /api/analysis/insights`
- `GET /api/analysis/compare`
- `POST /api/ai/analyze`
- `POST /api/ai/analyze/unified`
- `GET /api/dashboard/metrics`
- `GET /api/dashboard/trends`
- `GET /api/dashboard/monthly`

### 1.4 Explication du code principal
- `backend/src/analysis.controller.ts`
  - Controleur principal du domaine analyse utilisateur.
  - Applique `JwtAccessGuard` pour proteger les routes utilisateur.
  - Delegue la logique metier a `SkinMetricService` et `InsightsService`.

- `backend/src/metrics/metrics.controller.ts`
  - Expose les routes dashboard pour KPI et tendances.
  - Force la presence de `userId` depuis `CurrentUser`.

- `backend/src/metrics/metrics.service.ts`
  - Moteur statistique principal:
    - moyenne, min, max
    - ecart type
    - mediane
    - percentiles Q1/Q3
    - moving average
    - tendance par periodes (7j, 30j, 90j)
  - Construit aussi les agregations mensuelles pour les graphs.

- `backend/src/ai/scoring-engine.service.ts`
  - Transforme les detections en scores de conditions (0-100).
  - Applique les poids par condition (acne, pores, rides, etc.).
  - Normalise les poids et calcule un score global.

---

## 2) Module Recommendation - Recommendation products

### 2.1 Pages frontend utilisees
- `frontend/src/pages/ProductsPage.tsx`
- `frontend/src/pages/RoutinesPage.tsx`

### 2.2 Services frontend utilises
- `frontend/src/services/product.service.ts`
  - `filter(params)`
  - `getTypes()`
  - `getIngredients()`
- `frontend/src/services/svrRoutineService.ts` (utilise dans le flux routines)
- `frontend/src/services/routinePersonalizationService.ts` (personnalisation)

### 2.3 Endpoints backend utilises
- `GET /api/products/filter`
- `GET /api/products/types`
- `GET /api/products/ingredients`
- `POST /api/ai/svr-routine`

### 2.4 Explication du code principal
- `backend/src/products/products.controller.ts`
  - API publique de recherche/filtrage des produits.

- `backend/src/products/products.service.ts`
  - QueryBuilder dynamique TypeORM.
  - Filtres supportes: search, type, ingredient, prix min/max, clean, tri.
  - Extrait les types et ingredients uniques pour les filtres UI.

- `backend/src/recommendation/recommendation.service.ts`
  - Moteur de recommandations hybride:
    - Priorite script Python (`scripts/recommend.py`) + dataset CSV
    - Fallback DB si Python indisponible (ou pandas manquant)
  - Score les produits selon overlap concerns + rating.
  - Diversifie la selection par categories (cleanser, serum, moisturizer, sunscreen).
  - Persiste les recommandations finales (`Recommendation`, `RecommendationItem`).

Note importante:
- Le dossier `backend/src/recommendation/` n expose pas un controller direct.
- La recommendation est utilisee via d autres flux (AI/routine/services).

---

## 3) Module Payment - Payment et gestion des plans

### 3.1 Pages frontend utilisees
- `frontend/src/pages/PricingPage.tsx`
- `frontend/src/pages/UpgradePage.tsx`
- `frontend/src/pages/PaymentSuccess.tsx`
- `frontend/src/pages/PaymentCancel.tsx`

### 3.2 Services frontend utilises
- `frontend/src/services/paymentService.ts`
  - `subscribePlan(payload)`
  - `getPaymentHistory(userId)`
  - `createCheckoutSession(userId, plan)`

### 3.3 Endpoints backend utilises
- `GET /api/plans`
- `POST /api/payments/subscribe`
- `POST /api/payments/checkout-session`
- `GET /api/payments/session/:sessionId`
- `POST /api/payments/webhook`
- `GET /api/payments/history/:userId`
- `PATCH /api/payments/subscription/:userId`

### 3.4 Explication du code principal
- `backend/src/plans/plans.controller.ts`
  - Retourne le catalogue plans (FREE, PRO, PREMIUM) + features.

- `backend/src/payment/payment.controller.ts`
  - Orchestration Stripe:
    - creation session checkout
    - verification session apres redirect
    - webhook Stripe `checkout.session.completed`
  - Gere aussi le downgrade abonnement.

- `backend/src/payment/payment.service.ts`
  - Logique d upgrade abonnement:
    - cree paiement
    - verifie hierarchy plan
    - met a jour dates subscription
  - Retourne historique paiements.

- `frontend/src/pages/UpgradePage.tsx`
  - Flux principal d upgrade:
    - tentative Stripe Checkout
    - fallback formulaire local si Stripe indisponible

- `frontend/src/pages/PaymentSuccess.tsx`
  - Lit `session_id` en query string.
  - Verifie l etat paiement via backend puis affiche resultat.

---

## 4) Module Chat - Messaging system

### 4.1 Pages frontend utilisees
- `frontend/src/pages/ChatPage.tsx`

### 4.2 Hooks/services frontend utilises
- `frontend/src/hooks/useChat.ts`
  - gere etat messages, loading, errors
  - envoi message et ajout reponse assistant
- `frontend/src/services/chat.service.ts`
  - `sendPersonalizedMessage(message)` -> `/chat/personalized`

### 4.3 Endpoints backend utilises
- `POST /api/chat/start`
- `POST /api/chat/message`
- `POST /api/chat/personalized`
- `POST /api/chat/history`
- `POST /api/chat/session-messages`
- `POST /api/chat/delete-session`
- `POST /api/chat/rename-session`

### 4.4 Explication du code principal
- `backend/src/chat/chat.controller.ts`
  - API chat securisee par JWT.
  - Expose creation session, envoi message, historique, suppression, renommage.

- `backend/src/chat/chat.service.ts`
  - Moteur conversationnel:
    - resolution user/session
    - controle quotas chat selon abonnement
    - increment usage messages
    - prompt personnalise selon contexte peau utilisateur
    - sauvegarde historique en DB
    - cache memoire court terme (10 min)

- `frontend/src/pages/ChatPage.tsx`
  - UI conversation: input, rendu assistant, erreurs limites plan.
  - Si limite plan atteinte, propose redirection upgrade.

---

## 5) Module Authentification - Login Google + score AI

### 5.1 Pages frontend utilisees
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/GoogleCallback.tsx`
- `frontend/src/pages/LoginFacePage.tsx`
- `frontend/src/pages/LoginFingerprintPage.tsx`
- `frontend/src/pages/TwoFactorPage.tsx`
- `frontend/src/pages/TwoFactorSettingsPage.tsx`

### 5.2 Services frontend utilises
- `frontend/src/services/googleRealOAuthService.ts`
  - extraction tokens OAuth depuis URL
  - parsing id_token JWT
  - fallback userinfo API Google
- `frontend/src/services/aiService.ts`
  - verification identite/score AI (photo, email trust, coherence)

### 5.3 Endpoints backend utilises
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/google`
- `POST /api/auth/login-face`
- `POST /api/auth/check-user`
- `PUT /api/auth/update-ai-score`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/:id`
- `DELETE /api/auth/sessions`

### 5.4 Explication du code principal
- `backend/src/auth/auth.controller.ts`
  - Point d entree auth: login/register/google/refresh/sessions.
  - Ajoute controles: throttle, captcha login, cookies refresh token.

- `backend/src/auth/auth.service.ts`
  - Coeur auth metier:
    - login email/password
    - login google modern
    - login face
    - emission access + refresh tokens
    - gestion sessions
    - forgot/reset password
    - persistance aiScore, photoAnalysis, emailAnalysis

- `frontend/src/pages/GoogleCallback.tsx`
  - Recupere tokens OAuth Google.
  - Construit profil utilisateur reel Google.
  - Calcule verification AI locale.
  - Appelle backend `/auth/google` pour session finale.

---

## 6) Other things - Transcription, Export PDF/CSV, Meteo API, Crisp

### 6.1 Export PDF / Excel
Pages/composants detectes:
- `frontend/src/components/insights/SkinAgeInsightCard.tsx`

Explication:
- Utilise `jspdf` + `jspdf-autotable` pour generer un rapport PDF riche.
- Utilise `xlsx` pour export multi-feuilles Excel.
- Le flux export est deja implemente cote frontend.

### 6.2 Audio / "transcription"
Elements detectes:
- `frontend/src/components/insights/SkinAgeInsightCard.tsx` (speechSynthesis)
- `frontend/src/pages/SkinAnalysisPage.tsx` (usage speechSynthesis detecte)

Etat:
- Le projet contient de la synthese vocale (Text-To-Speech) via `window.speechSynthesis`.
- Je n ai pas trouve de vraie transcription Speech-To-Text (pas de `SpeechRecognition` complete).

### 6.3 CSV export
Etat:
- Export Excel est present (`xlsx`).
- Export CSV explicite dedie non detecte dans les fichiers lus.
- Possible extension: generer CSV via `XLSX.utils.sheet_to_csv` ou Blob CSV dedie.

### 6.4 Meteo API
Pages/composants detectes:
- `frontend/src/components/dashboard/WeatherAdaptiveWidget.tsx`
- `frontend/src/services/weatherService.ts`
- `frontend/src/pages/DashboardPage.tsx`

Explication:
- Geolocalisation navigateur.
- Meteo via Open-Meteo (temperature, humidite, UV).
- Reverse geocoding via Nominatim pour la ville.
- Retour conseil skincare adapte aux conditions.

### 6.5 Crisp chat support
Etat:
- Aucune integration Crisp detectee (pas de `$crisp`, pas de SDK Crisp trouve).
- Cette fonctionnalite est probablement encore a implementer.

---

## 7) Resume architecture "page -> service -> endpoint"

### Skin analyse
- `AnalysisPage/SkinAnalysisPage` -> `analysisService` + `dashboardService` -> `/analysis/*`, `/dashboard/*`, `/ai/analyze*`

### Recommendation products
- `ProductsPage` -> `productService` -> `/products/filter|types|ingredients`
- `RoutinesPage` -> service routine/SVR -> `/ai/svr-routine`

### Payment/plans
- `PricingPage` -> fetch plans -> `/plans`
- `UpgradePage` -> `paymentService` -> `/payments/checkout-session`, `/payments/subscribe`
- `PaymentSuccess` -> verify session -> `/payments/session/:id`

### Chat
- `ChatPage` -> `useChat` -> `chatService` -> `/chat/personalized` (et autres routes chat selon flux)

### Auth + Google + score AI
- `LoginPage/GoogleCallback` -> `googleRealOAuthService` + `aiService` -> `/auth/google`, `/auth/login`, `/auth/refresh`

---

## 8) Notes de qualite et coherence

- Le projet est riche et modulaire (NestJS + React).
- Les taches principales sont bien couvertes par des modules dedies.
- Certaines features "other things" sont partielles:
  - Export PDF/Excel: OK
  - Meteo API: OK
  - TTS: OK
  - Transcription STT: non complet
  - Crisp: non implemente
  - CSV dedie: non explicite

---

## 9) Prochaine etape recommandee

Pour transformer ce document en guide equipe complet, tu peux ajouter:
- Diagrammes sequence (Login Google, Payment Stripe, Chat message flow)
- Matrice des droits par plan (FREE/PRO/PREMIUM)
- Checklist QA par page (happy path + erreurs)
- Runbook production (variables env, webhooks, rotation secrets)
