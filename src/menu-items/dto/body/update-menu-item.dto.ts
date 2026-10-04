import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUrl, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { Trim } from '../../../common/transforms/trim.transform.js';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';
import { IsMenuItemPrice } from '../../validators/is-menu-item-price.decorator.js';
import { MENU_ITEM_MAX_PRICE } from '../../menu-items.constants.js';

export class UpdateMenuItemDto {
    @ApiPropertyOptional({ example: EXAMPLES.menuItemName, maxLength: 100 })
    @ValidateIf((_, value) => value !== undefined)
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name?: string

    @ApiPropertyOptional({ example: EXAMPLES.menuItemDescription, maxLength: 500, nullable: true, description: 'null clears the description' })
    @ValidateIf((_, value) => value !== undefined && value !== null)
    @IsString()
    @MaxLength(500)
    description?: string | null

    @ApiPropertyOptional({ example: EXAMPLES.menuItemPrice, type: String, description: `Decimal string, > 0 and <= ${MENU_ITEM_MAX_PRICE}, at most 2 decimals` })
    @ValidateIf((_, value) => value !== undefined)
    @IsMenuItemPrice()
    price?: string

    @ApiPropertyOptional({ example: EXAMPLES.menuItemImageUrl, maxLength: 2048, nullable: true, description: 'null clears the image' })
    @ValidateIf((_, value) => value !== undefined && value !== null)
    @IsString()
    @MaxLength(2048)
    @IsUrl({ protocols: ['https'], require_protocol: true, disallow_auth: true })
    imageUrl?: string | null

    @ApiPropertyOptional({ example: EXAMPLES.categoryId, minimum: 1 })
    @ValidateIf((_, value) => value !== undefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    categoryId?: number

    @ApiPropertyOptional({ example: EXAMPLES.menuItemSortOrder, minimum: 0, maximum: 100000 })
    @ValidateIf((_, value) => value !== undefined)
    @IsInt()
    @Min(0)
    @Max(100000)
    sortOrder?: number
}