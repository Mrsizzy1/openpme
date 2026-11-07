import React from 'react';
import { CircleAlert, RefreshCw } from 'lucide-react';
import { cx } from '../../lib/cx';
import { Button } from './Button';
import { renderIcon, type IconProp } from './icon';

export interface ErrorStateProps {
  /** Titre factuel. Défaut : « Impossible de charger les données ». */
  title?: React.ReactNode;
  /** Message d'erreur (celui de l'API ou une explication). */
  message?: React.ReactNode;
  /** Relance le chargement ; affiche le bouton « Réessayer ». */
  onRetry?: () => void;
  /** Libellé du bouton de relance. Défaut : « Réessayer ». */
  retryLabel?: string;
  /** Relance en cours (indicateur sur le bouton). */
  retrying?: boolean;
  /** Actions supplémentaires (ex. lien vers les paramètres). */
  actions?: React.ReactNode;
  /** Icône. Défaut : `CircleAlert`. */
  icon?: IconProp;
  /** Version resserrée pour une carte ou un panneau. */
  compact?: boolean;
  className?: string;
}

/** État d'erreur avec relance, à la place d'un contenu qui n'a pas pu être chargé. */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Impossible de charger les données',
  message,
  onRetry,
  retryLabel = 'Réessayer',
  retrying = false,
  actions,
  icon = CircleAlert,
  compact = false,
  className,
}) => (
  <div className={cx('empty-state', 'error-state', compact && 'empty-state-compact', className)} role="alert">
    <div className="empty-state-icon" aria-hidden="true">{renderIcon(icon, compact ? 18 : 22)}</div>
    <p className="empty-state-title">{title}</p>
    {message ? <p className="empty-state-text">{message}</p> : null}
    {onRetry || actions ? (
      <div className="empty-state-actions">
        {onRetry ? (
          <Button size="sm" icon={<RefreshCw />} onClick={onRetry} loading={retrying}>
            {retryLabel}
          </Button>
        ) : null}
        {actions}
      </div>
    ) : null}
  </div>
);
