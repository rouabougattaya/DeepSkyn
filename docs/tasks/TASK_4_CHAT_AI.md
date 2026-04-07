# Tâche 4 : Système de Messagerie (Base Chat)

Structure fondamentale pour l'envoi et la réception de messages avant l'intégration de l'IA.

## 1. Backend (Infrastructure de Messagerie)

### Contrôleur de Chat : `ChatController`
- **Fichier** : [backend/src/chat/chat.controller.ts](backend/src/chat/chat.controller.ts)
- **Rôle** : Gère les points d'entrée (endpoints) pour la communication.
- **Action Principale** : `POST /chat/message` - Reçoit le contenu textuel de l'utilisateur.

### Service de Base : `ChatService`
- **Fichier** : [backend/src/chat/chat.service.ts](backend/src/chat/chat.service.ts)
- **Rôle** : Gère la persistance et le flux des messages.
- **Logique de Messaging** :
  - **Validation** : Vérifie que le message n'est pas vide.
  - **Sauvegarde** : Enregistre le message dans la base de données (table `ChatMessage`).
  - **Récupération** : Permet de charger l'historique complet d'une conversation pour un utilisateur donné.

## 2. Frontend (Interface Graphique Simple)

### Fenêtre de Chat : `ChatWindow`
- **Fichier** : [frontend/src/components/chat/ChatWindow.tsx](frontend/src/components/chat/ChatWindow.tsx)
- **Composant de saisie** : `MessageInput` (Input + Bouton Envoyer).
- **Logique d'envoi** :
  - Capturer l'événement "Click" ou "Enter".
  - Envoyer le texte au backend via `axios.post`.
  - Mettre à jour localement l'interface pour afficher la bulle de message "en attente" ou "confirmée".

---
*Note : Cette documentation se limite au système de transport des messages (Messaging System). Les couches d'intelligence (IA), de personnalisation et les intégrations API externes sont traitées comme des extensions.*

