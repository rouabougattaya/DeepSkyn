import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UserSkinProfile, GlobalScoreResult } from './detection.interface';

type RefinedRecommendation = {
    name: string;
    type: string;
    price?: number;
    url?: string;
    reason: string;
};

type RoutineStepResult = {
    stepName: string;
    productName: string;
    instruction: string;
    reason: string;
};

type RoutinePlanResult = {
    morning: RoutineStepResult[];
    night: RoutineStepResult[];
};

@Injectable()
export class OpenRouterService {
    private readonly logger = new Logger(OpenRouterService.name);
    private readonly apiKey: string;
    private readonly baseUrl = 'https://openrouter.ai/api/v1';

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY') || '';
        if (!this.apiKey) {
            this.logger.warn('⚠️ OPENROUTER_API_KEY non définie - Mode dégradé');
        }
    }

    /**
     * Analyse de peau via OpenRouter (The Unified Interface for LLMs)
     */
    async analyzeSkin(profile: UserSkinProfile, plan: string = 'FREE'): Promise<GlobalScoreResult> {
        if (!this.apiKey) {
            this.logger.error('❌ OPENROUTER_API_KEY manquante');
            throw new Error('AI analysis unavailable - Missing API Key');
        }

        try {
            this.logger.log(`📡 Appel OpenRouter pour: ${profile.skinType}, ${profile.age} ans`);

            // On utilise gemini-2.0-flash-lite par défaut via OpenRouter
            // On utilise gemini-2.0-flash-001 pour un compromis idéal vitesse/intelligence
            const model = 'google/gemini-2.0-flash-001';

            const prompt = `
                Tu es un expert dermatologue de classe mondiale. Tu vas réaliser une analyse pour DeepSkyn en DEUX ÉTAPES SÉPARÉES ET CLAIRES.

                ═══════════════════════════════════════════════════════════════════
                ÉTAPE 1 : ANALYSE VISUELLE PURE (CE QUE TU VOIS DANS L'IMAGE UNIQUEMENT)
                ═══════════════════════════════════════════════════════════════════

                Examine TRÈS ATTENTIVEMENT ${profile.imagesBase64?.length ? `les ${profile.imagesBase64.length} images fourni(e)s` : "l'image fournie"}.

                Pour CHAQUE condition possible, réponds UNIQUEMENT à cette question :
                "EST-CE VISIBLE DIRECTEMENT DANS L'IMAGE ?"

                Détecte ET NOTE visuellement :
                - Acné : boutons, pustules, papules visibles
                - Points noirs : comédons ouverts clairement visibles
                - Rides : ridules et rides marquées visibles
                - Rougeurs : zones rouges, érythème visible
                - Taches pigmentaires : zones sombres, hyperpigmentation
                - Cicatrices : dépression visible de la peau
                - Pores dilatés : pores visiblement ouverts
                - Texture : rugosité, sécheresse visible
                - Hydratation : brillance/luminosité, desquamation visible

                RÈGLE ABSOLUE : Si une condition n'est PAS clairement visible dans l'image, marque-la comme NON ÉVALUÉE. N'invente JAMAIS.

                ═══════════════════════════════════════════════════════════════════
                ÉTAPE 2 : FUSION AVEC LE PROFIL UTILISATEUR
                ═══════════════════════════════════════════════════════════════════

                Le profil de l'utilisateur :
                - Type de peau : ${profile.skinType}
                - Âge : ${profile.age} ans
                - Préoccupations sélectionnées : ${profile.concerns?.length ? profile.concerns.join(', ') : 'Aucune'}
                - Auto-évaluations : acne=${profile.acneLevel ?? 'non donné'}/100, points noirs=${profile.blackheadsLevel ?? 'non donné'}/100, rides=${profile.wrinklesDepth ?? 'non donné'}/100, rougeurs=${profile.rednessLevel ?? 'non donné'}/100, pores=${profile.poreSize ?? 'non donné'}/100, hydratation=${profile.hydrationLevel ?? 'non donné'}/100, sensibilité=${profile.sensitivityLevel ?? 'non donné'}/100

                RÈGLE CRITIQUE :
                - Tu dois COMBINER (visuel image + déclaration formulaire)
                - SEULEMENT les conditions qui sont (A) visibles dans l'image OU (B) sélectionnées par l'utilisateur
                - Une condition n'apparaît QUE si elle satisfait au moins UN des deux critères
                - JAMAIS d'analyse pour une condition ni vue ni mentionnée

                Explique la note :
                - Si visible + mentionnée : note basée sur la sévérité visuelle + auto-évaluation
                - Si visible MAIS non mentionnée : note basée sur le visuel (l'utilisateur a oublié)
                - Si mentionnée MAIS non visible : note basée sur la déclaration (peut être léger ou caché)
                - Si ni visible NI mentionnée : EXCLURE complètement, marquer NON ÉVALUÉE

                ═══════════════════════════════════════════════════════════════════
                DÉTAILS IMPORTANTS
                ═══════════════════════════════════════════════════════════════════

                - Type de peau influence la cohérence : Oily -> attendre pores/points noirs élevés | Dry -> attendre hydration basse
                - Âge ${profile.age} : ${profile.age < 25 ? 'peut avoir acné, ridules légères' : profile.age < 45 ? 'équilibre acne/rides/taches' : 'rides/taches probables, hydration clé'}
                - Hydration et Wrinkles INVERSEMENT corrélés : peau sèche = plus de rides
                - PONDÉRATION : Auto-évaluation ~60%, visuel ~40% (quand les deux existent)

                FORMAT DE RÉPONSE (JSON UNIQUEMENT) :

                ÉTAPE 0 : VÉRIFICATION DU VISAGE
                Si l'image fournie NE CONTIENT PAS un visage humain clairement identifiable (ex: photo d'un ordinateur, d'un paysage, d'un objet, d'un animal), tu DOIS refuser l'analyse et retourner EXACTEMENT ce JSON:
                {
                    "error": "NOT_A_FACE",
                    "message": "Veuillez fournir une photo d'un visage humain valide."
                }

                ÉTAPE 3 : RETOUR STRICTEMENT EN JSON
                {
                    "globalScore": [0-100],
                    "conditionScores": [
                        { "type": "Acne", "evaluated": true|false, "score": [0-100 ou null], "count": [estimé ou 0], "severity": [0.0-1.0 ou null], "notEvaluatedReason": "ni visible ni mentionné" ou null },
                        { "type": "Enlarged-Pores", "evaluated": true|false, "score": [0-100 ou null], "count": [estimé ou 0], "severity": [0.0-1.0 ou null], "notEvaluatedReason": "ni visible ni mentionné" ou null },
                        { "type": "Atrophic Scars", "evaluated": true|false, "score": [0-100 ou null], "count": [estimé ou 0], "severity": [0.0-1.0 ou null], "notEvaluatedReason": "ni visible ni mentionné" ou null },
                        { "type": "Skin Redness", "evaluated": true|false, "score": [0-100 ou null], "count": [estimé ou 0], "severity": [0.0-1.0 ou null], "notEvaluatedReason": "ni visible ni mentionné" ou null },
                        { "type": "Blackheads", "evaluated": true|false, "score": [0-100 ou null], "count": [estimé ou 0], "severity": [0.0-1.0 ou null], "notEvaluatedReason": "ni visible ni mentionné" ou null },
                        { "type": "Dark-Spots", "evaluated": true|false, "score": [0-100 ou null], "count": [estimé ou 0], "severity": [0.0-1.0 ou null], "notEvaluatedReason": "ni visible ni mentionné" ou null },
                        { "type": "black_dots", "evaluated": true|false, "score": [0-100 ou null], "count": [estimé ou 0], "severity": [0.0-1.0 ou null], "notEvaluatedReason": "ni visible ni mentionné" ou null },
                        { "type": "Hydration", "evaluated": true|false, "score": [0-100 ou null], "count": [estimé ou 0], "severity": [0.0-1.0 ou null], "notEvaluatedReason": "ni visible ni mentionné" ou null },
                        { "type": "Wrinkles", "evaluated": true|false, "score": [0-100 ou null], "count": [estimé ou 0], "severity": [0.0-1.0 ou null], "notEvaluatedReason": "ni visible ni mentionné" ou null }
                    ],
                    "totalDetections": [total estimé],
                    "analysis": {
                        "bestCondition": "[Type]",
                        "worstCondition": "[Type]",
                        "dominantCondition": "[Type]",
                        "expertInsights": ${plan === 'PREMIUM' ? "\"Analyse détaillée niveau dermatologue exclusive au plan Premium (2-3 paragraphes d'expertise technique)\"" : 'null'}
                    }
                }

                INTERDICTIONS ABSOLUES :
                - Pas de score "50" par défaut
                - Pas d'invention de problème
                - Pas d'analyse pour une condition non visible ET non mentionnée
                - Si incertitude, marquer evaluated=false plutôt que de forcer une note
            `;

            const content: any[] = [{ type: 'text', text: prompt }];

            // Add all images to the content
            const images = profile.imagesBase64 || (profile.imageBase64 ? [profile.imageBase64] : []);

            for (const imgBase64 of images) {
                const base64Data = imgBase64.includes('base64,')
                    ? imgBase64.split('base64,')[1]
                    : imgBase64;

                content.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:image/jpeg;base64,${base64Data}`
                    }
                });
            }

            console.log(`[OpenRouterService] Calling model: ${model} with content text length: ${content[0].text.length} | Images: ${images.length}`);

            let response;
            try {
                response = await axios.post(
                    `${this.baseUrl}/chat/completions`,
                    {
                        model: model,
                        messages: [{ role: 'user', content: content }],
                        response_format: { type: 'json_object' },
                        max_tokens: 1000 // Réduit de 2000 à 1000 pour éviter l'erreur 402 (crédits insuffisants)
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'HTTP-Referer': 'https://deepskyn.app', // Obligatoire pour OpenRouter
                            'X-Title': 'DeepSkyn AI',
                        },
                        timeout: 120000 // 2 minutes timeout
                    }
                );
            } catch (axiosErr: any) {
                const statusCode = axiosErr.response?.status;
                const errorData = axiosErr.response?.data;
                const errorMessage = errorData?.error?.message || errorData?.error || axiosErr.message;

                console.error(`[OpenRouterService] API Error (${statusCode}):`, errorMessage);
                console.error('[OpenRouterService] Full error response:', JSON.stringify(errorData, null, 2));

                // Provide helpful diagnostic message
                if (statusCode === 401) {
                    throw new Error('OpenRouter authentification failed - Check OPENROUTER_API_KEY');
                } else if (statusCode === 429) {
                    throw new Error('OpenRouter rate limit exceeded - Please try again later');
                } else if (statusCode === 400) {
                    throw new Error(`OpenRouter bad request: ${errorMessage}`);
                } else if (statusCode === 503) {
                    throw new Error('OpenRouter service temporarily unavailable');
                }

                throw new Error(`OpenRouter API error (${statusCode}): ${errorMessage}`);
            }

            console.log('[OpenRouterService] Response status:', response.status);

            if (!response.data?.choices?.[0]?.message?.content) {
                console.error('[OpenRouterService] Unexpected response structure:', JSON.stringify(response.data, null, 2));
                throw new Error('OpenRouter returned invalid response structure');
            }

            const text = response.data.choices[0].message.content;
            console.log('[OpenRouterService] Response content length:', text.length);

            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.error === 'NOT_A_FACE') {
                    throw new Error('NOT_A_FACE');
                }
                return parsed as GlobalScoreResult;
            }

            console.error('[OpenRouterService] No JSON found in response:', text.substring(0, 500));
            throw new Error('Failed to parse OpenRouter response - No JSON found');

        } catch (error: any) {
            const errorMsg = error.message || String(error);
            this.logger.error('❌ Erreur OpenRouter:', errorMsg);
            throw error; // Re-throw with original error for better details
        }
    }

    /**
     * Analyse du risque de session via OpenRouter
     */
    async analyzeSessionRisk(sessionData: any): Promise<any> {
        if (!this.apiKey) {
            return this.getDefaultSessionAnalysis();
        }

        try {
            const model = 'google/gemini-2.0-flash-lite-preview-02-05:free';
            const prompt = `
        Analyse de risque de sécurité pour une session utilisateur:
        - Browser: ${sessionData.fingerprint?.browser || 'Inconnu'}
        - OS: ${sessionData.fingerprint?.os || 'Inconnu'}
        - IP: ${sessionData.fingerprint?.ip || 'Inconnue'}
        - Mobile: ${sessionData.fingerprint?.isMobile ? 'Oui' : 'Non'}
        
        Retourne UNIQUEMENT un objet JSON: {
          "score": 0-100,
          "warning": "message ou null",
          "anomalies": [],
          "recommendation": "keep"
        }
      `;

            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': 'https://deepskyn.app',
                    }
                }
            );

            const text = response.data.choices[0].message.content;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return this.getDefaultSessionAnalysis();

        } catch (error: any) {
            this.logger.error('❌ Erreur OpenRouter Risk:', error.message);
            return this.getDefaultSessionAnalysis();
        }
    }

    async estimateSkinAge(profile: UserSkinProfile): Promise<{ skinAge: number; rationale: string }> {
        if (!this.apiKey) {
            throw new Error('AI analysis unavailable - Missing API Key');
        }

        const model = 'google/gemini-2.0-flash-001';
        const prompt = `
Tu es un dermatologue expert. Calcule un skinAge PRÉCIS à partir des images et du formulaire.

Données profil:
- Age réel: ${profile.age}
- Type de peau: ${profile.skinType}
- Genre: ${profile.gender}
- Préoccupations: ${profile.concerns?.join(', ') || 'N/A'}
- Auto-évaluation: acne=${profile.acneLevel ?? 'N/A'}, blackheads=${profile.blackheadsLevel ?? 'N/A'}, pores=${profile.poreSize ?? 'N/A'}, redness=${profile.rednessLevel ?? 'N/A'}, hydration=${profile.hydrationLevel ?? 'N/A'}, sensitivity=${profile.sensitivityLevel ?? 'N/A'}, wrinkles=${profile.wrinklesDepth ?? 'N/A'}

Consignes strictes:
- Analyse visuellement: rides, taches, relâchement, éclat, texture.
- Croise avec le formulaire et justifie le résultat.
- Interdit d'inventer: si les infos sont faibles, reste prudent et mentionne l'incertitude.

Retourne UNIQUEMENT ce JSON:
{
  "skinAge": number,
  "rationale": "explication concise et factuelle"
}
`;

        const content: any[] = [{ type: 'text', text: prompt }];
        const images = profile.imagesBase64 || (profile.imageBase64 ? [profile.imageBase64] : []);
        for (const imgBase64 of images) {
            const base64Data = imgBase64.includes('base64,') ? imgBase64.split('base64,')[1] : imgBase64;
            content.push({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Data}` },
            });
        }

        const parsed = await this.callJsonModel(model, [{ role: 'user', content }]);
        return {
            skinAge: Number(parsed?.skinAge),
            rationale: typeof parsed?.rationale === 'string' ? parsed.rationale : 'Skin age generated from image and form context.',
        };
    }

    async refineProductRecommendations(input: {
        baseRecommendations: Array<any>;
        analysisResult: any;
        profile: UserSkinProfile;
    }): Promise<{ recommendations: RefinedRecommendation[]; explanation?: string }> {
        if (!this.apiKey) {
            return { recommendations: (input.baseRecommendations || []).map((p: any) => ({ ...p, reason: 'Recommandation issue du modèle primaire.' })) };
        }

        const model = 'google/gemini-2.0-flash-001';
        const prompt = `
Tu dois AFFINER des recommandations skincare.

Problèmes détectés image + formulaire:
${JSON.stringify(input.analysisResult, null, 2)}

Produits suggérés par le modèle actuel:
${JSON.stringify(input.baseRecommendations, null, 2)}

Consignes strictes:
- Corrige et affine pour être EXACTEMENT aligné avec les problèmes réellement détectés.
- Conserve uniquement des produits cohérents avec la liste d'origine (pas d'invention de nouvelles références hors liste).
- Produis des recommandations variées.
- Chaque produit DOIT avoir une raison claire, reliée aux problèmes détectés.

Retourne UNIQUEMENT ce JSON:
{
  "explanation": "résumé",
  "recommendations": [
    {
      "name": "...",
      "type": "...",
      "price": 0,
      "url": "...",
      "reason": "justification précise"
    }
  ]
}
`;

        const parsed = await this.callJsonModel(model, [{ role: 'user', content: prompt }]);
        const recs = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
        return {
            recommendations: recs,
            explanation: typeof parsed?.explanation === 'string' ? parsed.explanation : undefined,
        };
    }

    async generateRoutineFromRecommendations(input: {
        recommendations: Array<any>;
        analysisResult: any;
    }): Promise<RoutinePlanResult | null> {
        if (!this.apiKey) {
            return null;
        }

        const model = 'google/gemini-2.0-flash-001';
        const prompt = `
Génère une routine AM/PM EXCLUSIVEMENT à partir des produits autorisés.

Produits autorisés (uniquement ceux-ci):
${JSON.stringify(input.recommendations, null, 2)}

Analyse complète:
${JSON.stringify(input.analysisResult, null, 2)}

Règles strictes:
- Interdit d'ajouter un produit absent de la liste.
- Chaque étape doit inclure le nom exact du produit.
- Explique comment et pourquoi l'utiliser à ce moment (AM ou PM), lié aux problèmes détectés.
- Ordre d'application logique.

Retourne UNIQUEMENT ce JSON:
{
  "morning": [
    { "stepName": "Cleanser", "productName": "Nom exact", "instruction": "...", "reason": "..." }
  ],
  "night": [
    { "stepName": "Cleanser", "productName": "Nom exact", "instruction": "...", "reason": "..." }
  ]
}
`;

        const parsed = await this.callJsonModel(model, [{ role: 'user', content: prompt }]);
        if (!parsed || !Array.isArray(parsed.morning) || !Array.isArray(parsed.night)) {
            return null;
        }

        return {
            morning: parsed.morning,
            night: parsed.night,
        };
    }

    private async callJsonModel(model: string, messages: any[]): Promise<any> {
        const response = await axios.post(
            `${this.baseUrl}/chat/completions`,
            {
                model,
                messages,
                response_format: { type: 'json_object' },
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': 'https://deepskyn.app',
                    'X-Title': 'DeepSkyn AI',
                },
            },
        );

        const text = response.data?.choices?.[0]?.message?.content;
        if (typeof text !== 'string') {
            return {};
        }

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    }

    /**
     * Chatbot response via OpenRouter
     */
    async chat(message: string, systemPrompt?: string, plan: string = 'FREE'): Promise<string> {
        if (!this.apiKey) {
            return "Je suis désolé, le service d'IA est actuellement indisponible.";
        }

        try {
            const model = 'google/gemini-2.0-flash-001';
            const messages: any[] = [];

            if (systemPrompt) {
                let enhancedPrompt = systemPrompt;
                if (plan === 'PREMIUM') {
                    enhancedPrompt += " [USER PREMIUM] : Fournis des réponses extrêmement détaillées, expertes et utilise un ton médical précis. Ne limite pas la longueur de tes explications.";
                }
                messages.push({ role: 'system', content: enhancedPrompt });
            }

            messages.push({ role: 'user', content: message });

            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': 'https://deepskyn.app',
                        'X-Title': 'DeepSkyn Chat',
                    }
                }
            );

            return response.data.choices[0].message.content || "Désolé, je n'ai pas pu générer de réponse.";

        } catch (error: any) {
            this.logger.error('❌ Erreur OpenRouter Chat:', error.message);
            return "Une erreur est survenue lors de la communication avec l'IA.";
        }
    }

    /**
     * Generate personalized SVR product recommendations + AM/PM routine via LLM
     */
    async generateSVRRoutine(products: any[], profile: any): Promise<any> {
        if (!this.apiKey) {
            throw new Error('AI analysis unavailable - Missing API Key');
        }

        const model = 'google/gemini-2.0-flash-001';

        const productList = products.map(p =>
            `- [${p.category.toUpperCase()}] "${p.name}" | Texture: ${p.texture || 'N/A'} | Score: ${p.score ?? 'N/A'}/10 | Ingredients: ${p.ingredients.join(', ')} | Price: €${p.price} | URL: ${p.url} | Image: ${p.imageUrl || ''} | Description: ${p.description} | Suits: ${p.suitableSkinTypes.join(', ')} | Concerns: ${p.suitableConcerns.join(', ')}`
        ).join('\n');

        const concernsSummary = [
            profile.concerns?.length ? `Concerns: ${profile.concerns.join(', ')}` : '',
            profile.acneLevel > 50 ? `Acne level: ${profile.acneLevel}/100` : '',
            profile.blackheadsLevel > 50 ? `Blackheads: ${profile.blackheadsLevel}/100` : '',
            profile.poreSize > 50 ? `Visible pores: ${profile.poreSize}/100` : '',
            profile.wrinklesDepth > 50 ? `Wrinkles/aging: ${profile.wrinklesDepth}/100` : '',
            (profile.hydrationLevel ?? 100) < 50 ? `Dehydrated skin: ${profile.hydrationLevel}/100` : '',
            profile.rednessLevel > 50 ? `Redness: ${profile.rednessLevel}/100` : '',
            profile.sensitivityLevel > 60 ? `High sensitivity: ${profile.sensitivityLevel}/100` : '',
        ].filter(Boolean).join(' | ');

        const prompt = `
You are a certified SVR skincare specialist and expert dermatologist with 20 years of experience.
Your task is TWO-FOLD:
1) Recommend the BEST SVR products for this user from the catalog below (varied, multi-product per category)
2) Build a daily AM/PM routine using those products

USER PROFILE:
- Skin Type: ${profile.skinType}
- Age: ${profile.age}
- Gender: ${profile.gender || 'Not specified'}
- ${concernsSummary || 'No specific concerns mentioned'}

AVAILABLE SVR PRODUCTS (use ONLY these — never invent names):
${productList}

STRICT RULES FOR RECOMMENDATIONS (recommendedProducts array):
- Select 5 to 8 products total across VARIED categories
- Include at minimum: 1 cleanser, 1 serum, 1 moisturizer, 1 sunscreen
- If multiple products of the same category are relevant, include up to 2 per category
- Rank by skin-type suitability AND concern match
- Each product MUST have a personalized reason why it fits THIS specific user
- Add a short skinBenefit (max 5 words)
- score: 0-10 relevance score for this user's profile

STRICT RULES FOR ROUTINE:
- Morning: cleanser → toner (if relevant) → serum → eye cream (if age 40+) → moisturizer → sunscreen
- Night: cleanser → serum → moisturizer (NO sunscreen at night)
- Instructions must be personalized to this user's skin type
- Reason: explain why this product is best for this person's specific situation

Return ONLY valid JSON in EXACTLY this format:
{
  "skinProfile": "1-sentence profile description",
  "generalAdvice": "2-3 sentences of personalized dermatological advice and timeline",
  "recommendedProducts": [
    {
      "name": "exact product name from catalog",
      "category": "cleanser|serum|moisturizer|sunscreen|toner|exfoliant|mask|eye-cream|treatment",
      "description": "product description",
      "price": 12.50,
      "url": "https://...",
      "imageUrl": "https://...",
      "keyIngredients": ["ing1", "ing2", "ing3"],
      "reason": "personalized reason why this product suits this specific user's skin profile",
      "skinBenefit": "short benefit claim",
      "texture": "gel|crème|sérum|etc",
      "score": 9.2
    }
  ],
  "morning": [
    {
      "stepOrder": 1,
      "stepName": "Nettoyage",
      "product": {
        "name": "exact product name",
        "category": "cleanser",
        "description": "product description",
        "price": 12.50,
        "url": "https://...",
        "imageUrl": "https://..." ,
        "keyIngredients": ["ing1", "ing2"]
      },
      "instruction": "specific application instruction personalized for this user",
      "reason": "why THIS product suits this exact skin type and concerns"
    }
  ],
  "night": [
    ...same format, NO sunscreen step...
  ]
}
`;

        try {
            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    temperature: 0.35,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': 'https://deepskyn.app',
                        'X-Title': 'DeepSkyn SVR Routine',
                    },
                }
            );

            const text = response.data?.choices?.[0]?.message?.content;
            if (typeof text !== 'string') throw new Error('No content from LLM');

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Failed to parse SVR routine JSON');

            const parsed = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(parsed.morning) || !Array.isArray(parsed.night)) {
                throw new Error('Invalid SVR routine structure');
            }
            if (!Array.isArray(parsed.recommendedProducts)) {
                parsed.recommendedProducts = [];
            }

            // === ENHANCEMENT: Enrich with imageUrl from products catalog ===
            const enrichImageUrl = (product: any, catalogProducts: any[]) => {
                if (!product || !product.name) return product;

                const productName = product.name.trim();

                // Find matching product in catalog
                let match = catalogProducts.find(p =>
                    p.name.trim().toLowerCase() === productName.toLowerCase()
                );

                // If no exact match, try partial match
                if (!match) {
                    match = catalogProducts.find(p =>
                        productName.toLowerCase().includes(p.name.trim().toLowerCase()) ||
                        p.name.trim().toLowerCase().includes(productName.toLowerCase())
                    );
                }

                // Add imageUrl from catalog if found
                if (match?.imageUrl) {
                    product.imageUrl = match.imageUrl;
                }

                return product;
            };

            // Enrich all products with imageUrl from the original products array
            parsed.recommendedProducts = parsed.recommendedProducts.map((p: any) =>
                enrichImageUrl(p, products)
            );

            parsed.morning = (parsed.morning || []).map((step: any) => ({
                ...step,
                product: enrichImageUrl(step.product, products)
            }));

            parsed.night = (parsed.night || []).map((step: any) => ({
                ...step,
                product: enrichImageUrl(step.product, products)
            }));

            this.logger.log(`✅ SVR routine: ${parsed.recommendedProducts?.length} products recommended with ${parsed.recommendedProducts.filter((p: any) => p.imageUrl).length} images`);
            return parsed;

        } catch (error: any) {
            this.logger.error('❌ SVR routine generation failed:', error.message);
            throw error;
        }
    }

    private getDefaultSessionAnalysis() {
        return {
            score: 20,
            warning: null,
            anomalies: [],
            recommendation: 'keep'
        };
    }

    /**
     * Predict future skin state using Digital Twin simulation
     */
    async predictFutureSkinState(context: string): Promise<any> {
        if (!this.apiKey) {
            this.logger.error('❌ OPENROUTER_API_KEY manquante');
            return {};
        }

        try {
            this.logger.log('📡 Appel OpenRouter pour Digital Twin prediction');

            const model = 'google/gemini-2.0-flash-001';

            const systemPrompt = `Tu es un dermatologue expert spécialisé en prédictions de l'évolution cutanée.
Basé sur l'état actuel de la peau, la routine de soins et les facteurs de style de vie, 
tu dois prédire l'état de la peau à 1, 3 et 6 mois.

Fournis des prédictions RÉALISTES et SCIENTIFIQUEMENT FONDÉES.
Chaque prédiction doit inclure:
- Score de peau amélio (0-100)
- Âge cutané prévisible
- État de chaque métrique (hydration, oil, acne, wrinkles)
- Améliorations attendues (liste spécifique)
- Dégradations possibles (si routine non respectée)
- Résumé concis`;

            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: context }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': 'https://deepskyn.app',
                    }
                }
            );

            const text = response.data.choices[0].message.content;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return {};

        } catch (error: any) {
            this.logger.error('❌ Erreur OpenRouter Digital Twin:', error.message);
            return {};
        }
    }
}
