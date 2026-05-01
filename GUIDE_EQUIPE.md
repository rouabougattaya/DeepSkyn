# 🤝 Guide pour les autres membres de l'équipe

## 📍 Contexte

Mohamed a créé **84 tests unitaires** pour 5 services critiques d'E-Commerce et Paiement.

Chaque membre peut maintenant :
1. **Voir les exemples** pour structurer ses propres tests
2. **Utiliser les mêmes mocks** pour ses services
3. **Vérifier la couverture** avec les mêmes outils

---

## 🛡️ Yathreb - Sécurité (AuthService, JwtTokenService, etc.)

### Utiliser comme base de code
```typescript
// Structure à reproduire pour AuthService
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('AuthService', () => {
  let service: AuthService;
  let mockRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // Ajouter vos tests
});
```

### Cas à tester
- ✅ Login avec bon mot de passe
- ✅ Login avec mauvais mot de passe
- ✅ Accès refusé sans JWT
- ✅ Token expiré
- ✅ 2FA : vérifier OTP correct/incorrect
- ✅ Rate limiting : trop de tentatives

### Commandes
```bash
npm test -- auth.service.spec.ts
npm test -- auth.service.spec.ts --coverage
npm test -- jwt-token.service.spec.ts
npm test -- two-factor.service.spec.ts
```

---

## 🧠 Skander - Intelligence Artificielle (AiAnalysisService, etc.)

### Utiliser comme base de code
Le **RecommendationService** de Mohamed montre comment mocker les appels Python !

```typescript
// Mocker les appels externes (comme Gemini, OpenRouter)
mockExternalServiceRepository.mockResolvedValue({
  confidence: 0.95,
  result: 'prediction...'
});
```

### Cas à tester
- ✅ API Gemini répond correctement
- ✅ API Gemini timeout
- ✅ Image valide acceptée
- ✅ Image invalide rejetée
- ✅ Parsing des résultats correct
- ✅ Gestion des erreurs OpenRouter

### Commandes
```bash
npm test -- ai-analysis.service.spec.ts
npm test -- image-validation.service.spec.ts
npm test -- gemini.service.spec.ts
npm test -- openrouter.service.spec.ts --coverage
```

---

## 🧪 Dina - Routines Cosmétiques (RoutineService, IncompatibilityService, ChatService)

### Utiliser comme base de code
Le **SubscriptionService** montre comment tester les limites !

```typescript
// Tester les logiques de limites/validations
async checkIncompatibility(productIds: string[]): Promise<boolean> {
  // Tester que certains produits ne peuvent pas être mélangés
  expect(await service.checkIncompatibility(['retinol', 'vitaminC']))
    .toBe(true); // Incompatible
}
```

### Cas à tester
- ✅ Compatibilité produits valide
- ✅ Incompatibilité produits (ex: Retinol + Vit C)
- ✅ Créer routine personnalisée
- ✅ Chat message sauvegardé
- ✅ Historique chat récupéré
- ✅ Messages limités par plan

### Commandes
```bash
npm test -- routine.service.spec.ts
npm test -- incompatibility.service.spec.ts
npm test -- chat.service.spec.ts --coverage
```

---

## 👤 Roua - Utilisateurs (UsersService, SkinMetricService, AdminController)

### Utiliser comme base de code
Le **PaymentService** montre comment tester les CRUD complets !

```typescript
// Tester les opérations CRUD
mockUserRepository.findOne.mockResolvedValue(user);
mockUserRepository.save.mockResolvedValue(updatedUser);
```

### Cas à tester
- ✅ Créer utilisateur
- ✅ Mettre à jour profil
- ✅ Récupérer utilisateur
- ✅ Calculer score de peau
- ✅ Admin : récupérer tous les utilisateurs
- ✅ Admin : supprimer utilisateur
- ✅ Email de sécurité envoyé

### Commandes
```bash
npm test -- users.service.spec.ts
npm test -- skin-metric.service.spec.ts
npm test -- admin.controller.spec.ts --coverage
```

---

## 🔄 Flux de travail ensemble

### 1. Chacun teste ses services
```bash
# Yathreb
npm test -- auth/**/*.spec.ts

# Skander
npm test -- ai/**/*.spec.ts

# Dina
npm test -- routine/**/*.spec.ts
npm test -- chat/**/*.spec.ts

# Mohamed (déjà fait ✅)
npm test -- products/**/*.spec.ts
npm test -- payment/**/*.spec.ts

# Roua
npm test -- user/**/*.spec.ts
npm test -- admin/**/*.spec.ts
```

### 2. Voir la couverture globale
```bash
npm test -- --coverage
```

### 3. Reporter les résultats
Après chaque sprint :
```bash
npm test -- --coverage > test-results.txt
```

---

## 📊 Tableau de coordination

| Membre | Services | Fichiers | Cas | Coverage |
|--------|----------|----------|-----|----------|
| Yathreb 🛡️ | Auth, JWT, 2FA | auth/*.spec.ts | 20+ | 85% |
| Skander 🧠 | AI, Image, OpenRouter | ai/*.spec.ts | 25+ | 90% |
| Dina 🧪 | Routine, Incompatibility, Chat | routine/*.spec.ts | 20+ | 88% |
| Mohamed 💳 | Products, Payment, Subscription | payment/*.spec.ts | 84 | 90% ✅ |
| Roua 👤 | Users, Metrics, Admin | user/*.spec.ts | 20+ | 85% |
| **TOTAL** | **15 services** | **50+ fichiers** | **189+ tests** | **80%+** ✅ |

---

## 🎯 Points clés à retenir

### ✨ Mocks standards
- Tous les repositories utilisent le même pattern TypeORM
- Les services externes sont mockés avec `jest.mock()`
- Les Loggers sont supprimés avec `jest.spyOn()`

### ✨ Couverture cible
- **Minimum** : 70% lines/functions/branches
- **Objectif** : 80% pour chaque service
- **Excellent** : 90%+ sur les services critiques

### ✨ Cas d'erreur
- **Happy path** : le cas où tout fonctionne
- **Error cases** : quand ça échoue
- **Edge cases** : limites, limits, null values

### ✨ Commandes utiles à tous
```bash
# Voir un seul service
npm test -- mon-service.spec.ts

# Mode watch pour développement
npm test -- --watch mon-service.spec.ts

# Voir la couverture
npm test -- --coverage mon-service.spec.ts

# Exécuter seul un test
npm test -- mon-service.spec.ts -t "should description"
```

---

## 🚀 Exemple reproductible

Regardez les fichiers de Mohamed :
1. [ProductsService](./backend/src/products/products.service.spec.ts) - Simple avec filtrage
2. [StripeService](./backend/src/payment/stripe.service.spec.ts) - Avec mocks d'API
3. [SubscriptionService](./backend/src/subscription/subscription.service.spec.ts) - Complexe avec logique métier

Reproduire la même structure pour votre service !

---

## 💡 Support

Si vous avez des questions :
1. Regardez les tests de Mohamed pour comprendre le pattern
2. Consultez [TESTS_MOHAMED.md](./TESTS_MOHAMED.md) pour les explications
3. Utilisez [QUICK_COMMANDS.md](./QUICK_COMMANDS.md) pour exécuter rapidement

---

## 🎉 Objectif collectif

Atteindre **80% de couverture globale** du backend avec **tous les services testés** ! 

**Vous avez 189+ tests à faire. Allez-y ! 💪**
