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
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  anomalyCount?: number;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ anomalyCount = 0, lowStockCount = 0 }) => {
  const { user, organization, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
    { to: '/sales', label: 'Ventes & Point de vente', icon: ShoppingCart },
    { to: '/products', label: 'Produits & Stocks', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeColor: 'warning' },
    { to: '/invoices', label: 'Facturation & Devis', icon: Receipt },
    { to: '/finances', label: 'Caisse & Dépenses', icon: Wallet },
    { to: '/customers', label: 'Clients & Créances', icon: Users },
    { to: '/anomalies', label: 'Détection d’anomalies', icon: ShieldAlert, badge: anomalyCount > 0 ? anomalyCount : undefined, badgeColor: 'danger' },
    { to: '/settings', label: 'Paramètres Entreprise', icon: Settings },
  ];

  return (
    <aside style={{
      width: '270px',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
          flexShrink: 0,
        }}>
          <Building2 size={22} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', letterSpacing: '-0.02em', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {organization?.name || 'Smart PME'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
            {organization?.country || 'RDC'} • {organization?.settings?.primaryCurrency || 'CDF'}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-subtle)', fontWeight: 700, padding: '0.5rem 0.75rem', letterSpacing: '0.05em' }}>
          Menu Principal
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.7rem 0.85rem',
              borderRadius: '10px',
              color: isActive ? '#fff' : 'var(--text-muted)',
              background: isActive ? 'linear-gradient(90deg, rgba(37, 99, 235, 0.25) 0%, rgba(37, 99, 235, 0.05) 100%)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--primary-light)' : '3px solid transparent',
              textDecoration: 'none',
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.875rem',
              marginBottom: '0.25rem',
              transition: 'all 0.15s ease',
            })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <item.icon size={19} />
              <span>{item.label}</span>
            </div>
            {item.badge !== undefined && (
              <span className={`badge badge-${item.badgeColor}`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div style={{
        padding: '1.25rem',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {user?.role}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Se déconnecter"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-subtle)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
