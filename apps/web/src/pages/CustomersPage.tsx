import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { formatCurrency, Currency } from '@smart-pme/shared';
import { Users, Plus, Search, Phone, Mail, MapPin, X, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CustomersPage: React.FC = () => {
  const { organization } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('5000000');
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getCustomers(search);
      setCustomers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ApiClient.createCustomer({
        name: formName,
        companyName: formCompany,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        creditLimit: parseFloat(formCreditLimit) || 0,
        currency: 'CDF',
      });
      setShowAddModal(false);
      setFormName('');
      setFormCompany('');
      setFormPhone('');
      setFormEmail('');
      setFormAddress('');
      loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création du client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '380px' }}>
          <input
            type="text"
            placeholder="Rechercher un client, société, tél..."
            className="input-field"
            style={{ paddingLeft: '2.5rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
        </form>

        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <Plus size={18} />
          <span>Nouveau Client</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Code Client</th>
                <th>Nom & Raison Sociale</th>
                <th>Coordonnées</th>
                <th>Adresse</th>
                <th>Plafond de Crédit</th>
                <th>Créance Due (Solde)</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const balance = Number(c.outstandingBalance);
                const limit = Number(c.creditLimit);
                const isOverLimit = limit > 0 && balance > limit;

                return (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {c.code}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{c.name}</div>
                      {c.companyName && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.companyName}</div>
                      )}
                    </td>
                    <td>
                      {c.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <Phone size={13} />
                          <span>{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                          <Mail size={13} />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '240px' }}>
                      {c.address || 'Kinshasa'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {limit > 0 ? formatCurrency(limit, c.currency) : 'Illimité'}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: balance > 0 ? '#F87171' : '#34D399' }}>
                        {formatCurrency(balance, c.currency)}
                      </span>
                    </td>
                    <td>
                      {isOverLimit ? (
                        <span className="badge badge-danger">Plafond Dépassé</span>
                      ) : balance > 0 ? (
                        <span className="badge badge-warning">En Compte</span>
                      ) : (
                        <span className="badge badge-success">À jour</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Customer */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Créer une Fiche Client
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Nom complet du client ou contact *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Patrick Kabongo"
                  className="input-field"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Raison Sociale / Entreprise
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Congo Entreprise SARL"
                    className="input-field"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Téléphone (WhatsApp) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+243 81 000 0000"
                    className="input-field"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="client@domaine.cd"
                    className="input-field"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Plafond de Crédit Autorisé (CDF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Adresse physique
                </label>
                <input
                  type="text"
                  placeholder="Commune, Quartier, Avenue, N°..."
                  className="input-field"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Enregistrement...' : 'Enregistrer le Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
