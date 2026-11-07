import React from 'react';
import { cx } from '../../lib/cx';
import { Spinner } from './Spinner';

export interface LoadingStateProps {
  /** Texte affiché sous l'indicateur. Défaut : « Chargement… ». */
  label?: string;
  /** Version resserrée (hauteur minimale réduite). */
  compact?: boolean;
  className?: string;
}

/** Indicateur de chargement centré, pour une zone dont on ne connaît pas la forme. */
export const LoadingState: React.FC<LoadingStateProps> = ({ label = 'Chargement…', compact = false, className }) => (
  <div className={cx('loading-state', compact && 'loading-state-compact', className)} role="status" aria-live="polite">
    <Spinner />
    <span>{label}</span>
  </div>
);

export interface SkeletonProps {
  /** Largeur CSS (ex. `120`, `'60%'`). Défaut : 100 %. */
  width?: number | string;
  /** Hauteur CSS. Défaut : 12 px. */
  height?: number | string;
  /** Forme : `text` (défaut), `block` (rectangle arrondi), `circle`. */
  variant?: 'text' | 'block' | 'circle';
  className?: string;
}

/** Bloc de substitution animé, à utiliser quand la forme du contenu est connue. */
export const Skeleton: React.FC<SkeletonProps> = ({ width, height, variant = 'text', className }) => (
  <span
    className={cx('skeleton', variant !== 'text' && `skeleton-${variant}`, className)}
    style={{ width, height }}
    aria-hidden="true"
  />
);

/** Plusieurs lignes de texte simulées (la dernière est plus courte). */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className }) => (
  <div className={cx('skeleton-lines', className)} aria-hidden="true">
    {Array.from({ length: lines }, (_, index) => (
      <Skeleton key={index} width={index === lines - 1 && lines > 1 ? '60%' : '100%'} />
    ))}
  </div>
);

export interface TableSkeletonProps {
  /** Nombre de lignes simulées. Défaut : 6. */
  rows?: number;
  /** Nombre de colonnes simulées. Défaut : 5. */
  columns?: number;
  /** Affiche une ligne d'en-tête. Défaut : `true`. */
  header?: boolean;
}

const CELL_WIDTHS = ['72%', '48%', '84%', '56%', '40%', '64%'];

/** Tableau simulé pendant le chargement d'une liste. */
export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, columns = 5, header = true }) => (
  <div className="table-skeleton" role="status" aria-label="Chargement des données">
    <table className="data-table">
      {header ? (
        <thead>
          <tr>
            {Array.from({ length: columns }, (_, index) => (
              <th key={index}><Skeleton width={index === 0 ? 96 : 64} height={10} /></th>
            ))}
          </tr>
        </thead>
      ) : null}
      <tbody>
        {Array.from({ length: rows }, (_, row) => (
          <tr key={row}>
            {Array.from({ length: columns }, (_, column) => (
              <td key={column} className={column === columns - 1 ? 'col-amount' : undefined}>
                <Skeleton width={CELL_WIDTHS[(row + column) % CELL_WIDTHS.length]} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/** Grille de cartes simulées (fiches clients, utilisateurs, indicateurs…). */
export const CardGridSkeleton: React.FC<{ count?: number; minWidth?: number }> = ({ count = 6, minWidth = 280 }) => (
  <div
    className="grid-auto"
    style={{ '--grid-min': `${minWidth}px` } as React.CSSProperties}
    role="status"
    aria-label="Chargement des données"
  >
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="card card-body skeleton-card" aria-hidden="true">
        <div className="cluster">
          <Skeleton variant="circle" width={36} height={36} />
          <div className="stack-xs flex-1">
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" />
          </div>
        </div>
        <SkeletonText lines={2} />
      </div>
    ))}
  </div>
);

/** Rangée d'indicateurs simulés. */
export const KpiSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="kpi-grid" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="kpi-card">
        <Skeleton width="45%" />
        <Skeleton width="70%" height={22} />
        <Skeleton width="55%" height={10} />
      </div>
    ))}
  </div>
);

/** Page simulée (barre d'outils + tableau) : repli par défaut pendant le chargement d'une page. */
export const PageSkeleton: React.FC = () => (
  <div className="page page-skeleton" role="status" aria-label="Chargement de la page">
    <div className="page-toolbar" aria-hidden="true">
      <div className="page-toolbar-start">
        <Skeleton variant="block" width={280} height={36} />
        <Skeleton variant="block" width={160} height={36} />
      </div>
      <div className="page-toolbar-end">
        <Skeleton variant="block" width={136} height={36} />
      </div>
    </div>
    <div className="table-wrapper">
      <TableSkeleton rows={8} columns={6} />
    </div>
  </div>
);
