import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UserSkinProfile, GlobalScoreResult } from './detection.interface';

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
        Tu es un expert dermatologue de classe mondiale travaillant pour l'application de pointe DeepSkyn.
        Ta mission est de réaliser une analyse de peau ultra-précise et professionnelle basée sur le profil utilisateur ${profile.imageBase64 ? "et l'IMAGE haute définition fournie." : "."}
        
        PROFIL UTILISATEUR :
        - Type de peau : ${profile.skinType}
        - Âge : ${profile.age} ans
        - Genre : ${profile.gender}
        - Préoccupations majeures : ${profile.concerns.length > 0 ? profile.concerns.join(', ') : "Général"}
        - Auto-évaluation :
            * Acné : ${profile.acneLevel ?? 'N/A'}/100
            * Points noirs : ${profile.blackheadsLevel ?? 'N/A'}/100
            * Pores : ${profile.poreSize ?? 'N/A'}/100
            * Rougeurs : ${profile.rednessLevel ?? 'N/A'}/100
            * Déshydratation : ${profile.hydrationLevel ?? 'N/A'}/100
            * Sensibilité : ${profile.sensitivityLevel ?? 'N/A'}/100
            * Rides : ${profile.wrinklesDepth ?? 'N/A'}/100

        INSTRUCTIONS d'ANALYSE :
        Évalue les 9 conditions suivantes sur une échelle de 0 à 100 (100 = Excellent, 0 = Sévère) :
        1. Acne (Acné) - Éruptions et inflammation
        2. Enlarged-Pores (Pores dilatés) - Pores visibles
        3. Atrophic Scars (Cicatrices atrophiques) - Dépression cutanée
        4. Skin Redness (Rougeurs) - Érythème et irritation
        5. Blackheads (Points noirs) - Comédons ouverts
        6. Dark-Spots (Taches pigmentaires) - Hyperpigmentation
        7. black_dots (Micro-comédons) - Mini-imperfections
        8. Hydration (Hydratation) - Niveau d'humidité cutanée (IMPORTANT: 0= très sec, 100=bien hydraté)
        9. Wrinkles (Rides) - Profondeur des rides/ridules (IMPORTANT: 0=nombreuses rides profondes, 100=peau lisse)

        RÈGLES D'EXPERTISE :
        - La cohérence est CRITIQUE. Un type "${profile.skinType}" doit influencer les scores logiquement (ex: Oily -> Pores et Blackheads élevés, Hydration peut être basse).
        - L'âge (${profile.age}) doit influencer l'interprétation (ex: Jeune = moins de rides; Âgé = plus d'attention à Hydration et Wrinkles).
        ${profile.imageBase64 ? "- ANALYSE VISUELLE : Examine méticuleusement l'image. Tes yeux d'expert doivent primer sur les déclarations si une contradiction est visible." : "- ANALYSE STATISTIQUE : Basée sur les corrélations dermatologiques du profil fourni."}
        - PONDÉRATION USER-INPUT : L'auto-évaluation utilisateur (acneLevel, hydrationLevel, wrinklesDepth, etc.) doit FORTEMENT influencer les scores correspondants (~70% du calcul), plus 30% pour l'analyse visuelle.
        - COHÉRENCE: Hydration doit être INVERSEMENT corrélé avec Wrinkles (peau sèche = plus de rides).

        FORMAT DE RÉPONSE (JSON UNIQUEMENT) :
        {
          "globalScore": [0-100],
          "conditionScores": [
            { "type": "Acne", "score": [0-100], "count": [estimé], "severity": [0.0-1.0] },
            { "type": "Enlarged-Pores", "score": [0-100], "count": [estimé], "severity": [0.0-1.0] },
            { "type": "Atrophic Scars", "score": [0-100], "count": [estimé], "severity": [0.0-1.0] },
            { "type": "Skin Redness", "score": [0-100], "count": [estimé], "severity": [0.0-1.0] },
            { "type": "Blackheads", "score": [0-100], "count": [estimé], "severity": [0.0-1.0] },
            { "type": "Dark-Spots", "score": [0-100], "count": [estimé], "severity": [0.0-1.0] },
            { "type": "black_dots", "score": [0-100], "count": [estimé], "severity": [0.0-1.0] },
            { "type": "Hydration", "score": [0-100], "severity": [0.0-1.0] },
            { "type": "Wrinkles", "score": [0-100], "severity": [0.0-1.0] }
          ],
          "totalDetections": [total estimé],
          "analysis": {
            "bestCondition": "[Type]",
            "worstCondition": "[Type]",
            "dominantCondition": "[Type]",
            "expertInsights": ${plan === 'PREMIUM' ? "\"Analyse détaillée niveau dermatologue exclusive au plan Premium (2-3 paragraphes d'expertise technique)\"" : "null"}
          }
        }
      `;

            const content: any[] = [{ type: 'text', text: prompt }];

            if (profile.imageBase64) {
                // Retirer le préfixe data:image/...;base64, si présent
                const base64Data = profile.imageBase64.includes('base64,')
                    ? profile.imageBase64.split('base64,')[1]
                    : profile.imageBase64;

                content.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:image/jpeg;base64,${base64Data}`
                    }
                });
            }

            console.log(`[OpenRouterService] Calling model: ${model} with content text length: ${content[0].text.length}`);

            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model: model,
                    messages: [{ role: 'user', content: content }],
                    response_format: { type: 'json_object' }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': 'https://deepskyn.app', // Obligatoire pour OpenRouter
                        'X-Title': 'DeepSkyn AI',
                    }
                }
            ).catch(err => {
                const detailedError = err.response?.data?.error?.message || err.response?.data || err.message;
                console.error('[OpenRouterService] Axios POST failed:', detailedError);
                throw new Error(`OpenRouter API error: ${detailedError}`);
            });

            console.log('[OpenRouterService] Response status:', response.status);

            const text = response.data.choices[0].message.content;
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]) as GlobalScoreResult;
            }

            throw new Error('Failed to parse OpenRouter response');

        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            this.logger.error('❌ Erreur OpenRouter:', errorMsg);
            throw new Error(`OpenRouter Analysis failed: ${errorMsg}`);
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

    private getDefaultSessionAnalysis() {
        return {
            score: 20,
            warning: null,
            anomalies: [],
            recommendation: 'keep'
        };
    }
}
