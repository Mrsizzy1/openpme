import React, { useEffect, useState } from 'react';
import {
  Monitor,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  Laptop,
  Pause,
  Play,
  Wifi,
  WifiOff,
  Ban,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  Alert,
  Button,
  EmptyState,
  Field,
  IconButton,
  KpiCard,
  Modal,
  PageToolbar,
  StatusBadge,
  TableSkeleton,
} from '../components/ui';
import { formatNumber, formatRelativeTime } from '../lib/format';
import { getRoleLabel } from '../lib/status';
import './TerminalsPage.css';

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
  lockReason?: string | null;
  commandAcknowledged?: boolean;
  stateVersion?: number;
  lastAcknowledgedAt?: string | null;
  tokenRevoked?: boolean;
  cashSessionId?: string;
}

type TerminalAction = 'LOCK' | 'UNLOCK' | 'REVOKE';

const ACTION_COPY: Record<TerminalAction, {
  title: string;
  description: string;
  confirm: string;
  tone: 'warning' | 'success' | 'danger';
  icon: typeof Lock;
}> = {
  LOCK: {
    title: 'Verrouiller le poste',
    description: 'Un écran de verrouillage s’affichera sur le poste. L’application reste active pour permettre le déverrouillage à distance.',
    confirm: 'Confirmer le verrouillage',
    tone: 'warning',
    icon: Lock,
  },
  UNLOCK: {
    title: 'Déverrouiller le poste',
    description: 'Le poste retrouvera son accès dès qu’il recevra cette commande. Une reconnexion de l’utilisateur pourra être demandée.',
    confirm: 'Confirmer le déverrouillage',
    tone: 'success',
    icon: Unlock,
  },
  REVOKE: {
    title: 'Révoquer le poste',
    description: 'Le jeton de sécurité sera invalidé immédiatement. Le poste restera bloqué et devra être réenrôlé localement par un administrateur autorisé.',
    confirm: 'Confirmer la révocation',
    tone: 'danger',
    icon: AlertTriangle,
  },
};

