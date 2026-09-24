import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DatabaseService } from '../database/database.service.js';
import { getAppTimeZone } from '../common/utils/timezone.util.js';

const JOB_NAME = 'refresh-token-cleanup';
const DEFAULT_CRON = '0 4 * * *'; // 04:00 daily, in APP_TIMEZONE
// Keep rows for 1 day after expiry: revoked-but-unexpired rows are never
// deleted (room for future refresh-token reuse detection), and the buffer
// avoids any edge case with tokens expiring while the job runs.
const RETENTION_AFTER_EXPIRY_MS = 24 * 60 * 60 * 1000 // 1 day in ms

@Injectable()
export class RefreshTokenCleanupService implements OnModuleInit {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly scheduler: SchedulerRegistry,
  ) { }

  onModuleInit(): void {
    const timeZone = getAppTimeZone(this.config);
    const cronTime = this.config.get<string>('REFRESH_TOKEN_CLEANUP_CRON', DEFAULT_CRON);

    // Registered dynamically: @Cron() options are fixed at import time and
    // can't read ConfigService. An invalid cron expression throws here → boot fails.
    const job = CronJob.from({
      cronTime,
      timeZone,
      onTick: () => {
        void this.cleanup();
      },
    });

    this.scheduler.addCronJob(JOB_NAME, job);
    job.start();
    this.logger.log(`Refresh token cleanup scheduled: "${cronTime}" (${timeZone})`);
  }

  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_AFTER_EXPIRY_MS).toISOString();
    try {
      const deleted = await this.db.client.orm.public.RefreshToken
        .where((t) => t.expiresAt.lt(cutoff))
        .deleteAndCount();
      this.logger.log(`Deleted ${deleted} refresh token row(s) expired before ${cutoff}`);
    } catch (err: unknown) {
      // Never crash the process over housekeeping; it retries on the next run.
      this.logger.error('Refresh token cleanup failed', err);
    }
  }
}