import React, { useEffect, useState } from 'react';
import {
  Monitor,
  Power,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  Shield,
  Laptop,
  Globe,
  Radio,
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface Terminal {
  id: string;
  organizationId: string;
  userId?: string;
  userName: string;
  userRole: string;
  clientType: 'DESKTOP_PYQT' | 'WEB_POS' | 'BROWSER';
  ipAddress: string;
  lastPing: string;
  status: 'ONLINE' | 'LOCKED' | 'OFFLINE';
  pendingCommand: 'NONE' | 'LOCK' | 'UNLOCK' | 'KILL' | 'MESSAGE';
  commandMessage?: string;
  cashSessionId?: string;
}

export const TerminalsPage: React.FC = () => {
  const { user } = useAuth();
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [actionType, setActionType] = useState<'LOCK' | 'KILL' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { success, error, warning } = useToast();

  const fetchTerminals = async () => {
    try {
      const data = await ApiClient.getTerminals();
      setTerminals(data);
    } catch (err: any) {
      // Éviter de spammer en cas d'erreur de polling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Enregistrement immédiat du poste de travail pour supervision
    ApiClient.sendHeartbeat({
      terminalId: 'DESKTOP-CAISSE-01',
      organizationId: user?.organizationId || '',
      userId: user?.id,
      clientType: 'DESKTOP_PYQT',
    }).then(() => fetchTerminals()).catch(() => fetchTerminals());

    if (!autoRefresh) return;
    const interval = setInterval(fetchTerminals, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, user]);

  const handleOpenActionModal = (term: Terminal, type: 'LOCK' | 'KILL') => {
    setSelectedTerminal(term);
    setActionType(type);
    setReason(
      type === 'KILL'
        ? "Fermeture administrative ordonnée par la Direction (fin de journée ou alerte)."
        : "Poste temporairement verrouillé pour contrôle de caisse."
    );
  };

  const handleConfirmAction = async () => {
    if (!selectedTerminal || !actionType) return;
    setSubmitting(true);
    try {
      if (actionType === 'LOCK') {
        await ApiClient.lockTerminal(selectedTerminal.id, reason);
        success(`Ordre de verrouillage transmis au poste ${selectedTerminal.id}`);
      } else if (actionType === 'KILL') {
        await ApiClient.killTerminal(selectedTerminal.id, reason);
        warning(`Ordre de fermeture immédiate (Killswitch) envoyé au terminal ${selectedTerminal.id}`);
      }
      setSelectedTerminal(null);
      setActionType(null);
      await fetchTerminals();
    } catch (err: any) {
      error(err.message || "Erreur lors de l'exécution de la commande à distance.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConnectDesktopTerminal = async () => {
    try {
      await ApiClient.sendHeartbeat({
        terminalId: `DESKTOP-POS-${Math.floor(Math.random() * 90 + 10)}`,
        organizationId: user?.organizationId || '',
        userId: user?.id,
        clientType: 'DESKTOP_PYQT',
      });
      success('Nouveau poste Windows connecté et enregistré dans la console !');
      await fetchTerminals();
    } catch (err: any) {
      error('Erreur lors de la connexion du terminal.');
    }
  };

  const handleUnlock = async (terminalId: string) => {
    try {
      await ApiClient.unlockTerminal(terminalId);
      success(`Poste ${terminalId} déverrouillé avec succès.`);
      await fetchTerminals();
    } catch (err: any) {
      error(err.message || 'Erreur lors du déverrouillage.');
    }
  };

  const formatLastPing = (dateStr: string) => {
    try {
      const ping = new Date(dateStr).getTime();
      const diffSec = Math.floor((Date.now() - ping) / 1000);
      if (diffSec < 5) return 'À l\'instant (il y a ' + diffSec + 's)';
      if (diffSec < 60) return `Il y a ${diffSec}s`;
      return `Il y a ${Math.floor(diffSec / 60)} min`;
    } catch {
      return dateStr;
    }
  };

  const onlineCount = terminals.filter((t) => t.status === 'ONLINE').length;
  const lockedCount = terminals.filter((t) => t.status === 'LOCKED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* En-tête KPI et Contrôle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            background: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <div>
              <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Postes Actifs</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{onlineCount}</div>
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
            <div>
              <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Postes Verrouillés</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{lockedCount}</div>
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Radio size={18} color="#2563EB" />
            <div>
              <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Supervision Réseau</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#2563EB' }}>
                {autoRefresh ? 'Temps Réel (4s)' : 'Pause'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleConnectDesktopTerminal}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Monitor size={15} /> Connecter Poste Caisse
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={autoRefresh ? 'spin' : ''} />
            {autoRefresh ? 'Désactiver Actualisation Auto' : 'Activer Temps Réel'}
          </button>
          <button
            onClick={fetchTerminals}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Guide informatif */}
      <div style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#1E40AF',
        fontSize: '13px',
      }}>
        <Shield size={20} color="#2563EB" style={{ flexShrink: 0 }} />
        <div>
          <b>Module de Supervision & Sécurité Distante :</b> En tant que Manager ou Propriétaire,
          vous pouvez superviser l'ensemble des caisses et postes Windows connectés, verrouiller un poste en cours de vente,
          ou ordonner l'<b>extinction et la fermeture immédiate à distance (Kill switch)</b> de l'application desktop.
        </div>
      </div>

      {/* Tableau des terminaux */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Poste / Machine</th>
              <th>Type de Client</th>
              <th>Utilisateur Connecté</th>
              <th>Adresse IP</th>
              <th>Dernier Signal</th>
              <th>Statut</th>
              <th style={{ textAlign: 'right' }}>Actions de Contrôle</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#6B7280' }}>
                  Recherche des terminaux connectés...
                </td>
              </tr>
            ) : terminals.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                  <Monitor size={36} color="#9CA3AF" style={{ margin: '0 auto 10px', display: 'block' }} />
                  Aucun poste de caisse ou terminal desktop actif pour le moment.<br />
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    Lancez l'application desktop (<code>python main.py</code>) pour voir le poste apparaître ici en direct.
                  </span>
                </td>
              </tr>
            ) : (
              terminals.map((term) => {
                const isOnline = term.status === 'ONLINE';
                const isLocked = term.status === 'LOCKED';

                return (
                  <tr key={term.id} style={{ background: isLocked ? '#FFFBEB' : undefined }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <Monitor size={16} color={isOnline ? '#10B981' : isLocked ? '#F59E0B' : '#6B7280'} />
                        <span>{term.id}</span>
                      </div>
                      {term.cashSessionId && (
                        <span style={{ fontSize: '11px', color: '#059669', display: 'block', marginTop: '2px' }}>
                          Caisse active : #{term.cashSessionId.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: term.clientType === 'DESKTOP_PYQT' ? '#EEF2FF' : '#F3F4F6',
                        color: term.clientType === 'DESKTOP_PYQT' ? '#4F46E5' : '#374151',
                        fontWeight: 600,
                      }}>
                        {term.clientType === 'DESKTOP_PYQT' ? <Laptop size={12} /> : <Globe size={12} />}
                        {term.clientType === 'DESKTOP_PYQT' ? 'Windows Desktop (Qt)' : 'Navigateur Web'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#111827' }}>{term.userName}</div>
                      <span style={{ fontSize: '11px', color: '#6B7280' }}>{term.userRole}</span>
                    </td>
                    <td>
                      <code style={{ fontSize: '12px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                        {term.ipAddress}
                      </code>
                    </td>
                    <td style={{ fontSize: '12px', color: '#4B5563' }}>
                      {formatLastPing(term.lastPing)}
                    </td>
                    <td>
                      {isOnline && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#166534',
                          background: '#DCFCE7',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
                          En Ligne
                        </span>
                      )}
                      {isLocked && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#92400E',
                          background: '#FEF3C7',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}>
                          <Lock size={12} />
                          Verrouillé
                        </span>
                      )}
                      {!isOnline && !isLocked && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#4B5563',
                          background: '#F3F4F6',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}>
                          Déconnecté
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {isLocked ? (
                          <button
                            onClick={() => handleUnlock(term.id)}
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#059669',
                            }}
                            title="Déverrouiller le poste"
                          >
                            <Unlock size={13} />
                            Déverrouiller
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenActionModal(term, 'LOCK')}
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#D97706',
                            }}
                            title="Verrouiller l'écran à distance"
                          >
                            <Lock size={13} />
                            Verrouiller
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenActionModal(term, 'KILL')}
                          className="btn"
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#DC2626',
                            color: 'white',
                            border: 'none',
                          }}
                          title="Fermer l'application à distance"
                        >
                          <Power size={13} />
                          Fermer à distance
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Confirmation d'Action (Lock ou Kill) */}
      {selectedTerminal && actionType && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              {actionType === 'KILL' ? (
                <div style={{ background: '#FEE2E2', padding: '10px', borderRadius: '50%', color: '#DC2626' }}>
                  <Power size={24} />
                </div>
              ) : (
                <div style={{ background: '#FEF3C7', padding: '10px', borderRadius: '50%', color: '#D97706' }}>
                  <Lock size={24} />
                </div>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  {actionType === 'KILL'
                    ? 'Fermer le logiciel à distance (Killswitch)'
                    : 'Verrouiller le poste à distance'}
                </h3>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                  Cible : <b>{selectedTerminal.id}</b> ({selectedTerminal.userName})
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.5 }}>
              {actionType === 'KILL' ? (
                <>
                  <span style={{ color: '#DC2626', fontWeight: 600 }}>Attention :</span> Cette action ordonne la{' '}
                  <b>fermeture immédiate et l'extinction</b> de l'application desktop sur la machine de la caisse.
                  Toute session en cours sera interrompue.
                </>
              ) : (
                <>
                  Cette action affiche un écran de verrouillage bloquant sur le poste cible. L'opérateur ne pourra plus
                  effectuer de vente jusqu'au déverrouillage par un manager.
                </>
              )}
            </p>

            <div style={{ marginTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                Motif transmis au terminal :
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="input"
                style={{ width: '100%', resize: 'vertical', fontSize: '13px' }}
                placeholder="Raison de la fermeture ou du verrouillage..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedTerminal(null);
                  setActionType(null);
                }}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={submitting}
                className="btn"
                style={{
                  background: actionType === 'KILL' ? '#DC2626' : '#D97706',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {submitting ? (
                  'Transmission...'
                ) : actionType === 'KILL' ? (
                  <>
                    <Power size={14} /> Exécuter la Fermeture Forcée
                  </>
                ) : (
                  <>
                    <Lock size={14} /> Confirmer le Verrouillage
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
