import { Injectable, UnauthorizedException, BadRequestException, Logger, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { DatabaseService } from '../database/database.service.js';
import { LoginDto } from './dto/body/login.dto.js';
import { buildRefreshToken, hashRefreshToken, parseRefreshToken, verifyRefreshToken } from './utils/refresh-token.util.js';
import { generateRandomToken } from '../common/utils/random-token.util.js';
import { PASSWORD_RESET_TTL_MS, hashVerificationToken, createEmailVerificationToken } from '../common/utils/one-time-token.util.js';
import { ChangePasswordDto } from './dto/body/change-password.dto.js';
import { MailService } from '../mail/mail.service.js';
import { TokenPairResponseDto } from './dto/response/token-pair-response.dto.js';
import { AuthResponseDto } from './dto/response/auth-response.dto.js';
import { toUserResponseDto, type UserRecord } from '../users/user.mapper.js';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  sub: number;
  role: string;
  email: string;
}

interface UserRow extends UserRecord {
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) { }

  private readonly logger = new Logger(AuthService.name);


  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.findUserByEmail(dto.email);
    await this.assertPasswordMatches(user.password, dto.password);
    const tokens = await this.generateAuthTokens(user.id, user.role, user.email);

    return { ...tokens, user: toUserResponseDto(user) };
  }

  private async findUserByEmail(email: string): Promise<UserRow> {
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
    // Secret and lifetime come from JwtModule config (JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN)
    return this.jwt.sign(payload)
  }

  private async generateAuthTokens(
    userId: number,
    role: string,
    email: string,
  ): Promise<TokenPairResponseDto> {
    const accessToken = this.signAccessToken({ sub: userId, role, email });

    const secret = generateRandomToken();
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

  async refresh(rawRefreshToken: string): Promise<AuthResponseDto> {
    const parsed = parseRefreshToken(rawRefreshToken);
    if (!parsed) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenRow = await this.db.client.orm.public.RefreshToken.where({
      id: parsed.rowId,
    }).first();

    // Cheap checks first: no argon2 work for missing, replayed, or expired tokens.
    // Every failure path throws the same generic error on purpose.
    if (
      !tokenRow ||
      tokenRow.revoked ||
      new Date(tokenRow.expiresAt) < new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }


    const secretValid = await verifyRefreshToken(tokenRow.tokenHash, parsed.secret);
    if (!secretValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const claimed = await this.db.client.orm.public.RefreshToken
      .where({ id: tokenRow.id, revoked: false })
      .updateAndCount({ revoked: true });

    if (claimed !== 1) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.db.client.orm.public.User.where({
      id: tokenRow.userId,
    }).first();

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateAuthTokens(user.id, user.role, user.email);
    return { ...tokens, user: toUserResponseDto(user) };
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

    await this.db.client.orm.public.RefreshToken
      .where({ id: tokenRow.id })
      .update({
        revoked: true,
      });
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<TokenPairResponseDto> {
    const user = await this.db.client.orm.public.User.where({ id: userId }).first();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const currentValid = await argon2.verify(user.password, dto.currentPassword);
    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const newHash = await argon2.hash(dto.newPassword);

    await this.db.client.orm.public.User.where({ id: user.id }).update({
      password: newHash,
      mustChangePassword: false,
    });

    await this.revokeAllRefreshTokens(user.id);

    return this.generateAuthTokens(user.id, user.role, user.email);
  }

  private async revokeAllRefreshTokens(userId: number): Promise<void> {
    await this.db.client.orm.public.RefreshToken
      .where({ userId, revoked: false })
      .updateAndCount({
        revoked: true,
      });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.db.client.orm.public.User.where({ email }).first();

    if (!user) {
      return;
    }

    const token = generateRandomToken();

    await this.db.client.orm.public.User.where({ id: user.id }).update({
      passwordResetToken: hashVerificationToken(token),
      passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString(),
    });

    this.mail.sendPasswordResetEmail(user.email, token)
      .catch((err: unknown) => {
        this.logger.error(`Failed to send password reset email to user ${user.id}`, err);
      })
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashVerificationToken(token);

    const user = await this.db.client.orm.public.User.where({
      passwordResetToken: tokenHash,
    }).first();

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      new Date(user.passwordResetExpiresAt) < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(newPassword);

    const claimed = await this.db.client.orm.public.User
      .where({ id: user.id, passwordResetToken: tokenHash })
      .updateAndCount({
        password: passwordHash,
        mustChangePassword: false,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      });

    if (claimed !== 1) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.revokeAllRefreshTokens(user.id);
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashVerificationToken(token);

    const user = await this.db.client.orm.public.User.where({
      emailVerificationToken: tokenHash,
    }).first();

    if (
      !user ||
      !user.emailVerificationExpiresAt ||
      new Date(user.emailVerificationExpiresAt) < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const claimed = await this.db.client.orm.public.User
      .where({ id: user.id, emailVerificationToken: tokenHash })
      .updateAndCount({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      });

    if (claimed !== 1) {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async resendVerificationEmail(userId: number): Promise<void> {
    const user = await this.db.client.orm.public.User.where({ id: userId }).first();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.emailVerified) {
      throw new ConflictException('Email is already verified');
    }

    const { token, tokenHash, expiresAt } = createEmailVerificationToken();

    // Overwrite: any previously sent link stops working immediately.
    await this.db.client.orm.public.User
      .where({ id: user.id })
      .update({
        emailVerificationToken: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      });

    await this.mail.sendVerificationEmail(user.email, token)
      .catch((err: unknown) => {
        this.logger.error(`Verification email failed for user ${user.id}`, err);
        throw new ServiceUnavailableException(
          'Could not send verification email. Please try again later.',
        );
      })
  }
}
