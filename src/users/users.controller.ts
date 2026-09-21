import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { MustChangePasswordGuard } from '../auth/guards/must-change-password.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UsersService } from "./users.service.js"
import { CreateUserResponseDto } from './dto/user-response.dto.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, MustChangePasswordGuard)
export class UsersController {
    constructor(private readonly users: UsersService) { }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Create a user (admin only)' })
    @ApiResponse({ status: 201, description: 'User created' })
    @ApiResponse({ status: 400, description: 'Validation failed' })
    @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
    @ApiResponse({ status: 403, description: 'Not an admin, or must change password first' })
    @ApiResponse({ status: 409, description: 'Email already in use' })
    @ApiCreatedResponse({ type: CreateUserResponseDto })
    @ApiConflictResponse({ description: 'A user with this email already exists' })
    @ApiForbiddenResponse({ description: 'Caller is not an admin, or must change password first' })
    create(@Body() dto: CreateUserDto) {
        return this.users.create(dto);
    }
}