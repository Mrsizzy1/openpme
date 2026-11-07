import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cx } from '../../lib/cx';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type' | 'size'> {
  /** Texte recherché (champ contrôlé). */
  value: string;
  /** Reçoit la nouvelle valeur (et non l'événement). */
  onChange: (value: string) => void;
  /** Appelé après un clic sur « Effacer » (en plus de `onChange('')`). */
  onClear?: () => void;
  /** Raccourci clavier affiché à droite quand le champ est vide (ex. « F1 »). Purement indicatif. */
  shortcut?: string;
  /** Largeur CSS du champ (ex. `320`, `'100%'`). Défaut : 280 px, extensible dans une barre d'outils. */
  width?: number | string;
  /** `sm` : hauteur 30 px pour les barres denses. */
  size?: 'sm' | 'md';
  /** Classe du conteneur. */
  className?: string;
  /** Classe du champ `<input>`. */
  inputClassName?: string;
}

/**
 * Champ de recherche avec loupe, bouton d'effacement et nom accessible.
 * Échap efface la saisie en cours.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onChange,
    onClear,
    shortcut,
    width,
    size = 'md',
    placeholder = 'Rechercher…',
    className,
    inputClassName,
    onKeyDown,
    ...rest
  },
  forwardedRef,
) {
  const localRef = useRef<HTMLInputElement | null>(null);

  const setRefs = (element: HTMLInputElement | null) => {
    localRef.current = element;
    if (typeof forwardedRef === 'function') forwardedRef(element);
    else if (forwardedRef) forwardedRef.current = element;
  };

  const clear = () => {
    onChange('');
    onClear?.();
    localRef.current?.focus();
  };

  return (
    <div
      className={cx('search-input', size === 'sm' && 'search-input-sm', className)}
      style={width !== undefined ? { width, flexBasis: width } : undefined}
    >
      <Search className="search-input-icon" aria-hidden="true" />
      <input
        ref={setRefs}
        type="search"
        className={cx('input-field', size === 'sm' && 'input-sm', inputClassName)}
        value={value}
        placeholder={placeholder}
        aria-label={rest['aria-label'] ?? placeholder.replace(/…$/, '')}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault();
            event.stopPropagation();
            clear();
          }
          onKeyDown?.(event);
        }}
        {...rest}
      />
      {value ? (
        <button
          type="button"
          className="search-input-clear"
          onClick={clear}
          aria-label="Effacer la recherche"
          title="Effacer la recherche"
        >
          <X aria-hidden="true" />
        </button>
      ) : shortcut ? (
        <kbd className="kbd search-input-kbd" aria-hidden="true">{shortcut}</kbd>
      ) : null}
    </div>
  );
});
