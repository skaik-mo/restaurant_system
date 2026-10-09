import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, Max, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';
import { MAX_LINES_PER_ORDER, MAX_QUANTITY_PER_LINE } from '../../guest.constants.js';

export class CreateGuestOrderItemDto {
    @ApiProperty({ example: EXAMPLES.menuItemId })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    menuItemId!: number;

    @ApiProperty({ example: EXAMPLES.orderQuantity, minimum: 1, maximum: MAX_QUANTITY_PER_LINE })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_QUANTITY_PER_LINE)
    quantity!: number;
}

export class CreateGuestOrderDto {
    @ApiProperty({ type: [CreateGuestOrderItemDto], minItems: 1, maxItems: MAX_LINES_PER_ORDER })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(MAX_LINES_PER_ORDER)
    @ValidateNested({ each: true })
    @Type(() => CreateGuestOrderItemDto)
    items!: CreateGuestOrderItemDto[];
}