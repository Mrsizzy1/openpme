import React, { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '@smart-pme/shared';
import { Users, Plus, RefreshCw, Pencil, Trash2, SearchX, UserRound, Wallet, OctagonAlert } from 'lucide-react';
import { ApiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  KpiCard,
  Modal,
  PageToolbar,
  SearchInput,
  Spinner,
  StatusBadge,
  TableSkeleton,
  useConfirm,
} from '../components/ui';
import { formatNumber } from '../lib/format';

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();
  const canManage = user?.role === 'ORG_OWNER' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const hasLoadedOnce = useRef(false);

  // Formulaire (création et modification)
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = async () => {
    try {
      if (hasLoadedOnce.current) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);
      const res = await ApiClient.getCustomers(search);
      setCustomers(res);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      setLoadError(err.message || 'Impossible de charger les clients.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Recherche côté serveur après une courte pause de frappe.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, hasLoadedOnce.current ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [search]);

  const resetForm = () => {
    setFormName('');
    setFormCompany('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormCreditLimit('');
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setShowAddModal(true);
  };

  const closeForm = () => {
    setShowAddModal(false);
    setEditingCustomer(null);
    resetForm();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim()) {
      setFormError('Le nom du client est obligatoire.');
      return;
    }
    setSubmitting(true);
    try {
      await ApiClient.createCustomer({
        name: formName.trim(),
        companyName: formCompany.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        creditLimit: parseFloat(formCreditLimit) || 0,
        currency: 'CDF',
      });
      const name = formName;
      closeForm();
      success(`Client « ${name} » enregistré avec succès.`);
      loadCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la création du client.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (customer: any) => {
    setEditingCustomer(customer);
    setFormName(customer.name || '');
    setFormCompany(customer.companyName || '');
    setFormPhone(customer.phone || '');
    setFormEmail(customer.email || '');
    setFormAddress(customer.address || '');
    setFormCreditLimit(String(customer.creditLimit || '0'));
    setFormError(null);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Le nom du client est obligatoire.');
      return;
    }

    setSubmitting(true);
    try {
      await ApiClient.updateCustomer(editingCustomer.id, {
        name: formName.trim(),
        companyName: formCompany.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        creditLimit: parseFloat(formCreditLimit) || 0,
      });
      closeForm();
      success('Client mis à jour avec succès.');
      loadCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la modification.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customer: any) => {
    const confirmed = await confirm({
      title: `Supprimer le client « ${customer.name} » ?`,
      message: 'Si ce client possède déjà des factures ou des règlements, sa fiche sera archivée pour préserver l’intégrité comptable.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await ApiClient.deleteCustomer(customer.id);
      success('Client supprimé avec succès.');
      loadCustomers();
    } catch (err: any) {
      toastError(err.message || 'Impossible de supprimer ce client.');
    }
  };

  const withBalance = customers.filter((c) => Number(c.outstandingBalance || 0) > 0).length;
  const overLimit = customers.filter((c) => {
    const limit = Number(c.creditLimit || 0);
    return limit > 0 && Number(c.outstandingBalance || 0) > limit;
  }).length;

  const isEditing = Boolean(editingCustomer);
  const formOpen = showAddModal || isEditing;

  const renderTable = () => {
    if (loading) return <TableSkeleton rows={6} columns={7} />;

    if (loadError && customers.length === 0) {
      return <ErrorState title="Impossible de charger les clients" message={loadError} onRetry={loadCustomers} />;
    }

    if (customers.length === 0) {
      return search ? (
        <EmptyState
          icon={SearchX}
          title="Aucun résultat"
          description={`Aucun client ne correspond à « ${search} ».`}
          action={<Button onClick={() => setSearch('')}>Effacer la recherche</Button>}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="Aucun client enregistré"
          description="Créez vos fiches clients pour suivre leurs achats, leurs encours et leur limite de crédit."
          action={<Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>Nouveau client</Button>}
        />
      );
    }

    return (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Client</th>
              <th>Contact</th>
              <th>Adresse</th>
              <th className="col-amount">Limite de crédit</th>
              <th className="col-amount">Encours</th>
              <th>Situation</th>
              {canManage && <th className="col-actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {customers.map((c: any) => {
              const outstanding = Number(c.outstandingBalance || 0);
              const limit = Number(c.creditLimit || 0);
              const exceeded = limit > 0 && outstanding > limit;
              return (
                <tr key={c.id}>
                  <td className="col-mono">{c.code}</td>
                  <td>
                    <span className="cell-primary">{c.name}</span>
                    {c.companyName && <span className="cell-secondary">{c.companyName}</span>}
                  </td>
                  <td>
                    {c.phone || c.email ? (
                      <>
                        {c.phone && <span className="nowrap">{c.phone}</span>}
                        {c.email && <span className="cell-secondary">{c.email}</span>}
                      </>
                    ) : <span className="text-tertiary">—</span>}
                  </td>
                  <td>
                    {c.address ? <span className="truncate" style={{ display: 'block', maxWidth: 200 }} title={c.address}>{c.address}</span> : <span className="text-tertiary">—</span>}
                  </td>
                  <td className="col-amount">
                    {limit > 0 ? formatCurrency(limit, c.currency || 'CDF') : <span className="text-tertiary">Sans crédit</span>}
                  </td>
                  <td className={`col-amount${exceeded ? ' text-danger' : ''}`}>
                    {formatCurrency(outstanding, c.currency || 'CDF')}
                  </td>
                  <td>
                    {exceeded ? (
                      <StatusBadge tone="danger" dot>Plafond dépassé</StatusBadge>
                    ) : outstanding > 0 ? (
                      <StatusBadge tone="warning" dot>Encours</StatusBadge>
                    ) : (
                      <StatusBadge tone="success" dot>À jour</StatusBadge>
                    )}
                  </td>
                  {canManage && (
                    <td className="col-actions">
                      <IconButton icon={<Pencil />} size="sm" aria-label={`Modifier ${c.name}`} title="Modifier" onClick={() => handleOpenEdit(c)} />
                      <IconButton icon={<Trash2 />} size="sm" variant="danger" aria-label={`Supprimer ${c.name}`} title="Supprimer" onClick={() => handleDeleteCustomer(c)} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="page">
      <PageToolbar
        start={(
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher un client, une société, un téléphone…"
              aria-label="Rechercher un client"
              width={360}
            />
            {refreshing && <Spinner size="sm" label="Recherche en cours" />}
          </>
        )}
        end={(
          <>
            <IconButton icon={<RefreshCw />} variant="secondary" aria-label="Actualiser la liste" onClick={loadCustomers} />
            <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>
              Nouveau client
            </Button>
          </>
        )}
      />

      <div className="kpi-grid">
        <KpiCard label="Clients" value={formatNumber(customers.length)} icon={UserRound} tone="primary" hint={search ? 'Résultats de la recherche' : 'Fiches enregistrées'} loading={loading} />
        <KpiCard label="Avec encours" value={formatNumber(withBalance)} icon={Wallet} tone="warning" hint="Clients ayant un solde à régler" loading={loading} />
        <KpiCard
          label="Plafond dépassé"
          value={formatNumber(overLimit)}
          icon={OctagonAlert}
          tone="danger"
          valueTone={overLimit > 0 ? 'danger' : undefined}
          hint="Encours supérieur à la limite de crédit"
          loading={loading}
        />
      </div>

      <div className="table-wrapper">{renderTable()}</div>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={isEditing ? 'Modifier le client' : 'Nouveau client'}
        description={isEditing ? editingCustomer?.name : 'La limite de crédit autorise ou non la vente à crédit pour ce client.'}
        icon={isEditing ? Pencil : UserRound}
        busy={submitting}
        onSubmit={isEditing ? handleUpdateCustomer : handleCreateCustomer}
        footer={(
          <>
            <Button onClick={closeForm} disabled={submitting}>Annuler</Button>
            <Button type="submit" variant="primary" loading={submitting} loadingText="Enregistrement…">
              {isEditing ? 'Enregistrer les modifications' : 'Enregistrer le client'}
            </Button>
          </>
        )}
      >
        {formError && <Alert tone="danger">{formError}</Alert>}
        <div>
          <Field label="Nom complet ou raison sociale" required htmlFor="cust-name">
            <input
              id="cust-name"
              type="text"
              required
              className="input-field"
              placeholder="Prénom et nom, ou dénomination"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </Field>

          <Field label="Société" hint="Facultatif" htmlFor="cust-company">
            <input
              id="cust-company"
              type="text"
              className="input-field"
              value={formCompany}
              onChange={(e) => setFormCompany(e.target.value)}
            />
          </Field>

          <div className="form-grid">
            <Field label="Téléphone" htmlFor="cust-phone">
              <input
                id="cust-phone"
                type="tel"
                className="input-field"
                placeholder="+243 8X XXX XXXX"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </Field>
            <Field label="E-mail" htmlFor="cust-email">
              <input
                id="cust-email"
                type="email"
                className="input-field"
                placeholder="client@exemple.cd"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Adresse" htmlFor="cust-address">
            <input
              id="cust-address"
              type="text"
              className="input-field"
              placeholder="Commune, avenue, numéro…"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
            />
          </Field>

          <Field label="Limite de crédit" hint="Laissez 0 pour interdire la vente à crédit à ce client." htmlFor="cust-credit" className="mb-0">
            <div className="input-addon">
              <input
                id="cust-credit"
                type="number"
                min="0"
                step="any"
                className="input-field"
                placeholder="0"
                value={formCreditLimit}
                onChange={(e) => setFormCreditLimit(e.target.value)}
              />
              <span className="input-addon-text">CDF</span>
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
};
