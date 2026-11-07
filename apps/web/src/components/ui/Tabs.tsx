import React, { useId, useRef } from 'react';
import { cx } from '../../lib/cx';
import { renderIcon, type IconProp } from './icon';

export interface TabItem<T extends string = string> {
  value: T;
  label: React.ReactNode;
  /** Icône facultative avant le libellé. */
  icon?: IconProp;
  /** Compteur affiché après le libellé. */
  count?: number;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  /** Onglets à afficher. */
  items: ReadonlyArray<TabItem<T>>;
  /** Onglet actif. */
  value: T;
  /** Changement d'onglet. */
  onChange: (value: T) => void;
  /** `line` (souligné, défaut) pour les sections de page ; `pills` (segmenté) pour un filtre compact. */
  variant?: 'line' | 'pills';
  /** Nom accessible de la liste d'onglets (ex. « Vues des ventes »). */
  'aria-label'?: string;
  /** Préfixe des identifiants (à réutiliser dans `<TabPanel tabsId=…>`). */
  id?: string;
  className?: string;
}

/**
 * Onglets accessibles (rôle `tablist`, navigation aux flèches, Début/Fin).
 * Le contenu est rendu par la page ; utilisez `TabPanel` pour relier panneau et onglet.
 */
export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  variant = 'line',
  id,
  className,
  ...rest
}: TabsProps<T>): React.ReactElement {
  const generatedId = `tabs-${useId().replace(/:/g, '')}`;
  const baseId = id ?? generatedId;
  const listRef = useRef<HTMLDivElement>(null);

  const focusTab = (index: number) => {
    const enabled = items.filter((item) => !item.disabled);
    if (enabled.length === 0) return;
    const target = enabled[(index + enabled.length) % enabled.length];
    onChange(target.value);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(target.value)}"]`)
      ?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((item) => !item.disabled);
    const current = enabled.findIndex((item) => item.value === value);
    if (event.key === 'ArrowRight') focusTab(current + 1);
    else if (event.key === 'ArrowLeft') focusTab(current - 1);
    else if (event.key === 'Home') focusTab(0);
    else if (event.key === 'End') focusTab(enabled.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={rest['aria-label']}
      className={cx(variant === 'pills' ? 'segmented' : 'tabs', className)}
      onKeyDown={handleKeyDown}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.value}`}
            aria-controls={`${baseId}-panel-${item.value}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            data-value={item.value}
            className={cx(variant === 'pills' ? 'segmented-btn' : 'tab-btn', selected && 'active')}
            onClick={() => onChange(item.value)}
          >
            {renderIcon(item.icon, 15)}
            <span>{item.label}</span>
            {item.count !== undefined ? <span className="tab-count">{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps {
  /** `id` passé à `<Tabs>`. */
  tabsId: string;
  /** Valeur de l'onglet associé. */
  value: string;
  /** Onglet actif : le panneau n'est rendu que s'il correspond. */
  activeValue: string;
  children: React.ReactNode;
  className?: string;
}

/** Panneau relié à un onglet (`role="tabpanel"`). Rendu uniquement s'il est actif. */
export const TabPanel: React.FC<TabPanelProps> = ({ tabsId, value, activeValue, children, className }) => {
  if (value !== activeValue) return null;
  return (
    <div
      role="tabpanel"
      id={`${tabsId}-panel-${value}`}
      aria-labelledby={`${tabsId}-tab-${value}`}
      className={className}
    >
      {children}
    </div>
  );
};
