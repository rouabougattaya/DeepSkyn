#!/usr/bin/env pwsh

# Script d'exécution des tests de Roua
# Usage: .\test-roua.ps1 [command]

param(
    [string]$Command = "all"
)

$ErrorActionPreference = "Stop"

# Couleurs pour l'output
$Green = @{ ForegroundColor = "Green" }
$Red = @{ ForegroundColor = "Red" }
$Yellow = @{ ForegroundColor = "Yellow" }
$Blue = @{ ForegroundColor = "Cyan" }

Write-Host "🧪 TESTS UNITAIRES DE ROUA" @Blue
Write-Host "=" * 50 @Blue
Write-Host ""

# Vérifier qu'on est dans le bon répertoire
if (-Not (Test-Path "package.json")) {
    Write-Host "❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le répertoire 'backend'" @Red
    exit 1
}

Write-Host "✅ Répertoire backend confirmé" @Green
Write-Host ""

# Fonctions de test
function Test-Users {
    Write-Host "📋 Lancement des tests UsersService..." @Yellow
    npm test -- users.service.spec --verbose
}

function Test-SkinMetric {
    Write-Host "📊 Lancement des tests SkinMetricService..." @Yellow
    npm test -- skin-metric.service.spec --verbose
}

function Test-AdminService {
    Write-Host "👤 Lancement des tests AdminService..." @Yellow
    npm test -- admin.service.spec --verbose
}

function Test-AdminController {
    Write-Host "🎮 Lancement des tests AdminController..." @Yellow
    npm test -- admin.controller.spec --verbose
}

function Test-MetricsService {
    Write-Host "📈 Lancement des tests MetricsService..." @Yellow
    npm test -- metrics.service.spec --verbose
}

function Test-MetricsController {
    Write-Host "📊 Lancement des tests MetricsController..." @Yellow
    npm test -- metrics.controller.spec --verbose
}

function Test-EmailSecurity {
    Write-Host "📧 Lancement des tests EmailSecurityService..." @Yellow
    npm test -- email-security.service.spec --verbose
}

function Test-All {
    Write-Host "🚀 Lancement de TOUS les tests de Roua..." @Yellow
    Write-Host ""
    
    $testPattern = "(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
    
    npm test -- --testPathPattern=$testPattern --verbose
}

function Test-AllWithCoverage {
    Write-Host "📊 Lancement de TOUS les tests avec couverture..." @Yellow
    Write-Host ""
    
    $testPattern = "(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
    
    npm test -- --testPathPattern=$testPattern --coverage --verbose
}

function Test-Watch {
    Write-Host "👀 Mode Watch - Relancer automatiquement à chaque modification..." @Yellow
    Write-Host "Quel module voulez-vous tester en watch ?" @Yellow
    Write-Host "1. users"
    Write-Host "2. skin-metric"
    Write-Host "3. admin-service"
    Write-Host "4. admin-controller"
    Write-Host "5. metrics-service"
    Write-Host "6. metrics-controller"
    Write-Host "7. email-security"
    
    $choice = Read-Host "Choix (1-7)"
    
    $modules = @{
        "1" = "users.service.spec"
        "2" = "skin-metric.service.spec"
        "3" = "admin.service.spec"
        "4" = "admin.controller.spec"
        "5" = "metrics.service.spec"
        "6" = "metrics.controller.spec"
        "7" = "email-security.service.spec"
    }
    
    if ($modules.ContainsKey($choice)) {
        npm test -- $modules[$choice] --watch
    }
    else {
        Write-Host "❌ Choix invalide" @Red
    }
}

