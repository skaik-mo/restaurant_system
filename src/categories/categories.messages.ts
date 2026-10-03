import type { ErrorDefinition } from '../common/errors/error-definition.js';

export const CATEGORIES_ERRORS = {
  NOT_FOUND: { code: 'MENU_CATEGORY_NOT_FOUND', message: 'Category not found' },
  NAME_TAKEN: { code: 'MENU_CATEGORY_NAME_TAKEN', message: 'A category with this name already exists' },
  HAS_ITEMS: { code: 'MENU_CATEGORY_HAS_ITEMS', message: 'Category still has menu items; move or delete them first' },
} as const satisfies Record<string, ErrorDefinition>;

export const CATEGORIES_MESSAGES = {
  CREATED: 'Category created successfully',
  UPDATED: 'Category updated successfully',
} as const;