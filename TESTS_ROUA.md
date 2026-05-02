# 🧪 TESTS UNITAIRES - ROUA

## 📋 Résumé des Tests Créés

Roua est responsable de 7 modules avec **140+ tests unitaires** :

| Module | Service/Controller | Tests | Fichier |
|--------|-------------------|-------|---------|
| **User** | UsersService | 18 | `users.service.spec.ts` |
| **SkinMetric** | SkinMetricService | 22 | `skin-metric.service.spec.ts` |
| **Admin** | AdminService | 26 | `admin.service.spec.ts` |
| **Admin** | AdminController | 21 | `admin.controller.spec.ts` |
| **Metrics** | MetricsService | 37 | `metrics.service.spec.ts` |
| **Metrics** | MetricsController | 25 | `metrics.controller.spec.ts` |
| **EmailSecurity** | EmailSecurityService | 42 | `email-security.service.spec.ts` |

---

## 🚀 COMMANDES DE TEST

### 1️⃣ Installer les dépendances (si non installé)
```bash
cd backend
npm install
```

### 2️⃣ Tests individuels par module

#### **UsersService Tests** (18 tests)
```bash
npm test -- users.service.spec
```
✅ Couvre : CRUD operations, moderation check, birthDate parsing, error handling

#### **SkinMetricService Tests** (22 tests)
```bash
npm test -- skin-metric.service.spec
```
✅ Couvre : Metric updates, score recalculation, pagination, mathematical calculations

#### **AdminService Tests** (26 tests)
```bash
npm test -- admin.service.spec
```
✅ Couvre : User management, CRUD operations, filtering, role management, password hashing

#### **AdminController Tests** (21 tests)
```bash
npm test -- admin.controller.spec
```
✅ Couvre : Route handlers, HTTP status codes, guards, parameter validation

#### **MetricsService Tests** (37 tests)
```bash
npm test -- metrics.service.spec
```
✅ Couvre : Dashboard metrics, trends, monthly data, statistical functions, demo seed

#### **MetricsController Tests** (25 tests)
```bash
npm test -- metrics.controller.spec
```
✅ Couvre : All endpoints, response types, edge cases, concurrency

#### **EmailSecurityService Tests** (42 tests)
```bash
npm test -- email-security.service.spec
```
✅ Couvre : Disposable domains detection, format validation, security edge cases

### 3️⃣ Tests de tous les modules de Roua
```bash
npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
```

### 4️⃣ Tests avec couverture de code
```bash
npm test -- --coverage --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
```

### 5️⃣ Tests en mode "watch" (développement)
```bash
npm test -- --watch --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
```

### 6️⃣ Tests avec debug verbeux
```bash
npm test -- --verbose --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
```

---

## 📊 Couverture de Code Attendue

Après les tests, la couverture devrait être :

```
Statement Coverage: ~85-90%
Branch Coverage: ~80-85%
Function Coverage: ~85-90%
Line Coverage: ~85-90%
```

---

## 🎯 Cas de Tests Couverts par Module

### UsersService (18 tests)
- ✅ `findById` - User found / not found
- ✅ `findAll` - All users / empty list
- ✅ `update` - Valid update / moderation rejection / birthDate parsing
- ✅ `remove` - Delete user
- ✅ Edge cases : null bio, multiple updates

### SkinMetricService (22 tests)
- ✅ `updateMetric` - Metric update with recalculation
- ✅ `recalculateAnalysisScore` - Score calculation
- ✅ `getUserAnalyses` - Pagination, filtering, authorization
- ✅ `getUserSkinAgeSeries` - Series data retrieval
- ✅ Mathematical edge cases : zero values, extreme values

### AdminService (26 tests)
- ✅ `findAllUsers` - Pagination, filtering, sorting, subscriptions
- ✅ `createUser` - Create users/admins, email validation, password hashing
- ✅ `findUserById` - User retrieval, not found handling
- ✅ `updateUser` - User update operations
- ✅ `removeUser` - User deletion
- ✅ `getStats` - Statistics dashboard
- ✅ `updateUserRole` - Role management

