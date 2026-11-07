import { Controller, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Observable, interval, map, merge, of, takeUntil, timer } from 'rxjs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RealtimeService } from './realtime.service';

/** Durée de vie d'un flux : le poste se reconnecte ensuite avec un jeton frais (session revérifiée). */
const STREAM_LIFETIME_MS = 15 * 60 * 1000;
/** Message de maintien de connexion (proxies, pare-feu). */
const HEARTBEAT_MS = 25 * 1000;

@ApiTags('Realtime Sync')
@Controller('events')
@ApiBearerAuth()
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  @Sse('stream')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @ApiOperation({ summary: 'Flux temps réel (Server-Sent Events) des changements de l’entreprise' })
  stream(@CurrentUser('organizationId') organizationId: string): Observable<MessageEvent> {
    return merge(
      of<MessageEvent>({ type: 'ready', data: { at: new Date().toISOString() } }),
      interval(HEARTBEAT_MS).pipe(map((): MessageEvent => ({ type: 'ping', data: {} }))),
      this.realtime.forOrganization(organizationId).pipe(
        map((event): MessageEvent => ({
          type: 'change',
          data: { topic: event.topic, action: event.action, actorId: event.actorId, origin: event.origin, at: event.at },
        })),
      ),
    ).pipe(takeUntil(timer(STREAM_LIFETIME_MS)));
  }
}
