import type { ErrorDefinition } from '../common/errors/error-definition.js';

export const DINING_TABLES_ERRORS = {
    NOT_FOUND: { code: 'DINING_TABLE_NOT_FOUND', message: 'Dining table not found' },
    NUMBER_TAKEN: { code: 'DINING_TABLE_NUMBER_TAKEN', message: 'A dining table with this number already exists' },
    HAS_ORDERS: { code: 'DINING_TABLE_HAS_ORDERS', message: 'This dining table has orders and cannot be deleted' },
} as const satisfies Record<string, ErrorDefinition>;

export const DINING_TABLES_MESSAGES = {
    CREATED: 'Dining table created successfully',
    UPDATED: 'Dining table updated successfully',
    QR_TOKEN_ROTATED: 'Dining table QR token rotated successfully',
} as const;