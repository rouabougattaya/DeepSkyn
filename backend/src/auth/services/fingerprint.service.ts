// src/auth/services/fingerprint.service.ts
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class FingerprintService {
  async generateFingerprint(req: Request): Promise<{
    hash: string;
    browser: string;
    os: string;
    ip: string;
    isMobile: boolean;
    isTablet: boolean;
  }> {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    
    // ✅ CORRECTION : Récupération correcte de l'IP
    const ip = 
      (req.headers['x-forwarded-for'] as string)?.split(',').shift()?.trim() ||
      req.socket?.remoteAddress ||
      (req as any).ip ||
      'IP non disponible';

    // Détection basique du navigateur et OS depuis le userAgent
    const browser = this.detectBrowser(userAgent);
    const os = this.detectOS(userAgent);
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    const isTablet = /ipad|tablet|(android(?!.*mobile))/i.test(userAgent);
    
    const rawFingerprint = `${userAgent}|${acceptLanguage}|${ip}|${browser}|${os}|${isTablet}`;
    
    const hash = crypto
      .createHash('sha256')
      .update(rawFingerprint)
      .digest('hex');

    return {
      hash,
      browser,
      os,
      ip,
      isMobile,
      isTablet,
    };
  }

  private detectBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  private detectOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Unknown';
  }
}