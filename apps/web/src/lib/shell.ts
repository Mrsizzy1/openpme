import { createContext, useContext } from 'react';

export interface ShellContextValue {
  /**
   * Recharge les indicateurs de l'enveloppe (session de caisse, alertes, stock bas).
   * À appeler après une action qui les modifie : ouverture/clôture de caisse,
   * résolution d'une anomalie, mouvement de stock…
   */
  refreshIndicators: () => void;
}

export const ShellContext = createContext<ShellContextValue>({
  refreshIndicators: () => undefined,
});

/** Accès aux actions de l'enveloppe applicative (en-tête, menu). */
export function useShell(): ShellContextValue {
  return useContext(ShellContext);
}
