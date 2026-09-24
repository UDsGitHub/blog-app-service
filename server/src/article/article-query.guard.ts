import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthenticatedRequest } from '../guard/authenticated-request.interface';
import { ArticleStatus } from '../generated/prisma/enums';

@Injectable()
export class ArticleQueryGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const { status, startDate, endDate } = request.query;

    if (!request.isAuthenticated && !status) {
      throw new BadRequestException(
        'status is a required field for unauthenticated users',
      );
    }

    if (
      !request.isAuthenticated &&
      (status === ArticleStatus.DRAFT || status === ArticleStatus.ARCHIVED)
    ) {
      throw new UnauthorizedException();
    }

    if ((startDate || endDate) && !status) {
      throw new BadRequestException(
        'status is required when filtering by startDate or endDate',
      );
    }

    return true;
  }
}