function Show-Coverage {
    Write-Host "📊 Génération du rapport de couverture..." @Yellow
    
    $testPattern = "(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)"
    
    npm test -- --testPathPattern=$testPattern --coverage --collectCoverageFrom="src/**/*.ts" --coveragePathIgnorePatterns="/node_modules/"
    
    Write-Host ""
    Write-Host "✅ Rapport généré!" @Green
    Write-Host ""
    Write-Host "Ouvrir le rapport HTML :" @Yellow
    Write-Host "start coverage\lcov-report\index.html"
    Write-Host ""
    
    # Ouvrir automatiquement le rapport
    if (Test-Path "coverage\lcov-report\index.html") {
        Start-Process "coverage\lcov-report\index.html"
    }
}

function Show-Menu {
    Write-Host ""
    Write-Host "📋 MENU PRINCIPAL" @Blue
    Write-Host "=" * 50 @Blue
    Write-Host ""
    Write-Host "Modules individuels :" @Yellow
    Write-Host "  1. UsersService (18 tests)"
    Write-Host "  2. SkinMetricService (22 tests)"
    Write-Host "  3. AdminService (26 tests)"
    Write-Host "  4. AdminController (21 tests)"
    Write-Host "  5. MetricsService (37 tests)"
    Write-Host "  6. MetricsController (25 tests)"
    Write-Host "  7. EmailSecurityService (42 tests)"
    Write-Host ""
    Write-Host "Tests groupés :" @Yellow
    Write-Host "  8. TOUS les tests de Roua (140+ tests)"
    Write-Host "  9. TOUS les tests + couverture"
    Write-Host "  a. Mode Watch (auto-relancer)"
    Write-Host "  c. Voir le rapport de couverture"
    Write-Host ""
    Write-Host "  q. Quitter"
    Write-Host ""
}

# Menu interactif si pas de commande
if ($Command -eq "all") {
    while ($true) {
        Show-Menu
        $choice = Read-Host "Sélectionnez une option"
        
        switch ($choice) {
            "1" { Test-Users; Break }
            "2" { Test-SkinMetric; Break }
            "3" { Test-AdminService; Break }
            "4" { Test-AdminController; Break }
            "5" { Test-MetricsService; Break }
            "6" { Test-MetricsController; Break }
            "7" { Test-EmailSecurity; Break }
            "8" { Test-All; Break }
            "9" { Test-AllWithCoverage; Break }
            "a" { Test-Watch; Break }
            "c" { Show-Coverage; Break }
            "q" { Write-Host "👋 Au revoir!" @Green; exit 0 }
            default {
                Write-Host "❌ Option invalide" @Red
                continue
            }
        }
        
        Write-Host ""
        Read-Host "Appuyez sur Entrée pour continuer"
    }
}
else {
    # Exécuter la commande directement
    switch ($Command.ToLower()) {
        "users" { Test-Users }
        "skin-metric" { Test-SkinMetric }
        "admin-service" { Test-AdminService }
        "admin-controller" { Test-AdminController }
        "metrics-service" { Test-MetricsService }
        "metrics-controller" { Test-MetricsController }
        "email-security" { Test-EmailSecurity }
        "all-tests" { Test-All }
        "all-coverage" { Test-AllWithCoverage }
        "watch" { Test-Watch }
        "coverage" { Show-Coverage }
        default {
            Write-Host "❌ Commande inconnue: $Command" @Red
            Write-Host ""
            Write-Host "Commandes disponibles:" @Yellow
            Write-Host "  users              - UsersService tests"
            Write-Host "  skin-metric        - SkinMetricService tests"
            Write-Host "  admin-service      - AdminService tests"
            Write-Host "  admin-controller   - AdminController tests"
            Write-Host "  metrics-service    - MetricsService tests"
            Write-Host "  metrics-controller - MetricsController tests"
            Write-Host "  email-security     - EmailSecurityService tests"
            Write-Host "  all-tests          - Tous les tests"
            Write-Host "  all-coverage       - Tous les tests + couverture"
            Write-Host "  watch              - Mode Watch"
            Write-Host "  coverage           - Voir le rapport"
            exit 1
        }
    }
}

Write-Host ""
Write-Host "✅ Terminé!" @Green
