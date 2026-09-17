import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  readonly client = db;

  async onModuleInit() {
    await this.client.connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.client.close();
    this.logger.log('Database connection closed');
  }
}