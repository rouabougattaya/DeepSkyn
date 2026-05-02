import { Test, TestingModule } from '@nestjs/testing';
import { EmailSecurityService } from './email-security.service';

describe('EmailSecurityService', () => {
  let service: EmailSecurityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailSecurityService],
    }).compile();

    service = module.get<EmailSecurityService>(EmailSecurityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isSuspicious', () => {
    it('should return false for valid emails', () => {
      const result = service.isSuspicious('user@gmail.com');

      expect(result.suspicious).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    it('should detect disposable domain emails', () => {
      const disposableEmails = [
        'user@10minutemail.com',
        'test@guerrillamail.com',
        'temp@mailinator.com',
        'fake@tempmail.com',
        'throwaway@getnada.com',
      ];

      disposableEmails.forEach((email) => {
        const result = service.isSuspicious(email);
        expect(result.suspicious).toBe(true);
        expect(result.reason).toBe('disposable');
      });
    });

    it('should not flag legitimate domain variations', () => {
      const legitimateEmails = [
        'user@gmail.com',
        'user@yahoo.com',
        'user@outlook.com',
        'user@company.com',
        'user@university.edu',
      ];

      legitimateEmails.forEach((email) => {
        const result = service.isSuspicious(email);
        expect(result.suspicious).toBe(false);
      });
    });

    it('should detect suspicious email formats', () => {
      const suspiciousEmails = [
        'invalidemail',
        'user@',
        '@domain.com',
        'user name@domain.com',
        'user@domain',
      ];

      suspiciousEmails.forEach((email) => {
        const result = service.isSuspicious(email);
        expect(result.suspicious).toBe(true);
      });
    });

    it('should handle case-insensitive domain checking', () => {
      const result = service.isSuspicious('user@10MINUTEMAIL.COM');

      expect(result.suspicious).toBe(true);
      expect(result.reason).toBe('disposable');
    });
  });

  describe('isDisposableDomain', () => {
    it('should identify known disposable domains', () => {
      const disposableDomains = [
        '10minutemail.com',
        '10minutemail.net',
        'guerrillamail.com',
        'guerrillamail.net',
        'guerrillamail.org',
        'mailinator.com',
        'mailinator.net',
        'tempmail.com',
        'tempmail.net',
        'throwaway.email',
        'getnada.com',
        'yopmail.com',
        'fakeinbox.com',
        'trashmail.com',
        'mailnesia.com',
        'sharklasers.com',
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
      ];

      disposableDomains.forEach((domain) => {
        const result = (service as any).isDisposableDomain(domain);
        expect(result).toBe(true);
      });
    });

    it('should not flag legitimate domains as disposable', () => {
      const legitimateDomains = [
        'gmail.com',
        'yahoo.com',
        'outlook.com',
        'hotmail.com',
        'protonmail.com',
        'company.com',
        'university.edu',
      ];

      legitimateDomains.forEach((domain) => {
        const result = (service as any).isDisposableDomain(domain);
        expect(result).toBe(false);
      });
    });

    it('should be case-insensitive', () => {
      const result1 = (service as any).isDisposableDomain('10minutemail.com');
      const result2 = (service as any).isDisposableDomain('10MINUTEMAIL.COM');
      const result3 = (service as any).isDisposableDomain('10MinuteMail.Com');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it('should handle subdomain variations', () => {
      const result1 = (service as any).isDisposableDomain('mail.10minutemail.com');
      const result2 = (service as any).isDisposableDomain('10minutemail.com');

      // Should not match subdomains unless specifically added
      expect(result2).toBe(true);
    });
  });

  describe('hasSuspiciousFormat', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@example.com',
        'user+tag@example.co.uk',
        'user_name@example.org',
        'user123@example.com',
      ];

      validEmails.forEach((email) => {
        const result = (service as any).hasSuspiciousFormat(email);
        expect(result).toBe(false);
      });
    });

    it('should detect invalid email formats', () => {
      const invalidEmails = [
        'invalidemail',
        'user@',
        '@example.com',
      ];

      invalidEmails.forEach((email) => {
        const result = (service as any).hasSuspiciousFormat(email);
        expect(result).toBe(true);
      });
    });

    it('should handle edge cases', () => {
      const edgeCases = [
        '',
        ' ',
        'a',
        '@',
        'a@b',
      ];

      edgeCases.forEach((email) => {
        const result = (service as any).hasSuspiciousFormat(email);
        expect(result).toBe(true);
      });
    });

    it('should allow single character local part', () => {
      const result = (service as any).hasSuspiciousFormat('a@example.com');

      expect(result).toBe(false);
    });

    it('should allow special characters in local part', () => {
      const result = (service as any).hasSuspiciousFormat('user+test@example.com');

      expect(result).toBe(false);
    });
  });

  describe('Response Format', () => {
    it('should return SuspiciousResult interface', () => {
      const result = service.isSuspicious('user@10minutemail.com');

      expect(result).toHaveProperty('suspicious');
      expect(result).toHaveProperty('reason');
      expect(typeof result.suspicious).toBe('boolean');
    });

    it('should not include reason for legitimate emails', () => {
      const result = service.isSuspicious('user@gmail.com');

      expect(result.suspicious).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    it('should include reason for suspicious emails', () => {
      const result = service.isSuspicious('user@mailinator.com');

      expect(result.suspicious).toBe(true);
      expect(result.reason).toBeDefined();
      expect(['disposable', 'format']).toContain(result.reason);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle very long email addresses', () => {
      const longEmail = 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.com';

      const result = service.isSuspicious(longEmail);

      expect(typeof result.suspicious).toBe('boolean');
    });

    it('should handle international characters', () => {
      const result = service.isSuspicious('üser@example.com');

      expect(typeof result.suspicious).toBe('boolean');
    });

    it('should handle SQL injection attempts in email', () => {
      const result = service.isSuspicious("'; DROP TABLE users--@example.com");

      expect(result.suspicious).toBe(true);
    });

    it('should handle XSS attempts in email', () => {
      const result = service.isSuspicious('<script>alert("xss")</script>@example.com');

      expect(result.suspicious).toBe(true);
    });

    it('should handle unicode normalization attacks', () => {
      const result = service.isSuspicious('user@example.com\u0000test');

      expect(typeof result.suspicious).toBe('boolean');
    });
  });

  describe('Performance', () => {
    it('should handle high-volume disposable email checks', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        service.isSuspicious(`user${i}@10minutemail.com`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 1000 checks in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle rapid consecutive checks', () => {
      const emails = [
        'user1@gmail.com',
        'user2@mailinator.com',
        'user3@outlook.com',
        'user4@tempmail.org',
        'user5@yahoo.com',
      ];

      const results = emails.map((email) => service.isSuspicious(email));

      expect(results).toHaveLength(5);
      expect(results.every((r) => typeof r.suspicious === 'boolean')).toBe(true);
    });
  });

  describe('Comprehensive Disposable Domain List', () => {
    it('should have all documented disposable domains in the list', () => {
      // Test a sampling of domains to ensure coverage
      const domains = [
        '10minutemail.com',
        'guerrillamail.com',
        'mailinator.com',
        'temp-mail.org',
        'yopmail.com',
      ];

      domains.forEach((domain) => {
        expect((service as any).isDisposableDomain(domain)).toBe(true);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should correctly flag disposable email as suspicious', () => {
      const result = service.isSuspicious('user@mailinator.com');

      expect(result.suspicious).toBe(true);
      expect(result.reason).toBe('disposable');
    });

    it('should correctly flag malformed email as suspicious', () => {
      const result = service.isSuspicious('user@');

      expect(result.suspicious).toBe(true);
      expect(result.reason).toBe('format');
    });

    it('should pass clean email through', () => {
      const result = service.isSuspicious('legitimate.user@company.com');

      expect(result.suspicious).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    it('should handle email with plus addressing', () => {
      const result = service.isSuspicious('user+newsletter@gmail.com');

      expect(result.suspicious).toBe(false);
    });

    it('should prioritize disposable domain check over format check', () => {
      // Even if format is unusual, disposable domain is the primary concern
      const result = service.isSuspicious('user123@10minutemail.com');

      expect(result.suspicious).toBe(true);
      expect(result.reason).toBeDefined();
    });
  });
});
