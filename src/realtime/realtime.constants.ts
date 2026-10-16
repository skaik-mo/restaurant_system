import { MINUTE_MS } from '../common/throttler/throttler.config.js';

export const STREAM_HEARTBEAT_MS = 15_000;
export const MAX_STREAMS_PER_USER = 5;
export const MAX_STREAMS_PER_IP = 30;
export const MAX_STREAM_BUFFERED_BYTES = 1_048_576;
// setTimeout cannot take more than a signed 32-bit number of milliseconds
export const MAX_TIMER_MS = 2_147_483_647;

// Connection attempts per minute; the open-stream caps above are enforced separately
export const REALTIME_CONNECT_LIMIT = {
    ip: { limit: 300, ttl: MINUTE_MS },
    user: { limit: 30, ttl: MINUTE_MS },
};

export const REALTIME_EVENT_NAMES = ['order.created', 'order.updated', 'table.updated'] as const;
