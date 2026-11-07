import React from 'react';
import { cx } from '../../lib/cx';
import type { Tone } from '../../lib/tone';
import { renderIcon, type IconProp } from './icon';

export interface StatusBadgeProps {
  /** Ton sémantique (voir la table de correspondance dans le guide UI). Défaut : `neutral`. */
  tone?: Tone;
  /** Libellé du statut (sinon `children`). */
  label?: React.ReactNode;
  children?: React.ReactNode;
  /** Pastille colorée devant le libellé (recommandé pour les statuts d'état). */
  dot?: boolean;
  /** Icône facultative à la place de la pastille. */
  icon?: IconProp;
  /** Infobulle (détail du statut). */
  title?: string;
  /** `sm` pour les cellules denses. Défaut : `md`. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Pastille de statut : `<StatusBadge tone="success" dot>Payée</StatusBadge>`.
 * Combinez avec `getStatusMeta()` de `lib/status` pour les statuts métier.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  tone = 'neutral',
  label,
  children,
  dot = false,
  icon,
  title,
  size = 'md',
  className,
}) => (
  <span
    className={cx('badge', `badge-${tone}`, dot && !icon && 'badge-dot', size === 'sm' && 'badge-sm', className)}
    title={title}
  >
    {renderIcon(icon, 12)}
    {label ?? children}
  </span>
);
