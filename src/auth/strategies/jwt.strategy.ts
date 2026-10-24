import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { getJwtAccessSecret, JWT_ALGORITHM } from '../utils/jwt-secret.util.js';
import { DatabaseService } from '../../database/database.service.js';
import { COMMON_ERRORS } from '../../common/errors/common.errors.js';

export interface JwtPayload {
  sub: number;
  role: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtAccessSecret(config),
      algorithms: [JWT_ALGORITHM],
    });
  }

  // The DB row is the source of truth: a deactivated user is rejected at once and a changed
  // role applies on the next request. The spread keeps `exp`, which the SSE stream reads.
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.db.client.orm.public.User.where({ id: payload.sub }).first();
    if (!user || !user.isActive) {
      throw new UnauthorizedException(COMMON_ERRORS.UNAUTHORIZED);
    }
    return { ...payload, role: user.role, email: user.email };
  }
}
