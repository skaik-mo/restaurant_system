import { MINUTE_MS } from '../common/throttler/throttler.config.js';

export const TABLE_TOKEN_HEADER = 'x-table-token';
export const ORDER_TOKEN_HEADER = 'x-order-token';
export const MAX_HEADER_TOKEN_LENGTH = 128;

export const MAX_LINES_PER_ORDER = 20;
export const MAX_QUANTITY_PER_LINE = 20;
export const MAX_OPEN_ORDERS_PER_TABLE = 10;
export const OPEN_ORDER_STATUSES = ['PENDING', 'PREPARING'] as const;

export const GUEST_MENU_LIMITS = {
    ip: { limit: 300, ttl: MINUTE_MS },
    table: { limit: 60, ttl: MINUTE_MS },
};
export const GUEST_ORDER_CREATE_LIMITS = {
    ip: { limit: 30, ttl: MINUTE_MS },
    table: { limit: 10, ttl: MINUTE_MS },
};
export const GUEST_ORDER_POLL_LIMITS = {
    ip: { limit: 300, ttl: MINUTE_MS },
    table: { limit: 120, ttl: MINUTE_MS },
};
export const GUEST_ORDER_CANCEL_LIMITS = {
    ip: { limit: 30, ttl: MINUTE_MS },
    table: { limit: 10, ttl: MINUTE_MS },
};