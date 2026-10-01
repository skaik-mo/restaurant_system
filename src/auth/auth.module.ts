import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { MustChangePasswordGuard } from './guards/must-change-password.guard.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { RefreshTokenCleanupService } from './refresh-token-cleanup.service.js';
import { parseJwtExpiresIn } from './utils/jwt-expires-in.util.js';
import { getJwtAccessSecret, JWT_ALGORITHM } from './utils/jwt-secret.util.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: getJwtAccessSecret(config),
        signOptions: {
          algorithm: JWT_ALGORITHM,
          expiresIn: parseJwtExpiresIn(config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN')),
        },
      }),
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard, MustChangePasswordGuard, AuthService, RefreshTokenCleanupService],
  controllers: [AuthController],
  exports: [PassportModule, JwtModule, JwtAuthGuard, RolesGuard, MustChangePasswordGuard],
})
export class AuthModule { }