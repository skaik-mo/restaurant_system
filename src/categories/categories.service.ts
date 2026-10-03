import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common' 
import { DatabaseService } from '../database/database.service.js' 
import { CategoryResponseDto } from './dto/response/category-response.dto.js' 
import { toCategoryResponseDto } from './category.mapper.js' 
import { CreateCategoryDto } from './dto/body/create-category.dto.js' 
import { CATEGORIES_ERRORS } from './categories.messages.js' 
import { isForeignKeyViolation, isUniqueViolation } from '../common/utils/db-error.util.js' 
import { COMMON_ERRORS } from '../common/errors/common.errors.js' 
import { UpdateCategoryDto } from './dto/body/update-category.dto.js'

// Names include a hash suffix: re-verify both if the index / foreign key definitions ever change
const CATEGORY_NAME_UNIQUE_CONSTRAINT = 'category_name_lower_e40b0be1' 
const MENU_ITEM_CATEGORY_FK = 'menuItem_categoryId_fkey' 

@Injectable()
export class CategoriesService {
    constructor(private readonly db: DatabaseService) { }

    private get categories() {
        return this.db.client.orm.public.Category
    }

    private rethrowNameTaken(err: unknown): void {
        if (isUniqueViolation(err, CATEGORY_NAME_UNIQUE_CONSTRAINT)) {
            throw new ConflictException(CATEGORIES_ERRORS.NAME_TAKEN)
        }
    }

    async fetchAll(): Promise<CategoryResponseDto[]> {
        const rows = await this.categories.all() 
        return rows
            .map(toCategoryResponseDto)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    }

    async findOne(id: number): Promise<CategoryResponseDto> {
        const row = await this.categories.where({ id }).first() 
        if (!row) {
            throw new NotFoundException(CATEGORIES_ERRORS.NOT_FOUND) 
        }
        return toCategoryResponseDto(row) 
    }

    async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
        try {
            const row = await this.categories.create({ name: dto.name, sortOrder: dto.sortOrder ?? 0 })
            return toCategoryResponseDto(row)
        } catch (err: unknown) {
            this.rethrowNameTaken(err)
            throw err
        }
    }

    async update(id: number, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
        const data = {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
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
            const row = await this.categories.where({ id }).update(data) 
            if (!row) {
                throw new NotFoundException(CATEGORIES_ERRORS.NOT_FOUND) 
            }
            return toCategoryResponseDto(row) 
        } catch (err: unknown) {
            this.rethrowNameTaken(err) 
            throw err 
        }
    }

    async remove(id: number): Promise<void> {
        let deleted: number
        try {
            deleted = await this.categories.where({ id }).deleteAndCount() 
        } catch (err: unknown) {
            if (isForeignKeyViolation(err, MENU_ITEM_CATEGORY_FK)) {
                throw new ConflictException(CATEGORIES_ERRORS.HAS_ITEMS) 
            }
            throw err 
        }
        if (deleted !== 1) {
            throw new NotFoundException(CATEGORIES_ERRORS.NOT_FOUND) 
        }
    }
}
