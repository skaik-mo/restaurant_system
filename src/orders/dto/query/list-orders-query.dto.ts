import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';
import { ORDER_LIST_DEFAULT_LIMIT, ORDER_LIST_MAX_LIMIT, ORDER_STATUSES, type OrderStatusValue } from '../../orders.constants.js';

export class ListOrdersQueryDto {
    @ApiPropertyOptional({ example: EXAMPLES.orderStatus, enum: ORDER_STATUSES, description: 'Only orders with this status' })
    @ValidateIf((_, value) => value !== undefined)
    @IsIn(ORDER_STATUSES)
    status?: OrderStatusValue;

    @ApiPropertyOptional({
        example: EXAMPLES.timestamp,
        description: 'Only orders updated strictly after this ISO 8601 timestamp (include the time zone, e.g. Z). Replaces the default window and ignores limit: every changed order is returned',
    })
    @ValidateIf((_, value) => value !== undefined)
    @IsISO8601({ strict: true, strictSeparator: true })
    @MaxLength(40)
    updatedSince?: string;

    @ApiPropertyOptional({
        example: EXAMPLES.orderLimit,
        minimum: 1,
        maximum: ORDER_LIST_MAX_LIMIT,
        default: ORDER_LIST_DEFAULT_LIMIT,
        description: 'Maximum number of closed (READY/CANCELLED) orders of today to return, newest kept. Open orders are always all returned. Ignored when updatedSince is set',
    })
    @ValidateIf((_, value) => value !== undefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(ORDER_LIST_MAX_LIMIT)
    limit?: number;
}
