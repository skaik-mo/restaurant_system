import { Module } from '@nestjs/common';
import { DiningTablesService } from './dining-tables.service.js';
import { DiningTablesController } from './dining-tables.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  providers: [DiningTablesService],
  controllers: [DiningTablesController]
})
export class DiningTablesModule { }
