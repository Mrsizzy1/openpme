import React, { useState, useEffect, useRef } from 'react';
import { Truck, Plus, RefreshCw, Building2, HandCoins, SearchX } from 'lucide-react';
import { ApiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
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
} from '../components/ui';
import { formatMoney, formatNumber } from '../lib/format';

interface SupplierItem {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  outstandingDebt: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export const SuppliersPage: React.FC = () => {
  const { organization } = useAuth();
  const { success, error } = useToast();
  const primaryCurrency = organization?.settings?.primaryCurrency || 'CDF';

  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const hasLoadedOnce = useRef(false);

  const emptyForm = () => ({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    currency: primaryCurrency,
    outstandingDebt: 0,
  });
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = async () => {
    if (hasLoadedOnce.current) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await ApiClient.getSuppliers(search || undefined);
      setSuppliers(data);
      setLoadError('');
      hasLoadedOnce.current = true;
    } catch (err: any) {
      const message = err.message || 'Erreur lors du chargement des fournisseurs';
      if (!hasLoadedOnce.current) setLoadError(message);
      error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Recherche côté serveur, déclenchée après une courte pause de frappe.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchSuppliers();
    }, hasLoadedOnce.current ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ApiClient.createSupplier(formData);
      success('Fournisseur enregistré avec succès.');
      setShowModal(false);
      setFormData(emptyForm());
      fetchSuppliers();
    } catch (err: any) {
      error(err.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const totalDebt = suppliers.reduce((sum, s) => sum + Number(s.outstandingDebt || 0), 0);
  const activeCount = suppliers.filter((s) => s.isActive).length;
  const indebtedCount = suppliers.filter((s) => Number(s.outstandingDebt) > 0).length;

  const renderTable = () => {
    if (loading) return <TableSkeleton rows={5} columns={5} />;

    if (loadError && suppliers.length === 0) {
      return <ErrorState title="Impossible de charger les fournisseurs" message={loadError} onRetry={fetchSuppliers} />;
    }

    if (suppliers.length === 0) {
      return search ? (
        <EmptyState
          icon={SearchX}
          title="Aucun résultat"
          description={`Aucun fournisseur ne correspond à « ${search} ».`}
          action={<Button onClick={() => setSearch('')}>Effacer la recherche</Button>}
        />
      ) : (
        <EmptyState
          icon={Truck}
          title="Aucun fournisseur enregistré"
          description="Enregistrez vos fournisseurs pour suivre vos achats et vos dettes d’approvisionnement."
          action={<Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowModal(true)}>Nouveau fournisseur</Button>}
        />
      );
    }

    return (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fournisseur</th>
              <th>Contact</th>
              <th>Adresse</th>
              <th>Statut</th>
              <th className="col-amount">Dette en cours</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => {
              const debt = Number(s.outstandingDebt) || 0;
              return (
                <tr key={s.id}>
                  <td>
                    <span className="cell-primary">{s.name}</span>
                    <span className="cell-secondary">
                      <span className="font-mono">{s.code}</span>
                      {s.contactPerson ? ` · ${s.contactPerson}` : ''}
                    </span>
                  </td>
                  <td>
                    {s.phone || s.email ? (
                      <>
                        {s.phone && <span className="nowrap">{s.phone}</span>}
                        {s.email && <span className="cell-secondary">{s.email}</span>}
                      </>
                    ) : (
                      <span className="text-tertiary">—</span>
                    )}
                  </td>
                  <td>{s.address || <span className="text-tertiary">—</span>}</td>
                  <td>
                    <StatusBadge tone={s.isActive ? 'success' : 'neutral'} dot>
                      {s.isActive ? 'Actif' : 'Inactif'}
                    </StatusBadge>
                  </td>
                  <td className={`col-amount${debt > 0 ? ' text-danger' : ''}`}>
                    {formatMoney(debt, s.currency)}
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
    <div className="page">
      <PageToolbar
        start={(
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher par nom, code, contact ou téléphone…"
              aria-label="Rechercher un fournisseur"
              width={360}
            />
            {refreshing && <Spinner size="sm" label="Recherche en cours" />}
          </>
        )}
        end={(
          <>
            <IconButton icon={<RefreshCw />} variant="secondary" aria-label="Actualiser la liste" onClick={fetchSuppliers} />
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowModal(true)}>
              Nouveau fournisseur
            </Button>
          </>
        )}
      />

      <div className="kpi-grid">
        <KpiCard
          label="Fournisseurs actifs"
          value={formatNumber(activeCount)}
          icon={Building2}
          tone="primary"
          hint={`${formatNumber(suppliers.length)} fiche(s) au total`}
          loading={loading}
        />
        <KpiCard
          label="Dettes fournisseurs"
          value={formatMoney(totalDebt, primaryCurrency)}
          icon={HandCoins}
          tone={totalDebt > 0 ? 'danger' : 'success'}
          valueTone={totalDebt > 0 ? 'danger' : undefined}
          hint={indebtedCount > 0 ? `${formatNumber(indebtedCount)} fournisseur(s) à régler` : 'Aucune dette en cours'}
          loading={loading}
        />
      </div>

      <div className="table-wrapper">{renderTable()}</div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau fournisseur"
        description="Les coordonnées servent aux bons de commande et au suivi des dettes d’achat."
        icon={Truck}
        busy={saving}
        onSubmit={handleCreate}
        footer={(
          <>
            <Button onClick={() => setShowModal(false)} disabled={saving}>Annuler</Button>
            <Button type="submit" variant="primary" loading={saving} loadingText="Enregistrement…">
              Enregistrer
            </Button>
          </>
        )}
      >
        <Field label="Raison sociale" required htmlFor="supplier-name">
          <input
            id="supplier-name"
            type="text"
            required
            className="input-field"
            placeholder="Ex. Distributeur officiel Congo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </Field>

        <Field label="Personne de contact" htmlFor="supplier-contact">
          <input
            id="supplier-contact"
            type="text"
            className="input-field"
            placeholder="Nom du commercial ou du gérant"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
          />
        </Field>

        <div className="form-grid">
          <Field label="Téléphone" htmlFor="supplier-phone">
            <input
              id="supplier-phone"
              type="tel"
              className="input-field"
              placeholder="+243 …"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </Field>
          <Field label="E-mail" htmlFor="supplier-email">
            <input
              id="supplier-email"
              type="email"
              className="input-field"
              placeholder="contact@fournisseur.cd"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Adresse" htmlFor="supplier-address">
          <input
            id="supplier-address"
            type="text"
            className="input-field"
            placeholder="Kinshasa, Gombe / Limete…"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </Field>
      </Modal>
    </div>
  );
};
