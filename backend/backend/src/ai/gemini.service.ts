// backend/src/ai/gemini.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

onModuleInit() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    this.logger.warn('⚠️ GEMINI_API_KEY non définie - Mode dégradé (sans analyse IA)');
    return;
  }
  
  try {
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // ✅ Utiliser un modèle disponible (février 2026)
    // Gemini 3.1 Pro Preview est le modèle le plus récent
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });
    
    this.logger.log('✅ GeminiService initialisé avec succès (modèle: gemini-3.1-pro-preview)');
  } catch (error) {
    this.logger.error('❌ Erreur initialisation Gemini:', error);
  }
}

  async analyzeSessionRisk(sessionData: any): Promise<{
    score: number;
    anomalies: string[];
    warning: string | null;
    recommendation: 'keep' | 'review' | 'revoke';
  }> {
    // Si pas de modèle Gemini, retourner une analyse par défaut
    if (!this.model) {
      return {
        score: 10,
        anomalies: [],
        warning: 'Analyse IA désactivée (clé API manquante)',
        recommendation: 'keep',
      };
    }

    const prompt = `
      Analyse cette session utilisateur pour détecter des comportements suspects:

      Contexte de connexion:
      - User ID: ${sessionData.userId || 'Inconnu'}
      - Heure de connexion: ${sessionData.createdAt || 'Inconnue'}
      
      Informations device:
      - Navigateur: ${sessionData.fingerprint?.browser || 'Inconnu'}
      - OS: ${sessionData.fingerprint?.os || 'Inconnu'}
      - Type: ${sessionData.fingerprint?.isMobile ? 'Mobile' : 'Desktop'}
      - IP: ${sessionData.fingerprint?.ip || 'Inconnue'}

      Retourne UNIQUEMENT un objet JSON avec:
      {
        "score": 0-100,
        "anomalies": [],
        "warning": "message ou null",
        "recommendation": "keep" ou "review" ou "revoke"
      }
    `;

    try {
      this.logger.log('📡 Envoi requête à Gemini...');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      this.logger.log('📝 Réponse reçue:', text.substring(0, 100) + '...');
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        score: 20,
        anomalies: [],
        warning: null,
        recommendation: 'keep',
      };
    } catch (error) {
      this.logger.error('❌ Erreur Gemini:', error);
      return {
        score: 10,
        anomalies: [],
        warning: 'Erreur lors de l\'analyse IA',
        recommendation: 'keep',
      };
    }
  }
}