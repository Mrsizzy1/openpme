import React from 'react';
import { Inbox } from 'lucide-react';
import { cx } from '../../lib/cx';
import { renderIcon, type IconProp } from './icon';

export interface EmptyStateProps {
  /** Icône illustrant le contenu attendu (ex. `Package` pour un catalogue). Défaut : `Inbox`. */
  icon?: IconProp;
  /** Phrase courte : « Aucun produit pour le moment ». */
  title: React.ReactNode;
  /** Explication ou prochaine étape : « Créez votre premier article pour commencer. » */
  description?: React.ReactNode;
  /** Action(s) proposée(s), généralement un bouton primaire. */
  action?: React.ReactNode;
  /** Version resserrée pour un panneau étroit ou une carte (moins de marges). */
  compact?: boolean;
  className?: string;
}

/** État vide : liste sans résultat, panier vide, recherche infructueuse… */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = Inbox,
  title,
  description,
  action,
  compact = false,
  className,
}) => (
  <div className={cx('empty-state', compact && 'empty-state-compact', className)}>
    {icon ? <div className="empty-state-icon" aria-hidden="true">{renderIcon(icon, compact ? 18 : 22)}</div> : null}
    <p className="empty-state-title">{title}</p>
    {description ? <p className="empty-state-text">{description}</p> : null}
    {action ? <div className="empty-state-actions">{action}</div> : null}
  </div>
);
