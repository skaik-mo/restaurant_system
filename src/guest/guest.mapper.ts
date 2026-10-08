import { toIsoTimestamp } from '../common/utils/timestamp.util.js';
import type { GuestMenuCategoryResponseDto } from './dto/response/guest-menu-response.dto.js';
import type { GuestOrderStatusResponseDto } from './dto/response/guest-order-response.dto.js';

interface CategoryRecord { id: number; name: string; sortOrder: number }
interface MenuItemRecord {
    id: number;
    name: string;
    description: string | null;
    price: string;
    imageUrl: string | null;
    categoryId: number;
    sortOrder: number;
}
interface OrderStatusRecord { id: number; status: string; updatedAt: string }

const bySortOrder = (a: { sortOrder: number; id: number }, b: { sortOrder: number; id: number }) =>
    a.sortOrder - b.sortOrder || a.id - b.id;

// Categories without available items are omitted; no timestamps, no isAvailable
export function toGuestMenu(categories: CategoryRecord[], items: MenuItemRecord[]): GuestMenuCategoryResponseDto[] {
    return [...categories]
        .sort(bySortOrder)
        .map((category) => ({
            id: category.id,
            name: category.name,
            items: items
                .filter((item) => item.categoryId === category.id)
                .sort(bySortOrder)
                .map((item) => ({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    imageUrl: item.imageUrl,
                })),
        }))
        .filter((category) => category.items.length > 0);
}

export function toGuestOrderStatus(order: OrderStatusRecord): GuestOrderStatusResponseDto {
    return { id: order.id, status: order.status, updatedAt: toIsoTimestamp(order.updatedAt) };
}