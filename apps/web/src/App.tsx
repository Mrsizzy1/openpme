import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ApiClient } from './api/client';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SalesPage } from './pages/SalesPage';
import { ProductsPage } from './pages/ProductsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { FinancesPage } from './pages/FinancesPage';
import { CustomersPage } from './pages/CustomersPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedLayout: React.FC<{ children: React.ReactNode; title: string; subtitle?: string }> = ({
  children,
  title,
  subtitle,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [anomalyCount, setAnomalyCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  useEffect(() => {
    if (isAuthenticated) {
      ApiClient.getCurrentCashSession().then(setActiveSession).catch(() => {});
      ApiClient.getAnomalies('DETECTED').then((res) => setAnomalyCount(res.length)).catch(() => {});
      ApiClient.getLowStock().then((res) => setLowStockCount(res.length)).catch(() => {});
    }
  }, [isAuthenticated, title]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        color: '#fff',
        fontSize: '1.1rem',
      }}>
        Initialisation de Smart PME Finance...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Sidebar anomalyCount={anomalyCount} lowStockCount={lowStockCount} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header title={title} subtitle={subtitle} activeSession={activeSession} />
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedLayout
                title="Supervision & Pilotage Financier"
                subtitle="Vue d’ensemble des opérations commerciales, de trésorerie et alertes d'anomalies"
              >
                <DashboardPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/sales"
            element={
              <ProtectedLayout
                title="Ventes & Caisse Enregistreuse"
                subtitle="Enregistrement des ventes au comptoir, facturation directe et décompte des stocks"
              >
                <SalesPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedLayout
                title="Produits, Services & Gestion des Stocks"
                subtitle="Catalogue des articles, prix d'achat/vente, marges et suivi des seuils d'alerte"
              >
                <ProductsPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/invoices"
            element={
              <ProtectedLayout
                title="Facturation Complète & Devis"
                subtitle="Cycle de vie des factures, règlements partiels et impression des pièces légales"
              >
                <InvoicesPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/finances"
            element={
              <ProtectedLayout
                title="Caisse, Dépenses & Comptes Financiers"
                subtitle="Clôture de caisse avec calcul d’écart théorique vs réel, dépenses et comptes Rawbank/M-Pesa"
              >
                <FinancesPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedLayout
                title="Répertoire Clients & Suivi des Créances"
                subtitle="Fiches clients, encours de facturation, limites de crédit et historique"
              >
                <CustomersPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/anomalies"
            element={
              <ProtectedLayout
                title="Détection Intelligente des Anomalies"
                subtitle="Moteur d’inspection explicable des anomalies financières, stocks et remises anormales"
              >
                <AnomaliesPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedLayout
                title="Paramètres de l’Entreprise"
                subtitle="Personnalisation de la devise (CDF/USD), fiscalité, mentions légales et seuils de contrôle"
              >
                <SettingsPage />
              </ProtectedLayout>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
