# 🚀 GUIDE RAPIDE POUR ROUA - Tests Unitaires

## 🎯 Objectif
Atteindre **80% de couverture de code** sur 7 modules.

---

## 📦 Modules à Tester

| # | Module | Couverture |
|---|--------|-----------|
| 1 | **UsersService** | Phase 2 - CRUD utilisateurs |
| 2 | **SkinMetricService** | Phase 2 - Calculs mathématiques |
| 3 | **AdminService** | Phase 3 - Gestion utilisateurs |
| 4 | **AdminController** | Phase 3 - Endpoints admin |
| 5 | **MetricsService** | Phase 3 - Statistiques |
| 6 | **MetricsController** | Phase 3 - Endpoints metrics |
| 7 | **EmailSecurityService** | Phase 3 - Validation emails |

---

## ⚡ Commandes Essentielles

### 1. Lancer TOUS les tests de Roua
```bash
npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
```

### 2. Lancer un test spécifique
```bash
npm test -- users.service.spec
```

### 3. Voir la couverture de code
```bash
npm test -- --coverage --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
```

### 4. Mode watch (pour développement)
```bash
npm test -- --watch users.service.spec
```

---

## 📋 Résumé des Tests

### ✅ UsersService (18 tests)
- Récupérer utilisateur par ID
- Récupérer tous les utilisateurs
- Mettre à jour utilisateur avec modération
- Valider email
- Supprimer utilisateur

**Fichier** : `backend/src/user/users.service.spec.ts`

### ✅ SkinMetricService (22 tests)
- Mettre à jour métrique
- Recalculer score d'analyse
- Récupérer analyses paginées
- Calculer série de skin age
- Gérer cas limites (null, zéro)

**Fichier** : `backend/src/skinMetric/skin-metric.service.spec.ts`

### ✅ AdminService (26 tests)
- Lister utilisateurs avec filtres
- Créer nouvel utilisateur/admin
- Chercher utilisateur par ID
- Mettre à jour utilisateur
- Supprimer utilisateur
- Obtenir statistiques
- Gérer rôles

**Fichier** : `backend/src/admin/admin.service.spec.ts`

### ✅ AdminController (21 tests)
- 7 endpoints protégés par guards
- Validation des paramètres UUID
- Codes HTTP corrects (201, 200, etc.)
- Gestion des erreurs

**Fichier** : `backend/src/admin/admin.controller.spec.ts`

### ✅ MetricsService (37 tests)
- Calculer KPIs (moyenne, médiane, percentiles)
- Générer tendances
- Agrégérer données mensuelles
- Générer données démo (6 mois)
- Fonctions statistiques complètes

**Fichier** : `backend/src/metrics/metrics.service.spec.ts`

### ✅ MetricsController (25 tests)
- 5 endpoints du dashboard
- Types de réponse correctes
- Gestion concurrence
- Cas limites (paramètres invalides)

**Fichier** : `backend/src/metrics/metrics.controller.spec.ts`

### ✅ EmailSecurityService (42 tests)
- Détecter emails temporaires (26+ domaines)
- Valider format email
- Tests de sécurité (SQL injection, XSS)
- Performance (1000 checks < 100ms)

**Fichier** : `backend/src/email-security/email-security.service.spec.ts`

---

## 🎬 Étapes à Suivre

### Jour 1 : Setup
```bash
# 1. Aller dans le répertoire backend
cd backend

# 2. Installer les dépendances (si pas fait)
npm install

# 3. Vérifier que jest fonctionne
npm test -- --version
```

### Jour 2-3 : Tests des Services Phase 2
```bash
# Tester UsersService
npm test -- users.service.spec --verbose

# Tester SkinMetricService
npm test -- skin-metric.service.spec --verbose
```

### Jour 3-4 : Tests des Services Phase 3
```bash
# Tester AdminService
npm test -- admin.service.spec --verbose

# Tester MetricsService
npm test -- metrics.service.spec --verbose

# Tester EmailSecurityService
npm test -- email-security.service.spec --verbose
```

### Jour 4-5 : Tests des Controllers
```bash
# Tester AdminController
npm test -- admin.controller.spec --verbose

# Tester MetricsController
npm test -- metrics.controller.spec --verbose
```

### Jour 5 : Vérification Finale
```bash
# Lancer TOUS les tests
npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)" --coverage

# Vérifier le rapport de couverture
# Ouvrir : coverage/lcov-report/index.html
```

---

## 🎯 KPIs de Succès

- ✅ **140+ tests** rédigés et exécutés
- ✅ **100% passage** de tous les tests
- ✅ **85%+ couverture** de code
- ✅ **0 erreur** au build
- ✅ **Tous les edge cases** couverts

---

## 🔧 Dépannage

### Les tests ne trouvent pas les fichiers
```bash
# Vérifier qu'on est dans le bon répertoire
pwd
# Doit être : .../DeepSkynv1/backend

# Vérifier la structure
ls src/user/users.service.spec.ts
```

### Jest ne s'exécute pas
```bash
# Réinstaller jest
npm install --save-dev jest @nestjs/testing

# Vérifier la config jest
cat jest.config.js
```

### Tests échouent sur les imports
```bash
# Compiler TypeScript d'abord
npm run build

# Puis lancer les tests
npm test
```

---

## 📊 Voir les Résultats

### Résumé rapide des tests
```bash
npm test -- --testNamePattern="UsersService" --verbose
```

### Coverage détaillé
```bash
npm test -- --coverage --testPathPattern="users.service"
# Résultat dans : coverage/lcov-report/index.html
```

### Tests échoués uniquement
```bash
npm test -- --testNamePattern="should throw" --verbose
```

---

## 💡 Conseils Importants

1. **Mocks bien faits** : Tous les services ont des mocks réalistes
2. **Tests d'erreurs** : Chaque test couvre les cas d'erreur
3. **Cas limites** : Tests pour null, empty, extrêmes
4. **Données réalistes** : Mocks imitent la vraie production
5. **Performance** : Des tests pour vérifier la rapidité

---

## 📞 Questions Fréquentes

**Q: Quel ordre pour les tests ?**
A: Phase 2 d'abord (Users + SkinMetric), puis Phase 3 (Admin + Metrics + EmailSecurity)

**Q: Comment déboguer un test ?**
A: Ajouter `.only` : `describe.only` ou `it.only` pour isoler

**Q: Combien de temps ça prend ?**
A: ~140 tests devraient s'exécuter en moins de 30 secondes

**Q: Comment atteindre 80% de couverture ?**
A: Tous les tests créés visent 85%+, il faut juste les lancer tous

---

## ✨ Après les Tests

Une fois tous les tests passants et la couverture > 80% :

1. ✅ Commit des tests dans git
2. ✅ Push vers la branche `testunitaire-roua`
3. ✅ Générer le rapport de couverture
4. ✅ Documenter les résultats

```bash
# Commit final
git add .
git commit -m "feat: test unitaire complet pour Roua - 140+ tests, 85%+ coverage"
git push origin testunitaire-roua
```

---

## 🎉 Vous êtes Prêt !

Tous les tests sont préparés et documentés. 
Il vous reste juste à les exécuter ! 🚀
