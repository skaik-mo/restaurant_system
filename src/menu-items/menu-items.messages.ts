import type { ErrorDefinition } from '../common/errors/error-definition.js';

export const MENU_ITEMS_ERRORS = {
    NOT_FOUND: { code: 'MENU_ITEM_NOT_FOUND', message: 'Menu item not found' },
    CATEGORY_INVALID: { code: 'MENU_ITEM_CATEGORY_INVALID', message: 'The selected category does not exist' },
} as const satisfies Record<string, ErrorDefinition>;

export const MENU_ITEMS_MESSAGES = {
    CREATED: 'Menu item created successfully',
    UPDATED: 'Menu item updated successfully',
    AVAILABILITY_UPDATED: 'Menu item availability updated successfully',
} as const;