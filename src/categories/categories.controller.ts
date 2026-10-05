import { Body, Controller, Get, Post, UseGuards, Param, Patch, Delete, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service.js';
import { CategoryResponseDto } from './dto/response/category-response.dto.js';
import { EnvelopeResponse } from '../common/http/envelope-response.decorator.js';
import { ApiErrorResponse } from '../common/swagger/api-error-response.decorator.js';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';
import { CATEGORIES_ERRORS, CATEGORIES_MESSAGES } from './categories.messages.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateCategoryDto } from './dto/body/create-category.dto.js';
import { AUTH_ERRORS } from '../auth/auth.messages.js';
import { MustChangePasswordGuard } from '../auth/guards/must-change-password.guard.js';
import { USER_ROLES } from '../common/types/user-role.type.js';
import { CategoryIdParamDto } from './dto/params/category-id-param.dto.js';
import { UpdateCategoryDto } from './dto/body/update-category.dto.js';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard, MustChangePasswordGuard)
@Roles('ADMIN')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    @Roles(...USER_ROLES)
    @ApiOperation({ summary: 'List categories, ordered by sortOrder then id' })
    @EnvelopeResponse({ status: 200, type: CategoryResponseDto, description: 'All categories' })
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    fetchAll(): Promise<CategoryResponseDto[]> {
        return this.categoriesService.fetchAll();
    }

    @Get(':id')
    @Roles(...USER_ROLES)
    @ApiOperation({ summary: 'Get one category' })
    @EnvelopeResponse({ status: 200, type: CategoryResponseDto, description: 'The category' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, CATEGORIES_ERRORS.NOT_FOUND)
    findOne(@Param() params: CategoryIdParamDto): Promise<CategoryResponseDto> {
        return this.categoriesService.findOne(params.id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a category (admin only)' })
    @EnvelopeResponse({ status: 201, type: CategoryResponseDto, message: CATEGORIES_MESSAGES.CREATED, description: 'Category created' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(409, CATEGORIES_ERRORS.NAME_TAKEN)
    create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
        return this.categoriesService.create(dto)
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a category (admin only)' })
    @EnvelopeResponse({ status: 200, type: CategoryResponseDto, message: CATEGORIES_MESSAGES.UPDATED, description: 'Category updated' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, CATEGORIES_ERRORS.NOT_FOUND)
    @ApiErrorResponse(409, CATEGORIES_ERRORS.NAME_TAKEN)
    update(@Param() params: CategoryIdParamDto, @Body() dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
        return this.categoriesService.update(params.id, dto);
    }

    @Delete(':id')
    @HttpCode(204)
    @ApiOperation({ summary: 'Delete an empty category (admin only)' })
    @EnvelopeResponse({ status: 204, description: 'Category deleted' })
    @ApiErrorResponse(400, COMMON_ERRORS.VALIDATION_FAILED)
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(404, CATEGORIES_ERRORS.NOT_FOUND)
    @ApiErrorResponse(409, CATEGORIES_ERRORS.HAS_ITEMS)
    remove(@Param() params: CategoryIdParamDto): Promise<void> {
        return this.categoriesService.remove(params.id);
    }
}