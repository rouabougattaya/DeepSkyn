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
  }> {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const ip = (req.headers['x-forwarded-for'] as string) || 
               req.socket.remoteAddress || 
               '0.0.0.0';

    // Détection basique du navigateur et OS depuis le userAgent
    const browser = this.detectBrowser(userAgent);
    const os = this.detectOS(userAgent);
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    
    const rawFingerprint = `${userAgent}|${acceptLanguage}|${ip}|${browser}|${os}`;
    
    const hash = crypto
      .createHash('sha256')
      .update(rawFingerprint)
      .digest('hex');

    return {
      hash,
      browser,
      os,
      ip: ip.split(',').pop()?.trim() || ip,
      isMobile,
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