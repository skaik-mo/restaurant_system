import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service.js';
import { HealthResponseDto } from './dto/response/health-response.dto.js';
import { EnvelopeResponse } from '../common/http/envelope-response.decorator.js';
import { HEALTH_ERRORS } from './health.messages.js';
import { ApiErrorResponse } from '../common/swagger/api-error-response.decorator.js';

const DB_CHECK_TIMEOUT_MS = 2_000 // 2 seconds

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly db: DatabaseService) { }

  /**
   * Liveness + database check for Docker, load balancers and uptime monitors.
   * Public on purpose, and deliberately says nothing beyond ok/error.
   */
  @Get()
  @ApiOperation({ summary: 'Health check (app + database)' })
  @EnvelopeResponse({ status: 200, type: HealthResponseDto, description: 'Application and database are healthy' })
  @ApiErrorResponse(503, HEALTH_ERRORS.DATABASE_UNAVAILABLE)
  async check(): Promise<HealthResponseDto> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.db.client.orm.public.User.where({ id: -1 }).first(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('database check timed out')), DB_CHECK_TIMEOUT_MS);
        }),
      ]);
      return { status: 'ok' };
    } catch (err: unknown) {
      this.logger.warn(`Health check failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new ServiceUnavailableException(HEALTH_ERRORS.DATABASE_UNAVAILABLE);
    } finally {
      clearTimeout(timer);
    }
  }
}