### AdminController (21 tests)
- ✅ All 7 endpoints : GET/POST/PATCH/DELETE
- ✅ Route protection with guards
- ✅ HTTP status codes (201, 200, etc.)
- ✅ Parameter validation with UUID pipes

### MetricsService (37 tests)
- ✅ `getDashboardMetrics` - KPI calculations, statistics
- ✅ `getTrends` - Multi-period trends
- ✅ `getMonthlyData` - Monthly aggregation
- ✅ `seedDemoData` - Demo data generation
- ✅ Statistical functions : mean, median, percentiles, stdDev
- ✅ Edge cases : single item, all equal values, rounding

### MetricsController (25 tests)
- ✅ All 5 endpoints
- ✅ Response format validation
- ✅ Concurrency handling
- ✅ Edge case parameters

### EmailSecurityService (42 tests)
- ✅ `isSuspicious` - Disposable domain detection, format validation
- ✅ `isDisposableDomain` - 26+ known disposable domains
- ✅ `hasSuspiciousFormat` - Email format validation
- ✅ Case-insensitive checks
- ✅ Security tests : SQL injection, XSS, unicode attacks
- ✅ Performance : 1000 checks in <100ms

---

## 💡 Conseils pour Atteindre 80%

1. **Mocks complets** : Tous les services ont des mocks bien structurés
2. **Happy paths ET sad paths** : Chaque test couvre les cas de succès ET d'erreur
3. **Edge cases** : Tests pour null, empty, extrêmes, invalid inputs
4. **Validation des erreurs** : Tests pour exceptions, throw, rejects
5. **Données réalistes** : Mocks utilisent des données proches de la production

---

## 📝 Exécution Recommandée

### Phase 1 : Vérifier individuellement
```bash
npm test -- users.service.spec
npm test -- skin-metric.service.spec
npm test -- admin.service.spec
npm test -- admin.controller.spec
npm test -- metrics.service.spec
npm test -- metrics.controller.spec
npm test -- email-security.service.spec
```

### Phase 2 : Lancer tous les tests ensemble
```bash
npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
```

### Phase 3 : Vérifier la couverture
```bash
npm test -- --coverage --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)" --collectCoverageFrom="src/**/*.ts" --coveragePathIgnorePatterns="/node_modules/"
```

---

## ✨ Rapports de Coverage

Après chaque test avec `--coverage`, les rapports sont générés dans `coverage/`:
- `coverage/index.html` - Vue HTML interactive
- `lcov.info` - Format compatible avec SonarQube
- `coverage-final.json` - JSON complet

Ouvrir le rapport HTML :
```bash
# Windows
start coverage/lcov-report/index.html

# Linux/Mac
open coverage/lcov-report/index.html
```

---

## 🔍 Débogage des Tests

### Exécuter un test spécifique
```bash
npm test -- users.service.spec -t "should return a user when found"
```

### Mode debug avec Node inspector
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand users.service.spec
```

### Voir les logs des tests
```bash
npm test -- --verbose --no-coverage
```

---

## 📦 Fichiers Créés

```
backend/src/
├── user/
│   └── users.service.spec.ts           (18 tests)
├── skinMetric/
│   └── skin-metric.service.spec.ts     (22 tests)
├── admin/
│   ├── admin.service.spec.ts           (26 tests)
│   └── admin.controller.spec.ts        (21 tests)
├── metrics/
│   ├── metrics.service.spec.ts         (37 tests)
│   └── metrics.controller.spec.ts      (25 tests)
└── email-security/
    └── email-security.service.spec.ts  (42 tests)
```

---

## ✅ Checklist pour Roua

- ✅ 140+ tests unitaires créés
- ✅ Tous les modules testés (Phase 2 + Phase 3)
- ✅ Coverage > 85% attendu
- ✅ Mocks et stubs complets
- ✅ Edge cases couverts
- ✅ Commandes de test documentées
- ✅ Rapports de coverage disponibles

**Objectif : Passer de 4% à 80%+ de couverture de code ! 🎯**
