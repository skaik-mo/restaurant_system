import { Body, Controller, HttpCode, HttpStatus, Post, Get, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse, ApiConflictResponse, ApiServiceUnavailableResponse, ApiTooManyRequestsResponse } from '@nestjs/swagger';
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
import { AuthUserResponseDto } from './dto/response/auth-user-response.dto.js';
import { TokenPairResponseDto } from './dto/response/token-pair-response.dto.js';
import { MessageResponseDto } from '../common/dto/response/message-response.dto.js';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RateLimit } from '../common/throttler/rate-limit.decorator.js';
import { MINUTE_MS, HOUR_MS } from '../common/throttler/throttler.config.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({ type: TokenPairResponseDto, description: 'Returns access and refresh tokens with the current user' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @UseGuards(ThrottlerGuard)
  @RateLimit({ ip: { limit: 30, ttl: MINUTE_MS }, email: { limit: 5, ttl: MINUTE_MS } })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts; retry later' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token, get new access+refresh pair' })
  @ApiOkResponse({ type: TokenPairResponseDto, description: 'Returns new access and refresh tokens with the current user' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @UseGuards(ThrottlerGuard)
  @RateLimit({ ip: { limit: 60, ttl: MINUTE_MS } })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts; retry later' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke the given refresh token' })
  @ApiResponse({ status: 204, description: 'Token revoked (or already invalid)' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, MustChangePasswordGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password; revokes all sessions and returns a fresh token pair' })
  @ApiResponse({ status: 200, description: 'Password changed; new tokens returned' })
  @ApiResponse({ status: 400, description: 'Validation failed or new password same as current' })
  @ApiResponse({ status: 401, description: 'Missing/invalid access token, or current password incorrect' })
  changePassword(
    @Req() req: { user: JwtPayload },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.sub, dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 200, description: 'Always returned, whether or not the email exists' })
  @UseGuards(ThrottlerGuard)
  @RateLimit({ ip: { limit: 10, ttl: 15 * MINUTE_MS }, email: { limit: 3, ttl: HOUR_MS } })
  @ApiTooManyRequestsResponse({ description: 'Too many requests; retry later' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If an account exists for that email, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new password using the token from the reset email' })
  @ApiResponse({ status: 200, description: 'Password reset; all sessions revoked' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  @UseGuards(ThrottlerGuard)
  @RateLimit({ ip: { limit: 10, ttl: 15 * MINUTE_MS } })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts; retry later' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset. Please log in with your new password.' };
  }


  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiOkResponse({ type: AuthUserResponseDto })
  me(@Req() req: { user: JwtPayload }) {
    return this.authService.getCurrentUser(req.user.sub);
  }


  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using the token from the email' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification token' })
  @UseGuards(ThrottlerGuard)
  @RateLimit({ ip: { limit: 20, ttl: 15 * MINUTE_MS } })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts; retry later' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email verified' };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a fresh verification email to the current user' })
  @ApiOkResponse({ type: MessageResponseDto, description: 'Verification email sent; any previous link is invalidated' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiConflictResponse({ description: 'Email is already verified' })
  @ApiServiceUnavailableResponse({ description: 'Email could not be sent; retry later' })
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @RateLimit({ user: { limit: 3, ttl: 15 * MINUTE_MS } })
  @ApiTooManyRequestsResponse({ description: 'Too many requests; retry later' })
  async resendVerification(@Req() req: { user: JwtPayload }): Promise<MessageResponseDto> {
    await this.authService.resendVerificationEmail(req.user.sub);
    return { message: 'Verification email sent' };
  }

}