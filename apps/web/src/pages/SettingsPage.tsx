import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { Building2, Save, DollarSign, Sliders, ShieldAlert, Check, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { organization, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states - Company Info
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [rccm, setRccm] = useState('');
  const [idNat, setIdNat] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  // Form states - Settings
  const [primaryCurrency, setPrimaryCurrency] = useState('CDF');
  const [secondaryCurrency, setSecondaryCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('2850');
  const [taxRatePercent, setTaxRatePercent] = useState('16');
  const [enableTax, setEnableTax] = useState(true);
  const [invoicePrefix, setInvoicePrefix] = useState('FAC-2026-');
  const [alertMaxDiscount, setAlertMaxDiscount] = useState('15');
  const [alertLargeExpense, setAlertLargeExpense] = useState('2000000');
  const [alertCashDiscrepancy, setAlertCashDiscrepancy] = useState('15000');
  const [invoiceFooterNote, setInvoiceFooterNote] = useState('');
  const [bankDetails, setBankDetails] = useState('');

  useEffect(() => {
    if (organization) {
      setName(organization.name || '');
      setLegalName(organization.legalName || '');
      setTaxId(organization.taxId || '');
      setRccm(organization.rccm || '');
      setIdNat(organization.idNat || '');
      setPhone(organization.phone || '');
      setEmail(organization.email || '');
      setAddress(organization.address || '');
      setCity(organization.city || 'Kinshasa');

      const s = organization.settings;
      if (s) {
        setPrimaryCurrency(s.primaryCurrency || 'CDF');
        setSecondaryCurrency(s.secondaryCurrency || 'USD');
        setExchangeRate(s.exchangeRateUsdToCdf?.toString() || '2850');
        setTaxRatePercent(s.taxRatePercent?.toString() || '16');
        setEnableTax(Boolean(s.enableTax));
        setInvoicePrefix(s.invoicePrefix || 'FAC-2026-');
        setAlertMaxDiscount(s.alertMaxDiscountPercent?.toString() || '15');
        setAlertLargeExpense(s.alertLargeExpenseThreshold?.toString() || '2000000');
        setAlertCashDiscrepancy(s.alertCashDiscrepancyThreshold?.toString() || '15000');
        setInvoiceFooterNote(s.invoiceFooterNote || '');
        setBankDetails(s.bankDetails || '');
      }
    }
  }, [organization]);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);
    try {
      // 1. Update Profile
      await ApiClient.updateOrgProfile({
        name,
        legalName,
        taxId,
        rccm,
        idNat,
        phone,
        email,
        address,
        city,
      });

      // 2. Update Settings
      await ApiClient.updateOrgSettings({
        primaryCurrency,
        secondaryCurrency,
        exchangeRateUsdToCdf: parseFloat(exchangeRate) || 2850,
        taxRatePercent: parseFloat(taxRatePercent) || 16,
        enableTax,
        invoicePrefix,
        alertMaxDiscountPercent: parseFloat(alertMaxDiscount) || 15,
        alertLargeExpenseThreshold: parseFloat(alertLargeExpense) || 2000000,
        alertCashDiscrepancyThreshold: parseFloat(alertCashDiscrepancy) || 15000,
        invoiceFooterNote,
        bankDetails,
      });

      await refreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour des paramètres');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px' }}>
      {savedSuccess && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.2)',
          border: '1px solid #10B981',
          borderRadius: '10px',
          padding: '1rem',
          color: '#A7F3D0',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <Check size={20} color="#10B981" />
          <span>Paramètres de l'entreprise mis à jour avec succès et appliqués à tous les modules.</span>
        </div>
      )}

      <form onSubmit={handleSaveAll}>
        {/* Section 1 : Informations Légales */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="var(--primary-light)" />
            <span>Identité & Données Légales de l’Entreprise (RDC)</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Ces informations figurent automatiquement sur les factures, devis et rapports légaux.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Nom Commercial *
              </label>
              <input
                type="text"
                required
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Raison Sociale Complète
              </label>
              <input
                type="text"
                className="input-field"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Numéro Impôt (NIF)
              </label>
              <input
                type="text"
                placeholder="A0000000X"
                className="input-field"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Numéro RCCM
              </label>
              <input
                type="text"
                placeholder="CD/KIN/RCCM/..."
                className="input-field"
                value={rccm}
                onChange={(e) => setRccm(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Identification Nationale (ID NAT)
              </label>
              <input
                type="text"
                placeholder="01-00-..."
                className="input-field"
                value={idNat}
                onChange={(e) => setIdNat(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Téléphone principal
              </label>
              <input
                type="text"
                className="input-field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Email de facturation
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Ville / Commune
              </label>
              <input
                type="text"
                className="input-field"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2 : Fiscalité & Multi-devises */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} color="#10B981" />
            <span>Devises, Taux de Change & Paramètres Fiscaux</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Gestion de la parité Franc Congolais (CDF) et Dollar Américain (USD).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Devise Principale de Tenue
              </label>
              <select
                className="input-field"
                value={primaryCurrency}
                onChange={(e) => setPrimaryCurrency(e.target.value)}
              >
                <option value="CDF">CDF - Franc Congolais</option>
                <option value="USD">USD - Dollar Américain</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Taux de change (1 USD = X CDF) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                className="input-field"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Taux de TVA légal (%) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                className="input-field"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="taxActive"
              checked={enableTax}
              onChange={(e) => setEnableTax(e.target.checked)}
            />
            <label htmlFor="taxActive" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
              Appliquer la TVA sur les factures de vente (16% en RDC)
            </label>
          </div>
        </div>

        {/* Section 3 : Seuils de Contrôle et Détection des Anomalies */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} color="#F59E0B" />
            <span>Seuils de Détection des Anomalies & Alertes</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Règles de surveillance qui déclenchent automatiquement des alertes lors des opérations quotidiennes.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Remise Max Autorisée sans Alerte (%)
              </label>
              <input
                type="number"
                className="input-field"
                value={alertMaxDiscount}
                onChange={(e) => setAlertMaxDiscount(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Seuil Dépense Exceptionnelle (CDF)
              </label>
              <input
                type="number"
                className="input-field"
                value={alertLargeExpense}
                onChange={(e) => setAlertLargeExpense(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Tolérance Écart de Caisse (CDF)
              </label>
              <input
                type="number"
                className="input-field"
                value={alertCashDiscrepancy}
                onChange={(e) => setAlertCashDiscrepancy(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 4 : Mentions Documents */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--accent-cyan)" />
            <span>Pied de page & Coordonnées Bancaires des Factures</span>
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
              Coordonnées bancaires & Mobile Money affichés sur les factures
            </label>
            <input
              type="text"
              className="input-field"
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
              Mentions Légales / Conditions en bas de page
            </label>
            <textarea
              className="input-field"
              rows={2}
              value={invoiceFooterNote}
              onChange={(e) => setInvoiceFooterNote(e.target.value)}
            />
          </div>
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3rem' }}>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
          >
            <Save size={18} />
            <span>{loading ? 'Enregistrement des paramètres...' : 'Enregistrer les Modifications'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
