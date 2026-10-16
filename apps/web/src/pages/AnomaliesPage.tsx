import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  FileText,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AnomaliesPage: React.FC = () => {
  const { organization } = useAuth();
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Resolution modal
  const [selectedAnomaly, setSelectedAnomaly] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [submittingResolve, setSubmittingResolve] = useState(false);

  const loadAnomalies = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getAnomalies(
        statusFilter || undefined,
        severityFilter || undefined
      );
      setAnomalies(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, [statusFilter, severityFilter]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await ApiClient.scanAnomalies();
      alert(`Scan terminé avec succès : ${res.newAlertsCount} nouvelle(s) anomalie(s) identifiée(s).`);
      loadAnomalies();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’inspection');
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnomaly) return;
    setSubmittingResolve(true);
    try {
      await ApiClient.resolveAnomaly(selectedAnomaly.id, resolutionNote);
      setSelectedAnomaly(null);
      setResolutionNote('');
      loadAnomalies();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la résolution');
    } finally {
      setSubmittingResolve(false);
    }
  };

  const handleDismiss = async (id: string) => {
    if (!confirm('Voulez-vous classer sans suite cette alerte ?')) return;
    try {
      await ApiClient.dismissAnomaly(id);
      loadAnomalies();
    } catch (err: any) {
      console.error(err);
    }
  };

  const criticalCount = anomalies.filter((a) => a.severity === 'CRITICAL' && a.status === 'DETECTED').length;
  const highCount = anomalies.filter((a) => a.severity === 'HIGH' && a.status === 'DETECTED').length;
  const totalActive = anomalies.filter((a) => a.status === 'DETECTED' || a.status === 'UNDER_REVIEW').length;

  return (
    <div style={{ padding: '2rem' }}>
      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ANOMALIES CRITIQUES</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#EF4444', margin: '0.35rem 0' }}>{criticalCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Nécessitent une action immédiate</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ANOMALIES ÉLEVÉES</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B', margin: '0.35rem 0' }}>{highCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Écarts de caisse & remises</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary-light)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL ALERTES ACTIVES</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: '0.35rem 0' }}>{totalActive}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>À examiner par la direction</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
          >
            <RefreshCw size={18} className={scanning ? 'animate-spin' : ''} />
            <span>{scanning ? 'Inspection en direct...' : 'Lancer le Scan des Règles'}</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['', 'DETECTED', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            {st === '' ? 'Toutes' : st === 'DETECTED' ? 'Détectées (En cours)' : st === 'UNDER_REVIEW' ? 'En examen' : st === 'RESOLVED' ? 'Résolues' : 'Rejetées'}
          </button>
        ))}
      </div>

      {/* Anomalies List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {anomalies.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-subtle)' }}>
            <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.35rem' }}>Aucune anomalie détectée</h4>
            <p style={{ fontSize: '0.85rem' }}>Toutes les opérations commerciales et financières sont conformes aux règles et seuils d'alerte.</p>
          </div>
        ) : (
          anomalies.map((a) => {
            const isResolved = a.status === 'RESOLVED';
            const isCritical = a.severity === 'CRITICAL' || a.severity === 'HIGH';

            return (
              <div
                key={a.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  borderLeft: `4px solid ${isResolved ? '#10B981' : isCritical ? '#EF4444' : '#F59E0B'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      padding: '6px',
                      borderRadius: '8px',
                      background: isResolved ? 'rgba(16, 185, 129, 0.2)' : isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: isResolved ? '#10B981' : isCritical ? '#EF4444' : '#F59E0B',
                    }}>
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                        {a.title}
                      </h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        Règle : <strong style={{ color: 'var(--accent-cyan)' }}>{a.ruleType}</strong> • Détectée le {new Date(a.createdAt).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge badge-${isCritical ? 'danger' : 'warning'}`}>
                      {a.severity}
                    </span>
                    <span className={`badge ${isResolved ? 'badge-success' : 'badge-info'}`}>
                      {a.status}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {a.explanation}
                </p>

                {/* Values observed vs threshold */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Valeur Observée : </span>
                    <strong style={{ color: '#F87171' }}>{a.observedValue || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Seuil / Règle Attendue : </span>
                    <strong style={{ color: '#34D399' }}>{a.expectedThreshold || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Entité Ciblée : </span>
                    <strong style={{ color: '#fff' }}>{a.entityType} ({a.entityId})</strong>
                  </div>
                </div>

                {/* Resolution note if resolved */}
                {isResolved && a.resolutionNote && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#A7F3D0',
                    marginBottom: '1rem',
                  }}>
                    <strong>Résolution ({a.resolvedAt ? new Date(a.resolvedAt).toLocaleDateString('fr-FR') : 'Validé'}) :</strong> {a.resolutionNote}
                  </div>
                )}

                {/* Action buttons */}
                {!isResolved && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      onClick={() => handleDismiss(a.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      Classer sans suite
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAnomaly(a);
                        setResolutionNote('');
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      <Check size={16} />
                      <span>Examiner & Régulariser</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Resolution Modal */}
      {selectedAnomaly && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Régularisation de l'Anomalie
              </h3>
              <button onClick={() => setSelectedAnomaly(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{selectedAnomaly.title}</div>
              <p style={{ color: 'var(--text-muted)' }}>{selectedAnomaly.explanation}</p>
            </div>

            <form onSubmit={handleResolve}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Commentaire d'audit & Mesure corrective appliquée *
                </label>
                <textarea
                  required
                  rows={4}
                  className="input-field"
                  placeholder="Ex : Réapprovisionnement validé avec le fournisseur DIC, ou accord exceptionnel de remise signé par le directeur..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setSelectedAnomaly(null)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={submittingResolve} className="btn btn-primary">
                  {submittingResolve ? 'Validation...' : 'Enregistrer la Régularisation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
