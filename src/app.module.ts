import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { MailModule } from './mail/mail.module.js';
import { throttlerOptions } from './common/throttler/throttler.config.js';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './health/health.module.js';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot(throttlerOptions),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    MailModule,
    HealthModule,
  ],
  controllers: [],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule { }
