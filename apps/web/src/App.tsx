import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Building2, LayoutDashboard } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ApiClient } from './api/client';
import { getFirstAllowedPath, hasPathAccess } from './role-permissions';
import { APP_NAME, getRouteMeta } from './lib/navigation';
import { ShellContext, type ShellContextValue } from './lib/shell';
import { BootScreen } from './components/ui/BootScreen';
import { PageSkeleton } from './components/ui/LoadingState';
import { RouteErrorBoundary } from './components/ui/ErrorBoundary';
import { realtime, useRealtime } from './lib/realtime';

// Pages chargées à la demande : démarrage plus rapide, et une page en erreur n'empêche pas les autres de s'afficher.
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const SalesPage = lazy(() => import('./pages/SalesPage').then((m) => ({ default: m.SalesPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage })));
const FinancesPage = lazy(() => import('./pages/FinancesPage').then((m) => ({ default: m.FinancesPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const TerminalsPage = lazy(() => import('./pages/TerminalsPage').then((m) => ({ default: m.TerminalsPage })));
const AnomaliesPage = lazy(() => import('./pages/AnomaliesPage').then((m) => ({ default: m.AnomaliesPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

/** Enveloppe commune des pages connectées : barre latérale + en-tête persistants. */
const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading, user, refreshProfile } = useAuth();
  const location = useLocation();
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [anomalyCount, setAnomalyCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [navOpen, setNavOpen] = useState(false);

  const refreshIndicators = useCallback(() => setRefreshKey((key) => key + 1), []);
  const shellValue = useMemo<ShellContextValue>(() => ({ refreshIndicators }), [refreshIndicators]);

  // Indicateurs de l'en-tête et de la barre latérale, rechargés à chaque navigation.
  useEffect(() => {
    if (!isAuthenticated) return;
    ApiClient.getCurrentCashSession().then(setActiveSession).catch(() => {});
    ApiClient.getAnomalies('DETECTED').then((res) => setAnomalyCount(res.length)).catch(() => {});
    ApiClient.getLowStock().then((res) => setLowStockCount(res.length)).catch(() => {});
  }, [isAuthenticated, location.pathname, refreshKey]);

  // Synchronisation en temps réel avec les autres postes de l'entreprise.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    realtime.start();
    return () => realtime.stop();
  }, [isAuthenticated]);

  useRealtime(['sales', 'finances', 'anomalies', 'products', 'payments'], refreshIndicators);
  // Taux du jour, profil et droits modifiés depuis un autre poste.
  useRealtime(['organizations', 'users'], () => {
    void refreshProfile().catch(() => undefined);
  });

  // Le tiroir de navigation (petits écrans) se ferme à chaque changement de page ou avec Échap.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  const meta = getRouteMeta(location.pathname);

  useEffect(() => {
    document.title = meta ? `${meta.label} · ${APP_NAME}` : APP_NAME;
  }, [meta]);

  if (isLoading) {
    return <BootScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPathAccess(location.pathname, user?.role)) {
    return <Navigate to={getFirstAllowedPath(user?.role)} replace />;
  }

  const page = (
    <RouteErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </RouteErrorBoundary>
  );

  const isPosCashier = new URLSearchParams(location.search).get('posMode') === 'cashier';

  if (isPosCashier) {
    return (
      <ShellContext.Provider value={shellValue}>
        <div className="pos-shell">
          <header className="pos-header">
            <div className="pos-brand">
              <span className="sidebar-brand-logo" aria-hidden="true">
                <Building2 size={16} />
              </span>
              <span className="pos-brand-name">Smart PME</span>
              <span className="pos-badge">Poste caisse</span>
            </div>
            <div className="pos-operator">
              <span>
                Opérateur : <strong>{user?.firstName} {user?.lastName}</strong>
              </span>
              <a href="/" className="pos-exit" title="Retourner à la console de gestion complète">
                <LayoutDashboard size={14} aria-hidden="true" />
                Console de gestion
              </a>
            </div>
          </header>
          <main className="pos-main">{page}</main>
        </div>
      </ShellContext.Provider>
    );
  }

  return (
    <ShellContext.Provider value={shellValue}>
      <div className={`app-shell${navOpen ? ' nav-open' : ''}`}>
        <Sidebar anomalyCount={anomalyCount} lowStockCount={lowStockCount} />
        <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />
        <div className="main-content">
          <Header
            title={meta?.label ?? APP_NAME}
            subtitle={meta?.subtitle}
            activeSession={activeSession}
            onMenuClick={() => setNavOpen(true)}
          />
          <main className="page-body" id="main-content">{page}</main>
        </div>
      </div>
    </ShellContext.Provider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={(
              <Suspense fallback={<BootScreen message="Chargement…" />}>
                <LoginPage />
              </Suspense>
            )}
          />

          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/finances" element={<FinancesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/terminals" element={<TerminalsPage />} />
            <Route path="/anomalies" element={<AnomaliesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
