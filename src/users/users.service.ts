import { ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { MailService } from '../mail/mail.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { createEmailVerificationToken } from '../common/utils/one-time-token.util.js';
import { isUniqueViolation } from '../common/utils/db-error.util.js';
import type { UserRole } from '../common/types/user-role.type.js';
import { CreateUserDto } from './dto/body/create-user.dto.js';
import { CreateUserResponseDto } from './dto/response/create-user-response.dto.js';
import { toUserResponseDto, type UserRecord } from './user.mapper.js';
import { UserResponseDto } from './dto/response/user-response.dto.js';
import { hashPassword } from '../auth/utils/password.util.js';
import { USERS_ERRORS } from './users.messages.js';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';

const USER_EMAIL_UNIQUE_CONSTRAINT = 'user_email_key';

type Tx = Parameters<Parameters<DatabaseService['client']['transaction']>[0]>[0];

interface UserChange {
  role?: UserRole;
  isActive?: boolean;
}

interface ChangeResult {
  user: UserRecord;
  changed: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
    private readonly realtime: RealtimeService,
  ) { }

  private readonly logger = new Logger(UsersService.name);

  async create(dto: CreateUserDto): Promise<CreateUserResponseDto> {
    await this.assertEmailAvailable(dto.email);

    const passwordHash = await hashPassword(dto.password);

    const {
      token: verificationToken,
      tokenHash: emailVerificationToken,
      expiresAt: emailVerificationExpiresAt,
    } = createEmailVerificationToken();

    const user = await this.db.client.orm.public.User.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      role: dto.role,
      mustChangePassword: true,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpiresAt,
    }).catch((err: unknown) => {
      if (isUniqueViolation(err, USER_EMAIL_UNIQUE_CONSTRAINT)) {
        throw new ConflictException(USERS_ERRORS.EMAIL_TAKEN);
      }
      throw err;
    });

    let verificationEmailSent = true;
    await this.mail.sendVerificationEmail(user.email, verificationToken)
      .catch((err: unknown) => {
        verificationEmailSent = false;
        this.logger.error(
          `Verification email failed for user ${user.id}; user was still created`,
          err,
        );
      })

    return { ...toUserResponseDto(user), verificationEmailSent };
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.db.client.orm.public.User.all();
    return users.sort((a, b) => a.id - b.id).map((user) => toUserResponseDto(user));
  }

  async findCurrentUser(userId: number): Promise<UserResponseDto> {
    const user = await this.db.client.orm.public.User.where({ id: userId }).first();
    if (!user) {
      throw new UnauthorizedException(COMMON_ERRORS.UNAUTHORIZED)
    }
    return toUserResponseDto(user);
  }

  async changeRole(actorId: number, targetId: number, role: UserRole): Promise<UserResponseDto> {
    this.assertNotSelf(actorId, targetId);
    return this.applyChange(targetId, { role });
  }

  async changeStatus(actorId: number, targetId: number, isActive: boolean): Promise<UserResponseDto> {
    this.assertNotSelf(actorId, targetId);
    return this.applyChange(targetId, { isActive });
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.db.client.orm.public.User.where({ email }).first();
    if (existing) {
      throw new ConflictException(USERS_ERRORS.EMAIL_TAKEN)
    }
  }

  private assertNotSelf(actorId: number, targetId: number): void {
    if (actorId === targetId) {
      throw new ConflictException(USERS_ERRORS.CANNOT_MODIFY_SELF);
    }
  }

  private async applyChange(targetId: number, change: UserChange): Promise<UserResponseDto> {
    const result = await this.db.client.transaction((tx) => this.applyInTransaction(tx, targetId, change));
    if (result.changed && change.isActive === false) {
      this.closeStreamsSafely(result.user.id);
    }
    return toUserResponseDto(result.user);
  }

  private async applyInTransaction(tx: Tx, targetId: number, change: UserChange): Promise<ChangeResult> {
    const target = await this.requireUser(tx, targetId);
    const patch = this.buildPatch(target, change);
    if (!patch) {
      return { user: target, changed: false };
    }
    if (this.isActiveAdmin(target) && this.removesAdmin(change)) {
      await this.lockActiveAdmins(tx);
      await this.assertAnotherActiveAdmin(tx, targetId);
    }
    const updated = await tx.orm.public.User.where({ id: targetId }).update(patch);
    if (!updated) {
      throw new NotFoundException(USERS_ERRORS.NOT_FOUND);
    }
    await this.revokeRefreshTokens(tx, targetId);
    return { user: updated, changed: true };
  }

  private async requireUser(tx: Tx, id: number) {
    const user = await tx.orm.public.User.where({ id }).first();
    if (!user) {
      throw new NotFoundException(USERS_ERRORS.NOT_FOUND);
    }
    return user;
  }

  private buildPatch(target: UserRecord, change: UserChange): UserChange | null {
    const patch: UserChange = {};
    if (change.role !== undefined && change.role !== target.role) {
      patch.role = change.role;
    }
    if (change.isActive !== undefined && change.isActive !== target.isActive) {
      patch.isActive = change.isActive;
    }
    return Object.keys(patch).length > 0 ? patch : null;
  }

  private isActiveAdmin(user: { role: string; isActive: boolean }): boolean {
    return user.role === 'ADMIN' && user.isActive;
  }

  private removesAdmin(change: UserChange): boolean {
    return change.isActive === false || (change.role !== undefined && change.role !== 'ADMIN');
  }

  // One UPDATE over all active admins takes their row locks until commit, so two
  // admin-removing changes queue instead of both seeing the other admin as "remaining".
  private async lockActiveAdmins(tx: Tx): Promise<void> {
    await tx.orm.public.User.where({ role: 'ADMIN', isActive: true }).updateAndCount({ isActive: true });
  }

  private async assertAnotherActiveAdmin(tx: Tx, excludeId: number): Promise<void> {
    const other = await tx.orm.public.User
      .where({ role: 'ADMIN', isActive: true })
      .where((u) => u.id.neq(excludeId))
      .first();
    if (!other) {
      throw new ConflictException(USERS_ERRORS.LAST_ADMIN);
    }
  }

  private async revokeRefreshTokens(tx: Tx, userId: number): Promise<void> {
    await tx.orm.public.RefreshToken.where({ userId, revoked: false }).updateAndCount({ revoked: true });
  }

  // After commit: a failure here must never fail the HTTP request
  private closeStreamsSafely(userId: number): void {
    try {
      this.realtime.closeUserStreams(userId);
    } catch (err: unknown) {
      this.logger.warn(`Closing streams of user ${userId} failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }
}
