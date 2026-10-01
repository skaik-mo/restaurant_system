import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { MustChangePasswordGuard } from '../auth/guards/must-change-password.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UsersService } from "./users.service.js"
import { CreateUserDto } from './dto/body/create-user.dto.js';
import { CreateUserResponseDto } from './dto/response/create-user-response.dto.js';
import type { JwtPayload } from '../auth/strategies/jwt.strategy.js';
import { UserResponseDto } from './dto/response/user-response.dto.js';
import { USER_ROLES } from '../common/types/user-role.type.js';
import { AllowWhenPasswordChangeRequired } from '../auth/decorators/allow-when-password-change-required.decorator.js';
import { EnvelopeResponse } from '../common/http/envelope-response.decorator.js';
import { USERS_ERRORS, USERS_MESSAGES } from './users.messages.js';
import { ApiErrorResponse } from '../common/swagger/api-error-response.decorator.js';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';
import { AUTH_ERRORS } from '../auth/auth.messages.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, MustChangePasswordGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) { }

  @Get('me')
  @Roles(...USER_ROLES)
  @AllowWhenPasswordChangeRequired() // new users need this to learn they must change their password
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @EnvelopeResponse({ status: 200, type: UserResponseDto, description: 'The current authenticated user' })
  @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
  me(@Req() req: { user: JwtPayload }): Promise<UserResponseDto> {
    return this.users.findCurrentUser(req.user.sub);
  }

  @Post('create-user')
  @ApiOperation({ summary: 'Create a user (admin only)' })
  @EnvelopeResponse({ status: 201, type: CreateUserResponseDto, message: USERS_MESSAGES.CREATED, description: 'User created; verificationEmailSent reports whether the email went out' })
  @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
  @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
  @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
  @ApiErrorResponse(409, USERS_ERRORS.EMAIL_TAKEN)
  create(@Body() dto: CreateUserDto): Promise<CreateUserResponseDto> {
    return this.users.create(dto);
  }
}