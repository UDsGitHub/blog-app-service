import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Observable } from 'rxjs';
import { AuthenticatedRequest } from './authenticated-request.interface';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AdminOnly } from './admin-only.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = (request.headers['authorization'] as string)?.split(
      'ApiKey ',
    )[1];
    const adminOnly = this.reflector.get(AdminOnly, context.getHandler());
    if (!apiKey && adminOnly) {
      throw new UnauthorizedException();
    }
    if (!apiKey) {
      request.isAuthenticated = false;
      return true;
    }

    let isAuthenticated = false;
    const incomingKeyBuffer = Buffer.from(apiKey);
    const envKeyBuffer = Buffer.from(
      this.configService.get<string>('API_KEY') ?? '',
    );
    if (incomingKeyBuffer.length === envKeyBuffer.length) {
      isAuthenticated = timingSafeEqual(incomingKeyBuffer, envKeyBuffer);
    }

    if (!isAuthenticated && adminOnly) {
      throw new UnauthorizedException();
    }
    request.isAuthenticated = isAuthenticated;
    return true;
  }
}
