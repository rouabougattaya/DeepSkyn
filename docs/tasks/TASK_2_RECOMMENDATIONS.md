# Tâche 2 : Système de Recommandations Hybride

Ce module suggère des produits et des routines de soin basés sur l'état de la peau détecté.

## 1. Backend (Moteur de recommandation)

### Service : `RecommendationService`
- **Fichier** : `backend/src/recommendation/recommendation.service.ts`
- **Fonctionnement Bi-mode** :
  1. **Mode Python** : Tente d'exécuter `backend/scripts/recommend.py`. Ce script utilise le dataset `skin_analysis_dataset.csv` pour faire un matching précis.
  2. **Mode Fallback** : Si Python ou les librairies (`pandas`) ne sont pas disponibles, il effectue une requête SQL via TypeORM sur la table `Product` pour trouver des correspondances par type de peau.

### Script de Calcul : `recommend.py`
- **Fichier** : `backend/scripts/recommend.py`
- **Rôle** : Script IA qui calcule la similarité entre le profil utilisateur et les produits du catalogue (SVR, etc.).

### Données Produits
- **Fichiers** : `backend/data/skincare_products_clean.csv` et `svr_products.json`
- **Contenu** : Base de données de référence pour les ingrédients et les compatibilités.

## 2. Frontend (Affichage des recommandations)

### Composant de Liste : `RecommendationList`
- **Fichier** : `frontend/src/components/recommendations/RecommendationList.tsx`
- **Rôle** : Affiche les cartes de produits recommandés.
- **Interaction** : Permet d'ajouter un produit directement à une routine quotidienne.

### Détails du Produit : `ProductDetail`
- **Fichier** : `frontend/src/pages/products/ProductDetailPage.tsx`
- **Logic** : Affiche les ingrédients et pourquoi ce produit est bon pour l'utilisateur (matching score).

---
*Astuce : Le système vérifie les ingrédients potentiellement irritants par rapport au profil de sensibilité de l'utilisateur.*
