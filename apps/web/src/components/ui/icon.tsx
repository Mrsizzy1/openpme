import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Icône acceptée par les composants du kit : soit le composant Lucide lui-même
 * (`icon={Package}`, taille gérée par le kit), soit un élément déjà rendu
 * (`icon={<Package size={18} />}`).
 */
export type IconProp = LucideIcon | React.ReactElement | null | undefined | false;

/** Rend une {@link IconProp} à la taille demandée (décorative, masquée aux lecteurs d'écran). */
export function renderIcon(icon: IconProp, size: number, className?: string): React.ReactNode {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  const Icon = icon as React.ElementType;
  return <Icon size={size} className={className} aria-hidden="true" focusable="false" />;
}
