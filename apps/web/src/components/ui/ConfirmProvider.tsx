import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CircleHelp, TriangleAlert, CircleAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import type { IconProp } from './icon';

export type ConfirmTone = 'danger' | 'primary' | 'warning';

export interface ConfirmOptions {
  /** Question posée, formulée comme une action (« Supprimer ce client ? »). */
  title: string;
  /** Conséquences de l'action, en une ou deux phrases. */
  message?: React.ReactNode;
  /** Libellé du bouton de confirmation (verbe d'action). Défaut : « Confirmer ». */
  confirmLabel?: string;
  /** Libellé du bouton d'annulation. Défaut : « Annuler ». */
  cancelLabel?: string;
  /** `danger` pour une action destructive, `warning` pour une action sensible. Défaut : `primary`. */
  tone?: ConfirmTone;
  /** Icône personnalisée (par défaut selon le ton). */
  icon?: IconProp;
}

/** Ouvre une confirmation et résout `true` (confirmé) ou `false` (annulé, Échap, clic sur le fond). */
export type ConfirmFunction = (options: ConfirmOptions | string) => Promise<boolean>;

interface PendingConfirm extends ConfirmOptions {
  id: number;
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<ConfirmFunction | null>(null);

const DEFAULT_ICONS: Record<ConfirmTone, IconProp> = {
  danger: TriangleAlert,
  warning: CircleAlert,
  primary: CircleHelp,
};

/**
 * Fournit `useConfirm()` à toute l'application (monté dans `main.tsx`).
 * Les demandes simultanées sont affichées l'une après l'autre.
 */
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<PendingConfirm[]>([]);
  const queueRef = useRef<PendingConfirm[]>([]);
  const counter = useRef(0);
  queueRef.current = queue;

  const confirm = useCallback<ConfirmFunction>((options) => new Promise<boolean>((resolve) => {
    const normalized: ConfirmOptions = typeof options === 'string' ? { title: options } : options;
    counter.current += 1;
    const id = counter.current;
    setQueue((current) => [...current, { ...normalized, id, resolve }]);
  }), []);

  const settle = useCallback((id: number, value: boolean) => {
    const request = queueRef.current.find((item) => item.id === id);
    if (!request) return;
    request.resolve(value);
    setQueue((current) => current.filter((item) => item.id !== id));
  }, []);

  const active = queue[0];

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {active ? <ConfirmDialog key={active.id} request={active} onSettle={settle} /> : null}
    </ConfirmContext.Provider>
  );
};

const ConfirmDialog: React.FC<{ request: PendingConfirm; onSettle: (id: number, value: boolean) => void }> = ({
  request,
  onSettle,
}) => {
  const tone = request.tone ?? 'primary';
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancel = () => onSettle(request.id, false);
  const accept = () => onSettle(request.id, true);

  return (
    <Modal
      open
      onClose={cancel}
      title={request.title}
      description={request.message}
      icon={request.icon ?? DEFAULT_ICONS[tone]}
      tone={tone}
      size="sm"
      role="alertdialog"
      className="modal-confirm"
      initialFocusRef={tone === 'primary' ? confirmRef : cancelRef}
      hideCloseButton
      footer={(
        <>
          <Button ref={cancelRef} variant="secondary" onClick={cancel}>
            {request.cancelLabel ?? 'Annuler'}
          </Button>
          <Button
            ref={confirmRef}
            variant={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'primary'}
            onClick={accept}
          >
            {request.confirmLabel ?? 'Confirmer'}
          </Button>
        </>
      )}
    />
  );
};

const fallbackConfirm: ConfirmFunction = async (options) => {
  const normalized = typeof options === 'string' ? { title: options } : options;
  const message = typeof normalized.message === 'string' ? `\n\n${normalized.message}` : '';
  return window.confirm(`${normalized.title}${message}`);
};

/**
 * Remplace `window.confirm` par une boîte de dialogue du système de design.
 *
 * @example
 * const confirm = useConfirm();
 * if (!(await confirm({ title: 'Vider le panier ?', message: 'Les 3 articles seront retirés.',
 *   confirmLabel: 'Vider le panier', tone: 'danger' }))) return;
 */
export function useConfirm(): ConfirmFunction {
  return useContext(ConfirmContext) ?? fallbackConfirm;
}
