import { MINUTE_MS } from '../common/throttler/throttler.config.js';

export const DINING_TABLE_NUMBER_MIN = 1;
export const DINING_TABLE_NUMBER_MAX = 9999;
export const QR_ROTATE_LIMIT = 10;

export const DINING_TABLE_STATUSES = ['AVAILABLE', 'BUSY'] as const;
export type DiningTableStatusValue = (typeof DINING_TABLE_STATUSES)[number];

export const DINING_TABLE_STATUS_LIMIT = { ip: { limit: 300, ttl: MINUTE_MS }, user: { limit: 60, ttl: MINUTE_MS } };
