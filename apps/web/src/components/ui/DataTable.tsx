import React from 'react';
import { cx } from '../../lib/cx';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { TableSkeleton } from './LoadingState';

export interface DataTableColumn<T> {
  /** Clé unique de la colonne. */
  key: string;
  /** En-tête (texte court, sans majuscules forcées). */
  header: React.ReactNode;
  /** Contenu de la cellule. */
  cell: (row: T, index: number) => React.ReactNode;
  /**
   * Type de colonne : `amount` et `number` (alignés à droite, chiffres tabulaires),
   * `mono` (références), `actions` (boutons de ligne à droite), `center`.
   */
  type?: 'text' | 'amount' | 'number' | 'mono' | 'actions' | 'center';
  /** Largeur CSS (ex. `120`, `'20%'`). */
  width?: number | string;
  /** Classe ajoutée aux cellules `<td>`. */
  className?: string;
  /** Classe ajoutée à l'en-tête `<th>`. */
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: ReadonlyArray<DataTableColumn<T>>;
  rows: ReadonlyArray<T>;
  /** Identifiant stable de chaque ligne. */
  rowKey: (row: T, index: number) => string | number;
  /** Affiche un squelette de tableau. */
  loading?: boolean;
  /** Message d'erreur : remplace le tableau par un état d'erreur. */
  error?: React.ReactNode;
  /** Relance du chargement (bouton « Réessayer » de l'état d'erreur). */
  onRetry?: () => void;
  /** État vide personnalisé (`<EmptyState … />`). */
  empty?: React.ReactNode;
  /** Clic sur une ligne (ligne survolable et activable au clavier). */
  onRowClick?: (row: T) => void;
  /** Classe calculée par ligne (`is-selected`, `is-muted`, `is-warning`…). */
  rowClassName?: (row: T, index: number) => string | undefined;
  /** Ligne(s) de pied (`<tr>` de totaux). */
  footer?: React.ReactNode;
  /** Lignes resserrées. */
  compact?: boolean;
  /** Hauteur max (ex. `480`) : le tableau défile et l'en-tête reste visible. */
  maxHeight?: number | string;
  /** Légende accessible (masquée visuellement). */
  caption?: string;
  className?: string;
}

const TYPE_CLASS: Record<NonNullable<DataTableColumn<unknown>['type']>, string | undefined> = {
  text: undefined,
  amount: 'col-amount',
  number: 'col-num',
  mono: 'col-mono',
  actions: 'col-actions',
  center: 'col-center',
};

/**
 * Tableau de données standard : en-tête collant, colonnes typées, états
 * chargement / erreur / vide intégrés.
 *
 * @example
 * <DataTable rows={products} rowKey={(p) => p.id} loading={loading} error={error} onRetry={load}
 *   empty={<EmptyState icon={Package} title="Aucun produit" />}
 *   columns={[
 *     { key: 'ref', header: 'Référence', type: 'mono', cell: (p) => p.code },
 *     { key: 'name', header: 'Désignation', cell: (p) => p.name },
 *     { key: 'price', header: 'Prix de vente', type: 'amount', cell: (p) => formatMoney(p.salePrice, p.currency) },
 *   ]} />
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  empty,
  onRowClick,
  rowClassName,
  footer,
  compact = false,
  maxHeight,
  caption,
  className,
}: DataTableProps<T>): React.ReactElement {
  if (loading && rows.length === 0) {
    return <TableSkeleton rows={6} columns={Math.min(columns.length, 6)} />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} compact />;
  }
  if (rows.length === 0) {
    return <>{empty ?? <EmptyState title="Aucune donnée à afficher" compact />}</>;
  }

  return (
    <div
      className={cx('table-container', maxHeight !== undefined && 'table-scroll', className)}
      style={maxHeight !== undefined ? ({ '--table-max-height': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } as React.CSSProperties) : undefined}
      aria-busy={loading || undefined}
    >
      <table className={cx('data-table', compact && 'data-table-compact')}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cx(column.type && TYPE_CLASS[column.type], column.headerClassName)}
                style={column.width !== undefined ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              className={cx(onRowClick && 'is-clickable', rowClassName?.(row, index))}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowClick(row);
                }
              } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={cx(column.type && TYPE_CLASS[column.type], column.className)}>
                  {column.cell(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? <tfoot>{footer}</tfoot> : null}
      </table>
    </div>
  );
}
