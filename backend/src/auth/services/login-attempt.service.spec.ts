import { Test, TestingModule } from '@nestjs/testing';
import { LoginAttemptService } from './login-attempt.service';

describe('LoginAttemptService', () => {
  let service: LoginAttemptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoginAttemptService],
    }).compile();

    service = module.get<LoginAttemptService>(LoginAttemptService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isBlocked', () => {
    it('should return null if user has no attempts', () => {
      expect(service.isBlocked('test@test.com')).toBeNull();
    });

    it('should normalize email before checking block status', () => {
      service.recordFailure('TEST@TEST.COM');
      service.recordFailure('TEST@TEST.COM');
      service.recordFailure('TEST@TEST.COM'); // 3rd blocks
      expect(service.isBlocked(' test@test.com ')).toBeGreaterThan(0);
    });

    it('should calculate remaining block minutes correctly', () => {
      const email = 'test@test.com';
      service.recordFailure(email);
      service.recordFailure(email);
      
      const now = new Date('2026-05-02T10:00:00Z').getTime();
      jest.useFakeTimers().setSystemTime(now);
      
      service.recordFailure(email); // Blocked for 3 minutes (until 10:03)

      jest.setSystemTime(now + 60000); // 1 minute passed

      const remainingMins = service.isBlocked(email);
      expect(remainingMins).toBe(2);

      jest.useRealTimers();
    });

    it('should unblock and return null if time passed', () => {
      const email = 'test@test.com';
      service.recordFailure(email);
      service.recordFailure(email);

      const now = new Date('2026-05-02T10:00:00Z').getTime();
      jest.useFakeTimers().setSystemTime(now);

      service.recordFailure(email); // Blocked for 3 minutes

      // Pass 3m + 1ms
      jest.setSystemTime(now + 3 * 60000 + 1);

      expect(service.isBlocked(email)).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('recordFailure', () => {
    it('should increment failures and block at 3rd attempt', () => {
      const email = 'test@test.com';
      
      service.recordFailure(email);
      expect(service.getRemainingAttempts(email)).toBe(2);
      expect(service.isBlocked(email)).toBeNull();

      service.recordFailure(email);
      expect(service.getRemainingAttempts(email)).toBe(1);
      expect(service.isBlocked(email)).toBeNull();

      service.recordFailure(email);
      expect(service.getRemainingAttempts(email)).toBe(0);
      expect(service.isBlocked(email)).toBeGreaterThan(0); // Assuming not running slow
    });
  });

  describe('clearAttempts', () => {
    it('should remove the record completely', () => {
      const email = 'test@test.com';
      service.recordFailure(email);
      expect(service.getRemainingAttempts(email)).toBe(2);

      service.clearAttempts(email);
      expect(service.getRemainingAttempts(email)).toBe(3);
    });

    it('should support mixed case emails', () => {
      const email = 'test@test.com';
      service.recordFailure(email);
      service.clearAttempts(' TEST@TEST.COM ');
      expect(service.getRemainingAttempts(email)).toBe(3);
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return 3 initially', () => {
      expect(service.getRemainingAttempts('new@test.com')).toBe(3);
    });

    it('should not go below 0', () => {
      const email = 'test@test.com';
      service.recordFailure(email);
      service.recordFailure(email);
      service.recordFailure(email);
      service.recordFailure(email); // 4th attempt
      expect(service.getRemainingAttempts(email)).toBe(0);
    });
  });
});
