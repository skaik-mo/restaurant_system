import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ORDER_TARGET_STATUSES, type OrderStatusValue } from '../../orders.constants.js';

export class UpdateOrderStatusDto {
    @ApiProperty({ example: 'PREPARING', enum: ORDER_TARGET_STATUSES })
    @IsIn(ORDER_TARGET_STATUSES)
    status!: OrderStatusValue;
}
