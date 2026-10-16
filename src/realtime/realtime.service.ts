import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ServerResponse } from 'node:http';
import { interval, map, merge, takeUntil, timer, type Observable } from 'rxjs';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';
import { RealtimeBus } from './realtime.bus.js';
import { StreamLimiter } from './stream-limiter.service.js';
import { HEARTBEAT_FRAME, formatEvent } from './realtime.frames.js';
import { MAX_STREAM_BUFFERED_BYTES, MAX_TIMER_MS, STREAM_HEARTBEAT_MS } from './realtime.constants.js';
import { REALTIME_ERRORS } from './realtime.messages.js';
import type { StreamUser } from './realtime.types.js';

@Injectable()
export class RealtimeService {
    constructor(
        private readonly bus: RealtimeBus,
        private readonly limiter: StreamLimiter,
    ) { }

    // Everything that can fail (401, 429) happens BEFORE the first byte, so the normal error filter still answers
    open(user: StreamUser, ip: string, res: ServerResponse): void {
        const msLeft = this.msUntilExpiry(user);
        const release = this.acquireSlot(user.sub, ip);
        this.writeHead(res);
        this.attach(res, msLeft, release);
    }

    // Fail closed: a token without a usable exp never gets a stream
    private msUntilExpiry(user: StreamUser): number {
        if (typeof user.exp !== 'number') {
            throw new UnauthorizedException(COMMON_ERRORS.UNAUTHORIZED);
        }
        const msLeft = user.exp * 1000 - Date.now();
        if (msLeft <= 0) {
            throw new UnauthorizedException(COMMON_ERRORS.UNAUTHORIZED);
        }
        return Math.min(msLeft, MAX_TIMER_MS);
    }

    private acquireSlot(userId: number, ip: string): () => void {
        const release = this.limiter.acquire(userId, ip);
        if (!release) {
            throw new HttpException(REALTIME_ERRORS.STREAM_LIMIT_REACHED, HttpStatus.TOO_MANY_REQUESTS);
        }
        return release;
    }

    private writeHead(res: ServerResponse): void {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Accel-Buffering': 'no',
            Connection: 'keep-alive',
        });
    }

    private attach(res: ServerResponse, msLeft: number, release: () => void): void {
        this.send(res, formatEvent('ready', { serverTime: new Date().toISOString() }));
        const subscription = this.frames()
            .pipe(takeUntil(timer(msLeft)))
            .subscribe({
                next: (frame) => this.send(res, frame),
                complete: () => res.end(),
            });
        res.on('close', () => {
            subscription.unsubscribe();
            release();
        });
        res.on('error', () => res.destroy());
    }

    private frames(): Observable<string> {
        return merge(
            this.bus.events$.pipe(map((message) => formatEvent(message.event, message.data))),
            interval(STREAM_HEARTBEAT_MS).pipe(map(() => HEARTBEAT_FRAME)),
        );
    }

    // A client that stops reading is dropped instead of buffering without limit
    private send(res: ServerResponse, frame: string): void {
        if (res.writableEnded || res.destroyed) {
            return;
        }
        res.write(frame);
        if (res.writableLength > MAX_STREAM_BUFFERED_BYTES) {
            res.destroy();
        }
    }
}
