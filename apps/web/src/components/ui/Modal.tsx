import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/cx';
import type { Tone } from '../../lib/tone';
import { renderIcon, type IconProp } from './icon';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  /** Affiche ou masque la fenêtre. */
  open: boolean;
  /** Demande de fermeture (Échap, clic sur le fond, bouton ×, sauf si `busy`). */
  onClose: () => void;
  /** Titre de la fenêtre (relié à `aria-labelledby`). */
  title: React.ReactNode;
  /** Phrase d'explication sous le titre (reliée à `aria-describedby`). */
  description?: React.ReactNode;
  /** Icône facultative à gauche du titre, dans une pastille teintée. */
  icon?: IconProp;
  /** Teinte de la pastille d'icône. Défaut : `primary`. */
  tone?: Tone;
  /** Largeur maximale : `sm` 420 px, `md` 560 px (défaut), `lg` 760 px, `xl` 1040 px. */
  size?: ModalSize;
  /** Contenu du corps (défilant si nécessaire). */
  children?: React.ReactNode;
  /** Pied de fenêtre, généralement les boutons d'action alignés à droite. */
  footer?: React.ReactNode;
  /** Action en cours : bloque la fermeture par Échap, fond et bouton ×. */
  busy?: boolean;
  /**
   * Si fourni, le corps et le pied sont enveloppés dans un `<form>` : un bouton
   * `type="submit"` du pied déclenche ce gestionnaire (pensez à `preventDefault`).
   */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  /** Élément à focaliser à l'ouverture (sinon : `[data-autofocus]`, puis premier champ du corps). */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Fermer au clic sur le fond. Défaut : `true`. */
  closeOnBackdrop?: boolean;
  /** Masque le bouton × de l'en-tête. */
  hideCloseButton?: boolean;
  /** `alertdialog` pour les confirmations. Défaut : `dialog`. */
  role?: 'dialog' | 'alertdialog';
  /** Classe supplémentaire sur le panneau `.modal`. */
  className?: string;
  /** Classe supplémentaire sur `.modal-body`. */
  bodyClassName?: string;
  /** Identifiant de base (titre : `<id>-title`). Généré automatiquement sinon. */
  id?: string;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/** Pile des fenêtres ouvertes : seule la dernière réagit au clavier. */
const modalStack: symbol[] = [];
let scrollLockCount = 0;
let savedBodyOverflow = '';

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true',
  );
}

function lockScroll(): void {
  if (scrollLockCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;
}

function unlockScroll(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) document.body.style.overflow = savedBodyOverflow;
}

/**
 * Fenêtre modale accessible : rendue dans un portail, fond assombri, fermeture par
 * Échap ou clic sur le fond (sauf `busy`), focus initial, focus piégé dans la
 * fenêtre puis restitué à l'élément déclencheur à la fermeture.
 *
 * @example
 * <Modal open={open} onClose={close} title="Nouveau client" onSubmit={save}
 *   footer={<><Button onClick={close}>Annuler</Button><Button type="submit" variant="primary">Enregistrer</Button></>}>
 *   <Field label="Nom" required><input className="input-field" /></Field>
 * </Modal>
 */
export const Modal: React.FC<ModalProps> = (props) => {
  if (!props.open || typeof document === 'undefined') return null;
  return <ModalDialog {...props} />;
};

const ModalDialog: React.FC<ModalProps> = ({
  onClose,
  title,
  description,
  icon,
  tone = 'primary',
  size = 'md',
  children,
  footer,
  busy = false,
  onSubmit,
  initialFocusRef,
  closeOnBackdrop = true,
  hideCloseButton = false,
  role = 'dialog',
  className,
  bodyClassName,
  id,
}) => {
  const generatedId = useId().replace(/:/g, '');
  const baseId = id ?? `modal-${generatedId}`;
  const titleId = `${baseId}-title`;
  const descriptionId = description ? `${baseId}-description` : undefined;

  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<symbol>(Symbol('modal'));
  const pressStartedOnBackdrop = useRef(false);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  onCloseRef.current = onClose;
  busyRef.current = busy;

  // Pile, verrouillage du défilement, focus initial et restitution du focus.
  useEffect(() => {
    const token = tokenRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalStack.push(token);
    lockScroll();

    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      const target = initialFocusRef?.current
        ?? dialog.querySelector<HTMLElement>('[data-autofocus]')
        ?? (bodyRef.current ? getFocusable(bodyRef.current)[0] : undefined)
        ?? dialog;
      target.focus();
    }

    return () => {
      const index = modalStack.lastIndexOf(token);
      if (index !== -1) modalStack.splice(index, 1);
      unlockScroll();
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
    // Exécuté une seule fois à l'ouverture : les props sont lues via des refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Échap et piège à focus (uniquement pour la fenêtre au sommet de la pile).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== tokenRef.current) return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busyRef.current) onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = getFocusable(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!active || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    pressStartedOnBackdrop.current = event.target === event.currentTarget;
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const isBackdropClick = event.target === event.currentTarget && pressStartedOnBackdrop.current;
    pressStartedOnBackdrop.current = false;
    if (isBackdropClick && closeOnBackdrop && !busy) onClose();
  };

  const content = (
    <>
      <div ref={bodyRef} className={cx('modal-body', bodyClassName)}>
        {children}
      </div>
      {footer ? <div className="modal-footer">{footer}</div> : null}
    </>
  );

  return createPortal(
    <div className="modal-overlay" onMouseDown={handleBackdropMouseDown} onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className={cx('modal', `modal-${size}`, className)}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={busy || undefined}
        tabIndex={-1}
      >
        <div className={cx('modal-header', Boolean(icon) && 'has-icon')}>
          {icon ? (
            <span className={cx('icon-tile', `icon-tile-${tone}`, 'modal-header-icon')} aria-hidden="true">
              {renderIcon(icon, 18)}
            </span>
          ) : null}
          <div className="modal-heading">
            <h2 className="modal-title" id={titleId}>{title}</h2>
            {description ? <p className="modal-description" id={descriptionId}>{description}</p> : null}
          </div>
          {!hideCloseButton ? (
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={busy}
              aria-label="Fermer"
              title="Fermer"
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {onSubmit ? (
          <form className="modal-form" onSubmit={onSubmit}>
            {content}
          </form>
        ) : content}
      </div>
    </div>,
    document.body,
  );
};
