import React, { useId } from 'react';
import { cx } from '../../lib/cx';
import type { Tone } from '../../lib/tone';
import { renderIcon, type IconProp } from './icon';

export interface SectionCardProps {
  /** Titre de la section (rendu en `<h2>` : le `<h1>` est celui de l'en-tête). */
  title?: React.ReactNode;
  /** Précision sous le titre. */
  description?: React.ReactNode;
  /** Icône à gauche du titre. */
  icon?: IconProp;
  /** Teinte de la pastille d'icône. Défaut : `neutral`. */
  iconTone?: Tone;
  /** Actions alignées à droite de l'en-tête (boutons `sm`). */
  actions?: React.ReactNode;
  /** Pied de carte (totaux, pagination, lien « Voir tout »). */
  footer?: React.ReactNode;
  /** Corps sans marge intérieure : pour un tableau ou une liste bord à bord. */
  flush?: boolean;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Élément racine (`section` par défaut). */
  as?: 'section' | 'div' | 'article';
  id?: string;
}

/** Carte titrée : en-tête (titre + actions), corps, pied facultatif. */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  icon,
  iconTone = 'neutral',
  actions,
  footer,
  flush = false,
  children,
  className,
  bodyClassName,
  as: Element = 'section',
  id,
}) => {
  const generatedId = `section-${useId().replace(/:/g, '')}`;
  const headingId = `${id ?? generatedId}-title`;
  return (
    <Element className={cx('card', className)} id={id} aria-labelledby={title ? headingId : undefined}>
      {title || actions ? (
        <div className="card-header">
          <div className="card-heading">
            {icon ? (
              <span className={cx('icon-tile', 'icon-tile-sm', `icon-tile-${iconTone}`)} aria-hidden="true">
                {renderIcon(icon, 15)}
              </span>
            ) : null}
            <div className="card-heading-text">
              {title ? <h2 className="card-title" id={headingId}>{title}</h2> : null}
              {description ? <p className="card-subtitle">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="card-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cx(flush ? 'card-body-flush' : 'card-body', bodyClassName)}>{children}</div>
      {footer ? <div className="card-footer">{footer}</div> : null}
    </Element>
  );
};
