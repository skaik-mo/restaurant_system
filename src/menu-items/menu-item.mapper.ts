import { toIsoTimestamp } from '../common/utils/timestamp.util.js';
import type { MenuItemResponseDto } from './dto/response/menu-item-response.dto.js';

export interface MenuItemRecord {
    id: number;
    name: string;
    description: string | null;
    price: string;
    imageUrl: string | null;
    categoryId: number;
    isAvailable: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

// price is passed through as the exact string Postgres returns (verified: Numeric(10,2) always has 2 decimals)
export function toMenuItemResponseDto(item: MenuItemRecord): MenuItemResponseDto {
    return {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        categoryId: item.categoryId,
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder,
        createdAt: toIsoTimestamp(item.createdAt),
        updatedAt: toIsoTimestamp(item.updatedAt),
    };
}