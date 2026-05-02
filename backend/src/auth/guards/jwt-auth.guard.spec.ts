import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if route is public', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    // Call canActivate
    const result = guard.canActivate(mockContext);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      mockContext.getHandler(),
      mockContext.getClass(),
    ]);
    expect(result).toBe(true);
  });

  it('should call super.canActivate if route is not public', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    // Mock super.canActivate somehow since it's AuthGuard('jwt')
    // We can just spy on it by putting a mock implementation on the prototype
    const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
    superCanActivateSpy.mockReturnValue(true);

    const result = guard.canActivate(mockContext);
    
    expect(result).toBe(true);
    expect(superCanActivateSpy).toHaveBeenCalledWith(mockContext);
  });
});
