import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  Users,
  Truck,
  ShieldAlert,
  Monitor,
  UserCheck,
  Settings,
  type LucideIcon,
} from 'lucide-react';

/** Groupes de la barre latérale, dans l'ordre d'affichage. */
export type NavGroupId = 'activity' | 'partners' | 'control' | 'admin';

export interface NavGroup {
  id: NavGroupId;
  label: string;
}

/** Métadonnées d'une page : libellé (menu + en-tête), sous-titre, icône et groupe. */
export interface AppRouteMeta {
  /** Chemin exact, identique aux clés de `ROLE_ACCESS_BY_PATH`. */
  path: string;
  /** Libellé du menu, repris tel quel comme titre de l'en-tête. */
  label: string;
  /** Sous-titre court et factuel affiché sous le titre de l'en-tête. */
  subtitle: string;
  icon: LucideIcon;
  group: NavGroupId;
  /** Compteur affiché dans le menu. */
  badgeKey?: 'stock' | 'anomaly';
}

export const NAV_GROUPS: readonly NavGroup[] = [
  { id: 'activity', label: 'Activité' },
  { id: 'partners', label: 'Tiers' },
  { id: 'control', label: 'Contrôle' },
  { id: 'admin', label: 'Administration' },
];

export const APP_ROUTES: readonly AppRouteMeta[] = [
  {
    path: '/',
    label: 'Tableau de bord',
    subtitle: 'Indicateurs clés de l’activité et de la trésorerie',
    icon: LayoutDashboard,
    group: 'activity',
  },
  {
    path: '/sales',
    label: 'Caisse & ventes',
    subtitle: 'Point de vente et journal des ventes',
    icon: ShoppingCart,
    group: 'activity',
  },
  {
    path: '/products',
    label: 'Produits & stock',
    subtitle: 'Catalogue, prix, marges et niveaux de stock',
    icon: Package,
    group: 'activity',
    badgeKey: 'stock',
  },
  {
    path: '/invoices',
    label: 'Factures & devis',
    subtitle: 'Factures, devis et règlements clients',
    icon: Receipt,
    group: 'activity',
  },
  {
    path: '/finances',
    label: 'Finances',
    subtitle: 'Sessions de caisse, dépenses et comptes',
    icon: Wallet,
    group: 'activity',
  },
  {
    path: '/customers',
    label: 'Clients',
    subtitle: 'Fiches clients, encours et limites de crédit',
    icon: Users,
    group: 'partners',
  },
  {
    path: '/suppliers',
    label: 'Fournisseurs',
    subtitle: 'Fiches fournisseurs et dettes d’achat',
    icon: Truck,
    group: 'partners',
  },
  {
    path: '/anomalies',
    label: 'Alertes & contrôles',
    subtitle: 'Anomalies détectées et contrôles internes',
    icon: ShieldAlert,
    group: 'control',
    badgeKey: 'anomaly',
  },
  {
    path: '/terminals',
    label: 'Postes de travail',
    subtitle: 'Supervision et contrôle à distance des postes',
    icon: Monitor,
    group: 'control',
  },
  {
    path: '/users',
    label: 'Utilisateurs',
    subtitle: 'Collaborateurs, rôles et accès',
    icon: UserCheck,
    group: 'admin',
  },
  {
    path: '/settings',
    label: 'Paramètres',
    subtitle: 'Entreprise, devises, fiscalité et seuils de contrôle',
    icon: Settings,
    group: 'admin',
  },
];

/** Nom de l'application, utilisé dans le titre de l'onglet. */
export const APP_NAME = 'Smart PME Finance';

/** Métadonnées de la page correspondant exactement à un chemin. */
export function getRouteMeta(pathname: string): AppRouteMeta | undefined {
  return APP_ROUTES.find((route) => route.path === pathname);
}
