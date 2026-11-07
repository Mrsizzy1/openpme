import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, filter } from 'rxjs';

/**
 * Événement de synchronisation diffusé à tous les postes d'une même entreprise.
 * Il ne transporte aucune donnée métier : chaque poste recharge lui-même ce qui a changé,
 * avec ses propres droits. Aucune information ne fuit donc d'un rôle à l'autre.
 */
export interface RealtimeEvent {
  organizationId: string;
  /** Domaine modifié : sales, products, customers, suppliers, invoices, payments, finances… */
  topic: string;
  /** Méthode HTTP à l'origine du changement (POST, PATCH, PUT, DELETE). */
  action: string;
  actorId?: string;
  /** Identifiant de l'onglet ou du poste émetteur, pour qu'il ignore son propre écho. */
  origin?: string;
  at: string;
}

/**
 * Bus d'événements en mémoire. Suffisant pour un serveur API unique ; en cas de déploiement
 * sur plusieurs instances, il faudra le relayer par un bus partagé (ex. Redis pub/sub).
 */
@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly events$ = new Subject<RealtimeEvent>();

  publish(event: Omit<RealtimeEvent, 'at'>): void {
    this.events$.next({ ...event, at: new Date().toISOString() });
  }

  forOrganization(organizationId: string): Observable<RealtimeEvent> {
    return this.events$.pipe(filter((event) => event.organizationId === organizationId));
  }

  onModuleDestroy(): void {
    this.events$.complete();
  }
}
