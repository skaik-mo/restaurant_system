import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class CreateCategoryDto {
    @ApiProperty({ example: EXAMPLES.categoryName, maxLength: 60 })
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(60)
    name!: string

    @ApiPropertyOptional({ example: EXAMPLES.categorySortOrder, minimum: 0, maximum: 100000 })
    @ValidateIf((_, value) => value !== undefined)
    @IsInt()
    @Min(0)
    @Max(100000)
    sortOrder?: number
}