export const TerminalsPage: React.FC = () => {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [actionType, setActionType] = useState<TerminalAction | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { success, error, warning } = useToast();

  const fetchTerminals = async () => {
    try {
      const data = await ApiClient.getTerminals();
      setTerminals(data);
    } catch (err: any) {
      // Ignorer les erreurs passagères de polling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminals();

    if (!autoRefresh) return;
    const interval = setInterval(fetchTerminals, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleOpenActionModal = (term: Terminal, type: TerminalAction = 'LOCK') => {
    setSelectedTerminal(term);
    setActionType(type);
    setReason(type === 'LOCK'
      ? 'Poste temporairement verrouillé pour vérification.'
      : type === 'REVOKE' ? 'Révocation administrative du poste.' : '');
  };

  const closeActionModal = () => {
    setSelectedTerminal(null);
    setActionType(null);
  };

  const handleConfirmAction = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!actionType || !selectedTerminal || !reason.trim()) return;
    setSubmitting(true);
    try {
      const result = actionType === 'LOCK'
        ? await ApiClient.lockTerminal(selectedTerminal.id, reason.trim())
        : actionType === 'UNLOCK'
          ? await ApiClient.unlockTerminal(selectedTerminal.id, reason.trim())
          : await ApiClient.revokeTerminal(selectedTerminal.id, reason.trim());
      const actionLabel = actionType === 'LOCK'
        ? 'Verrouillage'
        : actionType === 'UNLOCK' ? 'Déverrouillage' : 'Révocation';
      if (result.acknowledged) success(`${actionLabel} appliqué sur ${selectedTerminal.id}.`);
      else if (actionType === 'REVOKE') {
        warning(`Jeton de ${selectedTerminal.id} révoqué ; le poste doit être réenrôlé pour se reconnecter.`);
      } else {
        warning(`${actionLabel} envoyé ; application en attente de confirmation du poste.`);
      }
      closeActionModal();
      await fetchTerminals();
    } catch (err: any) {
      error(err.message || "Erreur lors de l'exécution de la commande à distance.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatLastPing = (dateStr?: string | null) => {
    if (!dateStr) return 'Aucun signal reçu';
    const ping = new Date(dateStr).getTime();
    if (Number.isNaN(ping)) return dateStr;
    const diffSec = Math.floor((Date.now() - ping) / 1000);
    if (diffSec < 3) return 'En direct';
    if (diffSec < 60) return `il y a ${diffSec} s`;
    return formatRelativeTime(dateStr);
  };

  const onlineTerminals = terminals.filter((t) => t.status === 'ONLINE');
  const lockedTerminals = terminals.filter((t) => t.status === 'LOCKED');
  const offlineTerminals = terminals.filter((t) => t.status !== 'ONLINE' && t.status !== 'LOCKED');

  const renderStatus = (term: Terminal) => {
    if (term.status === 'ONLINE') return <StatusBadge tone="success" dot>En ligne</StatusBadge>;
    if (term.status === 'LOCKED') return <StatusBadge tone="warning" icon={Lock}>Verrouillé</StatusBadge>;
    return <StatusBadge tone="neutral" dot>Hors ligne</StatusBadge>;
  };

  const actionCopy = actionType ? ACTION_COPY[actionType] : null;

  return (
    <div className="page terminals-page">
      <PageToolbar
        start={(
          <span className={`terminals-live${autoRefresh ? ' is-live' : ''}`} role="status">
            <span className="terminals-live-dot" aria-hidden="true" />
            {autoRefresh ? 'Supervision en direct · actualisation toutes les 3 s' : 'Supervision en pause'}
          </span>
        )}
        end={(
          <>
            <Button
              icon={autoRefresh ? <Pause size={15} /> : <Play size={15} />}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Mettre en pause' : 'Reprendre le direct'}
            </Button>
            <IconButton icon={<RefreshCw />} variant="secondary" aria-label="Actualiser maintenant" onClick={fetchTerminals} />
          </>
        )}
      />

      <div className="kpi-grid">
        <KpiCard
          label="Postes en ligne"
          value={formatNumber(onlineTerminals.length)}
          icon={Wifi}
          tone="success"
          hint={`sur ${formatNumber(terminals.length)} poste(s) enregistré(s)`}
          loading={loading}
        />
        <KpiCard
          label="Postes verrouillés"
          value={formatNumber(lockedTerminals.length)}
          icon={Lock}
          tone="warning"
          valueTone={lockedTerminals.length > 0 ? 'warning' : undefined}
          hint="Verrouillage à distance actif"
          loading={loading}
        />
        <KpiCard
          label="Postes hors ligne"
          value={formatNumber(offlineTerminals.length)}
          icon={WifiOff}
          tone="neutral"
          hint="Aucun signal récent"
          loading={loading}
        />
      </div>

      <Alert tone="info" title="Contrôle à distance">
        Surveillez en direct les postes de caisse Windows connectés. Vous pouvez verrouiller ou déverrouiller un poste sans arrêter l’application ; chaque commande affiche son état d’acquittement.
      </Alert>

      <div className="table-wrapper">
        {loading ? (
          <TableSkeleton rows={3} columns={7} />
        ) : terminals.length === 0 ? (
          <EmptyState
            icon={Monitor}
            title="Aucun poste connecté pour le moment"
            description={(
              <>Pour connecter un poste de caisse, lancez <strong>LANCER_DESKTOP.bat</strong> sur la machine Windows. Le poste apparaîtra ici avec son identifiant matériel.</>
            )}
          />
        ) : (
          <div className="table-container">
            <table className="data-table terminals-table">
              <thead>
                <tr>
                  <th>Poste</th>
                  <th>Client</th>
                  <th>Utilisateur</th>
                  <th>Adresse IP</th>
                  <th>Dernier signal</th>
                  <th>État</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {terminals.map((term) => {
                  const isOnline = term.status === 'ONLINE';
                  const isLocked = term.status === 'LOCKED';

                  return (
                    <tr key={term.id} className={isLocked ? 'is-locked' : undefined}>
                      <td>
                        <div className="terminals-identity">
                          <span
                            className={`icon-tile icon-tile-sm icon-tile-${isOnline ? 'success' : isLocked ? 'warning' : 'neutral'}`}
                            aria-hidden="true"
                          >
                            <Laptop size={15} />
                          </span>
                          <div>
                            <span className="cell-primary">{term.id}</span>
                            <span className={`cell-secondary${term.cashSessionId ? ' text-success' : ''}`}>
                              {term.cashSessionId ? `Caisse ouverte · n° ${term.cashSessionId.slice(0, 8)}` : 'Prêt pour la vente'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge tone="neutral">
                          {term.clientType === 'DESKTOP_PYQT' ? 'Application Windows' : 'Navigateur web'}
                        </StatusBadge>
                      </td>
                      <td>
                        <span className="cell-primary">{term.userName || 'Non assigné'}</span>
                        <span className="cell-secondary">{term.userRole ? getRoleLabel(term.userRole) : '—'}</span>
                      </td>
                      <td className="col-mono">{term.ipAddress || '—'}</td>
                      <td className="nowrap" title={term.lastPing ? new Date(term.lastPing).toLocaleString('fr-FR') : undefined}>
                        {formatLastPing(term.lastPing)}
                      </td>
                      <td>
                        {renderStatus(term)}
                        {!term.tokenRevoked && (
                          <span className={`terminals-ack${term.commandAcknowledged ? ' is-applied' : ''}`}>
                            {term.commandAcknowledged
                              ? <><CheckCircle2 size={12} aria-hidden="true" /> État appliqué</>
                              : <><Clock size={12} aria-hidden="true" /> En attente du poste</>}
                          </span>
                        )}
                      </td>
                      <td className="col-actions">
                        {term.tokenRevoked ? (
                          <StatusBadge tone="danger" icon={Ban} title="Le poste doit être réenrôlé pour se reconnecter">
                            Jeton révoqué
                          </StatusBadge>
                        ) : (
                          <div className="terminals-actions">
                            {isLocked ? (
                              <Button size="sm" icon={<Unlock size={14} />} onClick={() => handleOpenActionModal(term, 'UNLOCK')}>
                                Déverrouiller
                              </Button>
                            ) : (
                              <Button size="sm" icon={<Lock size={14} />} onClick={() => handleOpenActionModal(term)}>
                                Verrouiller
                              </Button>
                            )}
                            <Button size="sm" variant="danger-outline" onClick={() => handleOpenActionModal(term, 'REVOKE')}>
                              Révoquer
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(actionType && actionCopy)}
        onClose={closeActionModal}
        title={actionCopy?.title ?? ''}
        description={actionCopy?.description}
        icon={actionCopy?.icon}
        tone={actionCopy?.tone}
        size="sm"
        busy={submitting}
        onSubmit={handleConfirmAction}
        footer={(
          <>
            <Button onClick={closeActionModal} disabled={submitting}>Annuler</Button>
            <Button
              type="submit"
              variant={actionCopy?.tone ?? 'primary'}
              loading={submitting}
              loadingText="Exécution…"
              disabled={!reason.trim()}
            >
              {actionCopy?.confirm}
            </Button>
          </>
        )}
      >
        <p className="terminals-target">
          Poste concerné : <strong>{selectedTerminal?.id}</strong>
        </p>
        <Field label="Motif administratif" required htmlFor="terminal-action-reason" className="mb-0">
          <textarea
            id="terminal-action-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="input-field"
            placeholder="Expliquez la raison de cette commande…"
            required
          />
        </Field>
      </Modal>
    </div>
  );
};
