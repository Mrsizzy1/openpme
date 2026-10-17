import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  AlertCircle,
  Building,
  DollarSign,
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

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

  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    currency: organization?.settings?.primaryCurrency || 'CDF',
    outstandingDebt: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getSuppliers(search || undefined);
      setSuppliers(data);
    } catch (err: any) {
      error(err.message || 'Erreur lors du chargement des fournisseurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ApiClient.createSupplier(formData);
      success('Fournisseur enregistré avec succès !');
      setShowModal(false);
      setFormData({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        currency: organization?.settings?.primaryCurrency || 'CDF',
        outstandingDebt: 0,
      });
      fetchSuppliers();
    } catch (err: any) {
      error(err.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const totalDebt = suppliers.reduce((sum, s) => sum + Number(s.outstandingDebt || 0), 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={26} color="#1E40AF" /> Gestion des Fournisseurs & Approvisionnements
          </h1>
          <p className="page-subtitle">
            Suivi des partenaires commerciaux, réceptions d'achats et dettes fournisseurs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchSuppliers} className="btn-secondary" title="Actualiser">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Nouveau Fournisseur
          </button>
        </div>
      </div>

      {/* KPI Dettes Fournisseurs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={16} /> Total Fournisseurs Actifs
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px' }}>
            {suppliers.filter((s) => s.isActive).length}
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #DC2626' }}>
          <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={16} color="#DC2626" /> Dettes Fournisseurs Restantes
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', color: '#DC2626' }}>
            {totalDebt.toLocaleString('fr-FR')} {organization?.settings?.primaryCurrency || 'CDF'}
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
          <input
            type="text"
            className="input"
            placeholder="Rechercher par nom, code, personne de contact, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {/* Liste des fournisseurs */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>Chargement des fournisseurs...</div>
      ) : suppliers.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={36} color="#94A3B8" style={{ margin: '0 auto 10px' }} />
          <p>Aucun fournisseur trouvé.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {suppliers.map((s) => (
            <div key={s.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, background: '#EFF6FF', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px' }}>
                    {s.code}
                  </span>
                  <h3 style={{ margin: '6px 0 0', fontSize: '16px', fontWeight: 600 }}>{s.name}</h3>
                  {s.contactPerson && (
                    <div style={{ fontSize: '12px', color: '#64748B' }}>Contact : {s.contactPerson}</div>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px', margin: '12px 0' }}>
                {s.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={13} color="#94A3B8" /> {s.phone}
                  </div>
                )}
                {s.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={13} color="#94A3B8" /> {s.email}
                  </div>
                )}
                {s.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} color="#94A3B8" /> {s.address}
                  </div>
                )}
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Dette en cours :</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: Number(s.outstandingDebt) > 0 ? '#DC2626' : '#16A34A' }}>
                  {Number(s.outstandingDebt).toLocaleString('fr-FR')} {s.currency}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Création Fournisseur */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>Enregistrer un Fournisseur</h2>
              <button onClick={() => setShowModal(false)} className="btn-close">×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="label">Nom de l'Entreprise Fournisseur *</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Ex: Distributeur Officiel Congo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Personne de Contact</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nom du commercial ou gérant"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="label">Téléphone</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="+243 ..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="contact@fournisseur.cd"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Adresse Physique</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Kinshasa, Gombe / Limete..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
