import { ConflictException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { generateRandomToken } from '../common/utils/random-token.util.js';
import { DatabaseService } from '../database/database.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { EMAIL_VERIFICATION_TTL_MS, hashVerificationToken } from '../common/utils/one-time-token.util.js';
import { MailService } from '../mail/mail.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
  ) { }

  async create(dto: CreateUserDto) {
    await this.assertEmailAvailable(dto.email);

    const passwordHash = await argon2.hash(dto.password);

    const verificationToken = generateRandomToken();
    const emailVerificationToken = hashVerificationToken(verificationToken);
    const emailVerificationExpiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_TTL_MS,
    ).toISOString();

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

    await this.mail.sendVerificationEmail(user.email, verificationToken);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.db.client.orm.public.User.where({ email }).first();
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }
  }
}