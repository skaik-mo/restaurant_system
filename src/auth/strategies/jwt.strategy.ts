import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { getJwtAccessSecret, JWT_ALGORITHM } from '../utils/jwt-secret.util.js';

export interface JwtPayload {
  sub: number;
  role: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtAccessSecret(config),
      algorithms: [JWT_ALGORITHM],
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}