import React from 'react';
import { cx } from '../../lib/cx';

export interface PageToolbarProps {
  /** Zone gauche : recherche, filtres, sélecteurs de période. */
  start?: React.ReactNode;
  /** Zone droite : actions (bouton primaire en dernier, à l'extrême droite). */
  end?: React.ReactNode;
  /** Contenu ajouté à la suite de `start`. */
  children?: React.ReactNode;
  /** Ligne d'information sous la barre (ex. « 128 produits · 6 sous le seuil »). */
  summary?: React.ReactNode;
  className?: string;
}

/**
 * Première rangée d'une page : filtres à gauche, actions à droite. Les pages
 * n'affichent pas de grand titre : le titre et le sous-titre sont dans l'en-tête.
 *
 * @example
 * <PageToolbar
 *   start={<SearchInput value={q} onChange={setQ} placeholder="Rechercher un produit…" />}
 *   end={<Button variant="primary" icon={<Plus />}>Nouveau produit</Button>}
 * />
 */
export const PageToolbar: React.FC<PageToolbarProps> = ({ start, end, children, summary, className }) => {
  const toolbar = (
    <div className={cx('page-toolbar', !summary && className)}>
      {start || children ? (
        <div className="page-toolbar-start">
          {start}
          {children}
        </div>
      ) : null}
      {end ? <div className="page-toolbar-end">{end}</div> : null}
    </div>
  );
  if (!summary) return toolbar;
  return (
    <div className={cx('page-toolbar-block', className)}>
      {toolbar}
      <p className="page-toolbar-summary">{summary}</p>
    </div>
  );
};
