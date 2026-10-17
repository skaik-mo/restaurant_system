import { ApiProperty } from '@nestjs/swagger';
import { EXAMPLES } from '../../../common/swagger/api-examples.js';
import { ORDER_STATUSES } from '../../orders.constants.js';

export class OrderItemResponseDto {
    @ApiProperty({ example: EXAMPLES.orderItemId })
    id!: number;

    @ApiProperty({ example: EXAMPLES.menuItemName, description: 'Name at the time of the order' })
    itemName!: string;

    @ApiProperty({ example: EXAMPLES.orderQuantity })
    quantity!: number;

    @ApiProperty({ example: EXAMPLES.menuItemPrice, description: 'Unit price at the time of the order' })
    priceAtOrderTime!: string;
}

export class OrderResponseDto {
    @ApiProperty({ example: EXAMPLES.orderId })
    id!: number;

    @ApiProperty({ example: EXAMPLES.orderStatus, enum: ORDER_STATUSES })
    status!: string;

    @ApiProperty({ example: EXAMPLES.orderSource, enum: ['QR_TABLE', 'WAITER'] })
    source!: string;

    @ApiProperty({ example: EXAMPLES.orderType, enum: ['DINE_IN', 'TAKEAWAY'] })
    type!: string;

    @ApiProperty({ example: EXAMPLES.orderCustomerName, nullable: true, type: String })
    customerName!: string | null;

    @ApiProperty({ example: EXAMPLES.orderTotalPrice })
    totalPrice!: string;

    @ApiProperty({ example: EXAMPLES.diningTableId, nullable: true, type: Number })
    tableId!: number | null;

    @ApiProperty({ example: EXAMPLES.diningTableNumber, nullable: true, type: Number })
    tableNumber!: number | null;

    @ApiProperty({ example: EXAMPLES.userId, nullable: true, type: Number, description: 'Staff member who created the order (null for QR orders)' })
    userId!: number | null;

    @ApiProperty({ type: [OrderItemResponseDto] })
    items!: OrderItemResponseDto[];

    @ApiProperty({ example: EXAMPLES.timestamp })
    createdAt!: string;

    @ApiProperty({ example: EXAMPLES.timestamp })
    updatedAt!: string;
}
