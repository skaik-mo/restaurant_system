import { MINUTE_MS } from '../common/throttler/throttler.config.js';

// Admin user management: low traffic, but per-IP stays generous (restaurant NAT)
export const USER_ADMIN_LIMIT = {
  ip: { limit: 300, ttl: MINUTE_MS },
  user: { limit: 60, ttl: MINUTE_MS },
};
