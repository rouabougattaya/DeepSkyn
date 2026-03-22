/**
 * Stockage temporaire des données 2FA pendant la vérification du login
 * Utilise une Map en mémoire avec expiration après 5 minutes
 */

interface TempTwoFAData {
  userId: string;
  totpSecret: string;
  createdAt: number;
}

class TempTwoFAStorage {
  private storage = new Map<string, TempTwoFAData>();
  private EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes

  /**
   * Stocke les données temporaires 2FA pour un userId
   */
  set(userId: string, data: { totpSecret: string }): void {
    this.storage.set(userId, {
      userId,
      totpSecret: data.totpSecret,
      createdAt: Date.now(),
    });
  }

  /**
   * Récupère et supprime les données temporaires
   */
  get(userId: string): { totpSecret: string } | null {
    const data = this.storage.get(userId);

    if (!data) {
      return null;
    }

    // Vérifier l'expiration
    if (Date.now() - data.createdAt > this.EXPIRATION_TIME) {
      this.storage.delete(userId);
      return null;
    }

    return { totpSecret: data.totpSecret };
  }

  /**
   * Supprime les données après vérification
   */
  delete(userId: string): void {
    this.storage.delete(userId);
  }

  /**
   * Nettoie les données expirées (utile pour éviter le memory leak)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [userId, data] of this.storage.entries()) {
      if (now - data.createdAt > this.EXPIRATION_TIME) {
        this.storage.delete(userId);
      }
    }
  }
}

// Singleton instance
export const tempTwoFAStorage = new TempTwoFAStorage();

// Nettoyer les données expirées toutes les 10 minutes
setInterval(() => {
  tempTwoFAStorage.cleanup();
}, 10 * 60 * 1000);
