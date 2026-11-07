import { useEffect, useRef, useState } from 'react';
import { ApiClient, CLIENT_INSTANCE_ID } from '../api/client';

/**
 * Synchronisation en temps réel entre postes.
 * Le serveur pousse un signal (Server-Sent Events) à chaque modification faite sur un autre
 * poste de l'entreprise ; l'écran concerné recharge alors ses données avec ses propres droits.
 */
export type RealtimeTopic =
  | 'sales'
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'invoices'
  | 'payments'
  | 'finances'
  | 'anomalies'
  | 'organizations'
  | 'users'
  | 'remote-control';

export interface RealtimeChange {
  topic: RealtimeTopic;
  action: string;
  actorId?: string;
  origin?: string;
  at: string;
}

export type RealtimeStatus = 'connecting' | 'live' | 'offline';

type ChangeListener = (change: RealtimeChange) => void;
type StatusListener = (status: RealtimeStatus) => void;

const MAX_BACKOFF_MS = 30_000;

class RealtimeConnection {
  private changeListeners = new Set<ChangeListener>();
  private statusListeners = new Set<StatusListener>();
  private controller: AbortController | null = null;
  private running = false;
  private backoff = 1_000;
  private retryTimer: number | null = null;
  status: RealtimeStatus = 'offline';

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.connect();
  }

  stop(): void {
    this.running = false;
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.controller?.abort();
    this.controller = null;
    this.setStatus('offline');
  }

  onChange(listener: ChangeListener): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: RealtimeStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private scheduleReconnect(): void {
    if (!this.running) return;
    this.setStatus('offline');
    const delay = this.backoff;
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      void this.connect();
    }, delay);
  }

  private async connect(): Promise<void> {
    if (!this.running) return;
    this.setStatus('connecting');
    this.controller = new AbortController();

    try {
      let token = ApiClient.getAccessToken();
      if (!token) token = await ApiClient.renewAccessToken();
      let response = await this.open(token);
      if (response.status === 401) {
        token = await ApiClient.renewAccessToken();
        response = await this.open(token);
      }
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

      this.backoff = 1_000;
      this.setStatus('live');
      await this.read(response.body);
    } catch {
      // Réseau coupé, session expirée ou serveur redémarré : nouvelle tentative plus tard.
    }
    this.scheduleReconnect();
  }

  private open(token: string | null): Promise<Response> {
    return fetch(`${ApiClient.getBaseUrl()}/events/stream`, {
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      cache: 'no-store',
      signal: this.controller?.signal,
    });
  }

  private async read(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (this.running) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let separator = buffer.indexOf('\n\n');
      while (separator !== -1) {
        this.dispatch(buffer.slice(0, separator));
        buffer = buffer.slice(separator + 2);
        separator = buffer.indexOf('\n\n');
      }
    }
  }

  private dispatch(block: string): void {
    let type = 'message';
    const data: string[] = [];
    for (const line of block.replace(/\r/g, '').split('\n')) {
      if (line.startsWith('event:')) type = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (type !== 'change' || data.length === 0) return;
    try {
      const change = JSON.parse(data.join('\n')) as RealtimeChange;
      if (change.origin === CLIENT_INSTANCE_ID) return;
      this.changeListeners.forEach((listener) => listener(change));
    } catch {
      // Message illisible : ignoré.
    }
  }
}

export const realtime = new RealtimeConnection();

/**
 * Appelle `onChange` (regroupé, au plus une fois par 400 ms) quand un autre poste modifie
 * l'un des domaines indiqués.
 */
export function useRealtime(topics: RealtimeTopic[], onChange: () => void): void {
  const callback = useRef(onChange);
  callback.current = onChange;
  const key = topics.join(',');

  useEffect(() => {
    const watched = new Set(key.split(','));
    let timer: number | null = null;
    const unsubscribe = realtime.onChange((change) => {
      if (!watched.has(change.topic)) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        callback.current();
      }, 400);
    });
    return () => {
      unsubscribe();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [key]);
}

/** État de la connexion temps réel (pour l'indicateur de l'en-tête). */
export function useRealtimeStatus(): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>(realtime.status);
  useEffect(() => realtime.onStatus(setStatus), []);
  return status;
}
