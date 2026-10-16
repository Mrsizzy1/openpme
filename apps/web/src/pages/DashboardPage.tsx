import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { formatCurrency, Currency } from '@smart-pme/shared';
import {
  TrendingUp,
  Receipt,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  Package,
  ShoppingCart,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getDashboardMetrics();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading || !data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Chargement des données financières en temps réel...</div>
      </div>
    );
  }

  const { metrics, recentSales, recentInvoices, recentAnomalies } = data;

  return (
    <div style={{ padding: '2rem' }}>
      {/* Alert Bar if Anomalies */}
      {metrics.activeAnomaliesCount > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <ShieldAlert size={24} color="#EF4444" />
            <div>
              <div style={{ fontWeight: 700, color: '#FCA5A5' }}>
                {metrics.activeAnomaliesCount} anomalie(s) ou alerte(s) de gestion requièrent votre attention
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Ruptures de stock critiques, remises exceptionnelles ou retards de règlement détectés automatiquement.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/anomalies')}
            className="btn btn-danger btn-sm"
          >
            Examiner les alertes
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* CA Jour */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Chiffre d’affaires Jour</span>
            <TrendingUp size={16} color="var(--primary-light)" />
          </div>
          <div className="kpi-value">
            {formatCurrency(metrics.todaySales, metrics.primaryCurrency)}
          </div>
          <div className="kpi-sub" style={{ color: '#34D399' }}>
            {metrics.todaySalesCount} vente(s) enregistrée(s) aujourd’hui
          </div>
        </div>

        {/* CA Mois */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Revenus du Mois</span>
            <ShoppingCart size={16} color="var(--accent-cyan)" />
          </div>
          <div className="kpi-value">
            {formatCurrency(metrics.monthlyRevenue, metrics.primaryCurrency)}
          </div>
          <div className="kpi-sub">
            Période en cours (base facturée & comptoir)
          </div>
        </div>

        {/* Marge Nette */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Marge Nette Réalisée</span>
            <ArrowUpRight size={16} color="#10B981" />
          </div>
          <div className="kpi-value" style={{ color: metrics.netMargin >= 0 ? '#34D399' : '#F87171' }}>
            {formatCurrency(metrics.netMargin, metrics.primaryCurrency)}
          </div>
          <div className="kpi-sub">
            Revenus moins Dépenses ({formatCurrency(metrics.monthlyExpenses, metrics.primaryCurrency)})
          </div>
        </div>

        {/* Trésorerie Globale */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Trésorerie & Comptes</span>
            <Wallet size={16} color="#F59E0B" />
          </div>
          <div className="kpi-value">
            {formatCurrency(metrics.totalCashBalance, metrics.primaryCurrency)}
          </div>
          <div className="kpi-sub">
            Comptes Bancaires & Mobile Money
          </div>
        </div>

        {/* Créances Clients */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Créances Clients</span>
            <Receipt size={16} color="#3B82F6" />
          </div>
          <div className="kpi-value">
            {formatCurrency(metrics.totalReceivables, metrics.primaryCurrency)}
          </div>
          <div className="kpi-sub" style={{ color: '#FBBF24' }}>
            {metrics.unpaidInvoicesCount} facture(s) en attente de solde
          </div>
        </div>

        {/* Dettes Fournisseurs */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Dettes Fournisseurs</span>
            <ArrowDownRight size={16} color="#EC4899" />
          </div>
          <div className="kpi-value">
            {formatCurrency(metrics.totalPayables, metrics.primaryCurrency)}
          </div>
          <div className="kpi-sub">
            Engagements achats à régulariser
          </div>
        </div>

        {/* Ruptures Stock */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Articles en Stock Critique</span>
            <Package size={16} color="#EF4444" />
          </div>
          <div className="kpi-value" style={{ color: metrics.lowStockItemsCount > 0 ? '#F87171' : '#34D399' }}>
            {metrics.lowStockItemsCount}
          </div>
          <div className="kpi-sub">
            Sous le seuil d’alerte configuré
          </div>
        </div>

        {/* Alertes d'anomalies */}
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Alertes IA & Métier</span>
            <ShieldAlert size={16} color="#8B5CF6" />
          </div>
          <div className="kpi-value" style={{ color: metrics.activeAnomaliesCount > 0 ? '#FBBF24' : '#34D399' }}>
            {metrics.activeAnomaliesCount}
          </div>
          <div className="kpi-sub">
            Détection explicable en continu
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Sales & Live Anomalies */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        {/* Left: Ventes Récentes */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Dernières Opérations de Vente
            </h3>
            <button
              onClick={() => navigate('/sales')}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>Voir tout</span>
              <ExternalLink size={14} />
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>N° Vente</th>
                  <th>Client</th>
                  <th>Articles</th>
                  <th>Montant Total</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale: any) => (
                  <tr key={sale.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary-light)' }}>
                      {sale.saleNumber}
                    </td>
                    <td>{sale.customer?.name || 'Client Comptant'}</td>
                    <td>{sale.items?.length || 0} article(s)</td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>
                      {formatCurrency(Number(sale.total), sale.currency)}
                    </td>
                    <td>
                      <span className="badge badge-success">Validée</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Alertes de Surveillance */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Anomalies Détectées
            </h3>
            <button
              onClick={() => navigate('/anomalies')}
              className="btn btn-secondary btn-sm"
            >
              Centre d'alertes
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {recentAnomalies.map((anom: any) => (
              <div
                key={anom.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                }}
              >
                <div style={{
                  padding: '6px',
                  borderRadius: '8px',
                  background: anom.severity === 'CRITICAL' || anom.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: anom.severity === 'CRITICAL' || anom.severity === 'HIGH' ? '#EF4444' : '#F59E0B',
                }}>
                  <AlertTriangle size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{anom.title}</strong>
                    <span className={`badge badge-${anom.severity === 'CRITICAL' || anom.severity === 'HIGH' ? 'danger' : 'warning'}`}>
                      {anom.severity}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {anom.explanation}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.35rem' }}>
                    Observé : <strong style={{ color: '#FBBF24' }}>{anom.observedValue}</strong> • {new Date(anom.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
