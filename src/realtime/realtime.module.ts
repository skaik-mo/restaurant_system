import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RealtimeBus } from './realtime.bus.js';
import { RealtimeController } from './realtime.controller.js';
import { RealtimeService } from './realtime.service.js';
import { StreamLimiter } from './stream-limiter.service.js';

@Module({
    imports: [AuthModule],
    providers: [RealtimeBus, StreamLimiter, RealtimeService],
    controllers: [RealtimeController],
    exports: [RealtimeBus, RealtimeService],
})
export class RealtimeModule { }
