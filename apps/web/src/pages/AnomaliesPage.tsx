import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, ShieldCheck, RefreshCw, Check, ScanSearch, OctagonAlert, AlertTriangle, ListChecks } from 'lucide-react';
import { ApiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useShell } from '../lib/shell';
import {
  Alert,
  Button,
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  KpiCard,
  Modal,
  PageToolbar,
  Spinner,
  StatusBadge,
  useConfirm,
} from '../components/ui';
import { formatDate, formatDateTime, formatNumber } from '../lib/format';
import { ANOMALY_RULE_LABELS, ANOMALY_SEVERITY, ANOMALY_STATUS, getStatusMeta } from '../lib/status';
import { useRealtime } from '../lib/realtime';
import './AnomaliesPage.css';

const FILTER_OPTIONS = [
  { value: '', label: 'Toutes' },
  { value: 'DETECTED', label: 'À traiter' },
  { value: 'UNDER_REVIEW', label: 'En examen' },
  { value: 'RESOLVED', label: 'Résolues' },
  { value: 'DISMISSED', label: 'Classées' },
];

export const AnomaliesPage: React.FC = () => {
  const { user } = useAuth();
  const canManageAnomalies = user?.role !== 'AUDITOR';
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();
  const { refreshIndicators } = useShell();
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const hasLoadedOnce = useRef(false);

  // Régularisation
  const [selectedAnomaly, setSelectedAnomaly] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [submittingResolve, setSubmittingResolve] = useState(false);

  const loadAnomalies = async () => {
    try {
      if (hasLoadedOnce.current) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);
      const res = await ApiClient.getAnomalies(statusFilter || undefined);
      setAnomalies(res);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      setLoadError(err.message || 'Impossible de charger les anomalies.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, [statusFilter]);

  useRealtime(['anomalies', 'sales', 'finances'], () => {
    if (hasLoadedOnce.current) void loadAnomalies();
  });

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await ApiClient.scanAnomalies();
      success(`Analyse terminée : ${formatNumber(res.newAlertsCount)} nouvelle(s) anomalie(s) identifiée(s).`);
      loadAnomalies();
      refreshIndicators();
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de l\'inspection des règles.');
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnomaly || !resolutionNote.trim()) return;
    setSubmittingResolve(true);
    try {
      await ApiClient.resolveAnomaly(selectedAnomaly.id, resolutionNote.trim());
      setSelectedAnomaly(null);
      setResolutionNote('');
      success('Anomalie régularisée et enregistrée.');
      loadAnomalies();
      refreshIndicators();
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de la résolution.');
    } finally {
      setSubmittingResolve(false);
    }
  };

  const handleDismiss = async (id: string) => {
    const confirmed = await confirm({
      title: 'Classer cette alerte sans suite ?',
      message: 'Elle sera marquée comme non pertinente et sortira de la liste des alertes à traiter.',
      confirmLabel: 'Classer sans suite',
      tone: 'warning',
    });
    if (!confirmed) return;
    try {
      await ApiClient.dismissAnomaly(id);
      success('Alerte classée sans suite.');
      loadAnomalies();
      refreshIndicators();
    } catch (err: any) {
      toastError(err.message || 'Erreur lors du classement.');
    }
  };

  const criticalCount = anomalies.filter((a) => a.severity === 'CRITICAL' && a.status === 'DETECTED').length;
  const highCount = anomalies.filter((a) => a.severity === 'HIGH' && a.status === 'DETECTED').length;
  const totalActive = anomalies.filter((a) => a.status === 'DETECTED' || a.status === 'UNDER_REVIEW').length;

  const renderList = () => {
    if (loading) return <CardGridSkeleton count={3} minWidth={600} />;

    if (loadError && anomalies.length === 0) {
      return (
        <div className="card">
          <ErrorState title="Impossible de charger les anomalies" message={loadError} onRetry={loadAnomalies} />
        </div>
      );
    }

    if (anomalies.length === 0) {
      const filterLabel = FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label;
      return (
        <div className="card">
          {statusFilter ? (
            <EmptyState
              icon={ListChecks}
              title="Aucune anomalie dans cette catégorie"
              description={`Aucune anomalie avec le statut « ${filterLabel} ».`}
              action={<Button onClick={() => setStatusFilter('')}>Afficher toutes les anomalies</Button>}
            />
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="Aucune anomalie détectée"
              description="Toutes les opérations sont conformes aux règles de contrôle configurées."
              action={canManageAnomalies ? (
                <Button icon={<ScanSearch size={15} />} onClick={handleScan} loading={scanning} loadingText="Analyse en cours…">
                  Lancer une analyse
                </Button>
              ) : undefined}
            />
          )}
        </div>
      );
    }

    return (
      <div className="anomalies-list">
        {anomalies.map((a) => {
          const isResolved = a.status === 'RESOLVED' || a.status === 'DISMISSED';
          const severity = getStatusMeta(ANOMALY_SEVERITY, a.severity);
          const status = getStatusMeta(ANOMALY_STATUS, a.status);
          const accent = isResolved ? 'success' : severity.tone;

          return (
            <article key={a.id} className={`card anomaly-card anomaly-card-${accent}`}>
              <div className="anomaly-head">
                <span className={`icon-tile icon-tile-sm icon-tile-${accent}`} aria-hidden="true">
                  {isResolved ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
                </span>
                <div className="anomaly-title-block">
                  <h3 className="anomaly-title">{a.title}</h3>
                  <p className="anomaly-meta">
                    {ANOMALY_RULE_LABELS[a.ruleType] || a.ruleType} · {formatDateTime(a.createdAt)}
                  </p>
                </div>
                <div className="anomaly-badges">
                  <StatusBadge tone={severity.tone}>{severity.label}</StatusBadge>
                  <StatusBadge tone={status.tone} dot>{status.label}</StatusBadge>
                </div>
              </div>

              {a.explanation && <p className="anomaly-text">{a.explanation}</p>}

              <dl className="anomaly-facts">
                <div>
                  <dt>Valeur observée</dt>
                  <dd className="text-danger">{a.observedValue || '—'}</dd>
                </div>
                <div>
                  <dt>Seuil attendu</dt>
                  <dd className="text-success">{a.expectedThreshold || '—'}</dd>
                </div>
                <div>
                  <dt>Élément concerné</dt>
                  <dd>{a.entityType || '—'}</dd>
                </div>
              </dl>

              {isResolved && a.resolutionNote && (
                <Alert tone="success" title={`Résolution${a.resolvedAt ? ` du ${formatDate(a.resolvedAt)}` : ''}`}>
                  {a.resolutionNote}
                </Alert>
              )}

              {!isResolved && canManageAnomalies && (
                <div className="anomaly-actions">
                  <Button size="sm" variant="ghost" onClick={() => handleDismiss(a.id)}>
                    Classer sans suite
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Check size={14} />}
                    onClick={() => {
                      setSelectedAnomaly(a);
                      setResolutionNote('');
                    }}
                  >
                    Examiner et régulariser
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page">
      <PageToolbar
        start={(
          <>
            <div className="segmented" role="group" aria-label="Filtrer par statut">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`segmented-btn${statusFilter === opt.value ? ' active' : ''}`}
                  aria-pressed={statusFilter === opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {refreshing && <Spinner size="sm" label="Actualisation" />}
          </>
        )}
        end={(
          <>
            <IconButton icon={<RefreshCw />} variant="secondary" aria-label="Actualiser la liste" onClick={loadAnomalies} />
            {canManageAnomalies && (
              <Button variant="primary" icon={<ScanSearch size={15} />} onClick={handleScan} loading={scanning} loadingText="Analyse en cours…">
                Lancer une analyse
              </Button>
            )}
          </>
        )}
      />

      <div className="kpi-grid">
        <KpiCard
          label="Critiques"
          value={formatNumber(criticalCount)}
          icon={OctagonAlert}
          tone="danger"
          valueTone={criticalCount > 0 ? 'danger' : undefined}
          hint="Action immédiate requise"
          loading={loading}
        />
        <KpiCard
          label="Élevées"
          value={formatNumber(highCount)}
          icon={AlertTriangle}
          tone="warning"
          valueTone={highCount > 0 ? 'warning' : undefined}
          hint="Écarts et remises anormales"
          loading={loading}
        />
        <KpiCard
          label="Actives"
          value={formatNumber(totalActive)}
          icon={ShieldAlert}
          tone="primary"
          hint="À examiner ou en cours d’examen"
          loading={loading}
        />
      </div>

      {renderList()}

      <Modal
        open={Boolean(selectedAnomaly && canManageAnomalies)}
        onClose={() => setSelectedAnomaly(null)}
        title="Régulariser l’anomalie"
        description="Le commentaire est conservé dans le journal d’audit."
        icon={Check}
        tone="success"
        busy={submittingResolve}
        onSubmit={handleResolve}
        footer={(
          <>
            <Button onClick={() => setSelectedAnomaly(null)} disabled={submittingResolve}>Annuler</Button>
            <Button
              type="submit"
              variant="primary"
              loading={submittingResolve}
              loadingText="Enregistrement…"
              disabled={!resolutionNote.trim()}
            >
              Enregistrer la régularisation
            </Button>
          </>
        )}
      >
        {selectedAnomaly && (
          <div className="anomaly-recap">
            <div className="anomaly-recap-title">{selectedAnomaly.title}</div>
            {selectedAnomaly.explanation && <p className="anomaly-recap-text">{selectedAnomaly.explanation}</p>}
          </div>
        )}
        <Field label="Cause identifiée et mesure corrective" required htmlFor="resolution-note" className="mb-0">
          <textarea
            id="resolution-note"
            required
            rows={4}
            className="input-field"
            placeholder="Décrivez la cause identifiée et la mesure corrective appliquée…"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
};
