import { Injectable } from '@nestjs/common';

/** Domaines d'emails temporaires / jetables (liste non exhaustive) */
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'mailinator.com',
  'mailinator.net',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'throwaway.email',
  'getnada.com',
  'yopmail.com',
  'fakeinbox.com',
  'trashmail.com',
  'mailnesia.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'spam4.me',
  'dispostable.com',
  'maildrop.cc',
  'tmpmail.org',
  'mohmal.com',
  'emailondeck.com',
  'mintemail.com',
  '33mail.com',
  'inboxkitten.com',
  'tempinbox.com',
  'anonymousemail.me',
  'guerrillamail.com',
  'tempmail.org',
]);

export interface SuspiciousResult {
  suspicious: boolean;
  reason?: 'disposable' | 'format';
}

/**
 * Détection simple d'emails suspects à l'inscription :
 * - emails temporaires / jetables (domaines connus)
 * - formats suspects (structure invalide ou atypique)
 */
@Injectable()
export class EmailSecurityService {
  /**
   * Indique si l'email est suspect (temporaire ou format suspect).
   * À appeler avant de créer un compte (ex. dans register).
   */
  isSuspicious(email: string): SuspiciousResult {
    const normalized = email.toLowerCase().trim();
    if (!normalized) {
      return { suspicious: true, reason: 'format' };
    }

    if (this.hasSuspiciousFormat(normalized)) {
      return { suspicious: true, reason: 'format' };
    }

    if (this.isDisposableDomain(normalized)) {
      return { suspicious: true, reason: 'disposable' };
    }

    return { suspicious: false };
  }

  /** Vérifie si le domaine est un fournisseur d'emails temporaires connu */
  private isDisposableDomain(email: string): boolean {
    const normalized = email.toLowerCase().trim();
    const at = normalized.lastIndexOf('@');
    const domain = at === -1 ? normalized : normalized.slice(at + 1);
    return DISPOSABLE_DOMAINS.has(domain);
  }

  /** Détecte des formats suspects (structure, longueur, caractères) */
  private hasSuspiciousFormat(email: string): boolean {
    const parts = email.split('@');
    if (parts.length !== 2) return true;
    const [local, domain] = parts;
    if (!local || !domain) return true;
    if (local.length > 64 || domain.length > 253) return true;
    if (local.startsWith('.') || local.endsWith('.') || domain.startsWith('.') || domain.endsWith('.')) return true;
    if (local.includes('..') || domain.includes('..')) return true;
    if (domain.indexOf('.') === -1) return true;
    const domainTld = domain.split('.').pop();
    if (!domainTld || domainTld.length < 2) return true;
    const allowedLocal = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
    if (!allowedLocal.test(local)) return true;
    return false;
  }
}
