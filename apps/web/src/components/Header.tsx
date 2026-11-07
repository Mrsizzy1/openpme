import React, { useEffect, useState } from 'react';
import {
  Wallet,
  DollarSign,
  Plus,
  Wifi,
  WifiOff,
  RefreshCw,
  PenLine,
  AlertTriangle,
  Menu,
  RotateCcw,
  Archive,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { offlineSync } from '../services/offlineSync';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { EmptyState } from './ui/EmptyState';
import { formatDateTime, formatNumber } from '../lib/format';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewSaleClick?: () => void;
  onMenuClick?: () => void;
  activeSession?: any;
}

const RATE_PRESETS = [2800, 2850, 2860, 2870, 2900];

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onNewSaleClick,
  onMenuClick,
  activeSession,
}) => {
  const { organization, user, updateExchangeRate } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [pendingSyncError, setPendingSyncError] = useState('');
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [reviewOperations, setReviewOperations] = useState<Awaited<ReturnType<typeof offlineSync.getReviewOperations>>>([]);
  const [conflictLog, setConflictLog] = useState<Awaited<ReturnType<typeof offlineSync.getConflictLog>>>([]);
  const [showOfflineReview, setShowOfflineReview] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRateInput, setNewRateInput] = useState('');
  const [isSubmittingRate, setIsSubmittingRate] = useState(false);

  const canManageRate = user?.role === 'ORG_OWNER' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    let active = true;
    const refreshOfflineState = async () => {
      try {
        const snapshot = await offlineSync.getSnapshot();
        if (!active) return;
        setIsOnline(snapshot.isOnline);
        setPendingSyncCount(snapshot.pendingCount);
        setPendingReviewCount(snapshot.reviewCount);
        setIsSyncing(snapshot.status === 'syncing');
        setPendingSyncError(await offlineSync.getPendingSyncError());
      } catch (error) {
        if (active) setPendingSyncError(error instanceof Error ? error.message : 'État hors-ligne indisponible.');
      }
    };
    const handleOnline = () => void refreshOfflineState();
    const handleOffline = () => void refreshOfflineState();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = offlineSync.subscribe(() => void refreshOfflineState());
    void refreshOfflineState();

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await offlineSync.syncPendingSales();
    } finally {
      setIsSyncing(false);
      const snapshot = await offlineSync.getSnapshot();
      setPendingSyncCount(snapshot.pendingCount);
      setPendingReviewCount(snapshot.reviewCount);
      setPendingSyncError(await offlineSync.getPendingSyncError());
    }
  };

  const openOfflineReview = async () => {
    const [operations, conflicts] = await Promise.all([
      offlineSync.getReviewOperations(),
      offlineSync.getConflictLog(),
    ]);
    setReviewOperations(operations);
    setConflictLog(conflicts);
    setShowOfflineReview(true);
  };

  const retryOfflineOperation = async (id: string) => {
    await offlineSync.retryOperation(id);
    setReviewOperations(await offlineSync.getReviewOperations());
    setConflictLog(await offlineSync.getConflictLog());
  };

  const archiveOfflineOperation = async (id: string) => {
    await offlineSync.archiveOperation(id);
    setReviewOperations(await offlineSync.getReviewOperations());
    setConflictLog(await offlineSync.getConflictLog());
  };

  const syncTone = pendingReviewCount > 0 || pendingSyncError
    ? 'danger'
    : !isOnline
      ? 'warning'
      : isSyncing
        ? 'info'
        : 'success';

  const offlineStatusLabel = pendingReviewCount > 0
    ? `${pendingReviewCount} opération(s) à vérifier`
    : pendingSyncError
      ? 'File hors ligne à vérifier'
      : isSyncing
        ? 'Synchronisation…'
        : !isOnline
          ? `Hors ligne · ${pendingSyncCount} en attente`
          : 'Synchronisé';

  const SyncIcon = pendingReviewCount > 0 || pendingSyncError
    ? AlertTriangle
    : isSyncing
      ? RefreshCw
      : isOnline
        ? Wifi
        : WifiOff;

  const exchangeRate = Number(organization?.settings?.exchangeRateUsdToCdf) || 2850;

  const handleOpenRateModal = () => {
    if (!canManageRate) return;
    setNewRateInput(exchangeRate.toString());
    setShowRateModal(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newRateInput);
    if (!parsed || parsed <= 0) return;
    setIsSubmittingRate(true);
    try {
      await updateExchangeRate(parsed);
      setShowRateModal(false);
    } finally {
      setIsSubmittingRate(false);
    }
  };

  const rateContent = (
    <>
      <DollarSign size={14} aria-hidden="true" />
      <span className="chip-label-optional">1 USD =</span>
      <strong>{formatNumber(exchangeRate)} CDF</strong>
      {canManageRate && <PenLine size={12} aria-hidden="true" />}
    </>
  );

  const syncIcon = <SyncIcon size={14} aria-hidden="true" className={isSyncing ? 'animate-spin' : undefined} />;

  return (
    <>
      <header className="page-header">
        {onMenuClick && (
          <IconButton
            className="header-menu-btn"
            icon={<Menu />}
            aria-label="Ouvrir le menu de navigation"
            onClick={onMenuClick}
          />
        )}

        <div className="page-header-titles">
          <h1 className="page-header-title">{title}</h1>
          {subtitle && <div className="page-header-sub">{subtitle}</div>}
        </div>

        <div className="header-actions">
          {/* État réseau et synchronisation hors ligne */}
          {pendingReviewCount > 0 ? (
            <button
              type="button"
              className="chip chip-danger"
              onClick={openOfflineReview}
              title={pendingSyncError || 'Voir les opérations à vérifier'}
            >
              {syncIcon}
              <span className="chip-label">{offlineStatusLabel}</span>
            </button>
          ) : (
            <span
              className={`chip chip-${syncTone}`}
              title={pendingSyncError || offlineStatusLabel}
              role="status"
            >
              {syncIcon}
              <span className="chip-label">{offlineStatusLabel}</span>
              {pendingSyncCount > 0 && isOnline && (
                <button
                  type="button"
                  className="chip-action"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  title="Synchroniser maintenant"
                  aria-label="Synchroniser maintenant"
                >
                  <RefreshCw size={12} aria-hidden="true" className={isSyncing ? 'animate-spin' : undefined} />
                </button>
              )}
            </span>
          )}

          {/* Taux de change du jour */}
          {canManageRate ? (
            <button
              type="button"
              className="chip chip-neutral"
              onClick={handleOpenRateModal}
              title="Ajuster le taux du jour (appliqué partout automatiquement)"
            >
              {rateContent}
            </button>
          ) : (
            <span className="chip chip-neutral" title="Taux officiel appliqué">
              {rateContent}
            </span>
          )}

          {/* Session de caisse */}
          <button
            type="button"
            onClick={() => navigate('/finances')}
            className={`chip ${activeSession ? 'chip-success' : 'chip-warning'}`}
            title={activeSession ? 'Caisse ouverte — voir la session' : 'Caisse fermée — ouvrir une session'}
          >
            {activeSession ? <span className="chip-dot is-live" aria-hidden="true" /> : <Wallet size={14} aria-hidden="true" />}
            <span className="chip-label">{activeSession ? 'Caisse ouverte' : 'Caisse fermée'}</span>
          </button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={15} aria-hidden="true" />}
            onClick={() => {
              if (onNewSaleClick) onNewSaleClick();
              else navigate('/sales');
            }}
            title="Nouvelle vente"
          >
            <span className="header-new-sale-label">Nouvelle vente</span>
          </Button>
        </div>
      </header>

      <Modal
        open={showOfflineReview}
        onClose={() => setShowOfflineReview(false)}
        title="Opérations à vérifier"
        description="Ces opérations enregistrées hors ligne n’ont pas pu être synchronisées automatiquement."
        icon={AlertTriangle}
        tone="danger"
        size="lg"
        footer={<Button onClick={() => setShowOfflineReview(false)}>Fermer</Button>}
      >
        <div className="stack">
          {reviewOperations.length === 0 ? (
            <EmptyState compact title="Aucune opération à vérifier" description="Toutes les opérations hors ligne ont été traitées." />
          ) : reviewOperations.map((operation) => (
            <section key={operation.id} className="alert alert-danger">
              <div className="alert-content">
                <div className="alert-title">{operation.type}</div>
                <div className="alert-body">{operation.lastError}</div>
                <div className="alert-actions">
                  <Button variant="primary" size="sm" icon={<RotateCcw size={14} aria-hidden="true" />} onClick={() => void retryOfflineOperation(operation.id)}>
                    Réessayer
                  </Button>
                  <Button size="sm" icon={<Archive size={14} aria-hidden="true" />} onClick={() => void archiveOfflineOperation(operation.id)}>
                    Archiver avec journal
                  </Button>
                </div>
              </div>
            </section>
          ))}

          {conflictLog.length > 0 && (
            <section className="stack-sm">
              <h3 className="page-section-title">Journal des conflits</h3>
              <div className="table-wrapper">
                <div className="table-container">
                  <table className="data-table data-table-compact">
                    <thead>
                      <tr>
                        <th>Opération</th>
                        <th>Date</th>
                        <th>Statut</th>
                        <th>Détail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conflictLog.map((conflict) => (
                        <tr key={conflict.id}>
                          <td className="cell-primary">{conflict.operationType}</td>
                          <td className="nowrap">{formatDateTime(conflict.occurredAt)}</td>
                          <td>
                            <span className={`badge ${conflict.status === 'open' ? 'badge-warning' : conflict.status === 'resolved' ? 'badge-success' : 'badge-neutral'}`}>
                              {conflict.status === 'open' ? 'À vérifier' : conflict.status === 'resolved' ? 'Résolu' : 'Archivé'}
                            </span>
                          </td>
                          <td>{conflict.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      </Modal>

      <Modal
        open={showRateModal}
        onClose={() => setShowRateModal(false)}
        title="Ajuster le taux du jour"
        description="La modification s’applique immédiatement sur le web, l’application de bureau et tous les postes de caisse."
        icon={DollarSign}
        tone="success"
        size="sm"
        busy={isSubmittingRate}
        onSubmit={handleSaveRate}
        footer={(
          <>
            <Button onClick={() => setShowRateModal(false)} disabled={isSubmittingRate}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={isSubmittingRate} loadingText="Application…">
              Appliquer partout
            </Button>
          </>
        )}
      >
        <div className="form-group mb-0">
          <label className="form-label" htmlFor="exchange-rate-input">
            Valeur de 1 USD en francs congolais
          </label>
          <div className="input-addon">
            <input
              id="exchange-rate-input"
              type="number"
              step="1"
              min="1"
              className="input-field"
              value={newRateInput}
              onChange={(e) => setNewRateInput(e.target.value)}
              placeholder="Ex. 2850"
              required
            />
            <span className="input-addon-text">CDF</span>
          </div>
          <div className="cluster-sm" style={{ marginTop: 'var(--space-3)' }} aria-label="Taux usuels">
            {RATE_PRESETS.map((preset) => (
              <Button
                key={preset}
                size="xs"
                variant={Number(newRateInput) === preset ? 'primary' : 'secondary'}
                onClick={() => setNewRateInput(preset.toString())}
              >
                {formatNumber(preset)}
              </Button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
};
