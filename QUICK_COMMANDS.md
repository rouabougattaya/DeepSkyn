# ⚡ Commandes Rapides - Tests de Mohamed

## 📍 Se positionner dans le dossier backend

```bash
cd backend
```

## 🎯 Exécuter les tests

### 1️⃣ Tous les tests (Recommandé)
```bash
npm test -- products.service.spec.ts recommendation.service.spec.ts stripe.service.spec.ts payment.service.spec.ts subscription.service.spec.ts
```

### 2️⃣ ProductsService uniquement
```bash
npm test -- products.service.spec.ts
```

### 3️⃣ RecommendationService uniquement
```bash
npm test -- recommendation.service.spec.ts
```

### 4️⃣ StripeService uniquement
```bash
npm test -- stripe.service.spec.ts
```

### 5️⃣ PaymentService uniquement
```bash
npm test -- payment.service.spec.ts
```

### 6️⃣ SubscriptionService uniquement
```bash
npm test -- subscription.service.spec.ts
```

## 📊 Avec couverture de code

```bash
npm test -- --coverage products.service.spec.ts recommendation.service.spec.ts stripe.service.spec.ts payment.service.spec.ts subscription.service.spec.ts
```

## 🔍 Mode watch (surveillance en temps réel)

```bash
npm test -- --watch products.service.spec.ts recommendation.service.spec.ts stripe.service.spec.ts payment.service.spec.ts subscription.service.spec.ts
```

## 🖥️ Scripts automatisés

### Sur Windows (PowerShell ou CMD)
```bash
# Double-cliquez sur : run-tests.bat
# OU
.\run-tests.bat
```

### Sur Mac/Linux
```bash
bash run-tests.sh
```

## 📈 Résumé de la couverture

Après avoir exécuté avec `--coverage`, ouvrez :
```
coverage/index.html
```

## 🎯 Objectif

- **Total tests** : 84 tests
- **Couverture cible** : 80%+
- **Services testés** : 5 services complets

---

## ✨ Points clés

✅ ProductsService : 11 tests (filtrage, pagination, tri)
✅ RecommendationService : 13 tests (IA, scores de confiance)
✅ StripeService : 14 tests (webhooks, sessions)
✅ PaymentService : 15 tests (upgrades, historique)
✅ SubscriptionService : 31 tests (limites, plans, réinitialisations)

---

## 🚀 Raccourci pour vim dans un terminal

Si vous utilisez vim ou nano :

```bash
# Pour éditer les résultats de test
npm test -- products.service.spec.ts --verbose 2>&1 | less

# Pour sauvegarder dans un fichier
npm test -- products.service.spec.ts > test-results.txt 2>&1
```

---

💡 **Pro tip** : Avant de commit/push, toujours exécuter les tests avec coverage !
