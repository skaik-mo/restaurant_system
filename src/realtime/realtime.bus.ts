import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';
import type { RealtimeEvent, RealtimeEventData, RealtimeEventName } from './realtime.types.js';

/** In-memory event bus (single instance only). publish() never throws. */
@Injectable()
export class RealtimeBus implements OnModuleDestroy {
    private readonly logger = new Logger(RealtimeBus.name);
    private readonly subject = new Subject<RealtimeEvent>();

    readonly events$ = this.subject.asObservable();

    publish(event: RealtimeEventName, data: RealtimeEventData): void {
        try {
            this.subject.next({ event, data });
        } catch (err: unknown) {
            this.logger.warn(`Publishing ${event} failed: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
    }

    onModuleDestroy(): void {
        this.subject.complete();
    }
}
