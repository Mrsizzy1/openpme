import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { SuppliersPage } from './pages/SuppliersPage';
import { UsersPage } from './pages/UsersPage';
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
        background: '#F3F4F6',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div className="spinner" />
        <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Chargement de Smart PME Finance...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar anomalyCount={anomalyCount} lowStockCount={lowStockCount} />
      <div className="main-content">
        <Header title={title} subtitle={subtitle} activeSession={activeSession} />
        <main className="page-body">{children}</main>
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
                title="Tableau de bord"
                subtitle="Vue d'ensemble des indicateurs financiers et opérationnels"
              >
                <DashboardPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/sales"
            element={
              <ProtectedLayout
                title="Ventes & Point de vente"
                subtitle="Enregistrement des ventes, facturation directe et gestion des stocks"
              >
                <SalesPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedLayout
                title="Produits & Stocks"
                subtitle="Catalogue, prix d'achat/vente, marges et seuils d'alerte"
              >
                <ProductsPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/invoices"
            element={
              <ProtectedLayout
                title="Facturation"
                subtitle="Factures, règlements partiels et impression des pièces"
              >
                <InvoicesPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/finances"
            element={
              <ProtectedLayout
                title="Caisse & Dépenses"
                subtitle="Gestion de caisse, dépenses et comptes financiers"
              >
                <FinancesPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedLayout
                title="Clients"
                subtitle="Fiches clients, encours, limites de crédit et historique"
              >
                <CustomersPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/suppliers"
            element={
              <ProtectedLayout
                title="Fournisseurs"
                subtitle="Gestion des fournisseurs, dettes d'achats et réceptions"
              >
                <SuppliersPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedLayout
                title="Gestion des Rôles & Équipe"
                subtitle="Collaborateurs, attribution des permissions RBAC et accès"
              >
                <UsersPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/anomalies"
            element={
              <ProtectedLayout
                title="Détection des anomalies"
                subtitle="Inspection des anomalies financières, stocks et remises"
              >
                <AnomaliesPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedLayout
                title="Paramètres"
                subtitle="Devise, fiscalité, mentions légales et seuils de contrôle"
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
