import React from 'react';
import { cx } from '../../lib/cx';
import { getInitials } from '../../lib/format';
import type { Tone } from '../../lib/tone';

export interface AvatarProps {
  /** Nom complet : sert aux initiales et à l'infobulle. */
  name: string;
  /** `sm` 24 px, `md` 32 px (défaut), `lg` 40 px. */
  size?: 'sm' | 'md' | 'lg';
  /** Teinte. Défaut : `primary`. */
  tone?: Tone;
  className?: string;
}

/** Pastille d'initiales pour une personne ou une entreprise. */
export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', tone = 'primary', className }) => (
  <span className={cx('avatar', size !== 'md' && `avatar-${size}`, `avatar-${tone}`, className)} title={name} aria-hidden="true">
    {getInitials(name)}
  </span>
);
