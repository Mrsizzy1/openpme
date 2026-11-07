import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  Key,
  RefreshCw,
  Copy,
  Users,
  UserX,
  UserCheck,
  SearchX,
  ShieldCheck,
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Modal,
  PageToolbar,
  SearchInput,
  StatusBadge,
  TableSkeleton,
  useConfirm,
} from '../components/ui';
import { formatDate, formatRelativeTime } from '../lib/format';
import type { Tone } from '../lib/tone';
import { useRealtime } from '../lib/realtime';
import { can } from '../role-permissions';
import './UsersPage.css';

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  isOnline: boolean;
  activeSessionsCount: number;
  lastSeenAt: string | null;
}

const ROLE_INFO: Record<string, { label: string; tone: Tone; desc: string }> = {
  SUPER_ADMIN: { label: 'Super administrateur', tone: 'primary', desc: 'Contrôle système total et maintenance' },
  ORG_OWNER: { label: 'Propriétaire / DG', tone: 'primary', desc: 'Gestion financière, paramètres et validation totale' },
  MANAGER: { label: 'Gérant', tone: 'info', desc: 'Contrôle des opérations, paramètres et collaborateurs de l’entreprise' },
  ACCOUNTANT: { label: 'Comptable', tone: 'success', desc: 'Facturation, dépenses, créances et bilans' },
  CASHIER: { label: 'Caissier', tone: 'warning', desc: 'Ventes au comptoir (POS) et encaissements' },
  SALES_REP: { label: 'Commercial', tone: 'info', desc: 'Ventes et suivi des clients' },
  INVENTORY_MANAGER: { label: 'Gestionnaire de stock', tone: 'neutral', desc: 'Entrées, sorties et inventaires physiques' },
  PURCHASER: { label: 'Acheteur', tone: 'neutral', desc: 'Consultation des fournisseurs et achats' },
  AUDITOR: { label: 'Auditeur interne', tone: 'danger', desc: 'Lecture seule des journaux d’audit et des anomalies' },
};

