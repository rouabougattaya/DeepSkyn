import { Injectable } from '@nestjs/common';
const otplib = require('otplib');
const QRCode = require('qrcode');

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
    const secret = otplib.generateSecret();

    // Create OTPAuth URL (standard format for authenticators)
    const otpauthUrl = otplib.generateURI({
      secret,
      label: email,
      issuer: appName,
      encoding: 'base32',
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
      // Validate 6-digit code
      const isValid = otplib.verify({
        secret,
        encoding: 'base32',
        token: token.trim(),
        window: 1, // Accept codes from previous and next window (30 seconds)
      });
      return isValid;
    } catch (error) {
      return false;
    }
  }
}
