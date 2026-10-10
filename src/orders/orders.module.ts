import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
    imports: [AuthModule],
    providers: [OrdersService],
    controllers: [OrdersController],
})
export class OrdersModule { }
