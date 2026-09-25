import {
  BadRequestException,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ArticleQueryGuard } from './article-query.guard';
import { ArticleStatus } from '../../generated/prisma/enums';

describe('Article Query Guard', () => {
  let guard: ArticleQueryGuard;
  const getRequest = jest.fn();
  const context = {
    switchToHttp: () => ({ getRequest }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new ArticleQueryGuard();
  });

  it('missing status throws 400 when unauthenticated', () => {
    getRequest.mockReturnValue({ isAuthenticated: false, query: {} });
    expect(() => guard.canActivate(context)).toThrow(BadRequestException);
  });

  it('missing status returns true when authenticated', () => {
    getRequest.mockReturnValue({ isAuthenticated: true, query: {} });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('DRAFT | ARCHIVED fetch throws 401 when unauthenticated', () => {
    getRequest.mockReturnValueOnce({
      isAuthenticated: false,
      query: { status: ArticleStatus.DRAFT },
    });
    getRequest.mockReturnValueOnce({
      isAuthenticated: false,
      query: { status: ArticleStatus.ARCHIVED },
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('DRAFT | ARCHIVED returns true when authenticated', () => {
    getRequest.mockReturnValueOnce({
      isAuthenticated: true,
      query: { status: ArticleStatus.DRAFT },
    });
    getRequest.mockReturnValueOnce({
      isAuthenticated: true,
      query: { status: ArticleStatus.ARCHIVED },
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws 400 when date range filter are passed without status', () => {
    getRequest.mockReturnValueOnce({
      isAuthenticated: true,
      query: { endDate: new Date('2026-09-10') },
    });
    getRequest.mockReturnValueOnce({
      isAuthenticated: true,
      query: {
        startDate: new Date('2026-09-05'),
        endDate: new Date('2026-09-10'),
      },
    });

    expect(() => guard.canActivate(context)).toThrow(BadRequestException);
    expect(() => guard.canActivate(context)).toThrow(BadRequestException);
  });

  it('returns true when date range filters are passed with status', () => {
    getRequest.mockReturnValueOnce({
      isAuthenticated: false,
      query: {
        startDate: new Date('2026-09-05'),
        endDate: new Date('2026-09-10'),
        status: ArticleStatus.PUBLISHED,
      },
    });
    getRequest.mockReturnValueOnce({
      isAuthenticated: true,
      query: {
        startDate: new Date('2026-09-05'),
        endDate: new Date('2026-09-10'),
        status: ArticleStatus.DRAFT,
      },
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('returns true when status only passed', () => {
    getRequest.mockReturnValueOnce({
      isAuthenticated: false,
      query: {
        status: ArticleStatus.PUBLISHED,
      },
    });
    getRequest.mockReturnValueOnce({
      isAuthenticated: true,
      query: {
        status: ArticleStatus.DRAFT,
      },
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
  });
});
