# 🚀 DÉMARRAGE RAPIDE - ROUA

## ⚡ 3 Étapes pour Lancer les Tests

### Étape 1: Aller au répertoire backend
```bash
cd backend
```

### Étape 2: Choisir votre méthode

#### A) Menu Interactif (Recommandé - Windows)
```powershell
.\test-roua.ps1
```

#### B) Menu Interactif (Linux/Mac)
```bash
chmod +x test-roua.sh
./test-roua.sh
```

#### C) Commande directe - TOUS les tests
```bash
npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
```

#### D) Commande directe - TOUS + couverture
```bash
npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)" --coverage
```

### Étape 3: Attendre ~30 secondes ✅

---

## 📊 Résumé Rapide

| Quoi | Nombre |
|------|--------|
| Tests créés | **191** |
| Modules testés | **7** |
| Couverture attendue | **85%+** |
| Temps d'exécution | **~30s** |
| Scripts inclus | **3** (PowerShell, Bash, Batch) |

---

## 📋 Les 7 Modules à Tester

1. **UsersService** (18 tests) - CRUD utilisateurs
2. **SkinMetricService** (22 tests) - Calculs mathématiques  
3. **AdminService** (26 tests) - Gestion admin
4. **AdminController** (21 tests) - Endpoints admin
5. **MetricsService** (37 tests) - Statistiques
6. **MetricsController** (25 tests) - Endpoints metrics
7. **EmailSecurityService** (42 tests) - Validation emails

---

## 🎯 Objectif

Passer de **4% → 80%+ de couverture de code** 📈

---

## 📖 Pour Plus de Détails

Consultez ces fichiers:
- 📄 **GUIDE_ROUA_TESTS.md** - Guide français complet
- 📄 **TESTS_ROUA.md** - Référence technique
- 📄 **RESUMES_COMPLET_ROUA.md** - Statistiques détaillées
- 📄 **INDEX_ROUA.md** - Vue d'ensemble

---

**Prêt ? Lancez les tests maintenant ! 🚀**