const ASSIGNABLE_ROLE_KEYS = Object.keys(ROLE_INFO).filter(
  (role) => role !== 'SUPER_ADMIN' && role !== 'ORG_OWNER',
);

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'CASHIER',
};

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { success, error } = useToast();
  const confirm = useConfirm();
  const canManageUsers = can(currentUser?.role, 'manageUsers');

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<{ email: string; password: string } | null>(null);
  const hasLoadedOnce = useRef(false);

  // Formulaire création
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  /** Le squelette n'apparaît qu'au premier chargement ; l'actualisation automatique reste silencieuse. */
  const fetchUsers = async () => {
    if (!hasLoadedOnce.current) setLoading(true);
    try {
      const data = await ApiClient.getUsers();
      setUsers(data);
      setLoadError('');
      hasLoadedOnce.current = true;
    } catch (err: any) {
      const message = err.message || 'Erreur lors du chargement des collaborateurs';
      if (!hasLoadedOnce.current) setLoadError(message);
      error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const refreshInterval = window.setInterval(() => {
      void fetchUsers();
    }, 30_000);
    return () => window.clearInterval(refreshInterval);
  }, []);

  useRealtime(['users'], () => {
    if (hasLoadedOnce.current) void fetchUsers();
  });

  const onlineCount = users.filter((u) => u.isOnline).length;
  const activeCount = users.filter((u) => u.isActive).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await ApiClient.createUser(formData);
      success('Collaborateur créé avec succès.');
      setShowModal(false);
      setTemporaryPassword({ email: created.email, password: created.temporaryPassword });
      setFormData(EMPTY_FORM);
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (user: UserItem) => {
    const confirmed = await confirm({
      title: 'Réinitialiser le mot de passe ?',
      message: `Le mot de passe actuel de ${user.firstName} ${user.lastName} cessera de fonctionner. Un mot de passe temporaire sera affiché une seule fois.`,
      confirmLabel: 'Réinitialiser',
      tone: 'warning',
    });
    if (!confirmed) return;
    try {
      const result = await ApiClient.resetUserPassword(user.id);
      setTemporaryPassword({ email: result.email, password: result.temporaryPassword });
      success('Nouveau mot de passe généré. Il ne sera affiché qu’une seule fois.');
    } catch (err: any) {
      error(err.message || 'Erreur lors de la réinitialisation du mot de passe');
    }
  };

  const copyTemporaryPassword = async () => {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword.password);
      success('Mot de passe copié.');
    } catch {
      error('Copie impossible. Sélectionnez et copiez le mot de passe manuellement.');
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    if (user.id === currentUser?.id) {
      error('Vous ne pouvez pas désactiver votre propre compte');
      return;
    }

    if (user.isActive) {
      const confirmed = await confirm({
        title: 'Désactiver ce compte ?',
        message: `${user.firstName} ${user.lastName} ne pourra plus se connecter tant que le compte n’est pas réactivé.`,
        confirmLabel: 'Désactiver',
        tone: 'danger',
      });
      if (!confirmed) return;
    }

    try {
      await ApiClient.updateUser(user.id, { isActive: !user.isActive });
      success(`Compte ${user.isActive ? 'désactivé' : 'activé'} avec succès`);
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await ApiClient.updateUser(userId, { role: newRole });
      success('Rôle mis à jour avec succès');
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Erreur lors du changement de rôle');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const presenceLabel = (u: UserItem) => {
    if (u.isOnline) return `En ligne${u.activeSessionsCount > 1 ? ` · ${u.activeSessionsCount} sessions` : ''}`;
    if (u.lastSeenAt) {
      const relative = formatRelativeTime(u.lastSeenAt);
      return /^\d/.test(relative) ? `Vu le ${relative}` : `Vu ${relative}`;
    }
    return 'Jamais connecté';
  };

  const renderContent = () => {
    if (loading) return <TableSkeleton rows={4} columns={6} />;

    if (loadError && users.length === 0) {
      return <ErrorState title="Impossible de charger l’équipe" message={loadError} onRetry={fetchUsers} />;
    }

    if (users.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="Aucun collaborateur pour le moment"
          description="Ajoutez les membres de votre équipe et attribuez-leur un rôle adapté à leur poste."
          action={canManageUsers ? <Button variant="primary" icon={<UserPlus size={15} />} onClick={() => setShowModal(true)}>Nouveau collaborateur</Button> : undefined}
        />
      );
    }

    if (filteredUsers.length === 0) {
      return (
        <EmptyState
          icon={SearchX}
          title="Aucun résultat"
          description={`Aucun collaborateur ne correspond à « ${search} ».`}
          action={<Button onClick={() => setSearch('')}>Effacer la recherche</Button>}
        />
      );
    }

    return (
      <div className="table-container">
        <table className="data-table users-table">
          <thead>
            <tr>
              <th>Collaborateur</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Présence</th>
              <th>Ajouté le</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const roleInfo = ROLE_INFO[u.role] || { label: u.role, tone: 'neutral' as Tone, desc: 'Rôle personnalisé' };
              const isMe = u.id === currentUser?.id;
              const isProtected = u.role === 'ORG_OWNER' || u.role === 'SUPER_ADMIN';
              const canManageUser = canManageUsers && !isMe && !isProtected;
              const fullName = `${u.firstName} ${u.lastName}`;

              return (
                <tr key={u.id} className={u.isActive ? undefined : 'is-inactive'}>
                  <td>
                    <div className="users-identity">
                      <Avatar name={fullName} tone={roleInfo.tone} />
                      <div className="users-identity-text">
                        <span className="cell-primary">
                          {fullName}
                          {isMe && <StatusBadge tone="neutral" size="sm" className="users-me-badge">Vous</StatusBadge>}
                        </span>
                        <span className="cell-secondary">
                          {u.email}
                          {u.phone ? ` · ${u.phone}` : ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {canManageUser ? (
                      <select
                        className="select-field input-sm users-role-select"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        aria-label={`Rôle de ${fullName}`}
                        title={roleInfo.desc}
                      >
                        {ASSIGNABLE_ROLE_KEYS.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_INFO[r].label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="users-role-fixed" title={isProtected ? 'Compte protégé : seul son titulaire peut l’utiliser.' : roleInfo.desc}>
                        {isProtected && <ShieldCheck size={14} aria-hidden="true" />}
                        {roleInfo.label}
                      </span>
                    )}
                    <span className="cell-secondary users-role-desc">{roleInfo.desc}</span>
                  </td>
                  <td>
                    <StatusBadge tone={u.isActive ? 'success' : 'neutral'} dot>
                      {u.isActive ? 'Actif' : 'Désactivé'}
                    </StatusBadge>
                  </td>
                  <td>
                    <span className={`users-presence${u.isOnline ? ' is-online' : ''}`}>
                      <span className="users-presence-dot" aria-hidden="true" />
                      <span title={u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString('fr-FR') : undefined}>
                        {presenceLabel(u)}
                      </span>
                    </span>
                  </td>
                  <td className="nowrap">{formatDate(u.createdAt)}</td>
                  <td className="col-actions">
                    <IconButton
                      icon={<Key />}
                      size="sm"
                      aria-label={`Réinitialiser le mot de passe de ${fullName}`}
                      title={canManageUser ? 'Réinitialiser le mot de passe' : 'Action indisponible pour ce compte'}
                      disabled={!canManageUser}
                      onClick={() => handleResetPassword(u)}
                    />
                    <IconButton
                      icon={u.isActive ? <UserX /> : <UserCheck />}
                      size="sm"
                      variant={u.isActive ? 'danger' : 'ghost'}
                      aria-label={u.isActive ? `Désactiver le compte de ${fullName}` : `Activer le compte de ${fullName}`}
                      title={canManageUser ? (u.isActive ? 'Désactiver le compte' : 'Activer le compte') : 'Action indisponible pour ce compte'}
                      disabled={!canManageUser}
                      onClick={() => handleToggleStatus(u)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="page users-page">
      <PageToolbar
        start={(
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher par nom, e-mail, téléphone ou rôle…"
              aria-label="Rechercher un collaborateur"
              width={340}
            />
            {!loading && users.length > 0 && (
              <span className="users-summary">
                <span className={`users-presence-dot${onlineCount ? ' is-online' : ''}`} aria-hidden="true" />
                {onlineCount} en ligne sur {activeCount} compte{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
              </span>
            )}
          </>
        )}
        end={(
          <>
            <IconButton icon={<RefreshCw />} variant="secondary" aria-label="Actualiser la liste" onClick={fetchUsers} />
            {canManageUsers && (
              <Button variant="primary" icon={<UserPlus size={15} />} onClick={() => setShowModal(true)}>
                Nouveau collaborateur
              </Button>
            )}
          </>
        )}
      />

      <div className="table-wrapper">{renderContent()}</div>

      {/* Création d'un collaborateur */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau collaborateur"
        description="Un mot de passe temporaire sera généré et affiché une seule fois après la création."
        icon={UserPlus}
        busy={saving}
        onSubmit={handleCreate}
        footer={(
          <>
            <Button onClick={() => setShowModal(false)} disabled={saving}>Annuler</Button>
            <Button type="submit" variant="primary" loading={saving} loadingText="Création…">
              Créer le collaborateur
            </Button>
          </>
        )}
      >
        <div className="form-grid">
          <Field label="Prénom" required htmlFor="user-first-name">
            <input
              id="user-first-name"
              type="text"
              required
              className="input-field"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
          </Field>
          <Field label="Nom" required htmlFor="user-last-name">
            <input
              id="user-last-name"
              type="text"
              required
              className="input-field"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Adresse e-mail professionnelle" required htmlFor="user-email">
          <input
            id="user-email"
            type="email"
            required
            className="input-field"
            placeholder="collaborateur@entreprise.cd"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </Field>

        <Field label="Téléphone" hint="Facultatif" htmlFor="user-phone">
          <input
            id="user-phone"
            type="tel"
            className="input-field"
            placeholder="+243 812 345 678"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </Field>

        <Field label="Rôle" required hint={ROLE_INFO[formData.role]?.desc} htmlFor="user-role">
          <select
            id="user-role"
            className="select-field"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            {ASSIGNABLE_ROLE_KEYS.map((r) => (
              <option key={r} value={r}>
                {ROLE_INFO[r].label}
              </option>
            ))}
          </select>
        </Field>
      </Modal>

      {/* Mot de passe temporaire (affiché une seule fois) */}
      <Modal
        open={Boolean(temporaryPassword)}
        onClose={() => setTemporaryPassword(null)}
        title="Mot de passe temporaire"
        description={temporaryPassword ? (
          <>Transmettez ce mot de passe à <strong>{temporaryPassword.email}</strong> par un canal sûr. Il ne sera plus visible après la fermeture de cette fenêtre.</>
        ) : null}
        icon={Key}
        tone="warning"
        closeOnBackdrop={false}
        footer={(
          <Button variant="primary" onClick={() => setTemporaryPassword(null)}>
            J’ai noté le mot de passe
          </Button>
        )}
      >
        <div className="input-addon">
          <input
            className="input-field users-password"
            readOnly
            value={temporaryPassword?.password ?? ''}
            aria-label="Mot de passe temporaire"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button icon={<Copy size={15} />} onClick={copyTemporaryPassword} className="users-copy-btn">
            Copier
          </Button>
        </div>
      </Modal>
    </div>
  );
};
