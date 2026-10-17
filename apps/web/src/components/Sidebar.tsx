import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  Users,
  ShieldAlert,
  Settings,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  anomalyCount?: number;
  lowStockCount?: number;
}

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { to: '/sales', label: 'Ventes', icon: ShoppingCart },
  { to: '/products', label: 'Produits & Stocks', icon: Package, badgeKey: 'stock' as const },
  { to: '/invoices', label: 'Facturation', icon: Receipt },
  { to: '/finances', label: 'Caisse & Dépenses', icon: Wallet },
  { to: '/customers', label: 'Clients', icon: Users },
  { to: '/anomalies', label: 'Anomalies', icon: ShieldAlert, badgeKey: 'anomaly' as const },
  { to: '/settings', label: 'Paramètres', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ anomalyCount = 0, lowStockCount = 0 }) => {
  const { user, organization, logout } = useAuth();

  const getBadge = (item: typeof navItems[0]) => {
    if (item.badgeKey === 'anomaly' && anomalyCount > 0) return { count: anomalyCount, type: '' };
    if (item.badgeKey === 'stock' && lowStockCount > 0) return { count: lowStockCount, type: 'warning' };
    return null;
  };

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('') || '?';

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          <Building2 size={18} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div className="sidebar-brand-name">{organization?.name || 'Smart PME'}</div>
          <div className="sidebar-org">{organization?.country || 'RDC'} · {organization?.settings?.primaryCurrency || 'CDF'}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu</div>
        {navItems.map((item) => {
          const badge = getBadge(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <item.icon className="sidebar-link-icon" size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {badge && (
                <span className={`sidebar-link-badge${badge.type ? ` ${badge.type}` : ''}`}>
                  {badge.count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Pied : utilisateur */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.firstName} {user?.lastName}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="btn-logout"
            title="Se déconnecter"
            type="button"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};
