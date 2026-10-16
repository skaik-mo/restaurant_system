import { Injectable } from '@nestjs/common';
import { MAX_STREAMS_PER_IP, MAX_STREAMS_PER_USER } from './realtime.constants.js';

/** Counts open streams per user and per IP (in memory, single instance). */
@Injectable()
export class StreamLimiter {
    private readonly byUser = new Map<number, number>();
    private readonly byIp = new Map<string, number>();

    // Returns an idempotent release function, or null when a cap is reached. Synchronous, so it cannot race.
    acquire(userId: number, ip: string): (() => void) | null {
        if ((this.byUser.get(userId) ?? 0) >= MAX_STREAMS_PER_USER) {
            return null;
        }
        if ((this.byIp.get(ip) ?? 0) >= MAX_STREAMS_PER_IP) {
            return null;
        }
        this.increment(this.byUser, userId);
        this.increment(this.byIp, ip);

        let released = false;
        return () => {
            if (released) {
                return;
            }
            released = true;
            this.decrement(this.byUser, userId);
            this.decrement(this.byIp, ip);
        };
    }

    private increment<K>(counts: Map<K, number>, key: K): void {
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    private decrement<K>(counts: Map<K, number>, key: K): void {
        const next = (counts.get(key) ?? 0) - 1;
        if (next <= 0) {
            counts.delete(key);
        } else {
            counts.set(key, next);
        }
    }
}
