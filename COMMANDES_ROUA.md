# 📝 COMMANDES ESSENTIELLES - ROUA

**Copier-coller ces commandes pour exécuter les tests**

---

## 🚀 COMMANDES PRINCIPALES

### 1️⃣ Aller au répertoire backend
```bash
cd backend
```

### 2️⃣ Lancer TOUS les tests de Roua (Recommandé)
```bash
npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
```

### 3️⃣ Lancer TOUS les tests + couverture
```bash
npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)" --coverage
```

---

## 📊 TESTS INDIVIDUELS

### UsersService (18 tests)
```bash
npm test -- users.service.spec
```

### SkinMetricService (22 tests)
```bash
npm test -- skin-metric.service.spec
```

### AdminService (26 tests)
```bash
npm test -- admin.service.spec
```

### AdminController (21 tests)
```bash
npm test -- admin.controller.spec
```

### MetricsService (37 tests)
```bash
npm test -- metrics.service.spec
```

### MetricsController (25 tests)
```bash
npm test -- metrics.controller.spec
```

### EmailSecurityService (42 tests)
```bash
npm test -- email-security.service.spec
```

---

## 🎯 MODES SPÉCIAUX

### Mode Watch (auto-relancer à chaque modification)
```bash
npm test -- users.service.spec --watch
```

### Verbose (voir tous les détails)
```bash
npm test -- users.service.spec --verbose
```

### Un test spécifique
```bash
npm test -- users.service.spec -t "should return a user when found"
```

### Sans couverture (plus rapide)
```bash
npm test -- --testPathPattern="users.service" --no-coverage
```

---

## 📊 REPORTS DE COUVERTURE

### Générer couverture pour tous les tests
```bash
npm test -- --coverage --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
```

### Ouvrir le rapport HTML (Windows)
```bash
start coverage\lcov-report\index.html
```

### Ouvrir le rapport HTML (Linux)
```bash
xdg-open coverage/lcov-report/index.html
```

### Ouvrir le rapport HTML (Mac)
```bash
open coverage/lcov-report/index.html
```

---

## 🔧 DEBUGGING

### Exécuter un test et arrêter sur erreur
```bash
npm test -- users.service.spec --bail
```

### Exécuter avec timeout augmenté
```bash
npm test -- --testTimeout=10000 users.service.spec
```

### Node debugging mode
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand users.service.spec
```

---

## 🧪 COMBINAISONS UTILES

### Phase 2 (UsersService + SkinMetricService)
```bash
npm test -- --testPathPattern="(users.service|skin-metric.service)"
```

### Phase 3 (Admin + Metrics + EmailSecurity)
```bash
npm test -- --testPathPattern="(admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
```

### Tests Services uniquement
```bash
npm test -- --testPathPattern="service"
```

### Tests Controllers uniquement
```bash
npm test -- --testPathPattern="controller"
```

---

## 📜 LISTER LES TESTS

### Voir les tests d'un fichier
```bash
npm test -- users.service.spec --listTests
```

### Voir seulement les tests qui vont s'exécuter
```bash
npm test -- --testNamePattern="should" --dry-run
```

---

## 🚀 SCRIPTS AUTOMATISÉS

### Windows PowerShell
```powershell
.\backend\test-roua.ps1
```

### Linux/Mac
```bash
./backend/test-roua.sh
```

### Windows Batch
```batch
backend\test-roua.bat
```

---

## 📈 FORMATS DE RAPPORTS

### Coverage HTML
```bash
npm test -- --coverage --coverageReporters=html
# Résultat: coverage/index.html
```

### Coverage JSON
```bash
npm test -- --coverage --coverageReporters=json
# Résultat: coverage/coverage-final.json
```

### Coverage LCOV (pour SonarQube)
```bash
npm test -- --coverage --coverageReporters=lcov
# Résultat: coverage/lcov.info
```

---

## ⏱️ OPTIMISATION POUR LA VITESSE

### Tests sans output (mode silencieux)
```bash
npm test -- --silent
```

### Tests en parallèle
```bash
npm test -- --maxWorkers=4
```

### Tests en série (si parallèle pose problème)
```bash
npm test -- --runInBand
```

---

## 📊 FILTRES AVANCÉS

### Tous les tests SAUF AdminService
```bash
npm test -- --testPathIgnorePatterns="admin.service"
```

### Seulement les tests avec "should" dans le nom
```bash
npm test -- --testNamePattern="should"
```

### Seulement les tests avec "error" dans le nom
```bash
npm test -- --testNamePattern="error"
```

---

## 🎯 COMMANDE COMPLÈTE RECOMMANDÉE

### Exécution finale pour vérifier tout
```bash
npm test -- \
  --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)" \
  --coverage \
  --collectCoverageFrom="src/**/*.ts" \
  --coveragePathIgnorePatterns="/node_modules/" \
  --verbose
```

---

## 💾 SAUVEGARDER LES RÉSULTATS

### Rediriger output vers fichier
```bash
npm test -- users.service.spec > test-results.txt 2>&1
```

### Rediriger avec timestamp
```bash
npm test -- users.service.spec > test-results-$(date +%Y-%m-%d_%H-%M-%S).txt 2>&1
```

---

## ✅ CHECKLIST RAPIDE

- [ ] `cd backend` - Bon répertoire ?
- [ ] `npm install` - Dépendances OK ?
- [ ] `npm test -- users.service.spec` - Un test passe ?
- [ ] `npm test -- --testPathPattern="(users.service|..." --coverage` - Coverage OK ?
- [ ] Coverage > 80% ? ✅
- [ ] 191 tests passants ? ✅

---

**Besoin d'aide?** Consultez:
- DEMARRAGE_ROUA.md (Quick start)
- GUIDE_ROUA_TESTS.md (Guide complet)
- TESTS_ROUA.md (Référence technique)
