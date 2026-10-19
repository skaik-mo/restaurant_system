import type { ErrorDefinition } from '../common/errors/error-definition.js';

export const GUEST_ERRORS = {
    TABLE_TOKEN_INVALID: { code: 'GUEST_TABLE_TOKEN_INVALID', message: 'Invalid table token' },
    ORDER_TOKEN_INVALID: { code: 'GUEST_ORDER_TOKEN_INVALID', message: 'Order token is required' },
    ORDER_NOT_FOUND: { code: 'GUEST_ORDER_NOT_FOUND', message: 'Order not found' },
    ORDER_NOT_CANCELLABLE: { code: 'GUEST_ORDER_NOT_CANCELLABLE', message: 'Only a pending order can be cancelled' },
    MENU_ITEM_NOT_FOUND: { code: 'ORDER_MENU_ITEM_NOT_FOUND', message: 'One or more menu items do not exist' },
    ITEM_UNAVAILABLE: { code: 'ORDER_ITEM_UNAVAILABLE', message: 'One or more menu items are not available' },
    TABLE_LIMIT_REACHED: { code: 'ORDER_TABLE_LIMIT_REACHED', message: 'This table has too many open orders' },
} as const satisfies Record<string, ErrorDefinition>;

export const GUEST_MESSAGES = {
    ORDER_PLACED: 'Order placed successfully',
} as const;