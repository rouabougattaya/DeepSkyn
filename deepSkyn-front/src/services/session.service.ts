// frontend/src/services/session.service.ts
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export interface Session {
  id: string;
  fingerprint: {
    browser: string;
    os: string;
    ip: string;
    isMobile: boolean;
  };
  riskLevel: 'low' | 'medium' | 'high';
  riskAnalysis?: {
    score: number;
    warning: string | null;
    anomalies: string[];
    recommendation: 'keep' | 'review' | 'revoke';
  };
  lastActivity: string;
  isCurrent: boolean;
}

export const sessionService = {
  async getSessions(): Promise<Session[]> {
    const token = localStorage.getItem('token');
    console.log('🔍 Token récupéré:', token ? 'Oui' : 'Non');
    
    if (!token) {
      console.error('❌ Aucun token trouvé dans localStorage');
      throw new Error('Non authentifié');
    }
    
    console.log('📡 Envoi requête à:', `${API_URL}/auth/sessions`);
    
    try {
      const response = await axios.get(`${API_URL}/auth/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Réponse reçue:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur détaillée:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      throw error;
    }
  },

  async revokeSession(sessionId: string): Promise<void> {
    const token = localStorage.getItem('token');
    console.log('🔍 Révocation session:', sessionId);
    
    try {
      await axios.delete(`${API_URL}/auth/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Session révoquée avec succès');
    } catch (error) {
      console.error('❌ Erreur révocation session:', error);
      throw error;
    }
  },

  async revokeAllSessions(): Promise<void> {
    const token = localStorage.getItem('token');
    console.log('🔍 Révocation de toutes les sessions');
    
    try {
      await axios.delete(`${API_URL}/auth/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Toutes les sessions révoquées avec succès');
    } catch (error) {
      console.error('❌ Erreur révocation toutes sessions:', error);
      throw error;
    }
  }
};