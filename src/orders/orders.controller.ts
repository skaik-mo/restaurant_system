import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EnvelopeResponse } from '../common/http/envelope-response.decorator.js';
import { ApiErrorResponse } from '../common/swagger/api-error-response.decorator.js';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';
import { AUTH_ERRORS } from '../auth/auth.messages.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MustChangePasswordGuard } from '../auth/guards/must-change-password.guard.js';
import type { JwtPayload } from '../auth/strategies/jwt.strategy.js';
import { USER_ROLES, type UserRole } from '../common/types/user-role.type.js';
import { RateLimit } from '../common/throttler/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/throttler/rate-limit.guard.js';
import { GUEST_ERRORS } from '../guest/guest.messages.js';
import { OrdersService } from './orders.service.js';
import { ORDERS_ERRORS, ORDERS_MESSAGES } from './orders.messages.js';
import { ORDER_CREATE_LIMIT, ORDER_READ_LIMIT, ORDER_STATUS_CHANGE_LIMIT } from './orders.constants.js';
import { OrderResponseDto } from './dto/response/order-response.dto.js';
import { OrderIdParamDto } from './dto/params/order-id-param.dto.js';
import { ListOrdersQueryDto } from './dto/query/list-orders-query.dto.js';
import { UpdateOrderStatusDto } from './dto/body/update-order-status.dto.js';
import { CreateOrderDto } from './dto/body/create-order.dto.js';
import { CreateTakeawayOrderDto } from './dto/body/create-takeaway-order.dto.js';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard, MustChangePasswordGuard)
@Roles('ADMIN')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @Roles('WAITER', 'ADMIN')
    @UseGuards(RateLimitGuard)
    @RateLimit(ORDER_CREATE_LIMIT)
    @ApiOperation({ summary: 'Create a dine-in order for a table on behalf of a guest (waiter or admin)' })
    @EnvelopeResponse({ status: 201, type: OrderResponseDto, message: ORDERS_MESSAGES.CREATED, description: 'The created order' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED, ORDERS_ERRORS.TABLE_NOT_FOUND, GUEST_ERRORS.MENU_ITEM_NOT_FOUND, GUEST_ERRORS.ITEM_UNAVAILABLE)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(409, GUEST_ERRORS.TABLE_LIMIT_REACHED)
    @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
    create(@Body() dto: CreateOrderDto, @Req() req: { user: JwtPayload }): Promise<OrderResponseDto> {
        return this.ordersService.create(dto, req.user.sub);
    }

    @Post('takeaway')
    @Roles('WAITER', 'ADMIN')
    @UseGuards(RateLimitGuard)
    @RateLimit(ORDER_CREATE_LIMIT)
    @ApiOperation({ summary: 'Create a takeaway order (no table) for a named customer (waiter or admin)' })
    @EnvelopeResponse({ status: 201, type: OrderResponseDto, message: ORDERS_MESSAGES.CREATED, description: 'The created takeaway order' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED, GUEST_ERRORS.MENU_ITEM_NOT_FOUND, GUEST_ERRORS.ITEM_UNAVAILABLE)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
    createTakeaway(@Body() dto: CreateTakeawayOrderDto, @Req() req: { user: JwtPayload }): Promise<OrderResponseDto> {
        return this.ordersService.createTakeaway(dto, req.user.sub);
    }

    @Get()
    @Roles(...USER_ROLES)
    @UseGuards(RateLimitGuard)
    @RateLimit(ORDER_READ_LIMIT)
    @ApiOperation({ summary: 'List orders: today (business day) plus older open orders, or everything updated after updatedSince' })
    @EnvelopeResponse({ status: 200, type: OrderResponseDto, description: 'Orders sorted by createdAt then id' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
    list(@Query() query: ListOrdersQueryDto): Promise<OrderResponseDto[]> {
        return this.ordersService.list(query);
    }

    @Get(':id')
    @Roles(...USER_ROLES)
    @UseGuards(RateLimitGuard)
    @RateLimit(ORDER_READ_LIMIT)
    @ApiOperation({ summary: 'Get one order with its item snapshots' })
    @EnvelopeResponse({ status: 200, type: OrderResponseDto, description: 'The order' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, ORDERS_ERRORS.NOT_FOUND)
    @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
    findOne(@Param() params: OrderIdParamDto): Promise<OrderResponseDto> {
        return this.ordersService.findOne(params.id);
    }

    @Patch(':id/status')
    @Roles(...USER_ROLES)
    @UseGuards(RateLimitGuard)
    @RateLimit(ORDER_STATUS_CHANGE_LIMIT)
    @ApiOperation({ summary: 'Move an order to the next status. Kitchen: PREPARING and READY. Waiter: CANCELLED. Admin: all' })
    @EnvelopeResponse({ status: 200, type: OrderResponseDto, message: ORDERS_MESSAGES.STATUS_UPDATED, description: 'The updated order' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED, ORDERS_ERRORS.TRANSITION_FORBIDDEN)
    @ApiErrorResponse(404, ORDERS_ERRORS.NOT_FOUND)
    @ApiErrorResponse(409, ORDERS_ERRORS.TRANSITION_NOT_ALLOWED, ORDERS_ERRORS.STATUS_CHANGED)
    @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
    changeStatus(
        @Param() params: OrderIdParamDto,
        @Body() dto: UpdateOrderStatusDto,
        @Req() req: { user: JwtPayload },
    ): Promise<OrderResponseDto> {
        return this.ordersService.changeStatus(params.id, dto.status, req.user.role as UserRole);
    }
}
