import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';

@Module({
  imports: [AuthModule, RealtimeModule],
  providers: [UsersService],
  controllers: [UsersController]
})
export class UsersModule { }
