import { toIsoTimestamp } from '../common/utils/timestamp.util.js';
import type { OrderResponseDto } from './dto/response/order-response.dto.js';

export interface OrderRecord {
    id: number;
    status: string;
    source: string;
    type: string;
    customerName: string | null;
    totalPrice: string;
    userId: number | null;
    tableId: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface OrderItemRecord {
    id: number;
    orderId: number;
    itemName: string;
    quantity: number;
    priceAtOrderTime: string;
}

// Allowlist: orderAccessTokenHash is never part of the staff response
export function toOrderResponseDto(
    order: OrderRecord,
    items: OrderItemRecord[],
    tableNumber: number | null,
): OrderResponseDto {
    return {
        id: order.id,
        status: order.status,
        source: order.source,
        type: order.type,
        customerName: order.customerName,
        totalPrice: order.totalPrice,
        tableId: order.tableId,
        tableNumber,
        userId: order.userId,
        items: items.map((item) => ({
            id: item.id,
            itemName: item.itemName,
            quantity: item.quantity,
            priceAtOrderTime: item.priceAtOrderTime,
        })),
        createdAt: toIsoTimestamp(order.createdAt),
        updatedAt: toIsoTimestamp(order.updatedAt),
    };
}
