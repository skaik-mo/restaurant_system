import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EnvelopeResponse } from '../common/http/envelope-response.decorator.js';
import { ApiErrorResponse } from '../common/swagger/api-error-response.decorator.js';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';
import { AUTH_ERRORS } from '../auth/auth.messages.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MustChangePasswordGuard } from '../auth/guards/must-change-password.guard.js';
import { USER_ROLES } from '../common/types/user-role.type.js';
import { RateLimit } from '../common/throttler/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/throttler/rate-limit.guard.js';
import { MINUTE_MS } from '../common/throttler/throttler.config.js';
import { DiningTablesService } from './dining-tables.service.js';
import { DINING_TABLES_ERRORS, DINING_TABLES_MESSAGES } from './dining-tables.messages.js';
import { QR_ROTATE_LIMIT } from './dining-tables.constants.js';
import { DiningTableResponseDto } from './dto/response/dining-table-response.dto.js';
import { DiningTableQrTokenResponseDto } from './dto/response/dining-table-qr-token-response.dto.js';
import { CreateDiningTableDto } from './dto/body/create-dining-table.dto.js';
import { UpdateDiningTableDto } from './dto/body/update-dining-table.dto.js';
import { DiningTableIdParamDto } from './dto/params/dining-table-id-param.dto.js';

@ApiTags('dining-tables')
@ApiBearerAuth()
@Controller('dining-tables')
@UseGuards(JwtAuthGuard, RolesGuard, MustChangePasswordGuard)
@Roles('ADMIN')
export class DiningTablesController {
    constructor(private readonly diningTablesService: DiningTablesService) { }

    @Get()
    @Roles(...USER_ROLES)
    @ApiOperation({ summary: 'List dining tables ordered by number (no QR token)' })
    @EnvelopeResponse({ status: 200, type: DiningTableResponseDto, description: 'Dining tables' })
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    fetchAll(): Promise<DiningTableResponseDto[]> {
        return this.diningTablesService.fetchAll();
    }

    @Get(':id')
    @Roles(...USER_ROLES)
    @ApiOperation({ summary: 'Get one dining table (no QR token)' })
    @EnvelopeResponse({ status: 200, type: DiningTableResponseDto, description: 'The dining table' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, DINING_TABLES_ERRORS.NOT_FOUND)
    findOne(@Param() params: DiningTableIdParamDto): Promise<DiningTableResponseDto> {
        return this.diningTablesService.findOne(params.id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a dining table; the server generates its QR token (admin only)' })
    @EnvelopeResponse({ status: 201, type: DiningTableResponseDto, message: DINING_TABLES_MESSAGES.CREATED, description: 'Dining table created' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(409, DINING_TABLES_ERRORS.NUMBER_TAKEN)
    create(@Body() dto: CreateDiningTableDto): Promise<DiningTableResponseDto> {
        return this.diningTablesService.create(dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Change a dining table number (admin only)' })
    @EnvelopeResponse({ status: 200, type: DiningTableResponseDto, message: DINING_TABLES_MESSAGES.UPDATED, description: 'Dining table updated' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, DINING_TABLES_ERRORS.NOT_FOUND)
    @ApiErrorResponse(409, DINING_TABLES_ERRORS.NUMBER_TAKEN)
    update(@Param() params: DiningTableIdParamDto, @Body() dto: UpdateDiningTableDto): Promise<DiningTableResponseDto> {
        return this.diningTablesService.update(params.id, dto);
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiOperation({ summary: 'Delete a dining table without orders (admin only)' })
    @EnvelopeResponse({ status: 204, description: 'Dining table deleted' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, DINING_TABLES_ERRORS.NOT_FOUND)
    @ApiErrorResponse(409, DINING_TABLES_ERRORS.HAS_ORDERS)
    remove(@Param() params: DiningTableIdParamDto): Promise<void> {
        return this.diningTablesService.remove(params.id);
    }

    @Get(':id/qr-token')
    @ApiOperation({ summary: 'Get the current QR token of a dining table (admin only)' })
    @EnvelopeResponse({ status: 200, type: DiningTableQrTokenResponseDto, description: 'The current QR token' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, DINING_TABLES_ERRORS.NOT_FOUND)
    getQrToken(@Param() params: DiningTableIdParamDto): Promise<DiningTableQrTokenResponseDto> {
        return this.diningTablesService.getQrToken(params.id);
    }

    @Post(':id/qr-token/rotate')
    @HttpCode(200)
    @UseGuards(RateLimitGuard)
    @RateLimit({ user: { limit: QR_ROTATE_LIMIT, ttl: MINUTE_MS } })
    @ApiOperation({ summary: 'Rotate the QR token; the old token stops working immediately (admin only)' })
    @EnvelopeResponse({ status: 200, type: DiningTableQrTokenResponseDto, message: DINING_TABLES_MESSAGES.QR_TOKEN_ROTATED, description: 'The new QR token' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, DINING_TABLES_ERRORS.NOT_FOUND)
    @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
    rotateQrToken(@Param() params: DiningTableIdParamDto): Promise<DiningTableQrTokenResponseDto> {
        return this.diningTablesService.rotateQrToken(params.id);
    }
}