import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';

@Module({
    imports: [AuthModule, RealtimeModule],
    providers: [OrdersService],
    controllers: [OrdersController],
})
export class OrdersModule { }
