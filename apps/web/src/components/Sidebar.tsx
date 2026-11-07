import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasPathAccess } from '../role-permissions';
import { APP_ROUTES, NAV_GROUPS, type AppRouteMeta } from '../lib/navigation';
import { getRoleLabel } from '../lib/status';
import { getInitials } from '../lib/format';

interface SidebarProps {
  anomalyCount?: number;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ anomalyCount = 0, lowStockCount = 0 }) => {
  const { user, organization, logout } = useAuth();
  const userRole = user?.role || 'CASHIER';

  // Filtrage strict par rôle (mêmes règles que les routes).
  const visibleRoutes = APP_ROUTES.filter((route) => hasPathAccess(route.path, userRole));

  const getBadge = (route: AppRouteMeta) => {
    if (route.badgeKey === 'anomaly' && anomalyCount > 0) {
      return { count: anomalyCount, tone: '', label: `${anomalyCount} alerte(s) à traiter` };
    }
    if (route.badgeKey === 'stock' && lowStockCount > 0) {
      return { count: lowStockCount, tone: 'warning', label: `${lowStockCount} article(s) en stock bas` };
    }
    return null;
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const initials = getInitials(user?.firstName, user?.lastName) || '?';
  const roleLabel = getRoleLabel(userRole);

  return (
    <aside className="sidebar" aria-label="Navigation principale">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo" aria-hidden="true">
          <Building2 size={17} />
        </div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-name" title={organization?.name || 'Smart PME'}>
            {organization?.name || 'Smart PME'}
          </div>
          <div className="sidebar-org">
            {organization?.country || 'RDC'} · {organization?.settings?.primaryCurrency || 'CDF'}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => {
          const routes = visibleRoutes.filter((route) => route.group === group.id);
          if (routes.length === 0) return null;
          return (
            <div className="sidebar-group" key={group.id} role="group" aria-label={group.label}>
              <div className="sidebar-section-label" aria-hidden="true">{group.label}</div>
              {routes.map((route) => {
                const badge = getBadge(route);
                const Icon = route.icon;
                return (
                  <NavLink
                    key={route.path}
                    to={route.path}
                    end={route.path === '/'}
                    title={route.label}
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  >
                    <Icon className="sidebar-link-icon" aria-hidden="true" />
                    <span className="sidebar-link-label">{route.label}</span>
                    {badge && (
                      <span
                        className={`sidebar-link-badge${badge.tone ? ` ${badge.tone}` : ''}`}
                        aria-label={badge.label}
                        title={badge.label}
                      >
                        {badge.count > 99 ? '99+' : badge.count}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar" title={fullName || undefined} aria-hidden="true">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{fullName}</div>
            <div className="sidebar-user-role">{roleLabel}</div>
          </div>
          <button
            onClick={logout}
            className="btn-logout"
            title="Se déconnecter"
            aria-label="Se déconnecter"
            type="button"
          >
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
};
