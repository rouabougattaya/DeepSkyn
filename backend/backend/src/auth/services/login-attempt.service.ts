import { Injectable } from '@nestjs/common';

const MAX_ATTEMPTS = 3;
const BLOCK_DURATION_MS = 3 * 60 * 1000; // 3 minutes

interface AttemptRecord {
  count: number;
  blockedUntil: Date | null;
}


@Injectable()
export class LoginAttemptService {
  private readonly attempts = new Map<string, AttemptRecord>();


  isBlocked(email: string): number | null {
    const key = this.normalizeEmail(email);
    const record = this.attempts.get(key);
    if (!record?.blockedUntil) return null;
    if (new Date() < record.blockedUntil) {
      const remainingMs = record.blockedUntil.getTime() - Date.now();
      return Math.ceil(remainingMs / 60_000);
    }
    this.attempts.delete(key);
    return null;
  }


  recordFailure(email: string): void {
    const key = this.normalizeEmail(email);
    const existing = this.attempts.get(key);
    const count = (existing?.count ?? 0) + 1;
    const blockedUntil =
      count >= MAX_ATTEMPTS ? new Date(Date.now() + BLOCK_DURATION_MS) : null;
    this.attempts.set(key, { count, blockedUntil });
  }


  clearAttempts(email: string): void {
    this.attempts.delete(this.normalizeEmail(email));
  }

  /**
   * Retourne le nombre de tentatives restantes avant blocage.
   */
  getRemainingAttempts(email: string): number {
    const key = this.normalizeEmail(email);
    const record = this.attempts.get(key);
    if (!record) return MAX_ATTEMPTS;
    return Math.max(0, MAX_ATTEMPTS - record.count);
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}
