import { ConflictException, Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { DatabaseService } from '../database/database.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { MailService } from '../mail/mail.service.js';
import { createEmailVerificationToken } from '../common/utils/one-time-token.util.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
  ) { }

  private readonly logger = new Logger(UsersService.name);


  async create(dto: CreateUserDto) {
    await this.assertEmailAvailable(dto.email);

    const passwordHash = await argon2.hash(dto.password);

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

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      verificationEmailSent,
    };
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.db.client.orm.public.User.where({ email }).first();
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }
  }
}