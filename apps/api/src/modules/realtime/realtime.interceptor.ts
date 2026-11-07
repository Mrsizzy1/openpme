import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RealtimeService } from './realtime.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Domaines dont les modifications sont diffusées en temps réel. */
const SYNCED_TOPICS = new Set([
  'sales',
  'products',
  'customers',
  'suppliers',
  'invoices',
  'payments',
  'finances',
  'anomalies',
  'organizations',
  'users',
  'remote-control',
]);

/** « /api/v1/products/12/stock-movements?x=1 » → « products ». */
export function topicFromUrl(url: string): string | null {
  const path = url.split('?')[0].replace(/^\/+/, '');
  const segments = path.split('/');
  const start = segments[0] === 'api' && /^v\d+$/.test(segments[1] ?? '') ? 2 : 0;
  const topic = segments[start];
  return topic && SYNCED_TOPICS.has(topic) ? topic : null;
}

/**
 * Après chaque modification réussie d'un utilisateur connecté, prévient les autres postes
 * de la même entreprise. Les requêtes en échec ne publient rien.
 */
@Injectable()
export class RealtimeInterceptor implements NestInterceptor {
  constructor(private readonly realtime: RealtimeService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest();
    if (!MUTATING_METHODS.has(request.method)) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const user = request.user;
        if (!user?.organizationId) return;
        const topic = topicFromUrl(request.originalUrl || request.url || '');
        if (!topic) return;
        const origin = request.get?.('x-client-instance');
        this.realtime.publish({
          organizationId: user.organizationId,
          topic,
          action: request.method,
          actorId: user.id,
          origin: typeof origin === 'string' ? origin.slice(0, 64) : undefined,
        });
      }),
    );
  }
}
