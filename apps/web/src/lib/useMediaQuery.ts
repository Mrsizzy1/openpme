import { useEffect, useState } from 'react';

/** Points de rupture de l'enveloppe applicative (alignés sur index.css). */
export const MEDIA = {
  /** Menu en tiroir (< 1024 px). */
  drawer: '(max-width: 1023.98px)',
  /** Menu réduit à une colonne d'icônes (1024–1279 px). */
  rail: '(min-width: 1024px) and (max-width: 1279.98px)',
} as const;

function matches(query: string): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(query).matches;
}

/** Indique si la media query CSS donnée est satisfaite, avec mise à jour en direct. */
export function useMediaQuery(query: string): boolean {
  const [isMatch, setIsMatch] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const list = window.matchMedia(query);
    const update = () => setIsMatch(list.matches);
    update();
    if (typeof list.addEventListener === 'function') {
      list.addEventListener('change', update);
      return () => list.removeEventListener('change', update);
    }
    list.addListener(update);
    return () => list.removeListener(update);
  }, [query]);

  return isMatch;
}
