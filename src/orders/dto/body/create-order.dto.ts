import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';
import { Trim } from '../../../common/transforms/trim.transform.js';
import { CreateGuestOrderItemDto } from '../../../guest/dto/body/create-guest-order.dto.js';
import { MAX_LINES_PER_ORDER } from '../../../guest/guest.constants.js';
import { ORDER_CUSTOMER_NAME_MAX_LENGTH } from '../../orders.constants.js';

export class CreateOrderDto {
    @ApiProperty({ example: EXAMPLES.tableId })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    tableId!: number;

    @ApiPropertyOptional({ example: EXAMPLES.orderCustomerName, maxLength: ORDER_CUSTOMER_NAME_MAX_LENGTH })
    @ValidateIf((_, v) => v !== undefined)
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(ORDER_CUSTOMER_NAME_MAX_LENGTH)
    customerName?: string;

    @ApiProperty({ type: [CreateGuestOrderItemDto], minItems: 1, maxItems: MAX_LINES_PER_ORDER })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(MAX_LINES_PER_ORDER)
    @ValidateNested({ each: true })
    @Type(() => CreateGuestOrderItemDto)
    items!: CreateGuestOrderItemDto[];
}
