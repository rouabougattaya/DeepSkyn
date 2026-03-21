// backend/src/auth/services/recaptcha.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RecaptchaService {
  private readonly secretKey = process.env.RECAPTCHA_SECRET_KEY;

  async validateToken(token: string): Promise<boolean> {
    if (!token) {
      return false;
    }

    try {
      const response = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: this.secretKey,
            response: token,
          },
        },
      );

      const data = response.data;
      console.log('🔐 reCAPTCHA validation response:', data);
      
      return data.success === true;
    } catch (error) {
      console.error('❌ reCAPTCHA error:', error);
      return false;
    }
  }
}