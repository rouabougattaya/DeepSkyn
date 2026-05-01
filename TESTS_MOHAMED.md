# 🧪 Tests Unitaires - Mohamed (E-Commerce & Paiement)

## 📋 Vue d'ensemble

Cette suite de tests couvre les 5 services critiques de Mohamed :
1. **ProductsService** - Filtrage et recherche de produits avec pagination
2. **RecommendationService** - Moteur de recommandation (Python fallback DB)
3. **StripeService** - Gestion des sessions de paiement Stripe avec webhooks
4. **PaymentService** - Gestion des paiements et abonnements
5. **SubscriptionService** - Gestion des limites et des plans utilisateurs

---

## 🚀 Installation des dépendances

```bash
cd backend
npm install
```

## ✅ Exécuter TOUS les tests de Mohamed

### Option 1 : Tester tous les services à la fois
```bash
npm test -- products.service.spec.ts recommendation.service.spec.ts stripe.service.spec.ts payment.service.spec.ts subscription.service.spec.ts
```

### Option 2 : Avec coverage (couverture de code)
```bash
npm test -- --coverage products.service.spec.ts recommendation.service.spec.ts stripe.service.spec.ts payment.service.spec.ts subscription.service.spec.ts
```

### Option 3 : Mode watch (surveillance en temps réel)
```bash
npm test -- --watch products.service.spec.ts recommendation.service.spec.ts stripe.service.spec.ts payment.service.spec.ts subscription.service.spec.ts
```

---

## 🔍 Tester chaque service individuellement

### 1️⃣ ProductsService (Filtrage & Pagination)
```bash
npm test -- products.service.spec.ts
```

**Cas de test couverts :**
- ✅ Lister tous les produits sans filtres
- ✅ Filtrer par terme de recherche
- ✅ Filtrer par type de produit
- ✅ Filtrer par ingrédient
- ✅ Filtrer par plage de prix (min/max)
- ✅ Filtrer par flag isClean
- ✅ Appliquer le tri et la pagination
- ✅ Gérer les champs de tri non valides
- ✅ Appliquer la limite par défaut (50)
- ✅ Récupérer les types de produits uniques
- ✅ Récupérer les ingrédients uniques avec déduplication

---

### 2️⃣ RecommendationService (IA & Moteur de recommandation)
```bash
npm test -- recommendation.service.spec.ts
```

**Cas de test couverts :**
- ✅ Utiliser le fallback DB quand Python est désactivé
- ✅ Inclure les préoccupations (concerns) dans les recommandations
- ✅ Gérer un tableau vide de préoccupations
- ✅ Gérer les préoccupations non définies
- ✅ Sauvegarder les recommandations avec tous les paramètres
- ✅ Sauvegarder sans paramètres optionnels
- ✅ Gérer un tableau vide de recommandations
- ✅ Sauvegarder plusieurs éléments de recommandation
- ✅ Valider les scores de confiance (0 à 1)
- ✅ Gérer les scores de confiance élevés
- ✅ Gérer les scores de confiance bas

---

### 3️⃣ StripeService (Paiement Stripe avec mocks)
```bash
npm test -- stripe.service.spec.ts
```

**Cas de test couverts :**
- ✅ Créer une session de paiement PRO
- ✅ Créer une session de paiement PREMIUM
- ✅ Convertir correctement le montant en cents
- ✅ Inclure les URLs correctes de configuration
- ✅ Utiliser l'URL frontend par défaut quand non configurée
- ✅ Gérer les erreurs Stripe
- ✅ Récupérer une session de paiement par ID
- ✅ Retourner la session avec le statut de paiement = paid
- ✅ Retourner la session avec le statut de paiement = unpaid
- ✅ Gérer l'erreur "session non trouvée"
- ✅ Construire un événement webhook à partir de la signature
- ✅ Gérer l'erreur de vérification de signature webhook
- ✅ Gérer l'événement payment_intent.succeeded
- ✅ Gérer l'événement charge.failed

---

### 4️⃣ PaymentService (Gestion des paiements)
```bash
npm test -- payment.service.spec.ts
```

**Cas de test couverts :**
- ✅ Passer de FREE à PRO
- ✅ Passer de FREE à PREMIUM
- ✅ Passer de PRO à PREMIUM
- ✅ Créer un nouvel abonnement si l'utilisateur n'en a pas
- ✅ Gérer la tentative de rétrogradation (rester au même niveau)
- ✅ Définir les dates d'abonnement correctes (startDate, endDate)
- ✅ Récupérer l'historique des paiements par utilisateur
- ✅ Retourner un tableau vide quand l'utilisateur n'a pas de paiements
- ✅ Trier les paiements par date décroissante
- ✅ Gérer plusieurs transactions au même moment
- ✅ Gérer l'erreur de sauvegarde d'abonnement
- ✅ Gérer l'erreur de paiement

