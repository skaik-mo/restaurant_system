import { MINUTE_MS } from '../common/throttler/throttler.config.js';
import type { UserRole } from '../common/types/user-role.type.js';

export const ORDER_STATUSES = ['PENDING', 'PREPARING', 'READY', 'CANCELLED'] as const;
export const ORDER_TARGET_STATUSES = ['PREPARING', 'READY', 'CANCELLED'] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

export const ORDER_LIST_DEFAULT_LIMIT = 100;
export const ORDER_LIST_MAX_LIMIT = 200;

// from -> to -> roles allowed to make the move. READY and CANCELLED are terminal (absent).
export const ORDER_TRANSITIONS: Record<string, Record<string, readonly UserRole[]>> = {
    PENDING: { PREPARING: ['KITCHEN', 'ADMIN'], CANCELLED: ['WAITER', 'ADMIN'] },
    PREPARING: { READY: ['KITCHEN', 'ADMIN'], CANCELLED: ['WAITER', 'ADMIN'] },
};

export const ORDER_READ_LIMIT = { ip: { limit: 600, ttl: MINUTE_MS }, user: { limit: 120, ttl: MINUTE_MS } };
export const ORDER_STATUS_CHANGE_LIMIT = { ip: { limit: 300, ttl: MINUTE_MS }, user: { limit: 60, ttl: MINUTE_MS } };
