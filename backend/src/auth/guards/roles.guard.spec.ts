import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

// 'Role' est un type alias (pas un enum), on utilise directement les strings
type Role = 'USER' | 'ADMIN';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  function createMockContext(user: any): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should return true if no roles are required', () => {
    const context = createMockContext({ role: 'USER' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should return true if roles array is empty', () => {
    const context = createMockContext({ role: 'USER' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user has no role but roles are required', () => {
    const context = createMockContext({}); // no role
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN'] as Role[]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Role missing');
  });

  it('should throw ForbiddenException if user has null role but roles are required', () => {
    const context = createMockContext({ role: null });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN'] as Role[]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user role is not in required roles', () => {
    const context = createMockContext({ role: 'USER' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN'] as Role[]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Insufficient role');
  });

  it('should return true if user role matches required role', () => {
    const context = createMockContext({ role: 'ADMIN' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN'] as Role[]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should return true if user role is in a list of required roles', () => {
    const context = createMockContext({ role: 'USER' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'USER'] as Role[]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});
