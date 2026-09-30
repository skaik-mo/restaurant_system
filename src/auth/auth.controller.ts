import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiBadRequestResponse, ApiNoContentResponse, ApiTags, ApiBearerAuth, ApiUnauthorizedResponse, ApiConflictResponse, ApiServiceUnavailableResponse, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/body/login.dto.js';
import { RefreshTokenDto } from './dto/body/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { VerifyEmailDto } from './dto/body/verify-email.dto.js';
import { MustChangePasswordGuard } from './guards/must-change-password.guard.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';
import { ChangePasswordDto } from './dto/body/change-password.dto.js';
import { ForgotPasswordDto } from './dto/body/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/body/reset-password.dto.js';
import { AuthResponseDto } from './dto/response/auth-response.dto.js';
import { RateLimit } from '../common/throttler/rate-limit.decorator.js';
import { MINUTE_MS, HOUR_MS } from '../common/throttler/throttler.config.js';
import { AllowWhenPasswordChangeRequired } from './decorators/allow-when-password-change-required.decorator.js';
import { RateLimitGuard } from '../common/throttler/rate-limit.guard.js';
import { AUTH_MESSAGES } from './auth.messages.js';
import { EnvelopeResponse } from '../common/http/envelope-response.decorator.js';
import { ChangePasswordResponseDto } from './dto/response/change-password-response.dto.js';

const TOO_MANY_REQUESTS = 'Too many requests, retry later';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ ip: { limit: 30, ttl: MINUTE_MS }, email: { limit: 5, ttl: MINUTE_MS } })
  @ApiOperation({ summary: 'Log in with email and password' })
  @EnvelopeResponse({ status: 200, type: AuthResponseDto, description: 'Access and refresh tokens with the current user' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ ip: { limit: 60, ttl: MINUTE_MS } })
  @ApiOperation({ summary: 'Rotate refresh token, get new access+refresh pair' })
  @EnvelopeResponse({ status: 200, type: AuthResponseDto, description: 'New access and refresh tokens with the current user' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @AllowWhenPasswordChangeRequired()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the given refresh token' })
  @ApiNoContentResponse({ description: 'Token revoked (or already invalid)' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RateLimitGuard, MustChangePasswordGuard)
  @RateLimit({ user: { limit: 5, ttl: 15 * MINUTE_MS } })
  @AllowWhenPasswordChangeRequired()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password; revokes all sessions and returns a fresh token pair' })
  @EnvelopeResponse({ status: 200, type: ChangePasswordResponseDto, description: 'Password changed; new tokens (no user, by design)' })
  @ApiBadRequestResponse({ description: 'Validation failed, or new password same as current' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid access token, or current password incorrect' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  changePassword(
    @Req() req: { user: JwtPayload },
    @Body() dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    return this.authService.changePassword(req.user.sub, dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ ip: { limit: 10, ttl: 15 * MINUTE_MS }, email: { limit: 3, ttl: HOUR_MS } })
  @ApiOperation({ summary: 'Request a password reset email' })
  @EnvelopeResponse({ status: 200, message: AUTH_MESSAGES.FORGOT_PASSWORD_SENT, description: 'Always returned, whether or not the email exists' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ ip: { limit: 10, ttl: 15 * MINUTE_MS } })
  @ApiOperation({ summary: 'Set a new password using the token from the reset email' })
  @EnvelopeResponse({ status: 200, message: AUTH_MESSAGES.PASSWORD_RESET, description: 'Password reset; all sessions revoked' })
  @ApiBadRequestResponse({ description: 'Validation failed, invalid/expired reset token, or new password same as current' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ ip: { limit: 20, ttl: 15 * MINUTE_MS } })
  @ApiOperation({ summary: 'Verify email address using the token from the email' })
  @EnvelopeResponse({ status: 200, message: AUTH_MESSAGES.EMAIL_VERIFIED, description: 'Email verified' })
  @ApiBadRequestResponse({ description: 'Validation failed, or invalid/expired verification token' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RateLimitGuard) // order matters: JWT sets req.user first
  @RateLimit({ user: { limit: 3, ttl: 15 * MINUTE_MS } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a fresh verification email to the current user' })
  @EnvelopeResponse({ status: 200, message: AUTH_MESSAGES.VERIFICATION_EMAIL_SENT, description: 'Verification email sent; any previous link is invalidated' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiConflictResponse({ description: 'Email is already verified' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  @ApiServiceUnavailableResponse({ description: 'Email could not be sent; retry later' })
  async resendVerification(@Req() req: { user: JwtPayload }): Promise<void> {
    await this.authService.resendVerificationEmail(req.user.sub);
  }

}