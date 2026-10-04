import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';

export class MenuItemIdParamDto {
    @ApiProperty({ example: EXAMPLES.menuItemId, minimum: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    id!: number
}