# Tâche 2 : Système de Recommandations SVR & Pipeline de Données

Ce module gère l'acquisition des produits SVR et leur recommandation intelligente basée sur l'analyse cutanée.

## 1. Acquisition des Données (Scrapping & Import)

### Pipeline SVR (Scrapping simulé/JSON)
- *Source* : Les données proviennent initialement d'un processus de scrapping ciblant le site officiel SVR (ex: tn.svr.com).
- *Stockage Intermédiaire* : Les résultats sont consolidés dans [backend/data/svr_products.json](backend/data/svr_products.json).
- *Script d'Importation* : [backend/src/import_svr_json.js](backend/src/import_svr_json.js)
  - *Nettoyage* : Supprime les produits génériques existants (DELETE FROM products).
  - *Catégorisation Intelligente* : Analyse le nom et la description pour assigner dynamiquement un type (Serum, Cleanser, Sunscreen, etc.).
  - *Mapping des Problématiques* : Extrait les target_concerns (RIDES, ACNÉ, SÉCHERESSE) pour les lier aux besoins de l'utilisateur.

## 2. Moteur de Recommandation SVR

### Logique de Matching : RecommendationService
- *Fichier* : [backend/src/recommendation/recommendation.service.ts](backend/src/recommendation/recommendation.service.ts)
- *Processus de Sélection* :
  1. *Analyse du Profil* : Récupère les scores de l'utilisateur (ex: Forte Acné, Faible Hydratation).
  2. *Requête Ciblée* : Recherche dans la table products les éléments SVR dont les target_issues correspondent aux problèmes détectés.
  3. *Classement (Ranking)* : Priorise les produits dont le type correspond à l'étape manquante de la routine utilisateur (ex: si l'utilisateur n'a pas de nettoyant, le système suggère le PHYSIOPURE Lait Démaquillant).

## 3. Frontend (Expérience SVR)

### Panneau de Routine SVR : SvrRoutinePanel
- *Fichier* : [frontend/src/components/analysis/SvrRoutinePanel.tsx](frontend/src/components/analysis/SvrRoutinePanel.tsx)
- *Rôle* : Affiche une routine complète 100% SVR personnalisée après l'analyse.
- *Détails* : Chaque carte de produit affiche l'image officielle SVR scrapée, le prix indicatif et un lien direct vers le site marchand de la marque.