import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MenuItemsService } from './menu-items.service.js';
import { MENU_ITEMS_ERRORS, MENU_ITEMS_MESSAGES } from './menu-items.messages.js';
import { MenuItemResponseDto } from './dto/response/menu-item-response.dto.js';
import { CreateMenuItemDto } from './dto/body/create-menu-item.dto.js';
import { UpdateMenuItemDto } from './dto/body/update-menu-item.dto.js';
import { UpdateMenuItemAvailabilityDto } from './dto/body/update-menu-item-availability.dto.js';
import { MenuItemIdParamDto } from './dto/params/menu-item-id-param.dto.js';
import { ListMenuItemsQueryDto } from './dto/query/list-menu-items-query.dto.js';
import { EnvelopeResponse } from '../common/http/envelope-response.decorator.js';
import { ApiErrorResponse } from '../common/swagger/api-error-response.decorator.js';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';
import { AUTH_ERRORS } from '../auth/auth.messages.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MustChangePasswordGuard } from '../auth/guards/must-change-password.guard.js';
import { USER_ROLES } from '../common/types/user-role.type.js';

@ApiTags('menu-items')
@ApiBearerAuth()
@Controller('menu-items')
@UseGuards(JwtAuthGuard, RolesGuard, MustChangePasswordGuard)
@Roles('ADMIN')
export class MenuItemsController {
    constructor(private readonly menuItemsService: MenuItemsService) { }

    @Get()
    @Roles(...USER_ROLES)
    @ApiOperation({ summary: 'List menu items (including unavailable ones), ordered by sortOrder then id' })
    @EnvelopeResponse({ status: 200, type: MenuItemResponseDto, description: 'Menu items' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    fetchAll(@Query() query: ListMenuItemsQueryDto): Promise<MenuItemResponseDto[]> {
        return this.menuItemsService.fetchAll(query.categoryId);
    }

    @Get(':id')
    @Roles(...USER_ROLES)
    @ApiOperation({ summary: 'Get one menu item' })
    @EnvelopeResponse({ status: 200, type: MenuItemResponseDto, description: 'The menu item' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, MENU_ITEMS_ERRORS.NOT_FOUND)
    findOne(@Param() params: MenuItemIdParamDto): Promise<MenuItemResponseDto> {
        return this.menuItemsService.findOne(params.id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a menu item (admin only)' })
    @EnvelopeResponse({ status: 201, type: MenuItemResponseDto, message: MENU_ITEMS_MESSAGES.CREATED, description: 'Menu item created' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED, MENU_ITEMS_ERRORS.CATEGORY_INVALID)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    create(@Body() dto: CreateMenuItemDto): Promise<MenuItemResponseDto> {
        return this.menuItemsService.create(dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a menu item (admin only; availability has its own route)' })
    @EnvelopeResponse({ status: 200, type: MenuItemResponseDto, message: MENU_ITEMS_MESSAGES.UPDATED, description: 'Menu item updated' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED, MENU_ITEMS_ERRORS.CATEGORY_INVALID)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, MENU_ITEMS_ERRORS.NOT_FOUND)
    update(@Param() params: MenuItemIdParamDto, @Body() dto: UpdateMenuItemDto): Promise<MenuItemResponseDto> {
        return this.menuItemsService.update(params.id, dto);
    }

    @Patch(':id/availability')
    @ApiOperation({ summary: 'Show or hide a menu item (admin only)' })
    @EnvelopeResponse({ status: 200, type: MenuItemResponseDto, message: MENU_ITEMS_MESSAGES.AVAILABILITY_UPDATED, description: 'Availability updated' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, MENU_ITEMS_ERRORS.NOT_FOUND)
    setAvailability(@Param() params: MenuItemIdParamDto, @Body() dto: UpdateMenuItemAvailabilityDto): Promise<MenuItemResponseDto> {
        return this.menuItemsService.setAvailability(params.id, dto.isAvailable);
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiOperation({ summary: 'Delete a menu item (admin only; past orders keep their snapshot)' })
    @EnvelopeResponse({ status: 204, description: 'Menu item deleted' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, MENU_ITEMS_ERRORS.NOT_FOUND)
    remove(@Param() params: MenuItemIdParamDto): Promise<void> {
        return this.menuItemsService.remove(params.id);
    }
}