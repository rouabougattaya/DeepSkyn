# Compléments : Autres Fonctionnalités Techniques

Détails sur les outils transversaux du projet.

## 1. Météo et Environnement
- **Frontend** : `frontend/src/services/weatherService.ts`
- **Rôle** : Appelle l'API Open-Meteo.
- **Détail** : Récupère l'indice UV et l'humidité locale pour ajuster les conseils de protection solaire en temps réel.

## 2. Exportation de Données
- **PDF** : Géré dans `SkinAgeInsightCard.tsx` avec la table des scores.
- **Excel** : Exportation de l'historique des métriques pour un suivi médical externe.

## 3. Système de Notifications
- **Backend** : `backend/src/notifications/`
- **Rôle** : Rappels pour la routine du matin et du soir.
- **Frontend** : Alertes visuelles dans le dashboard.

## 4. Administration (Backoffice)
- **Dossier** : `backend/src/admin/`
- **Dashboard Admin** : Permet de modérer les utilisateurs, voir les statistiques globales de paiement et gérer le catalogue de produits.
