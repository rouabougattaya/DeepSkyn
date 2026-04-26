# Architecture Backend - DeepSkyn (Notes d'Analyse)

Voici une analyse technique détaillée de l'architecture backend (NestJS) pour les 5 points clés demandés, basée sur le code source de l'application DeepSkyn :

## 1. Logique de gestion : User vs Admin

La gestion des rôles est classique et robuste, basée sur **TypeORM** et les **Guards NestJS** :

*   **Base de données :** Dans `user.entity.ts`, le rôle est défini par une colonne `@Column({ type: 'enum', enum: ['USER', 'ADMIN'], default: 'USER' })`. Par défaut, toute nouvelle inscription reçoit le rôle `USER`.
*   **Sécurisation des routes :** Vous avez un décorateur personnalisé `@Roles('ADMIN')` et un guard `RolesGuard`. Ce Guard intercepte les requêtes, vérifie si l'utilisateur injecté dans la requête (via JWT) possède bien le rôle exigé. Si un simple `USER` tente d'accéder à l'Admin, une erreur `403 Forbidden` (`ForbiddenException('Insufficient role')`) est levée.
*   **Actions croisées :** Seuls les administrateurs peuvent interagir avec le module `admin.controller.ts`. Ce contrôleur permet à un admin de modifier le rôle d'un autre utilisateur (passer un utilisateur en admin), sauf s'il s'agit de son propre compte pour éviter de se bloquer soi-même.

## 2. Logique métier : Reconnaissance faciale pour Login/Inscription

La reconnaissance faciale utilise une approche basée sur les **embeddings vectoriels (Face Descriptors)** :

*   **Inscription (Registration) :** L'application front-end extrait un vecteur de caractéristiques du visage (un tableau de 128 nombres flottants, le `faceDescriptor`). Le backend le reçoit et le stocke dans le `User` (colonne de type JSON `faceDescriptor`).
*   **Connexion (Login Face) :** 
    1. L'utilisateur envoie son email et son scan en direct (`liveDescriptor`).
    2. Le backend (`loginFace` dans `AuthService`) récupère le profil de l'utilisateur.
    3. Il calcule la **distance euclidienne** entre le vecteur enregistré (`user.faceDescriptor`) et le vecteur en direct (`dto.liveDescriptor`).
    4. **Le seuil de tolérance (Threshold) est de `0.45`**. Si la distance spatiale entre les deux vecteurs est supérieure à `0.45`, l'accès est refusé (`UnauthorizedException('Visage non reconnu.')`). Si elle est inférieure, l'identité est validée et les tokens JWT sont générés.

## 3. Logique métier : "Fingerprint" (Biométrie et Session)

Le terme "Fingerprint" dans le code couvre **deux concepts très différents** :

*   **A - Fingerprint de Session / Appareil (`FingerprintService`) :** Il ne s'agit pas de l'empreinte digitale physique humaine, mais de l'empreinte *numérique* de l'appareil. Le backend combine l'IP, le User-Agent, le navigateur et l'OS, puis les hache en **SHA256**. Cela permet de détecter les connexions suspectes (si un utilisateur se connecte depuis un "fingerprint" d'appareil complètement nouveau, cela impacte le score de risque).
*   **B - Biométrie Physique (WebAuthn / Passkeys) réservée aux Admins :** Pour la vraie empreinte digitale (ou FaceID natif du téléphone/PC), vous utilisez la norme **WebAuthn / FIDO2** (bibliothèque `@simplewebauthn/server`).
    *   **Enregistrement :** L'admin génère un challenge cryptographique et s'inscrit avec la biométrie de son appareil (options `residentKey: 'required'`). Les clés publiques (`webauthnPublicKey`, `webauthnCredentialID`) sont sauvegardées dans la BDD.
    *   **Connexion :** Plus besoin de mot de passe. L'admin résout le challenge cryptographique avec l'empreinte digitale de son appareil, et le backend vérifie la signature vis-à-vis de la clé publique stockée.

## 4. Partie Backend Admin

Le module Admin (`AdminModule`, `AdminController`, `AdminService`) est le centre névralgique pour gérer l'application. Ses capacités :

*   **Dashboard & Statistiques :** La fonction `getStats()` requête la BDD pour obtenir le total des utilisateurs, des comptes premium, et le nombre de comptes sécurisés par 2FA. Elle calcule aussi la tendance d'inscriptions sur les **30 derniers jours** et la répartition par méthode de connexion (Google, Email, etc.).
*   **Gestion des utilisateurs (CRUD) :** L'admin peut lister tous les utilisateurs avec une pagination (`LIMIT` / `OFFSET`) et des recherches avancées via TypeORM (recherche `ILike` sur email, nom, prénom).
*   **Sécurité Admin :** Contrairement aux utilisateurs normaux, seul un admin peut invoquer la méthode `createUser` en lui forçant un rôle (pour créer de futurs collègues admins) et seul un admin peut bannir/supprimer (`removeUser`) quelqu'un.

## 5. Logique et Modèles pour la Reconnaissance des Peaux (AI / Skin Metrics)

Le processus d'analyse AI s'effectue en **deux étapes (Validation locale + Analyse cloud avancée)** :

### Étape 1 : Filtre Anti-Déchet (Local via Xenova/Transformers.js)
Avant d'utiliser de l'API payante, votre backend fait tourner un modèle d'Intelligence Artificielle localement (`ImageValidationService`).
*   **Le modèle :** `Xenova/clip-vit-base-patch32` (Zero-shot classification).
*   **Le fonctionnement :** Le backend prend la base64, la transforme en buffer, et la compare à plusieurs descriptions (ex: *"a close-up human face"*, *"a landscape"*, *"a computer"*).
*   **Condition :** Si le modèle n'est pas certain (score de confiance `< 0.45`) que l'image est un visage ou de la peau humaine, la requête est rejetée instantanément. S'il s'agit du paysage ou d'un objet, l'analyse n'aura pas lieu.

### Étape 2 : L'Analyse Dermatologique Profonde (Cloud via OpenRouter / Gemini)
L'image HD et les données de l'utilisateur sont ensuite envoyées au service `OpenRouterService`.
*   **Le modèle choisi :** `google/gemini-2.0-flash-001` (Modèle Google très efficace combinant vision et agilité textuelle).
*   **La logique du Prompt :** Le prompt système donne au modèle le rôle de *"dermatologue de classe mondiale"*. Une logique de pondération est codée en dur : **Les évaluations subjectives de l'utilisateur pèsent pour ~70% du rapport, l'analyse visuelle stricte par l'IA pèse pour ~30%**.
*   **Détection du Skin :** Le prompt inclut une *seconde barrière de sécurité* (au cas où le filtre local ait raté). Si Gemini reçoit l'image et juge fermement qu'il n'y a pas de visage (ex: une photo de dessin), il a pour consigne stricte de renvoyer une erreur JSON : `{"error": "NOT_A_FACE"}`.
*   **Les métriques (Les Piliers) :** Le modèle doit noter de 0 à 100 près de 9 critères stricts : Acné, Pores, Cicatrices, Rougeurs, Points noirs, Taches, Comédons, Hydratation, Rides. Des règles d'expertise forcées sont injectées dans le prompt (ex: "S'il a la peau grasse, les pores et points noirs doivent être mathématiquement scorés plus hauts", ou "L'hydratation est inversement corrélée aux rides").
*   **Le petit plus technique :** Un compte "Free" recevra des scores bruts, tandis qu'un compte "Premium" (`plan === 'PREMIUM'`) débloque le champ `expertInsights` contenant un rapport détaillé généré que l'IA ne génère pas pour les versions gratuites.
