#!/bin/bash

# Script d'exécution des tests de Roua (Linux/Mac)
# Usage: ./test-roua.sh [command]

COMMAND="${1:-all}"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 TESTS UNITAIRES DE ROUA${NC}"
echo -e "${BLUE}===================================================${NC}"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le répertoire 'backend'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Répertoire backend confirmé${NC}"
echo ""

# Fonctions de test
test_users() {
    echo -e "${YELLOW}📋 Lancement des tests UsersService...${NC}"
    npm test -- users.service.spec --verbose
}

test_skin_metric() {
    echo -e "${YELLOW}📊 Lancement des tests SkinMetricService...${NC}"
    npm test -- skin-metric.service.spec --verbose
}

test_admin_service() {
    echo -e "${YELLOW}👤 Lancement des tests AdminService...${NC}"
    npm test -- admin.service.spec --verbose
}

test_admin_controller() {
    echo -e "${YELLOW}🎮 Lancement des tests AdminController...${NC}"
    npm test -- admin.controller.spec --verbose
}

test_metrics_service() {
    echo -e "${YELLOW}📈 Lancement des tests MetricsService...${NC}"
    npm test -- metrics.service.spec --verbose
}

test_metrics_controller() {
    echo -e "${YELLOW}📊 Lancement des tests MetricsController...${NC}"
    npm test -- metrics.controller.spec --verbose
}

test_email_security() {
    echo -e "${YELLOW}📧 Lancement des tests EmailSecurityService...${NC}"
    npm test -- email-security.service.spec --verbose
}

test_all() {
    echo -e "${YELLOW}🚀 Lancement de TOUS les tests de Roua...${NC}"
    echo ""
    
    npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)" --verbose
}

test_all_coverage() {
    echo -e "${YELLOW}📊 Lancement de TOUS les tests avec couverture...${NC}"
    echo ""
    
    npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)" --coverage --verbose
}

show_coverage() {
    echo -e "${YELLOW}📊 Génération du rapport de couverture...${NC}"
    
    npm test -- --testPathPattern="(users.service|skin-metric.service|admin.service|admin.controller|metrics.service|metrics.controller|email-security.service)" --coverage --collectCoverageFrom="src/**/*.ts" --coveragePathIgnorePatterns="/node_modules/"
    
    echo ""
    echo -e "${GREEN}✅ Rapport généré!${NC}"
    echo ""
    echo -e "${YELLOW}Ouvrir le rapport HTML :${NC}"
    echo "open coverage/lcov-report/index.html  # Mac"
    echo "xdg-open coverage/lcov-report/index.html  # Linux"
    echo ""
    
    # Ouvrir automatiquement si disponible
    if command -v xdg-open &> /dev/null; then
        xdg-open coverage/lcov-report/index.html
    elif command -v open &> /dev/null; then
        open coverage/lcov-report/index.html
    fi
}

test_watch() {
    echo -e "${YELLOW}👀 Mode Watch - Relancer automatiquement à chaque modification...${NC}"
    echo -e "${YELLOW}Quel module voulez-vous tester en watch ?${NC}"
    echo "1. users"
    echo "2. skin-metric"
    echo "3. admin-service"
    echo "4. admin-controller"
    echo "5. metrics-service"
    echo "6. metrics-controller"
    echo "7. email-security"
    echo ""
    read -p "Choix (1-7): " choice
    
    case $choice in
        1) npm test -- users.service.spec --watch ;;
        2) npm test -- skin-metric.service.spec --watch ;;
        3) npm test -- admin.service.spec --watch ;;
        4) npm test -- admin.controller.spec --watch ;;
        5) npm test -- metrics.service.spec --watch ;;
        6) npm test -- metrics.controller.spec --watch ;;
        7) npm test -- email-security.service.spec --watch ;;
        *) echo -e "${RED}❌ Choix invalide${NC}" ;;
    esac
}

show_menu() {
    echo ""
    echo -e "${BLUE}📋 MENU PRINCIPAL${NC}"
    echo -e "${BLUE}===================================================${NC}"
    echo ""
    echo -e "${YELLOW}Modules individuels :${NC}"
    echo "  1. UsersService (18 tests)"
    echo "  2. SkinMetricService (22 tests)"
    echo "  3. AdminService (26 tests)"
    echo "  4. AdminController (21 tests)"
    echo "  5. MetricsService (37 tests)"
    echo "  6. MetricsController (25 tests)"
    echo "  7. EmailSecurityService (42 tests)"
    echo ""
    echo -e "${YELLOW}Tests groupés :${NC}"
    echo "  8. TOUS les tests de Roua (140+ tests)"
    echo "  9. TOUS les tests + couverture"
    echo "  a. Mode Watch (auto-relancer)"
    echo "  c. Voir le rapport de couverture"
    echo ""
    echo "  q. Quitter"
    echo ""
}

# Menu interactif si pas de commande
if [ "$COMMAND" == "all" ]; then
    while true; do
        show_menu
        read -p "Sélectionnez une option: " choice
        
        case $choice in
            1) test_users; break ;;
            2) test_skin_metric; break ;;
            3) test_admin_service; break ;;
            4) test_admin_controller; break ;;
            5) test_metrics_service; break ;;
            6) test_metrics_controller; break ;;
            7) test_email_security; break ;;
            8) test_all; break ;;
            9) test_all_coverage; break ;;
            a) test_watch; break ;;
            c) show_coverage; break ;;
            q) echo -e "${GREEN}👋 Au revoir!${NC}"; exit 0 ;;
            *) echo -e "${RED}❌ Option invalide${NC}" ;;
        esac
        
        echo ""
        read -p "Appuyez sur Entrée pour continuer"
    done
else
    # Exécuter la commande directement
    case ${COMMAND,,} in
        users) test_users ;;
        skin-metric) test_skin_metric ;;
        admin-service) test_admin_service ;;
        admin-controller) test_admin_controller ;;
        metrics-service) test_metrics_service ;;
        metrics-controller) test_metrics_controller ;;
        email-security) test_email_security ;;
        all-tests) test_all ;;
        all-coverage) test_all_coverage ;;
        watch) test_watch ;;
        coverage) show_coverage ;;
        *)
            echo -e "${RED}❌ Commande inconnue: $COMMAND${NC}"
            echo ""
            echo -e "${YELLOW}Commandes disponibles:${NC}"
            echo "  users              - UsersService tests"
            echo "  skin-metric        - SkinMetricService tests"
            echo "  admin-service      - AdminService tests"
            echo "  admin-controller   - AdminController tests"
            echo "  metrics-service    - MetricsService tests"
            echo "  metrics-controller - MetricsController tests"
            echo "  email-security     - EmailSecurityService tests"
            echo "  all-tests          - Tous les tests"
            echo "  all-coverage       - Tous les tests + couverture"
            echo "  watch              - Mode Watch"
            echo "  coverage           - Voir le rapport"
            exit 1
            ;;
    esac
fi

echo ""
echo -e "${GREEN}✅ Terminé!${NC}"
