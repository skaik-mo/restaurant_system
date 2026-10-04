import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class ListMenuItemsQueryDto {
    @ApiPropertyOptional({ example: EXAMPLES.categoryId, minimum: 1, description: 'Only items of this category' })
    @ValidateIf((_, value) => value !== undefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    categoryId?: number
}