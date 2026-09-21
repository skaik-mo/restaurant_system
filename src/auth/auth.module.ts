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

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN') as any,
        },
      }),
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard, MustChangePasswordGuard, AuthService],
  controllers: [AuthController],
  exports: [PassportModule, JwtModule, JwtAuthGuard, RolesGuard, MustChangePasswordGuard],
})
export class AuthModule {}