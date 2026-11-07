/**
 * Bus de notifications sans dépendance à React.
 *
 * Permet aux modules utilitaires (export CSV, impression…) d'afficher un toast
 * sans recourir à `alert()`. Le `ToastProvider` s'abonne au bus au montage ;
 * les notifications émises avant son montage sont mises en attente (10 max).
 *
 * @example
 * notify.warning('Aucune donnée à exporter.');
 * notify.error('Impression impossible.', { title: 'Imprimante' });
 */

export type NotifyTone = 'success' | 'error' | 'warning' | 'info';

export interface NotifyOptions {
  /** Titre court affiché en gras au-dessus du message. */
  title?: string;
  /** Durée d'affichage en millisecondes (0 = jusqu'à fermeture manuelle). */
  duration?: number;
}

export interface NotifyPayload extends NotifyOptions {
  tone: NotifyTone;
  message: string;
}

type Listener = (payload: NotifyPayload) => void;

const listeners = new Set<Listener>();
const pending: NotifyPayload[] = [];
const MAX_PENDING = 10;

function emit(payload: NotifyPayload): void {
  if (listeners.size === 0) {
    pending.push(payload);
    if (pending.length > MAX_PENDING) pending.shift();
    return;
  }
  listeners.forEach((listener) => listener(payload));
}

/**
 * Abonne un récepteur (le `ToastProvider`) au bus. Les notifications en attente
 * lui sont immédiatement transmises. Renvoie la fonction de désabonnement.
 */
export function subscribeNotify(listener: Listener): () => void {
  listeners.add(listener);
  while (pending.length > 0) {
    const payload = pending.shift();
    if (payload) listener(payload);
  }
  return () => {
    listeners.delete(listener);
  };
}

type NotifyFn = ((tone: NotifyTone, message: string, options?: NotifyOptions) => void) & {
  success: (message: string, options?: NotifyOptions) => void;
  error: (message: string, options?: NotifyOptions) => void;
  warning: (message: string, options?: NotifyOptions) => void;
  info: (message: string, options?: NotifyOptions) => void;
};

/** Affiche un toast depuis n'importe quel module (hors composants React compris). */
export const notify: NotifyFn = Object.assign(
  (tone: NotifyTone, message: string, options: NotifyOptions = {}) => emit({ ...options, tone, message }),
  {
    success: (message: string, options: NotifyOptions = {}) => emit({ ...options, tone: 'success', message }),
    error: (message: string, options: NotifyOptions = {}) => emit({ ...options, tone: 'error', message }),
    warning: (message: string, options: NotifyOptions = {}) => emit({ ...options, tone: 'warning', message }),
    info: (message: string, options: NotifyOptions = {}) => emit({ ...options, tone: 'info', message }),
  },
);
