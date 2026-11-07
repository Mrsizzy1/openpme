import React from 'react';
import { CircleCheck, CircleAlert, TriangleAlert, Info, X } from 'lucide-react';
import { cx } from '../../lib/cx';
import { renderIcon, type IconProp } from './icon';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  /** Ton du bandeau. Défaut : `info`. */
  tone?: AlertTone;
  /** Titre en gras (facultatif). */
  title?: React.ReactNode;
  /** Texte du bandeau. */
  children?: React.ReactNode;
  /** Icône personnalisée (par défaut selon le ton) ; `false` pour aucune. */
  icon?: IconProp;
  /** Boutons d'action, alignés sous le texte. */
  actions?: React.ReactNode;
  /** Affiche un bouton de fermeture. */
  onDismiss?: () => void;
  className?: string;
}

const DEFAULT_ICONS: Record<AlertTone, IconProp> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
};

/** Bandeau d'information contextuel (hors-ligne, seuil atteint, erreur de chargement…). */
export const Alert: React.FC<AlertProps> = ({ tone = 'info', title, children, icon, actions, onDismiss, className }) => (
  <div
    className={cx('alert', `alert-${tone}`, className)}
    role={tone === 'danger' ? 'alert' : 'status'}
  >
    {icon !== false ? <span className="alert-icon" aria-hidden="true">{renderIcon(icon ?? DEFAULT_ICONS[tone], 16)}</span> : null}
    <div className="alert-content">
      {title ? <div className="alert-title">{title}</div> : null}
      {children ? <div className="alert-body">{children}</div> : null}
      {actions ? <div className="alert-actions">{actions}</div> : null}
    </div>
    {onDismiss ? (
      <button type="button" className="alert-dismiss" onClick={onDismiss} aria-label="Masquer ce message" title="Masquer">
        <X aria-hidden="true" />
      </button>
    ) : null}
  </div>
);
