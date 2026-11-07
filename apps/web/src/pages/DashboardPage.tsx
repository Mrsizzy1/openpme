import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Currency, formatCurrency } from '@smart-pme/shared';
import {
  TrendingUp,
  Receipt,
  Wallet,
  ArrowDownRight,
  ShieldAlert,
  AlertTriangle,
  Package,
  ShoppingCart,
  ArrowRight,
  RefreshCw,
  Monitor,
  FileDown,
  PiggyBank,
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { hasPathAccess } from '../role-permissions';
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  KpiCard,
  KpiSkeleton,
  PageToolbar,
  SectionCard,
  Spinner,
  StatusBadge,
  TableSkeleton,
} from '../components/ui';
import { formatDate, formatNumber } from '../lib/format';
import { ANOMALY_SEVERITY, SALE_STATUS, getStatusMeta } from '../lib/status';
import { useRealtime } from '../lib/realtime';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<Currency | undefined>();
  const [dossierMonths, setDossierMonths] = useState<6 | 12>(12);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasData = useRef(false);

  const canOpen = (path: string) => hasPathAccess(path, user?.role);
  const goTo = (path: string) => (canOpen(path) ? () => navigate(path) : undefined);

  /** Premier chargement : squelette. Ensuite, le contenu reste affiché pendant l'actualisation. */
  const loadMetrics = async (currency = displayCurrency) => {
    try {
      if (hasData.current) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await ApiClient.getDashboardMetrics(currency);
      setData(res);
      hasData.current = true;
      setDisplayCurrency(res.metrics.displayCurrency);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les indicateurs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const downloadBankDossier = async () => {
    try {
      setDossierLoading(true);
      setDossierError(null);
      const pdf = await ApiClient.downloadBankDossier(dossierMonths);
      const url = window.URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dossier-banque-${dossierMonths}-mois.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      setDossierError(err instanceof Error ? err.message : 'Impossible de générer le dossier bancaire.');
    } finally {
      setDossierLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  // Indicateurs actualisés dès qu'un autre poste enregistre une opération.
  useRealtime(['sales', 'payments', 'invoices', 'finances', 'products', 'anomalies', 'suppliers'], () => {
    if (hasData.current) void loadMetrics();
  });

  const changeCurrency = (currency: Currency) => {
    if (currency === displayCurrency) return;
    setDisplayCurrency(currency);
    loadMetrics(currency);
  };

  const toolbar = (
    <PageToolbar
      start={(
        <>
          <div className="segmented" role="group" aria-label="Devise d’affichage">
            {[Currency.CDF, Currency.USD].map((currency) => (
              <button
                key={currency}
                type="button"
                className={`segmented-btn${(data?.metrics.displayCurrency ?? displayCurrency) === currency ? ' active' : ''}`}
                aria-pressed={(data?.metrics.displayCurrency ?? displayCurrency) === currency}
                onClick={() => changeCurrency(currency)}
                disabled={loading}
              >
                {currency}
              </button>
            ))}
          </div>
          {refreshing && <Spinner size="sm" label="Actualisation des indicateurs" />}
        </>
      )}
      end={(
        <>
          <div className="dashboard-dossier" role="group" aria-label="Dossier bancaire">
            <select
              className="select-field input-sm"
              aria-label="Période du dossier bancaire"
              value={dossierMonths}
              onChange={(event) => setDossierMonths(event.target.value === '6' ? 6 : 12)}
            >
              <option value={12}>12 derniers mois</option>
              <option value={6}>6 derniers mois</option>
            </select>
            <Button
              size="sm"
              icon={<FileDown size={14} />}
              onClick={downloadBankDossier}
              loading={dossierLoading}
              loadingText="Génération…"
              title="Télécharger le dossier de financement au format PDF"
            >
              Dossier bancaire
            </Button>
          </div>
          <IconButton
            icon={<RefreshCw />}
            variant="secondary"
            size="sm"
            aria-label="Actualiser les indicateurs"
            onClick={() => loadMetrics()}
            disabled={loading || refreshing}
          />
        </>
      )}
    />
  );

  if (loading) {
    return (
      <div className="page">
        {toolbar}
        <KpiSkeleton count={8} />
        <div className="dashboard-columns">
          <div className="table-wrapper"><TableSkeleton rows={5} columns={5} /></div>
          <div className="table-wrapper"><TableSkeleton rows={5} columns={2} /></div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="page">
        <div className="card">
          <ErrorState title="Impossible de charger le tableau de bord" message={error} onRetry={() => loadMetrics()} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, recentSales, recentAnomalies } = data;
  const money = (value: number) => formatCurrency(value, metrics.displayCurrency);

  return (
    <div className="page dashboard-page">
      {toolbar}

      {error && (
        <Alert tone="danger" title="Actualisation impossible" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {dossierError && (
        <Alert tone="danger" title="Dossier bancaire indisponible" onDismiss={() => setDossierError(null)}>
          {dossierError}
        </Alert>
      )}

      {metrics.activeAnomaliesCount > 0 && (
        <Alert
          tone="warning"
          icon={ShieldAlert}
          title={`${formatNumber(metrics.activeAnomaliesCount)} anomalie(s) en attente de traitement`}
          actions={canOpen('/anomalies') ? (
            <Button size="sm" iconRight={<ArrowRight size={13} />} onClick={() => navigate('/anomalies')}>
              Voir les alertes
            </Button>
          ) : undefined}
        >
          Des anomalies ont été détectées automatiquement et nécessitent votre attention.
        </Alert>
      )}

      <div className="kpi-grid dashboard-kpis">
        <KpiCard
          label="Chiffre d’affaires du jour"
          value={money(metrics.todaySales)}
          icon={TrendingUp}
          tone="primary"
          hint={`${formatNumber(metrics.todaySalesCount)} vente(s) aujourd’hui`}
          onClick={goTo('/sales')}
        />
        <KpiCard
          label="Revenus du mois"
          value={money(metrics.monthlyRevenue)}
          icon={ShoppingCart}
          tone="info"
          hint="Ventes et factures du mois en cours"
        />
        <KpiCard
          label="Marge nette"
          value={money(metrics.netMargin)}
          icon={PiggyBank}
          tone={metrics.netMargin >= 0 ? 'success' : 'danger'}
          valueTone={metrics.netMargin >= 0 ? 'success' : 'danger'}
          hint={`Dépenses : ${money(metrics.monthlyExpenses)}`}
        />
        <KpiCard
          label="Trésorerie"
          value={money(metrics.totalCashBalance)}
          icon={Wallet}
          tone="warning"
          hint="Caisses et comptes bancaires"
          onClick={goTo('/finances')}
        />
        <KpiCard
          label="Créances clients"
          value={money(metrics.totalReceivables)}
          icon={Receipt}
          tone="primary"
          hint={(
            <span className={metrics.unpaidInvoicesCount > 0 ? 'text-warning' : undefined}>
              {formatNumber(metrics.unpaidInvoicesCount)} facture(s) impayée(s)
            </span>
          )}
          onClick={goTo('/invoices')}
        />
        <KpiCard
          label="Dettes fournisseurs"
          value={money(metrics.totalPayables)}
          icon={ArrowDownRight}
          tone="danger"
          hint="Engagements d’achat à régler"
          onClick={goTo('/suppliers')}
        />
        <KpiCard
          label="Stock critique"
          value={formatNumber(metrics.lowStockItemsCount)}
          icon={Package}
          tone={metrics.lowStockItemsCount > 0 ? 'danger' : 'success'}
          valueTone={metrics.lowStockItemsCount > 0 ? 'danger' : undefined}
          hint="Articles sous le seuil d’alerte"
          onClick={goTo('/products')}
        />
        <KpiCard
          label="Anomalies actives"
          value={formatNumber(metrics.activeAnomaliesCount)}
          icon={ShieldAlert}
          tone={metrics.activeAnomaliesCount > 0 ? 'warning' : 'success'}
          valueTone={metrics.activeAnomaliesCount > 0 ? 'warning' : undefined}
          hint="Détectées, en attente de résolution"
          onClick={goTo('/anomalies')}
        />
      </div>

      <div className="dashboard-columns">
        <SectionCard
          title="Dernières ventes"
          icon={ShoppingCart}
          flush
          actions={canOpen('/sales') ? (
            <Button size="sm" variant="ghost" iconRight={<ArrowRight size={13} />} onClick={() => navigate('/sales')}>
              Voir tout
            </Button>
          ) : undefined}
        >
          {recentSales.length === 0 ? (
            <EmptyState
              compact
              icon={ShoppingCart}
              title="Aucune vente enregistrée"
              description="Les ventes apparaîtront ici dès leur enregistrement."
              action={canOpen('/sales') ? (
                <Button variant="primary" size="sm" onClick={() => navigate('/sales')}>Enregistrer une vente</Button>
              ) : undefined}
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N° de vente</th>
                    <th>Client</th>
                    <th className="col-num">Articles</th>
                    <th className="col-amount">Montant</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale: any) => {
                    const status = getStatusMeta(SALE_STATUS, sale.status);
                    return (
                      <tr key={sale.id}>
                        <td className="col-mono">{sale.saleNumber}</td>
                        <td>{sale.customer?.name || 'Client comptant'}</td>
                        <td className="col-num">{formatNumber(sale.items?.length || 0)}</td>
                        <td className="col-amount">{formatCurrency(Number(sale.total), sale.currency)}</td>
                        <td><StatusBadge tone={status.tone} dot>{status.label}</StatusBadge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Anomalies récentes"
          icon={ShieldAlert}
          iconTone="warning"
          flush
          actions={canOpen('/anomalies') ? (
            <Button size="sm" variant="ghost" iconRight={<ArrowRight size={13} />} onClick={() => navigate('/anomalies')}>
              Centre d’alertes
            </Button>
          ) : undefined}
        >
          {recentAnomalies.length === 0 ? (
            <EmptyState
              compact
              icon={ShieldAlert}
              title="Aucune anomalie détectée"
              description="Le système surveille les opérations en continu."
            />
          ) : (
            <ul className="dashboard-anomalies">
              {recentAnomalies.map((anom: any) => {
                const severity = getStatusMeta(ANOMALY_SEVERITY, anom.severity);
                return (
                  <li key={anom.id} className="dashboard-anomaly">
                    <AlertTriangle
                      size={15}
                      aria-hidden="true"
                      className={severity.tone === 'danger' ? 'text-danger' : 'text-warning'}
                    />
                    <div className="dashboard-anomaly-body">
                      <div className="dashboard-anomaly-head">
                        <span className="dashboard-anomaly-title">{anom.title}</span>
                        <StatusBadge tone={severity.tone} size="sm">{severity.label}</StatusBadge>
                      </div>
                      <p className="dashboard-anomaly-text">{anom.explanation}</p>
                      <div className="dashboard-anomaly-meta">
                        Valeur observée : <strong>{anom.observedValue}</strong> · {formatDate(anom.createdAt)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      {canOpen('/terminals') && (
        <div className="card dashboard-remote">
          <span className="icon-tile icon-tile-primary" aria-hidden="true">
            <Monitor size={18} />
          </span>
          <div className="dashboard-remote-text">
            <div className="card-title">Supervision des postes de caisse</div>
            <p className="card-subtitle">
              Suivez les postes connectés en direct, verrouillez un écran ou révoquez un poste à distance.
            </p>
          </div>
          <Button iconRight={<ArrowRight size={14} />} onClick={() => navigate('/terminals')}>
            Ouvrir la supervision
          </Button>
        </div>
      )}
    </div>
  );
};
