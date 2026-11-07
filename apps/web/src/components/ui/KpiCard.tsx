import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cx } from '../../lib/cx';
import type { Tone } from '../../lib/tone';
import { renderIcon, type IconProp } from './icon';
import { Skeleton } from './LoadingState';

export interface KpiTrend {
  /** Sens de la variation. */
  direction: 'up' | 'down' | 'flat';
  /** Texte de la variation (« +12 % », « −3 ventes »). */
  label: React.ReactNode;
  /** Ton imposé ; par défaut : hausse = succès, baisse = danger. Inversez pour les dépenses. */
  tone?: Tone;
}

export interface KpiCardProps {
  /** Intitulé de l'indicateur (« Chiffre d'affaires du jour »). */
  label: React.ReactNode;
  /** Valeur principale déjà formatée (`formatMoney`, `formatNumber`…). */
  value: React.ReactNode;
  /** Ligne de contexte sous la valeur (« 12 ventes aujourd'hui »). */
  hint?: React.ReactNode;
  /** Icône de l'indicateur, dans une pastille teintée. */
  icon?: IconProp;
  /** Teinte de la pastille d'icône. Défaut : `primary`. */
  tone?: Tone;
  /** Colore la valeur (ex. `danger` pour un solde négatif). Défaut : couleur de texte normale. */
  valueTone?: Tone;
  /** Variation affichée à côté du contexte. */
  trend?: KpiTrend;
  /** Affiche un squelette à la place de la valeur. */
  loading?: boolean;
  /** Rend la carte cliquable (navigation vers le détail). */
  onClick?: () => void;
  className?: string;
}

const TREND_ICONS = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus } as const;

/** Carte d'indicateur clé, à placer dans une grille `.kpi-grid`. */
export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
  valueTone,
  trend,
  loading = false,
  onClick,
  className,
}) => {
  const trendTone: Tone | undefined = trend
    ? trend.tone ?? (trend.direction === 'up' ? 'success' : trend.direction === 'down' ? 'danger' : 'neutral')
    : undefined;
  const TrendIcon = trend ? TREND_ICONS[trend.direction] : null;

  const body = (
    <>
      <div className="kpi-label">
        <span className="kpi-label-text">{label}</span>
        {icon ? <span className={cx('icon-tile', 'icon-tile-sm', `icon-tile-${tone}`)} aria-hidden="true">{renderIcon(icon, 15)}</span> : null}
      </div>
      <div className={cx('kpi-value', valueTone && `text-${valueTone}`)}>
        {loading ? <Skeleton width="70%" height={22} /> : value}
      </div>
      {hint || trend ? (
        <div className="kpi-sub">
          {trend && TrendIcon ? (
            <span className={cx('kpi-trend', `text-${trendTone}`)}>
              <TrendIcon size={13} aria-hidden="true" />
              {trend.label}
            </span>
          ) : null}
          {hint ? <span className="kpi-hint">{hint}</span> : null}
        </div>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={cx('kpi-card', 'kpi-card-interactive', className)} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className={cx('kpi-card', className)}>{body}</div>;
};
