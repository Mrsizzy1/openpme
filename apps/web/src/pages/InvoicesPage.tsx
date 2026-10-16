import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { formatCurrency, Currency, roundMoney } from '@smart-pme/shared';
import {
  Receipt,
  Search,
  Plus,
  Printer,
  CreditCard,
  Building2,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const InvoicesPage: React.FC = () => {
  const { organization } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Print / View modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Payment modal
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getInvoices(statusFilter || undefined);
      setInvoices(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  const handleOpenPayment = (inv: any) => {
    setPaymentInvoice(inv);
    setPaymentAmount(inv.balance.toString());
    setPaymentRef('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    setSubmittingPayment(true);
    try {
      await ApiClient.createPayment({
        invoiceId: paymentInvoice.id,
        customerId: paymentInvoice.customerId,
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        reference: paymentRef,
        currency: paymentInvoice.currency,
      });
      setPaymentInvoice(null);
      loadInvoices();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’encaissement');
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Filters and Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['', 'PAID', 'PARTIALLY_PAID', 'ISSUED', 'OVERDUE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            >
              {st === '' ? 'Toutes les factures' : st === 'PAID' ? 'Soldées (Payées)' : st === 'PARTIALLY_PAID' ? 'Acomptes / Partielle' : st === 'ISSUED' ? 'Émises' : 'En retard'}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>N° Facture</th>
                <th>Client</th>
                <th>Date d’Émission</th>
                <th>Échéance</th>
                <th>Montant Total</th>
                <th>Montant Payé</th>
                <th>Solde Restant</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary-light)' }}>
                    {inv.invoiceNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{inv.customer?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{inv.customer?.phone}</div>
                  </td>
                  <td>{new Date(inv.issueDate).toLocaleDateString('fr-FR')}</td>
                  <td>{new Date(inv.dueDate).toLocaleDateString('fr-FR')}</td>
                  <td style={{ fontWeight: 700, color: '#fff' }}>
                    {formatCurrency(Number(inv.total), inv.currency)}
                  </td>
                  <td style={{ color: '#34D399', fontWeight: 600 }}>
                    {formatCurrency(Number(inv.paidAmount), inv.currency)}
                  </td>
                  <td style={{ fontWeight: 700, color: Number(inv.balance) > 0 ? '#F87171' : 'var(--text-subtle)' }}>
                    {formatCurrency(Number(inv.balance), inv.currency)}
                  </td>
                  <td>
                    <span className={`badge ${inv.status === 'PAID' ? 'badge-success' : inv.status === 'PARTIALLY_PAID' ? 'badge-warning' : 'badge-info'}`}>
                      {inv.status === 'PAID' ? 'Payée' : inv.status === 'PARTIALLY_PAID' ? 'Partielle' : 'Émise'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="btn btn-secondary btn-sm"
                        title="Voir et imprimer"
                        style={{ padding: '0.35rem 0.6rem' }}
                      >
                        <Printer size={15} />
                      </button>
                      {Number(inv.balance) > 0 && (
                        <button
                          onClick={() => handleOpenPayment(inv)}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.35rem 0.6rem' }}
                          title="Encaisser"
                        >
                          <CreditCard size={15} />
                          <span>Régler</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Document Modal (Print view) */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px', background: '#fff', color: '#111827', padding: '2.5rem' }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #2563EB', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E3A8A' }}>
                  {organization?.name}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#4B5563', lineHeight: 1.4 }}>
                  {organization?.address}<br />
                  {organization?.city}, {organization?.country}<br />
                  Tél : {organization?.phone} | Email : {organization?.email}<br />
                  <strong>NIF :</strong> {organization?.taxId} | <strong>RCCM :</strong> {organization?.rccm} | <strong>ID NAT :</strong> {organization?.idNat}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563EB' }}>
                  FACTURE COMMERCIALE
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  N° {selectedInvoice.invoiceNumber}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.25rem' }}>
                  Date : {new Date(selectedInvoice.issueDate).toLocaleDateString('fr-FR')}<br />
                  Échéance : {new Date(selectedInvoice.dueDate).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>

            {/* Client address */}
            <div style={{ background: '#F3F4F6', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Facturé à :</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{selectedInvoice.customer?.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#4B5563' }}>
                {selectedInvoice.customer?.companyName && <span>{selectedInvoice.customer.companyName}<br /></span>}
                {selectedInvoice.customer?.address || 'Kinshasa, RDC'}<br />
                Tél : {selectedInvoice.customer?.phone}
              </div>
            </div>

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#1E3A8A', color: '#fff' }}>
                  <th style={{ padding: '0.6rem', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '0.6rem', textAlign: 'center' }}>Qté</th>
                  <th style={{ padding: '0.6rem', textAlign: 'right' }}>P.U.</th>
                  <th style={{ padding: '0.6rem', textAlign: 'right' }}>TVA %</th>
                  <th style={{ padding: '0.6rem', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items?.map((item: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '0.6rem' }}>{item.product?.name || item.description}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right' }}>{formatCurrency(Number(item.unitPrice), selectedInvoice.currency)}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right' }}>{item.taxRatePercent}%</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(Number(item.total), selectedInvoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <div style={{ width: '280px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                  <span>Sous-total HT :</span>
                  <span>{formatCurrency(Number(selectedInvoice.subtotal), selectedInvoice.currency)}</span>
                </div>
                {Number(selectedInvoice.taxAmount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                    <span>TVA (16%) :</span>
                    <span>{formatCurrency(Number(selectedInvoice.taxAmount), selectedInvoice.currency)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 800, fontSize: '1.1rem', borderTop: '2px solid #1E3A8A', color: '#1E3A8A' }}>
                  <span>Total TTC :</span>
                  <span>{formatCurrency(Number(selectedInvoice.total), selectedInvoice.currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#059669', fontWeight: 600 }}>
                  <span>Montant Réglé :</span>
                  <span>{formatCurrency(Number(selectedInvoice.paidAmount), selectedInvoice.currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#DC2626', fontWeight: 700 }}>
                  <span>Solde Restant Dû :</span>
                  <span>{formatCurrency(Number(selectedInvoice.balance), selectedInvoice.currency)}</span>
                </div>
              </div>
            </div>

            {/* Legal Footer */}
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem', fontSize: '0.75rem', color: '#6B7280', textAlign: 'center', lineHeight: 1.4 }}>
              {organization?.settings?.invoiceFooterNote || 'Facture certifiée conforme aux exigences fiscales en République démocratique du Congo.'}<br />
              Coordonnées bancaires : {organization?.settings?.bankDetails || 'Rawbank Kinshasa'}
            </div>

            {/* Print action buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="btn btn-secondary"
                style={{ color: '#111827' }}
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary"
              >
                <Printer size={16} />
                <span>Imprimer la Facture</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Enregistrer un Règlement
              </h3>
              <button onClick={() => setPaymentInvoice(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div>Facture N° : <strong>{paymentInvoice.invoiceNumber}</strong></div>
              <div>Client : <strong>{paymentInvoice.customer?.name}</strong></div>
              <div style={{ marginTop: '0.4rem', color: '#F87171', fontWeight: 700 }}>
                Solde restant à payer : {formatCurrency(Number(paymentInvoice.balance), paymentInvoice.currency)}
              </div>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Montant du règlement ({paymentInvoice.currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={paymentInvoice.balance}
                  className="input-field"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Moyen de paiement *
                </label>
                <select
                  className="input-field"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH">Espèces (Caisse)</option>
                  <option value="BANK_TRANSFER">Virement Bancaire (Rawbank / EquityBCDC)</option>
                  <option value="MOBILE_MONEY_MPESA">M-Pesa Marchand</option>
                  <option value="MOBILE_MONEY_AIRTEL">Airtel Money</option>
                  <option value="CHECK">Chèque</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Référence du paiement / N° bordereau
                </label>
                <input
                  type="text"
                  placeholder="ex: VIR-RAWBANK-12093"
                  className="input-field"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="btn btn-primary"
                >
                  {submittingPayment ? 'Enregistrement...' : 'Valider le Règlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