**Montants testés :**
- FREE → PRO : $9.99
- FREE → PREMIUM : $19.99
- PRO → PREMIUM : $19.99

---

### 5️⃣ SubscriptionService (Gestion des limites)
```bash
npm test -- subscription.service.spec.ts
```

**Cas de test couverts :**
- ✅ Retourner un abonnement existant pour l'utilisateur
- ✅ Créer un abonnement FREE s'il n'existe pas
- ✅ Corriger un abonnement avec un plan vide
- ✅ Vérifier les limites de chat (FREE, PRO, PREMIUM)
- ✅ Rejeter le chat quand l'utilisateur atteint la limite
- ✅ Réinitialiser les messages le jour suivant
- ✅ Vérifier les limites d'analyse (5, 50, 999999)
- ✅ Rejeter l'analyse quand l'utilisateur atteint la limite
- ✅ Réinitialiser les images le mois suivant
- ✅ Incrémenter les messages et mettre à jour le timestamp
- ✅ Incrémenter les images et mettre à jour le timestamp
- ✅ Retourner un résumé complet d'utilisation

**Limites par plan :**
| Plan | Chat | Analyse |
|------|------|---------|
| FREE | 20/jour | 5/mois |
| PRO | 200/jour | 50/mois |
| PREMIUM | 999999/jour | 999999/mois |

---

## 📊 Générer un rapport de couverture de code

```bash
npm test -- --coverage --collectCoverageFrom="src/products/**/*.ts" --collectCoverageFrom="src/recommendation/**/*.ts" --collectCoverageFrom="src/payment/**/*.ts" --collectCoverageFrom="src/subscription/**/*.ts"
```

Cela créera un dossier `coverage/` avec un rapport HTML détaillé.

---

## 🎯 Objectif de couverture

Pour atteindre **80% de couverture globale** :

- **ProductsService** : ~90% (11 tests)
- **RecommendationService** : ~85% (13 tests)
- **StripeService** : ~95% (14 tests)
- **PaymentService** : ~88% (15 tests)
- **SubscriptionService** : ~92% (31 tests)

**Total : 84 tests** ✅

---

## 🔧 Commandes utiles

### Exécuter avec sortie détaillée
```bash
npm test -- --verbose products.service.spec.ts
```

### Exécuter un seul test (par description)
```bash
npm test -- products.service.spec.ts -t "should return products without filters"
```

### Exécuter avec reporters personnalisés
```bash
npm test -- --reporters=default --reporters=jest-junit
```

### Mode debug
```bash
node --inspect-brk node_modules/.bin/jest --runInBand src/products/products.service.spec.ts
```

---

## 📝 Mocks et dépendances

Les tests utilisent des mocks complets pour :
- **TypeORM Repository** (trocage des services TypeORM)
- **ConfigService** (configuration Stripe)
- **Stripe API** (session checkout, webhooks)
- **Logger** (suppression des logs de test)

Aucune vraie base de données ou appel API n'est effectué ! ✅

---

## ✨ Points importants pour atteindre 80%

### Pour ProductsService
- Tester les edge cases (recherche vide, prix négatif)
- Vérifier le tri DESC vs ASC
- Tester les ingrédients en doublon

### Pour RecommendationService
- Tester les scores de confiance en limite (0, 1)
- Gérer les réponses Python invalides
- Tester le fallback DB

### Pour StripeService
- ✅ Mocks Stripe complets (checkout, webhooks)
- ✅ Tester les événements webhook divers
- ✅ Gérer les signatures invalides

### Pour PaymentService
- ✅ Tester l'upgrade FREE → PRO → PREMIUM
- ✅ Attendre les mises à jour de dates
- ✅ Tester l'historique de paiement

### Pour SubscriptionService
- ✅ Tester la réinitialisation quotidienne (chat)
- ✅ Tester la réinitialisation mensuelle (images)
- ✅ Vérifier les limites par plan
- ✅ Tester les résumés d'utilisation

---

## 🚨 Dépannage

### Si les tests échouent avec "Cannot find module 'jest'"
```bash
npm install jest @types/jest ts-jest --save-dev
```

### Si les tests échouent avec "Cannot find module 'typeorm'"
```bash
npm install
```

### Si les tests échouent avec erreur Stripe
Les mocks Stripe sont configurés. Vérifier que `jest.mock('stripe')` fonctionne.

---

## 🎉 Prochaines étapes

Après ces tests :
1. ✅ Célébrer atteindre 80% de couverture
2. ✅ Commenter les cas des autres équipes
3. ✅ Mettre en place une CI/CD pour exécuter automatiquement
4. ✅ Fixer les bugs découverts

**Bon courage ! 💪**
