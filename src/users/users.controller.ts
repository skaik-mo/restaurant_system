import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { MustChangePasswordGuard } from '../auth/guards/must-change-password.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/body/create-user.dto.js';
import { UpdateUserRoleDto } from './dto/body/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/body/update-user-status.dto.js';
import { UserIdParamDto } from './dto/params/user-id-param.dto.js';
import { CreateUserResponseDto } from './dto/response/create-user-response.dto.js';
import type { JwtPayload } from '../auth/strategies/jwt.strategy.js';
import { UserResponseDto } from './dto/response/user-response.dto.js';
import { USER_ROLES } from '../common/types/user-role.type.js';
import { AllowWhenPasswordChangeRequired } from '../auth/decorators/allow-when-password-change-required.decorator.js';
import { EnvelopeResponse } from '../common/http/envelope-response.decorator.js';
import { USERS_ERRORS, USERS_MESSAGES } from './users.messages.js';
import { USER_ADMIN_LIMIT } from './users.constants.js';
import { ApiErrorResponse } from '../common/swagger/api-error-response.decorator.js';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';
import { AUTH_ERRORS } from '../auth/auth.messages.js';
import { RateLimit } from '../common/throttler/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/throttler/rate-limit.guard.js';

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

  @Get()
  @UseGuards(RateLimitGuard)
  @RateLimit(USER_ADMIN_LIMIT)
  @ApiOperation({ summary: 'List all users, active and inactive, sorted by id (admin only; returns an array)' })
  @EnvelopeResponse({ status: 200, type: UserResponseDto, description: 'All users (array of users)' })
  @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
  @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
  @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
  list(): Promise<UserResponseDto[]> {
    return this.users.findAll();
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

  @Patch(':id/role')
  @UseGuards(RateLimitGuard)
  @RateLimit(USER_ADMIN_LIMIT)
  @ApiOperation({ summary: 'Change a user role (admin only). Revokes the user refresh tokens; the new role applies on the next request' })
  @EnvelopeResponse({ status: 200, type: UserResponseDto, description: 'The updated user (unchanged when the role is already set)' })
  @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
  @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
  @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
  @ApiErrorResponse(404, USERS_ERRORS.NOT_FOUND)
  @ApiErrorResponse(409, USERS_ERRORS.CANNOT_MODIFY_SELF, USERS_ERRORS.LAST_ADMIN)
  @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
  changeRole(
    @Req() req: { user: JwtPayload },
    @Param() params: UserIdParamDto,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    return this.users.changeRole(req.user.sub, params.id, dto.role);
  }

  @Patch(':id/status')
  @UseGuards(RateLimitGuard)
  @RateLimit(USER_ADMIN_LIMIT)
  @ApiOperation({ summary: 'Deactivate or reactivate a user (admin only). Deactivating revokes refresh tokens, rejects access tokens at once and closes open streams' })
  @EnvelopeResponse({ status: 200, type: UserResponseDto, description: 'The updated user (unchanged when the status is already set)' })
  @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
  @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
  @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
  @ApiErrorResponse(404, USERS_ERRORS.NOT_FOUND)
  @ApiErrorResponse(409, USERS_ERRORS.CANNOT_MODIFY_SELF, USERS_ERRORS.LAST_ADMIN)
  @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
  changeStatus(
    @Req() req: { user: JwtPayload },
    @Param() params: UserIdParamDto,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    return this.users.changeStatus(req.user.sub, params.id, dto.isActive);
  }
}
