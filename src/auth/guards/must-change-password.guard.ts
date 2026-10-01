import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../database/database.service.js';
import { ALLOW_WHEN_PASSWORD_CHANGE_REQUIRED_KEY } from '../decorators/allow-when-password-change-required.decorator.js';
import type { JwtPayload } from '../strategies/jwt.strategy.js';
import { AUTH_ERRORS } from '../auth.messages.js';
import { COMMON_ERRORS } from '../../common/errors/common.errors.js';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(
    private readonly db: DatabaseService,
    private readonly reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_WHEN_PASSWORD_CHANGE_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowed) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) {
      throw new UnauthorizedException(COMMON_ERRORS.UNAUTHORIZED);
    }

    const dbUser = await this.db.client.orm.public.User
      .where({ id: user.sub })
      .first();
    if (!dbUser) {
      throw new UnauthorizedException(COMMON_ERRORS.UNAUTHORIZED);
    }

    if (dbUser.mustChangePassword) {
      throw new ForbiddenException(AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    }

    return true;
  }
}