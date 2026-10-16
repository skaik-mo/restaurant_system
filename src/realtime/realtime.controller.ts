import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { ServerResponse } from 'node:http';
import { ApiErrorResponse } from '../common/swagger/api-error-response.decorator.js';
import { COMMON_ERRORS } from '../common/errors/common.errors.js';
import { AUTH_ERRORS } from '../auth/auth.messages.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MustChangePasswordGuard } from '../auth/guards/must-change-password.guard.js';
import { USER_ROLES } from '../common/types/user-role.type.js';
import { RateLimit } from '../common/throttler/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/throttler/rate-limit.guard.js';
import { RealtimeService } from './realtime.service.js';
import { REALTIME_CONNECT_LIMIT } from './realtime.constants.js';
import { REALTIME_ERRORS } from './realtime.messages.js';
import type { StreamUser } from './realtime.types.js';

@ApiTags('realtime')
@ApiBearerAuth()
@Controller('realtime')
@UseGuards(JwtAuthGuard, RolesGuard, MustChangePasswordGuard)
@Roles('ADMIN')
export class RealtimeController {
    constructor(private readonly realtimeService: RealtimeService) { }

    // @Res() without passthrough: the handler writes the SSE frames itself and returns nothing,
    // so the response envelope interceptor leaves the stream alone.
    @Get('stream')
    @Roles(...USER_ROLES)
    @UseGuards(RateLimitGuard)
    @RateLimit(REALTIME_CONNECT_LIMIT)
    @ApiOperation({
        summary:
            'Server-sent events for the KDS. Send Authorization: Bearer (use a fetch-based SSE client, not EventSource). '
            + 'Events: ready {serverTime}, order.created / order.updated / table.updated {id, status, updatedAt}. '
            + 'No replay: on every ready, call GET /orders?updatedSince=<last seen updatedAt> and merge by id. '
            + 'The stream ends when the access token expires, refresh the token and reconnect.',
    })
    @ApiProduces('text/event-stream')
    @ApiOkResponse({ description: 'Event stream', content: { 'text/event-stream': { schema: { type: 'string' } } } })
    @ApiErrorResponse(401, COMMON_ERRORS.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_ERRORS.FORBIDDEN, AUTH_ERRORS.PASSWORD_CHANGE_REQUIRED)
    @ApiErrorResponse(429, COMMON_ERRORS.RATE_LIMITED, REALTIME_ERRORS.STREAM_LIMIT_REACHED)
    stream(@Req() req: { user: StreamUser; ip?: string }, @Res() res: ServerResponse): void {
        this.realtimeService.open(req.user, req.ip ?? 'unknown', res);
    }
}
