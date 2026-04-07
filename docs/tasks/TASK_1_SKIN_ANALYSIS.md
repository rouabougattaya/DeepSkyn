# Tâche 1 : Calcul des Métriques (Scoring Engine)

Ce module se concentre sur la logique pure de calcul des scores de santé de la peau à partir des données brutes.

## 1. Backend (Moteur de Calcul)

### Service de Scoring : `ScoringService`
- **Fichier** : [backend/src/scoring.service.ts](backend/src/scoring.service.ts)
- **Rôle** : C'est le cœur algorithmique qui transforme les mesures brutes en scores lisibles.
- **Logique de calcul interne** :
  - **Normalisation** : Convertit les valeurs disparates (ex: taux de sébum, niveau d'hydratation) en une échelle commune de 0 à 100.
  - **Pondération** : Applique des coefficients (weights) définis dans `weights.dto.ts` pour donner plus d'importance à certaines métriques (ex: l'inflammation a un impact plus fort sur le score "Santé" que la simple brillance).
  - **Calcul Global** : Agrège les sous-scores pour générer le "Global Skin Health Score".

### Validation des Données : `WeightsDto`
- **Fichier** : [backend/src/weights.dto.ts](backend/src/weights.dto.ts)
- **Rôle** : Définit la structure des poids utilisés pour les calculs. Il assure que le moteur de calcul reçoit des paramètres valides (ex: les poids doivent être positifs).

## 2. Structure de Données (Base)

### Entité Métrique : `SkinMetric`
- **Fichier** : [backend/src/skinMetric/skinMetric.entity.ts](backend/src/skinMetric/skinMetric.entity.ts)
- **Rôle** : Stocke chaque mesure individuelle (hydratation, sébum, rougeur) avec sa valeur numérique et son unité.

## 3. Frontend (Affichage Technique)

### Composant Graphique : `MetricsCharts`
- **Fichier** : [frontend/src/components/metrics/MetricsCharts.tsx](frontend/src/components/metrics/MetricsCharts.tsx)
- **Rôle** : Reçoit les scores calculés par le backend et les affiche sous forme de graphiques temporels (Recharts).

