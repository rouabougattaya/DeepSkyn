# Tâche 3 : Paiements et Abonnements (Stripe)

Gestion de la monétisation, des niveaux d'accès (FREE, PRO, PREMIUM) et des transactions sécurisées.

## 1. Backend (Sécurité et Webhooks)

### Contrôleur de Paiement : `PaymentController`
- **Fichier** : `backend/src/payment/payment.controller.ts`
- **Endpoints** :
  - `create-checkout-session` : Initialise une session de paiement Stripe.
  - `webhook` : Reçoit les notifications de Stripe pour valider l'abonnement une fois le paiement réussi.

### Service d'Abonnement : `SubscriptionService`
- **Fichier** : `backend/src/subscription/subscription.service.ts`
- **Rôle** : Met à jour le statut de l'utilisateur dans la base de données (`FREE` -> `PRO`).
- **Scripts utilitaires** :
  - `fix_paid_subscription.js` : Permet de corriger manuellement un statut.
  - `simulate_complete_payment.js` : Outil de test pour simuler un retour Stripe.

## 2. Frontend (Parcours d'achat)

### Page de Tarification : `UpgradePage`
- **Fichier** : `frontend/src/pages/UpgradePage.tsx`
- **Contenu** : Présente les avantages des comptes PRO (analyses illimitées, conseils IA avancés).
- **Action** : Redirige l'utilisateur vers la page de paiement sécurisée de Stripe.

### Gestion du Succès : `PaymentSuccess`
- **Fichier** : `frontend/src/pages/PaymentSuccess.tsx`
- **Rôle** : Reçoit l'utilisateur après le paiement, vérifie la session et affiche un message de confirmation avant de débloquer les fonctionnalités.

---
*Note : Le système gère les remboursements et les annulations via le portail client Stripe.*
