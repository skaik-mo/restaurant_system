import { Body, Controller, Get, Header, Headers, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EnvelopeResponse } from '../common/http/envelope-response.decorator.js';
import { ApiErrorResponse } from '../common/swagger/api-error-response.decorator.js';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';
import { RateLimit } from '../common/throttler/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/throttler/rate-limit.guard.js';
import { GuestService } from './guest.service.js';
import { GUEST_ERRORS, GUEST_MESSAGES } from './guest.messages.js';
import {
    GUEST_MENU_LIMITS,
    GUEST_ORDER_CANCEL_LIMITS,
    GUEST_ORDER_CREATE_LIMITS,
    GUEST_ORDER_POLL_LIMITS,
    ORDER_TOKEN_HEADER,
    TABLE_TOKEN_HEADER,
} from './guest.constants.js';
import { CreateGuestOrderDto } from './dto/body/create-guest-order.dto.js';
import { GuestOrderIdParamDto } from './dto/params/guest-order-id-param.dto.js';
import { GuestMenuCategoryResponseDto } from './dto/response/guest-menu-response.dto.js';
import { GuestOrderCreatedResponseDto, GuestOrderStatusResponseDto } from './dto/response/guest-order-response.dto.js';

const NO_STORE = 'no-store';

@ApiTags('guest')
@ApiHeader({ name: 'X-Table-Token', required: true, description: 'Token from the table QR code' })
@Controller('guest')
export class GuestController {
    constructor(private readonly guestService: GuestService) { }

    @Get('menu')
    @Header('Cache-Control', NO_STORE)
    @UseGuards(RateLimitGuard)
    @RateLimit(GUEST_MENU_LIMITS)
    @ApiOperation({ summary: 'Available menu for the table behind the token' })
    @EnvelopeResponse({ status: 200, type: GuestMenuCategoryResponseDto, description: 'Categories with available items' })
    @ApiErrorResponse(401, GUEST_ERRORS.TABLE_TOKEN_INVALID)
    @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
    getMenu(@Headers(TABLE_TOKEN_HEADER) tableToken?: string): Promise<GuestMenuCategoryResponseDto[]> {
        return this.guestService.getMenu(tableToken);
    }

    @Post('orders')
    @Header('Cache-Control', NO_STORE)
    @UseGuards(RateLimitGuard)
    @RateLimit(GUEST_ORDER_CREATE_LIMITS)
    @ApiOperation({ summary: 'Place an order; the server prices it. The order token is returned once' })
    @EnvelopeResponse({ status: 201, type: GuestOrderCreatedResponseDto, message: GUEST_MESSAGES.ORDER_PLACED, description: 'Order placed' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED, GUEST_ERRORS.MENU_ITEM_NOT_FOUND, GUEST_ERRORS.ITEM_UNAVAILABLE)
    @ApiErrorResponse(401, GUEST_ERRORS.TABLE_TOKEN_INVALID)
    @ApiErrorResponse(409, GUEST_ERRORS.TABLE_LIMIT_REACHED)
    @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
    createOrder(
        @Body() dto: CreateGuestOrderDto,
        @Headers(TABLE_TOKEN_HEADER) tableToken?: string,
    ): Promise<GuestOrderCreatedResponseDto> {
        return this.guestService.createOrder(tableToken, dto);
    }

    @Get('orders/:id')
    @Header('Cache-Control', NO_STORE)
    @UseGuards(RateLimitGuard)
    @RateLimit(GUEST_ORDER_POLL_LIMITS)
    @ApiHeader({ name: 'X-Order-Token', required: true, description: 'Token returned when the order was placed' })
    @ApiOperation({ summary: 'Poll the status of your own order' })
    @EnvelopeResponse({ status: 200, type: GuestOrderStatusResponseDto, description: 'Order status' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, GUEST_ERRORS.TABLE_TOKEN_INVALID, GUEST_ERRORS.ORDER_TOKEN_INVALID)
    @ApiErrorResponse(404, GUEST_ERRORS.ORDER_NOT_FOUND)
    @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
    getOrderStatus(
        @Param() params: GuestOrderIdParamDto,
        @Headers(TABLE_TOKEN_HEADER) tableToken?: string,
        @Headers(ORDER_TOKEN_HEADER) orderToken?: string,
    ): Promise<GuestOrderStatusResponseDto> {
        return this.guestService.getOrderStatus(tableToken, orderToken, params.id);
    }

    @Post('orders/:id/cancel')
    @HttpCode(200)
    @Header('Cache-Control', NO_STORE)
    @UseGuards(RateLimitGuard)
    @RateLimit(GUEST_ORDER_CANCEL_LIMITS)
    @ApiHeader({ name: 'X-Order-Token', required: true, description: 'Token returned when the order was placed' })
    @ApiOperation({ summary: 'Cancel your own order while it is still pending (repeating the call is safe)' })
    @EnvelopeResponse({ status: 200, type: GuestOrderStatusResponseDto, description: 'Order is cancelled' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, GUEST_ERRORS.TABLE_TOKEN_INVALID, GUEST_ERRORS.ORDER_TOKEN_INVALID)
    @ApiErrorResponse(404, GUEST_ERRORS.ORDER_NOT_FOUND)
    @ApiErrorResponse(409, GUEST_ERRORS.ORDER_NOT_CANCELLABLE)
    @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED)
    cancelOrder(
        @Param() params: GuestOrderIdParamDto,
        @Headers(TABLE_TOKEN_HEADER) tableToken?: string,
        @Headers(ORDER_TOKEN_HEADER) orderToken?: string,
    ): Promise<GuestOrderStatusResponseDto> {
        return this.guestService.cancelOrder(tableToken, orderToken, params.id);
    }
}