# Documentation — Dev 4: Historical Insights Generator

Ce document récapitule le travail effectué pour le module de génération d'insights historiques.

## Objectif
L'objectif était de fournir à l'utilisateur des analyses automatiques (rule-based) basées sur son historique de scores de peau, ainsi qu'une visualisation graphique de son évolution.

## Fichiers Affectés

### Backend
1.  **[insights.service.ts](file:///c:/Users/yathr/Downloads/DeepSkyn-comparaison/DeepSkyn-comparaison/backend/src/insights/insights.service.ts)** [NEW] : Contient la logique de détection (stagnation, amélioration, fluctuations).
2.  **[insights.module.ts](file:///c:/Users/yathr/Downloads/DeepSkyn-comparaison/DeepSkyn-comparaison/backend/src/insights/insights.module.ts)** [NEW] : Module NestJS pour le service d'insights.
3.  **[analysis.controller.ts](file:///c:/Users/yathr/Downloads/DeepSkyn-comparaison/DeepSkyn-comparaison/backend/src/analysis.controller.ts)** [MODIFY] : Ajout de l'endpoint `GET /analysis/insights`.
4.  **[app.module.ts](file:///c:/Users/yathr/Downloads/DeepSkyn-comparaison/DeepSkyn-comparaison/backend/src/app.module.ts)** [MODIFY] : Importation du module d'insights.

### Frontend
1.  **[analysisService.ts](file:///c:/Users/yathr/Downloads/DeepSkyn-comparaison/DeepSkyn-comparaison/frontend/src/services/analysisService.ts)** [MODIFY] : Ajout de l'appel API pour les insights.
2.  **[authService-simple.ts](file:///c:/Users/yathr/Downloads/DeepSkyn-comparaison/DeepSkyn-comparaison/frontend/src/services/authService-simple.ts)** [MODIFY] : Ajout de `getUserAnalyses` pour récupérer l'historique brut.
3.  **[realApi.ts](file:///c:/Users/yathr/Downloads/DeepSkyn-comparaison/DeepSkyn-comparaison/frontend/src/services/realApi.ts)** [MODIFY] : Ajout de méthodes `get` et `post` génériques.
4.  **[InsightCard.tsx](file:///c:/Users/yathr/Downloads/DeepSkyn-comparaison/DeepSkyn-comparaison/frontend/src/components/insights/InsightCard.tsx)** [NEW] : Composant d'affichage des insights.
5.  **[TimelineView.tsx](file:///c:/Users/yathr/Downloads/DeepSkyn-comparaison/DeepSkyn-comparaison/frontend/src/components/insights/TimelineView.tsx)** [NEW] : Graphique d'évolution des scores (Recharts).
6.  **[AlertSection.tsx](file:///c:/Users/yathr/Downloads/DeepSkyn-comparaison/DeepSkyn-comparaison/frontend/src/components/insights/AlertSection.tsx)** [NEW] : Section dédiée aux alertes critiques.
7.  **[DashboardPage.tsx](file:///c:/Users/yathr/Downloads/DeepSkyn-comparaison/DeepSkyn-comparaison/frontend/src/pages/DashboardPage.tsx)** [MODIFY] : Intégration des nouveaux composants dans le tableau de bord.

## Logique de Détection
- **Stagnation** : Détectée si la variance des 3 derniers scores est inférieure à 2.
- **Amélioration continue** : Détectée si les 3 derniers scores sont strictement croissants.
- **Fluctuations anormales** : Détectée si la différence entre les deux dernières analyses est supérieure à 15 points.

## Installation des dépendances
Les bibliothèques suivantes ont été ajoutées au frontend :
- `recharts` : Pour les graphiques.
- `react-icons` : Pour les icônes des insights.
