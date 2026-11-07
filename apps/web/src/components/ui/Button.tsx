import React from 'react';
import { cx } from '../../lib/cx';
import { Spinner } from './Spinner';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'danger-outline'
  | 'success'
  | 'warning'
  | 'link';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Style visuel. `primary` : action principale (une seule par zone). Défaut : `secondary`. */
  variant?: ButtonVariant;
  /** Hauteur : `xs` 26 px, `sm` 30 px, `md` 36 px (défaut), `lg` 42 px. */
  size?: ButtonSize;
  /** Icône placée avant le libellé (taille normalisée par le CSS). */
  icon?: React.ReactNode;
  /** Icône placée après le libellé. */
  iconRight?: React.ReactNode;
  /** Affiche un indicateur et désactive le bouton pendant une action. */
  loading?: boolean;
  /** Libellé affiché pendant `loading` (ex. « Enregistrement… »). */
  loadingText?: React.ReactNode;
  /** Occupe toute la largeur disponible. */
  block?: boolean;
}

/**
 * Bouton du système de design. `type="button"` par défaut : passez
 * `type="submit"` explicitement pour soumettre un formulaire.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    iconRight,
    loading = false,
    loadingText,
    block = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'btn',
        `btn-${variant}`,
        size !== 'md' && `btn-${size}`,
        block && 'btn-block',
        loading && 'is-loading',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {loading && loadingText ? loadingText : children}
      {!loading && iconRight}
    </button>
  );
});
