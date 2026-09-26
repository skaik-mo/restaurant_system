import { Injectable, CanActivate, ExecutionContext, ForbiddenException, } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import type { JwtPayload } from '../strategies/jwt.strategy.js';

const EXEMPT_PATHS = ['/auth/change-password', '/auth/logout', '/users/me'];

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (EXEMPT_PATHS.includes(request.route?.path)) {
      return true;
    }

    const user = request.user as JwtPayload | undefined;
    if (!user) {
      return false;
    }

    const dbUser = await this.db.client.orm.public.User.where({
      id: user.sub,
    }).first()

    if (!dbUser) {
      return false;
    }

    if (dbUser.mustChangePassword) {
      throw new ForbiddenException(
        'Password change required before continuing',
      );
    }

    return true;
  }
}