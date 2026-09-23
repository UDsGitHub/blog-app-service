import { ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('Auth Guard', () => {
  let guard: AuthGuard;
  const getRequest = jest.fn();
  const reflector = { get: jest.fn() };
  const configService = { get: jest.fn().mockReturnValue('secret') };
  const context = {
    switchToHttp: () => ({
      getRequest,
    }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new AuthGuard(
      configService as unknown as ConfigService,
      reflector as unknown as Reflector,
    );
  });

  it('throws 401 no apikey and admin only', () => {
    getRequest.mockReturnValue({ headers: {} });
    reflector.get.mockReturnValue(true);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws 401 no apikey and not admin only', () => {
    getRequest.mockReturnValue({ headers: {} });
    reflector.get.mockReturnValue(false);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws 401 not authenticated and admin only', () => {
    getRequest.mockReturnValue({
      headers: { authorization: 'ApiKey wrongsecret' },
    });
    reflector.get.mockReturnValue(true);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws 401 authenticated and admin only', () => {
    getRequest.mockReturnValue({
      headers: { authorization: 'ApiKey secret' },
    });
    reflector.get.mockReturnValue(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws 401 authenticated and not admin only', () => {
    getRequest.mockReturnValue({
      headers: { authorization: 'ApiKey secret' },
    });
    reflector.get.mockReturnValue(false);

    expect(guard.canActivate(context)).toBe(true);
  });
});
