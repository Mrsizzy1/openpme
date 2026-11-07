import React from 'react';
import { cx } from '../../lib/cx';

export interface SpinnerProps {
  /** Taille : `sm` 14 px, `md` 20 px (défaut), `lg` 32 px. */
  size?: 'sm' | 'md' | 'lg';
  /** Variante claire pour fond sombre ou coloré. */
  inverse?: boolean;
  /**
   * Texte annoncé aux lecteurs d'écran. Sans libellé, l'indicateur est décoratif
   * (cas d'un bouton dont le texte indique déjà l'action en cours).
   */
  label?: string;
  className?: string;
}

/** Indicateur de chargement circulaire. */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', inverse = false, label, className }) => (
  <span
    className={cx('spinner', size !== 'md' && `spinner-${size}`, inverse && 'spinner-inverse', className)}
    role={label ? 'status' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
  />
);
