@echo off
REM 🎯 Script de test pour Mohamed - E-Commerce & Paiement (Windows)

setlocal enabledelayedexpansion

echo.
echo ============================================
echo 📊 Tests Unitaires - Suite E-Commerce
echo ============================================
echo.

REM Vérifier si npm est installé
npm -v >nul 2>&1
if errorlevel 1 (
  echo ❌ npm n'est pas installé. Veuillez installer Node.js.
  pause
  exit /b 1
)

REM Aller au dossier backend
cd /d "%~dp0backend"
if errorlevel 1 (
  echo ❌ Erreur : impossible de trouver le dossier backend
  pause
  exit /b 1
)

echo ✓ Répertoire : %cd%
echo.

REM Installer les dépendances si nécessaire
if not exist "node_modules" (
  echo 📦 Installation des dépendances...
  call npm install --legacy-peer-deps
  echo.
)

REM Menu d'options
echo Choisissez le type de test :
echo 1. Tous les tests (recommandé pour la CI/CD)
echo 2. ProductsService uniquement
echo 3. RecommendationService uniquement
echo 4. StripeService uniquement
echo 5. PaymentService uniquement
echo 6. SubscriptionService uniquement
echo 7. Tous les tests avec couverture de code
echo 8. Mode watch (surveillance en temps réel)
echo.
set /p choice="Entrez votre choix (1-8) : "

if "%choice%"=="1" (
  echo.
  echo 🚀 Exécution de tous les tests...
  echo.
  call npm test -- products.service.spec.ts recommendation.service.spec.ts stripe.service.spec.ts payment.service.spec.ts subscription.service.spec.ts
  goto :end
)

if "%choice%"=="2" (
  echo.
  echo 🚀 Test ProductsService (Filtrage ^& Pagination)...
  echo.
  call npm test -- products.service.spec.ts
  goto :end
)

if "%choice%"=="3" (
  echo.
  echo 🚀 Test RecommendationService (IA ^& Moteur)...
  echo.
  call npm test -- recommendation.service.spec.ts
  goto :end
)

if "%choice%"=="4" (
  echo.
  echo 🚀 Test StripeService (Paiement Stripe)...
  echo.
  call npm test -- stripe.service.spec.ts
  goto :end
)

if "%choice%"=="5" (
  echo.
  echo 🚀 Test PaymentService (Gestion des paiements)...
  echo.
  call npm test -- payment.service.spec.ts
  goto :end
)

if "%choice%"=="6" (
  echo.
  echo 🚀 Test SubscriptionService (Limites ^& Plans)...
  echo.
  call npm test -- subscription.service.spec.ts
  goto :end
)

if "%choice%"=="7" (
  echo.
  echo 🚀 Tous les tests avec rapport de couverture...
  echo.
  call npm test -- --coverage products.service.spec.ts recommendation.service.spec.ts stripe.service.spec.ts payment.service.spec.ts subscription.service.spec.ts
  echo.
  echo 📊 Rapport disponible dans : coverage\index.html
  goto :end
)

if "%choice%"=="8" (
  echo.
  echo 🚀 Mode watch activé (appuyez sur Q pour quitter)...
  echo.
  call npm test -- --watch products.service.spec.ts recommendation.service.spec.ts stripe.service.spec.ts payment.service.spec.ts subscription.service.spec.ts
  goto :end
)

echo.
echo ❌ Choix invalide.
echo.
pause
exit /b 1

:end
echo.
echo ✅ Exécution des tests terminée !
echo.
pause
