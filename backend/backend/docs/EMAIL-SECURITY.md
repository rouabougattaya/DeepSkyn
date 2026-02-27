# Détection d’emails suspects à l’inscription

## Objectifs

- **Détecter les emails temporaires** : domaines connus fournissant des adresses jetables (10minutemail, mailinator, etc.).
- **Détecter les formats suspects** : structure invalide ou atypique (plusieurs `@`, points consécutifs, domaine sans TLD, etc.).

Cela limite les inscriptions avec des adresses jetables ou mal formées, sans bloquer les vrais utilisateurs.

---

## 1. EmailSecurityService

**Fichier** : `email-security/email-security.service.ts`.

### Méthode `isSuspicious(email: string): SuspiciousResult`

- **Entrée** : une chaîne email (sera normalisée en minuscules et trim).
- **Sortie** : `{ suspicious: boolean, reason?: 'disposable' | 'format' }`.
  - `suspicious: false` → email accepté pour l’inscription.
  - `suspicious: true` avec `reason: 'disposable'` → domaine reconnu comme fournisseur d’emails temporaires.
  - `suspicious: true` avec `reason: 'format'` → format suspect (structure, longueur, caractères).

### Détection des emails temporaires

- Une **liste de domaines** connus (emails jetables) est maintenue dans le service (ex. `10minutemail.com`, `mailinator.com`, `guerrillamail.com`, `tempmail.com`, `yopmail.com`, etc.).
- Après extraction du domaine (partie après `@`), on vérifie s’il est dans cette liste.
- Si oui → `{ suspicious: true, reason: 'disposable' }`.

La liste peut être étendue sans changer la logique métier.

### Détection des formats suspects

On considère comme suspect un email qui :

- est vide après normalisation ;
- ne contient pas exactement un `@` (ou en contient plusieurs) ;
- a une partie locale ou domaine vide ;
- dépasse les longueurs usuelles (local > 64, domaine > 253) ;
- commence ou se termine par un point (local ou domaine) ;
- contient des points consécutifs (`..`) ;
- a un domaine sans point (pas de TLD) ou un TLD trop court (< 2 caractères) ;
- contient dans la partie locale des caractères non autorisés (hors lettres, chiffres et caractères courants selon RFC).

Si l’un de ces cas est rencontré → `{ suspicious: true, reason: 'format' }`.

---

## 2. Intégration dans le register

**Fichier** : `auth/auth.service.ts` → méthode `register(dto)`.

1. Normalisation de l’email : `emailNorm = dto.email.toLowerCase().trim()`.
2. Appel **`this.emailSecurityService.isSuspicious(emailNorm)`**.
3. Si `result.suspicious === true` → **`BadRequestException("Cet email n'est pas accepté pour l'inscription.")`**.
4. Sinon, poursuite du flux habituel (vérification doublon, hash mot de passe, création user, session).

Le message d’erreur est **volontairement générique** pour ne pas indiquer à un bot ou un attaquant si le rejet est dû à un email temporaire ou à un format invalide.

---

## 3. Explication sécurité

### Pourquoi bloquer les emails temporaires ?

- Les emails **jetables** permettent de créer des comptes sans engagement et sans traçabilité.
- Ils favorisent le **spam**, les **comptes multiples** (fraude, abus) et les **inscriptions de test** qui encombrent la base.
- En les refusant à l’inscription, on réduit ces usages tout en gardant une expérience normale pour les utilisateurs avec une adresse persistante.

### Pourquoi vérifier le format ?

- Un email **mal formé** peut indiquer une saisie erronée, un bot ou une tentative d’injection.
- Refuser les formats invalides ou très atypiques évite de stocker des données inutiles et limite certains abus (ex. champs démesurément longs, caractères bizarres).

### Bonnes pratiques

- **Message unique** côté API : ne pas distinguer « email temporaire » et « format invalide » dans la réponse pour ne pas aider un attaquant à ajuster ses tentatives.
- **Liste de domaines** : la maintenir à jour (ajouter des domaines jetables connus) selon les besoins ; le service est conçu pour que l’ajout soit simple.
- **Validation métier** : `isSuspicious()` complète la validation technique (ex. `@IsEmail()` dans le DTO) ; elle ne la remplace pas pour la conformité RFC.

---

## 4. Fichiers concernés

| Fichier | Rôle |
|--------|------|
| **email-security/email-security.service.ts** | `isSuspicious()`, liste de domaines temporaires, règles de format. |
| **email-security/email-security.module.ts** | Module global exportant `EmailSecurityService`. |
| **auth/auth.service.ts** | Appel à `isSuspicious()` dans `register()` ; `BadRequestException` si suspect. |
| **app.module.ts** | Import de `EmailSecurityModule`. |

---

## Résumé

*« À l’inscription, on vérifie l’email avec `EmailSecurityService.isSuspicious()` : refus des domaines d’emails temporaires connus et des formats suspects ; en cas de refus, une erreur 400 avec un message générique est renvoyée. »*
