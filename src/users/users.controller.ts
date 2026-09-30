import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConflictResponse, ApiForbiddenResponse, ApiBadRequestResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
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
import { USERS_MESSAGES } from './users.messages.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, MustChangePasswordGuard)
@Roles('ADMIN')
export class UsersController {
    constructor(private readonly users: UsersService) { }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Create a user (admin only)' })
    @EnvelopeResponse({ status: 201, type: CreateUserResponseDto, message: USERS_MESSAGES.CREATED, description: 'User created; verificationEmailSent reports whether the email went out' })
    @ApiBadRequestResponse({ description: 'Validation failed' })
    @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
    @ApiForbiddenResponse({ description: 'Caller is not an admin, or must change password first' })
    @ApiConflictResponse({ description: 'A user with this email already exists' })
    create(@Body() dto: CreateUserDto): Promise<CreateUserResponseDto> {
        return this.users.create(dto);
    }

    @Get('me')
    @Roles(...USER_ROLES)
    @AllowWhenPasswordChangeRequired()
    @ApiOperation({ summary: 'Get the current authenticated user' })
    @EnvelopeResponse({ status: 200, type: UserResponseDto, description: 'The current authenticated user' })
    @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
    me(@Req() req: { user: JwtPayload }): Promise<UserResponseDto> {
        return this.users.findCurrentUser(req.user.sub);
    }
}