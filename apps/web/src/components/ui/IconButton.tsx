import React from 'react';
import { cx } from '../../lib/cx';
import { Spinner } from './Spinner';
import type { ButtonSize } from './Button';

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** Nom accessible, obligatoire : un bouton icône n'a pas de texte visible. Sert aussi d'infobulle. */
  'aria-label': string;
  /** Icône Lucide, par ex. `<RefreshCw />` (taille normalisée par le CSS). */
  icon: React.ReactNode;
  /** Style : `ghost` (défaut, discret), `secondary` (bordé), `primary`, `danger` (rouge discret). */
  variant?: 'ghost' | 'secondary' | 'primary' | 'danger';
  /** Taille du carré : `xs` 26 px, `sm` 30 px, `md` 36 px (défaut), `lg` 42 px. */
  size?: ButtonSize;
  /** Affiche un indicateur de chargement à la place de l'icône. */
  loading?: boolean;
}

/** Bouton carré ne contenant qu'une icône. L'infobulle reprend `aria-label` sauf si `title` est fourni. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = 'ghost', size = 'md', loading = false, className, title, type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'btn',
        'btn-icon',
        variant === 'danger' ? 'btn-ghost btn-ghost-danger' : `btn-${variant}`,
        size !== 'md' && `btn-${size}`,
        className,
      )}
      title={title ?? rest['aria-label']}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : icon}
    </button>
  );
});
