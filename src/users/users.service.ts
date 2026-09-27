import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { MailService } from '../mail/mail.service.js';
import { createEmailVerificationToken } from '../common/utils/one-time-token.util.js';
import { isUniqueViolation } from '../common/utils/db-error.util.js';
import { CreateUserDto } from './dto/body/create-user.dto.js';
import { CreateUserResponseDto } from './dto/response/create-user-response.dto.js';
import { toUserResponseDto } from './user.mapper.js';
import { UserResponseDto } from './dto/response/user-response.dto.js';
import { hashPassword } from '../auth/utils/password.util.js';

const USER_EMAIL_UNIQUE_CONSTRAINT = 'user_email_key';
const EMAIL_TAKEN_MESSAGE = 'A user with this email already exists';

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
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
        throw new ConflictException(EMAIL_TAKEN_MESSAGE);
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

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.db.client.orm.public.User.where({ email }).first();
    if (existing) {
      throw new ConflictException(EMAIL_TAKEN_MESSAGE);
    }
  }

  async findCurrentUser(userId: number): Promise<UserResponseDto> {
    const user = await this.db.client.orm.public.User.where({ id: userId }).first();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return toUserResponseDto(user);
  }
}