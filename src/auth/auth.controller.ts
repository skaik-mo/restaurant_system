import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiBadRequestResponse, ApiNoContentResponse, ApiTags, ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse, ApiConflictResponse, ApiServiceUnavailableResponse, ApiTooManyRequestsResponse } from '@nestjs/swagger';
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
import { TokenPairResponseDto } from './dto/response/token-pair-response.dto.js';
import { MessageResponseDto } from '../common/dto/response/message-response.dto.js';
import { RateLimit } from '../common/throttler/rate-limit.decorator.js';
import { MINUTE_MS, HOUR_MS } from '../common/throttler/throttler.config.js';
import { AllowWhenPasswordChangeRequired } from './decorators/allow-when-password-change-required.decorator.js';
import { RateLimitGuard } from '../common/throttler/rate-limit.guard.js';

const TOO_MANY_REQUESTS = 'Too many requests; retry later';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ ip: { limit: 30, ttl: MINUTE_MS }, email: { limit: 5, ttl: MINUTE_MS } })
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Access and refresh tokens with the current user' })
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
  @ApiOkResponse({ type: AuthResponseDto, description: 'New access and refresh tokens with the current user' })
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
  @ApiOkResponse({ type: TokenPairResponseDto, description: 'Password changed; new tokens (no user field, by design)' })
  @ApiBadRequestResponse({ description: 'Validation failed, or new password same as current' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid access token, or current password incorrect' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  changePassword(
    @Req() req: { user: JwtPayload },
    @Body() dto: ChangePasswordDto,
  ): Promise<TokenPairResponseDto> {
    return this.authService.changePassword(req.user.sub, dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ ip: { limit: 10, ttl: 15 * MINUTE_MS }, email: { limit: 3, ttl: HOUR_MS } })
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiOkResponse({ type: MessageResponseDto, description: 'Always returned, whether or not the email exists' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If an account exists for that email, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ ip: { limit: 10, ttl: 15 * MINUTE_MS } })
  @ApiOperation({ summary: 'Set a new password using the token from the reset email' })
  @ApiOkResponse({ type: MessageResponseDto, description: 'Password reset; all sessions revoked' })
  @ApiBadRequestResponse({ description: 'Validation failed, invalid/expired reset token, or new password same as current' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset. Please log in with your new password.' };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ ip: { limit: 20, ttl: 15 * MINUTE_MS } })
  @ApiOperation({ summary: 'Verify email address using the token from the email' })
  @ApiOkResponse({ type: MessageResponseDto, description: 'Email verified' })
  @ApiBadRequestResponse({ description: 'Validation failed, or invalid/expired verification token' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<MessageResponseDto> {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email verified' };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RateLimitGuard) // order matters: JWT sets req.user first
  @RateLimit({ user: { limit: 3, ttl: 15 * MINUTE_MS } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a fresh verification email to the current user' })
  @ApiOkResponse({ type: MessageResponseDto, description: 'Verification email sent; any previous link is invalidated' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiConflictResponse({ description: 'Email is already verified' })
  @ApiTooManyRequestsResponse({ description: TOO_MANY_REQUESTS })
  @ApiServiceUnavailableResponse({ description: 'Email could not be sent; retry later' })
  async resendVerification(@Req() req: { user: JwtPayload }): Promise<MessageResponseDto> {
    await this.authService.resendVerificationEmail(req.user.sub);
    return { message: 'Verification email sent' };
  }

}