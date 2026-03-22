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

  private getDefaultAnalysis() {
    return {
      score: 20,
      warning: null,
      anomalies: [],
      recommendation: 'keep'
    };
  }
}