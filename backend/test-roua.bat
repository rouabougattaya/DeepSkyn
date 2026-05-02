@echo off
REM Script d'exécution des tests de Roua (Windows)
REM Usage: test-roua.bat [command]

setlocal enabledelayedexpansion

if not exist "package.json" (
    echo.
    echo [91m❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le répertoire 'backend'[0m
    echo.
    exit /b 1
)

echo.
echo [96m🧪 TESTS UNITAIRES DE ROUA[0m
echo [96m===================================================[0m
echo.
echo [92m✅ Répertoire backend confirmé[0m
echo.

set "COMMAND=%1"
if "%COMMAND%"=="" set "COMMAND=menu"

goto %COMMAND% 2>nul || goto invalid

:menu
:all
cls
echo.
echo [96m📋 MENU PRINCIPAL[0m
echo [96m===================================================[0m
echo.
echo [93mModules individuels :[0m
echo   1. UsersService (18 tests)
echo   2. SkinMetricService (22 tests)
echo   3. AdminService (26 tests)
echo   4. AdminController (21 tests)
echo   5. MetricsService (37 tests)
echo   6. MetricsController (25 tests)
echo   7. EmailSecurityService (42 tests)
echo.
echo [93mTests groupés :[0m
echo   8. TOUS les tests de Roua (140+ tests)
echo   9. TOUS les tests + couverture
echo   a. Mode Watch
echo   c. Voir le rapport de couverture
echo.
echo   q. Quitter
echo.
set /p choice="Sélectionnez une option: "

if "%choice%"=="1" goto users
if "%choice%"=="2" goto skin-metric
if "%choice%"=="3" goto admin-service
if "%choice%"=="4" goto admin-controller
if "%choice%"=="5" goto metrics-service
if "%choice%"=="6" goto metrics-controller
if "%choice%"=="7" goto email-security
if "%choice%"=="8" goto all-tests
if "%choice%"=="9" goto all-coverage
if "%choice%"=="a" goto watch
if "%choice%"=="c" goto coverage
if "%choice%"=="q" (
    echo.
    echo [92m👋 Au revoir![0m
    exit /b 0
)
echo [91m❌ Option invalide[0m
timeout /t 2 >nul
goto all

:users
echo.
echo [93m📋 Lancement des tests UsersService...[0m
echo.
call npm test -- users.service.spec --verbose
timeout /t 2 >nul
goto all

:skin-metric
echo.
echo [93m📊 Lancement des tests SkinMetricService...[0m
echo.
call npm test -- skin-metric.service.spec --verbose
timeout /t 2 >nul
goto all

:admin-service
echo.
echo [93m👤 Lancement des tests AdminService...[0m
echo.
call npm test -- admin.service.spec --verbose
timeout /t 2 >nul
goto all

:admin-controller
echo.
echo [93m🎮 Lancement des tests AdminController...[0m
echo.
call npm test -- admin.controller.spec --verbose
timeout /t 2 >nul
goto all

:metrics-service
echo.
echo [93m📈 Lancement des tests MetricsService...[0m
echo.
call npm test -- metrics.service.spec --verbose
timeout /t 2 >nul
goto all

:metrics-controller
echo.
echo [93m📊 Lancement des tests MetricsController...[0m
echo.
call npm test -- metrics.controller.spec --verbose
timeout /t 2 >nul
goto all

:email-security
echo.
echo [93m📧 Lancement des tests EmailSecurityService...[0m
echo.
call npm test -- email-security.service.spec --verbose
timeout /t 2 >nul
goto all

:all-tests
echo.
echo [93m🚀 Lancement de TOUS les tests de Roua...[0m
echo.
call npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)" --verbose
timeout /t 2 >nul
goto all

:all-coverage
echo.
echo [93m📊 Lancement de TOUS les tests avec couverture...[0m
echo.
call npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)" --coverage --verbose
echo.
echo [92m✅ Rapport généré![0m
echo.
if exist "coverage\lcov-report\index.html" (
    echo [93mOuverture du rapport HTML...[0m
    start coverage\lcov-report\index.html
)
timeout /t 2 >nul
goto all

:watch
echo.
echo [93m👀 Mode Watch - Relancer automatiquement à chaque modification...[0m
echo [93mQuel module voulez-vous tester en watch ?[0m
echo   1. users
echo   2. skin-metric
echo   3. admin-service
echo   4. admin-controller
echo   5. metrics-service
echo   6. metrics-controller
echo   7. email-security
echo.
set /p watch_choice="Choix (1-7): "

if "%watch_choice%"=="1" call npm test -- users.service.spec --watch
if "%watch_choice%"=="2" call npm test -- skin-metric.service.spec --watch
if "%watch_choice%"=="3" call npm test -- admin.service.spec --watch
if "%watch_choice%"=="4" call npm test -- admin.controller.spec --watch
if "%watch_choice%"=="5" call npm test -- metrics.service.spec --watch
if "%watch_choice%"=="6" call npm test -- metrics.controller.spec --watch
if "%watch_choice%"=="7" call npm test -- email-security.service.spec --watch

timeout /t 2 >nul
goto all

:coverage
echo.
echo [93m📊 Génération du rapport de couverture...[0m
echo.
call npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)" --coverage --collectCoverageFrom="src/**/*.ts" --coveragePathIgnorePatterns="/node_modules/"
echo.
echo [92m✅ Rapport généré![0m
echo.
if exist "coverage\lcov-report\index.html" (
    echo [93mOuverture du rapport HTML...[0m
    start coverage\lcov-report\index.html
)
timeout /t 2 >nul
goto all

:invalid
echo.
echo [91m❌ Commande inconnue: %COMMAND%[0m
echo.
echo [93mCommandes disponibles:[0m
echo   users              - UsersService tests
echo   skin-metric        - SkinMetricService tests
echo   admin-service      - AdminService tests
echo   admin-controller   - AdminController tests
echo   metrics-service    - MetricsService tests
echo   metrics-controller - MetricsController tests
echo   email-security     - EmailSecurityService tests
echo   all-tests          - Tous les tests
echo   all-coverage       - Tous les tests + couverture
echo   watch              - Mode Watch
echo   coverage           - Voir le rapport
echo.
exit /b 1

:end
echo.
echo [92m✅ Terminé![0m
