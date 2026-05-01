#!/bin/bash

# 🎯 Script de test pour Mohamed - E-Commerce & Paiement

echo "============================================"
echo "📊 Tests Unitaires - Suite E-Commerce"
echo "============================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Vérifier si npm est installé
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm n'est pas installé. Veuillez installer Node.js.${NC}"
  exit 1
fi

# Aller au dossier backend
cd "$(dirname "$0")/backend" || exit 1

echo -e "${BLUE}✓ Répertoire : $(pwd)${NC}"
echo ""

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
  npm install --legacy-peer-deps
  echo ""
fi

# Menu d'options
echo -e "${BLUE}Choisissez le type de test :${NC}"
echo "1. Tous les tests (recommandé pour la CI/CD)"
echo "2. ProductsService uniquement"
echo "3. RecommendationService uniquement"
echo "4. StripeService uniquement"
echo "5. PaymentService uniquement"
echo "6. SubscriptionService uniquement"
echo "7. Tous les tests avec couverture de code"
echo "8. Mode watch (surveillance en temps réel)"
echo ""
read -p "Entrez votre choix (1-8) : " choice

case $choice in
  1)
    echo -e "${BLUE}🚀 Exécution de tous les tests...${NC}"
    npm test -- products.service.spec.ts recommendation.service.spec.ts stripe.service.spec.ts payment.service.spec.ts subscription.service.spec.ts
    ;;
  2)
    echo -e "${BLUE}🚀 Test ProductsService (Filtrage & Pagination)...${NC}"
    npm test -- products.service.spec.ts
    ;;
  3)
    echo -e "${BLUE}🚀 Test RecommendationService (IA & Moteur)...${NC}"
    npm test -- recommendation.service.spec.ts
    ;;
  4)
    echo -e "${BLUE}🚀 Test StripeService (Paiement Stripe)...${NC}"
    npm test -- stripe.service.spec.ts
    ;;
  5)
    echo -e "${BLUE}🚀 Test PaymentService (Gestion des paiements)...${NC}"
    npm test -- payment.service.spec.ts
    ;;
  6)
    echo -e "${BLUE}🚀 Test SubscriptionService (Limites & Plans)...${NC}"
    npm test -- subscription.service.spec.ts
    ;;
  7)
    echo -e "${BLUE}🚀 Tous les tests avec rapport de couverture...${NC}"
    npm test -- --coverage products.service.spec.ts recommendation.service.spec.ts stripe.service.spec.ts payment.service.spec.ts subscription.service.spec.ts
    echo -e "${GREEN}📊 Rapport disponible dans : coverage/index.html${NC}"
    ;;
  8)
    echo -e "${BLUE}🚀 Mode watch activé (appuyez sur Q pour quitter)...${NC}"
    npm test -- --watch products.service.spec.ts recommendation.service.spec.ts stripe.service.spec.ts payment.service.spec.ts subscription.service.spec.ts
    ;;
  *)
    echo -e "${RED}❌ Choix invalide.${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}✅ Exécution des tests terminée !${NC}"
