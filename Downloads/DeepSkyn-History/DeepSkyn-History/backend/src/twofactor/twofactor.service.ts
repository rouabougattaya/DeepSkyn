import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';

export interface TwoFASetupDto {
  secret: string;
  qrCode: string;
}

@Injectable()
export class TwoFactorService {
  /**
   * Generates a TOTP secret and QR Code for 2FA authentication
   */
  async generateSecret(email: string, appName: string = 'DeepSkyn'): Promise<TwoFASetupDto> {
    // Generate a random secret
    const secret = generateSecret();

    // Create OTPAuth URL (standard format for authenticators)
    const otpauthUrl = generateURI({
      issuer: appName,
      label: email,
      secret: secret,
    });

    // Generate QR Code as base64
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      qrCode,
    };
  }

  /**
   * Verifies a TOTP code
   */
  verifyToken(secret: string, token: string): boolean {
    try {
      if (!secret || !token) return false;

      // Validate 6-digit code using the functional verifySync
      const result = verifySync({
        token: token.trim(),
        secret: secret,
      });

      return result.valid;
    } catch (error) {
      console.error('2FA Verification Error:', error);
      return false;
    }
  }
}
