import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service.js'
import { COMMON_ERRORS } from '../common/errors/common.errors.js'
import { isForeignKeyViolation } from '../common/utils/db-error.util.js'
import { MENU_ITEMS_ERRORS } from './menu-items.messages.js'
import { toMenuItemResponseDto } from './menu-item.mapper.js'
import { toMoney } from '../common/utils/numeric.util.js'
import type { MenuItemResponseDto } from './dto/response/menu-item-response.dto.js'
import type { CreateMenuItemDto } from './dto/body/create-menu-item.dto.js'
import type { UpdateMenuItemDto } from './dto/body/update-menu-item.dto.js'

// Verified by experiment (insert and update both raise it); re-verify if the foreign key definition changes
const MENU_ITEM_CATEGORY_FK = 'menuItem_categoryId_fkey'

@Injectable()
export class MenuItemsService {
    constructor(private readonly db: DatabaseService) { }

    private get items() {
        return this.db.client.orm.public.MenuItem
    }

    private rethrowCategoryInvalid(err: unknown): void {
        if (isForeignKeyViolation(err, MENU_ITEM_CATEGORY_FK)) {
            throw new BadRequestException(MENU_ITEMS_ERRORS.CATEGORY_INVALID)
        }
    }

    async fetchAll(categoryId?: number): Promise<MenuItemResponseDto[]> {
        const rows = categoryId === undefined
            ? await this.items.all()
            : await this.items.where({ categoryId }).all()
        return rows
            .map(toMenuItemResponseDto)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    }

    async findOne(id: number): Promise<MenuItemResponseDto> {
        const row = await this.items.where({ id }).first()
        if (!row) {
            throw new NotFoundException(MENU_ITEMS_ERRORS.NOT_FOUND)
        }
        return toMenuItemResponseDto(row)
    }

    async create(dto: CreateMenuItemDto): Promise<MenuItemResponseDto> {
        try {
            const row = await this.items.create({
                name: dto.name,
                price: toMoney(dto.price),
                categoryId: dto.categoryId,
                isAvailable: dto.isAvailable ?? true,
                sortOrder: dto.sortOrder ?? 0,
                ...(dto.description !== undefined ? { description: dto.description } : {}),
                ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
            })
            return toMenuItemResponseDto(row)
        } catch (err: unknown) {
            this.rethrowCategoryInvalid(err)
            throw err
        }
    }

    async update(id: number, dto: UpdateMenuItemDto): Promise<MenuItemResponseDto> {
        const data = {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.description !== undefined ? { description: dto.description } : {}),
            ...(dto.price !== undefined ? { price: toMoney(dto.price) } : {}),
            ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
            ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
            ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        }
        if (Object.keys(data).length === 0) {
            throw new BadRequestException({
                code: COMMON_ERRORS.VALIDATION_FAILED.code,
                message: COMMON_ERRORS.VALIDATION_FAILED.message,
                details: [{ field: 'body', message: 'At least one field must be provided' }],
            })
        }
        try {
            const row = await this.items.where({ id }).update(data)
            if (!row) {
                throw new NotFoundException(MENU_ITEMS_ERRORS.NOT_FOUND)
            }
            return toMenuItemResponseDto(row)
        } catch (err: unknown) {
            this.rethrowCategoryInvalid(err)
            throw err
        }
    }

    async setAvailability(id: number, isAvailable: boolean): Promise<MenuItemResponseDto> {
        const row = await this.items.where({ id }).update({ isAvailable })
        if (!row) {
            throw new NotFoundException(MENU_ITEMS_ERRORS.NOT_FOUND)
        }
        return toMenuItemResponseDto(row)
    }

    async remove(id: number): Promise<void> {
        const deleted = await this.items.where({ id }).deleteAndCount()
        if (deleted !== 1) {
            throw new NotFoundException(MENU_ITEMS_ERRORS.NOT_FOUND)
        }
    }
}