import { Module } from '@nestjs/common';
import { GuestService } from './guest.service.js';
import { GuestController } from './guest.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { OrdersModule } from '../orders/orders.module.js';

@Module({
    imports: [AuthModule, OrdersModule],
    providers: [GuestService],
    controllers: [GuestController],
})
export class GuestModule { }
