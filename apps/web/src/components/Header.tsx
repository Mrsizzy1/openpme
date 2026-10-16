import React from 'react';
import { Search, DollarSign, Wallet, ShieldAlert, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewSaleClick?: () => void;
  activeSession?: any;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onNewSaleClick,
  activeSession,
}) => {
  const { organization } = useAuth();
  const navigate = useNavigate();

  const exchangeRate = organization?.settings?.exchangeRateUsdToCdf || 2850;

  return (
    <header style={{
      height: '74px',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(11, 17, 32, 0.8)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Exchange Rate Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '0.4rem 0.85rem',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
        }}>
          <DollarSign size={15} color="#10B981" />
          <span>1 USD = <strong style={{ color: '#fff' }}>{exchangeRate.toLocaleString()} CDF</strong></span>
        </div>

        {/* Cash Session Status */}
        <div
          onClick={() => navigate('/finances')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            background: activeSession ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            border: activeSession ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
            color: activeSession ? '#34D399' : '#FBBF24',
          }}
        >
          <Wallet size={15} />
          <span>{activeSession ? 'Caisse Ouverte' : 'Caisse Fermée'}</span>
        </div>

        {/* Quick New Sale Button */}
        <button
          onClick={() => {
            if (onNewSaleClick) onNewSaleClick();
            else navigate('/sales');
          }}
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Plus size={16} />
          <span>Nouvelle Vente</span>
        </button>
      </div>
    </header>
  );
};
