// src/ai/gemini.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private model: any = null;
  private lastCallTime = 0;
  private readonly MIN_INTERVAL = 60000; // 1 minute entre chaque appel

  onModuleInit() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      this.logger.warn('⚠️ GEMINI_API_KEY non définie - Mode dégradé');
      return;
    }
    
    try {
      // ✅ Utiliser un modèle Gemini 3 (disponibles en février 2026)
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Choix 1: Gemini 3 Flash Preview (recommandé - rapide et économique)
      this.model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
      
      // Choix 2: Gemini 3 Pro Preview (plus puissant)
      // this.model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
      
      // Choix 3: Gemini 2.5 Flash (si le 3 ne marche pas)
      // this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      this.logger.log('✅ GeminiService initialisé avec gemini-3-flash-preview');
    } catch (error) {
      this.logger.error('❌ Erreur initialisation Gemini:', error);
    }
  }

  async analyzeSessionRisk(sessionData: any): Promise<any> {
    // Limiter le taux d'appels
    const now = Date.now();
    if (now - this.lastCallTime < this.MIN_INTERVAL) {
      this.logger.log('⏱️ Trop d\'appels, utilisation du cache');
      return this.getDefaultAnalysis();
    }

    if (!this.model) {
      return this.getDefaultAnalysis();
    }

    try {
      this.lastCallTime = now;
      this.logger.log('📡 Envoi requête à Gemini...');
      
      const prompt = `
        Analyse risque session:
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

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return this.getDefaultAnalysis();
      
    } catch (error: any) {
      this.logger.error('❌ Erreur Gemini:', error.message);
      
      // Si quota dépassé, retourner analyse par défaut
      if (error.status === 429) {
        return {
          score: 30,
          warning: 'Analyse temporairement indisponible (limite API atteinte)',
          anomalies: [],
          recommendation: 'keep'
        };
      }
      
    return this.getDefaultAnalysis();
    }
  }

  async generateContent(prompt: string): Promise<string | null> {
    if (!this.model) return null;
    try {
      this.logger.log('📡 Envoi requête à Gemini...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      this.logger.error('❌ Erreur Gemini generateContent:', error.message);
      return null;
    }
  }

  async classifyActivityRisk(activityData: any): Promise<any> {
    if (!this.model) return null;

    const prompt = `You are a security AI for a SaaS application. Classify the risk level of the following user activity event.

Event Data:
- Type: ${activityData.type}
- IP: ${activityData.ipAddress || 'unknown'}
- Device: ${activityData.deviceInfo || 'unknown'}
- Location: ${JSON.stringify(activityData.location || {})}
- Metadata: ${JSON.stringify(activityData.metadata || {})}
- Timestamp: ${new Date().toISOString()}

Return ONLY a valid JSON object:
{
  "riskLevel": "high | medium | low",
  "explanation": "short explanation in one sentence",
  "recommendedAction": "none | notify | temporary_lock"
}`;

    const text = await this.generateContent(prompt);
    if (!text) return null;

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0].trim());
      }
    } catch (e) {
      this.logger.error('❌ Erreur parsing JSON Gemini activity risk:', e.message);
    }
    return null;
  }

  async generateSmartNotification(data: {
    routine: string;
    skinCondition: string;
    weather: any;
    timeOfDay: string;
  }): Promise<any> {
    if (!this.model) return null;

    const prompt = `You are a smart skincare assistant.
    
Input Data:
- User routine: ${data.routine}
- Skin condition: ${data.skinCondition}
- Weather data: ${JSON.stringify(data.weather)}
- Time of day: ${data.timeOfDay}

Task:
1. Generate a personalized notification message.
2. Adapt message based on skin condition and environment.
3. Keep message short and engaging.
4. Suggest an action for the user based on the inputs.

Return ONLY a valid JSON object in this format:
{
  "title": "short engaging title",
  "message": "the personalized short message",
  "priority": "low" | "medium" | "high" 
}`;

    const text = await this.generateContent(prompt);
    if (!text) return null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         return JSON.parse(jsonMatch[0].trim());
      }
    } catch(e) {
      this.logger.error('❌ Erreur parsing JSON Gemini smart notification:', e.message);
    }
    return {
      title: "Skincare Reminder",
      message: "Time for your skincare routine!",
      priority: "medium"
    };
  }

  private getDefaultAnalysis() {
    return {
      score: 20,
      warning: null,
      anomalies: [],
      recommendation: 'keep'
    };
  }
}