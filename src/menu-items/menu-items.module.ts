import { Module } from '@nestjs/common';
import { MenuItemsService } from './menu-items.service.js';
import { MenuItemsController } from './menu-items.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  providers: [MenuItemsService],
  controllers: [MenuItemsController]
})
export class MenuItemsModule { }
