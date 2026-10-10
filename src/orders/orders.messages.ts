import type { ErrorDefinition } from '../common/errors/error-definition.js';

export const ORDERS_ERRORS = {
    NOT_FOUND: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
    TRANSITION_NOT_ALLOWED: { code: 'ORDER_TRANSITION_NOT_ALLOWED', message: 'This status change is not allowed for the order' },
    TRANSITION_FORBIDDEN: { code: 'ORDER_TRANSITION_FORBIDDEN', message: 'Your role may not make this status change' },
    STATUS_CHANGED: { code: 'ORDER_STATUS_CHANGED', message: 'The order status was changed by someone else. Reload and try again' },
} as const satisfies Record<string, ErrorDefinition>;

export const ORDERS_MESSAGES = {
    STATUS_UPDATED: 'Order status updated successfully',
} as const;
