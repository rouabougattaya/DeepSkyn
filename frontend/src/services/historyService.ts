import { getUser } from '@/lib/authSession';

export interface SessionHistory {
  id: string;
  userId: string;
  loginTime: string;
  logoutTime?: string;
  ipAddress: string;
  location: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  device: {
    userAgent: string;
    platform: string;
    browser: string;
  };
  loginMethod: 'email' | 'google' | 'face' | 'fingerprint';
  loginStatus: 'success' | 'failed';
  failureReason?: string;
  riskScore: number;
  used2FA: boolean;
}

export interface UserScore {
  userId: string;
  totalScore: number;
  profileConsistency: number;
  securityScore: number;
  locationConsistency: number;
  deviceConsistency: number;
  lastUpdated: string;
  factors: {
    nameConsistency: number;
    emailConsistency: number;
    twoFAUsage: number;
    failedLogins: number;
    unusualLocations: number;
    newDevices: number;
    bioConsistency: number;
  };
}

export const historyService = {
  // Enregistrer une tentative de login
  async recordLoginAttempt(data: {
    loginMethod: 'email' | 'google' | 'face' | 'fingerprint';
    status: 'success' | 'failed';
    failureReason?: string;
    used2FA: boolean;
    aiScore?: number;
    aiDetails?: any;
  }) {
    try {
      // Récupérer les sessions existantes depuis localStorage
      const sessionsStr = localStorage.getItem('activitySessions');
      const sessions: SessionHistory[] = sessionsStr ? JSON.parse(sessionsStr) : [];

      // Obtenir les infos de device
      const device = this.getDeviceInfo();
      const userId = this.getCurrentUserId();

      // Créer la nouvelle session avec localisation par défaut
      const newSession: SessionHistory = {
        id: Date.now().toString(),
        userId: userId,
        loginTime: new Date().toISOString(),
        ipAddress: '127.0.0.1', // Local par défaut
        location: {
          city: 'Local',
          country: 'France',
          latitude: 48.8566,
          longitude: 2.3522
        },
        device: device,
        loginMethod: data.loginMethod,
        loginStatus: data.status,
        failureReason: data.failureReason,
        riskScore: data.aiScore
          ? Math.round((1 - data.aiScore) * 100) // Convert trust score to risk score
          : this.calculateSimpleRiskScore(data.loginMethod, data.status),
        used2FA: data.used2FA,
      };

      // Ajouter la nouvelle session
      sessions.unshift(newSession);

      // Limiter à 50 sessions maximum
      if (sessions.length > 50) {
        sessions.splice(50);
      }

      // Sauvegarder dans localStorage
      localStorage.setItem('activitySessions', JSON.stringify(sessions));

      // Mettre à jour le score utilisateur avec les données réelles de l'IA
      this.updateUserScoreSimple(data.status, data.used2FA, data.aiScore, data.aiDetails);

      console.log('✅ Session enregistrée', data.aiScore !== undefined ? `avec AI Score: ${data.aiScore}` : '(AI Score non disponible)');
    } catch (error) {
      console.error('❌ Error recording session:', error);
    }
  },

  // Obtenir l'historique des sessions
  async getSessionHistory(limit: number = 50): Promise<SessionHistory[]> {
    try {
      const sessionsStr = localStorage.getItem('activitySessions');
      const sessions: SessionHistory[] = sessionsStr ? JSON.parse(sessionsStr) : [];
      return sessions.slice(0, limit);
    } catch (error) {
      console.error('Error getting session history:', error);
      return [];
    }
  },

  // Vérifier si la 2FA a été utilisée récemment (session actuelle)
  async was2FAUsedRecently(): Promise<boolean> {
    try {
      const sessions = await this.getSessionHistory(1);
      return sessions.length > 0 ? sessions[0].used2FA : false;
    } catch {
      return false;
    }
  },

  // Obtenir le score utilisateur
  async getUserScore(): Promise<UserScore | null> {
    try {
      const scoreStr = localStorage.getItem('userScore');
      return scoreStr ? JSON.parse(scoreStr) : null;
    } catch (error) {
      console.error('Error getting user score:', error);
      return null;
    }
  },

  // Obtenir les infos de device
  getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let platform = 'Unknown';

    // Détection du navigateur
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Détection de la plateforme
    if (userAgent.includes('Windows')) platform = 'Windows';
    else if (userAgent.includes('Mac')) platform = 'macOS';
    else if (userAgent.includes('Linux')) platform = 'Linux';
    else if (userAgent.includes('Android')) platform = 'Android';
    else if (userAgent.includes('iOS')) platform = 'iOS';

    return {
      userAgent,
      platform,
      browser
    };
  },

  // Obtenir l'ID de l'utilisateur actuel
  getCurrentUserId(): string {
    const user = getUser();
    return user?.id || 'anonymous';
  },

  // Calculer un score de risque simple
  calculateSimpleRiskScore(method: string, status: string): number {
    let score = 20; // Score de base

    // Ajuster selon la méthode
    if (method === 'google') score += 10;
    else if (method === 'email') score += 15;
    else if (method === 'face') score += 5;
    else if (method === 'fingerprint') score += 5;

    // Ajuster selon le statut
    if (status === 'failed') score += 30;

    return Math.min(score, 100);
  },

  // Mettre à jour le score utilisateur (version simple)
  updateUserScoreSimple(status: string, used2FA: boolean, aiScore?: number, aiDetails?: any) {
    try {
      const scoreStr = localStorage.getItem('userScore');
      const currentUserId = this.getCurrentUserId();

      let score: UserScore = scoreStr ? JSON.parse(scoreStr) : {
        userId: currentUserId,
        totalScore: 75,
        profileConsistency: 80,
        securityScore: 70,
        locationConsistency: 90,
        deviceConsistency: 85,
        lastUpdated: new Date().toISOString(),
        factors: {
          nameConsistency: 80,
          emailConsistency: 90,
          twoFAUsage: used2FA ? 80 : 20,
          failedLogins: status === 'failed' ? 30 : 10,
          unusualLocations: 5,
          newDevices: 10,
          bioConsistency: 0,
        }
      };

      // Ensure userId matches
      score.userId = currentUserId;

      // Utiliser les scores réels de l'IA s'ils sont fournis
      if (aiScore !== undefined) {
        // Le score global de l'IA impacte directement la cohérence du profil
        score.profileConsistency = Math.round(aiScore * 100);

        if (aiDetails) {
          if (aiDetails.nameConsistency !== undefined) {
            score.factors.nameConsistency = Math.round(aiDetails.nameConsistency * 100);
          }
          if (aiDetails.emailTrust !== undefined) {
            score.factors.emailConsistency = Math.round(aiDetails.emailTrust * 100);
          }
          if (aiDetails.bioStatus !== undefined) {
            score.factors.bioConsistency = Math.round(aiDetails.bioStatus * 100);
          }
        }
      }

      // Mettre à jour les facteurs de sécurité
      // Si la 2FA n'est pas utilisée, le score d'utilisation tombe à 0% immédiatement
      score.factors.twoFAUsage = used2FA ? 100 : 0;

      if (used2FA) {
        score.securityScore = Math.min(100, score.securityScore + 15);
      } else {
        // Pénalité plus forte si la 2FA n'est pas utilisée
        score.securityScore = Math.max(30, score.securityScore - 20);
      }

      if (status === 'failed') {
        score.factors.failedLogins = Math.min(score.factors.failedLogins + 15, 100);
        score.securityScore = Math.max(score.securityScore - 25, 0);
      } else {
        score.factors.failedLogins = Math.max(0, score.factors.failedLogins - 5);
      }

      // Calculer le score total
      score.totalScore = (
        score.profileConsistency * 0.4 +
        score.securityScore * 0.3 +
        score.locationConsistency * 0.15 +
        score.deviceConsistency * 0.15
      );

      score.lastUpdated = new Date().toISOString();

      localStorage.setItem('userScore', JSON.stringify(score));
    } catch (error) {
      console.error('Error updating user score:', error);
    }
  }
};
