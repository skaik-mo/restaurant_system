import type { Models } from '../../prisma/contract.d.ts';

export type UserRole = Models.public_User['role'];

export const USER_ROLES = ['ADMIN', 'KITCHEN', 'WAITER'] as const satisfies readonly UserRole[];
