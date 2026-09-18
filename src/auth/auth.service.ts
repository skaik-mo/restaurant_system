// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { DatabaseService } from '../database/database.service.js';
import { LoginDto } from './dto/login.dto.js';
import { buildRefreshToken, generateRefreshToken, hashRefreshToken, parseRefreshToken, verifyRefreshToken } from './utils/refresh-token.util.js';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  sub: number;
  role: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) { }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.findUserByEmail(dto.email);
    await this.assertPasswordMatches(user.password, dto.password);
    return this.generateAuthTokens(user.id, user.role, user.email);
  }

  private async findUserByEmail(email: string) {
    const user = await this.db.client.orm.public.User.where({ email }).first();
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }

  private async assertPasswordMatches(password: string, plainPassword: string): Promise<void> {
    const valid = await argon2.verify(password, plainPassword);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  private signAccessToken(payload: TokenPayload): string {
    return this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
  }

  private async generateAuthTokens(
    userId: number,
    role: string,
    email: string,
  ): Promise<TokenPair> {
    const accessToken = this.signAccessToken({ sub: userId, role, email });

    const secret = generateRefreshToken();
    const tokenHash = await hashRefreshToken(secret);

    const refreshTokenRow = await this.db.client.orm.public.RefreshToken.create({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
      revoked: false,
    });

    const refreshToken = buildRefreshToken(refreshTokenRow.id, secret);

    return { accessToken, refreshToken };
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const parsed = parseRefreshToken(rawRefreshToken);
    if (!parsed) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenRow = await this.db.client.orm.public.RefreshToken.where({
      id: parsed.rowId,
    }).first();

    if (!tokenRow) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const secretValid = await verifyRefreshToken(tokenRow.tokenHash, parsed.secret);
    if (!secretValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRow.revoked) {
      // This token was already used once — either normal rotation caught it late,
      // or it's been stolen and reused. Treat as invalid either way; don't say why.
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date(tokenRow.expiresAt) < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.db.client.orm.public.User.where({ id: tokenRow.userId }).first();
    if (!user) {
      // User was deleted after the token was issued — shouldn't normally happen
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.db.client.orm.public.RefreshToken.where({ id: tokenRow.id }).update({
      revoked: true,
    });

    return this.generateAuthTokens(user.id, user.role, user.email);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const parsed = parseRefreshToken(rawRefreshToken);
    if (!parsed) {
      return;
    }

    const tokenRow = await this.db.client.orm.public.RefreshToken.where({
      id: parsed.rowId,
    }).first();

    if (!tokenRow) {
      return;
    }

    const secretValid = await verifyRefreshToken(tokenRow.tokenHash, parsed.secret);
    if (!secretValid) {
      // Someone guessed a rowId with a wrong secret — don't revoke someone else's
      // token based on an unverified request.
      return;
    }

    await this.db.client.orm.public.RefreshToken.where({ id: tokenRow.id }).update({
      revoked: true,
    });
  }
}