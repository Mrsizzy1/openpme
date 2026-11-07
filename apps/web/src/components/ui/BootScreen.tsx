import React from 'react';
import { Building2 } from 'lucide-react';

export interface BootScreenProps {
  /** Message sous le nom de l'application. Défaut : « Restauration de votre session… ». */
  message?: string;
}

/**
 * Écran de démarrage plein écran (même rendu que l'écran statique d'index.html,
 * pour une transition sans saut).
 */
export const BootScreen: React.FC<BootScreenProps> = ({ message = 'Restauration de votre session…' }) => (
  <div className="boot-screen" role="status" aria-live="polite">
    <div className="boot-card">
      <span className="boot-logo" aria-hidden="true">
        <Building2 size={24} strokeWidth={2} />
      </span>
      <span className="boot-title">Smart PME Finance</span>
      <span className="boot-progress" aria-hidden="true" />
      <span className="boot-text">{message}</span>
    </div>
  </div>
);
