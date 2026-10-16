import { Module } from '@nestjs/common';
import { GuestService } from './guest.service.js';
import { GuestController } from './guest.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';

@Module({
    imports: [AuthModule, RealtimeModule],
    providers: [GuestService],
    controllers: [GuestController]
})
export class GuestModule { }
