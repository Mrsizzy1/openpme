import React, { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '@smart-pme/shared';
import { Receipt, Printer, CreditCard, RefreshCw, CheckCircle, FileSpreadsheet, Share2, ListChecks, Eye } from 'lucide-react';
import { ApiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { exportToCsv } from '../utils/exportCsv';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { printThermalReceiptWeb } from '../utils/escpos';
import { isNetworkFailure, offlineSync } from '../services/offlineSync';
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Modal,
  PageToolbar,
  Spinner,
  StatusBadge,
  TableSkeleton,
} from '../components/ui';
import { formatDate } from '../lib/format';
import { INVOICE_STATUS, getStatusMeta } from '../lib/status';
import { useRealtime } from '../lib/realtime';
import { can } from '../role-permissions';
import './InvoicesPage.css';

const FILTER_OPTIONS = [
  { value: '', label: 'Toutes' },
  { value: 'ISSUED', label: 'Émises' },
  { value: 'PARTIALLY_PAID', label: 'Partielles' },
  { value: 'OVERDUE', label: 'En retard' },
  { value: 'PAID', label: 'Payées' },
  { value: 'CANCELLED', label: 'Annulées' },
];

const statusLabel = (status: string) => getStatusMeta(INVOICE_STATUS, status).label;

export const InvoicesPage: React.FC = () => {
  const { organization, user } = useAuth();
  const canCollect = can(user?.role, 'collectPayment');
  const { success, error: toastError } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentCashSessionId, setPaymentCashSessionId] = useState<string | undefined>();
  const [cashSessionIds, setCashSessionIds] = useState<Record<string, string>>({});
  const [cashSessionLoadError, setCashSessionLoadError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const loadInvoices = async () => {
    try {
      if (hasLoadedOnce.current) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);
      const res = await ApiClient.getInvoices(statusFilter || undefined);
      setInvoices(res);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      setLoadError(err.message || 'Impossible de charger les factures.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  useRealtime(['invoices', 'payments', 'sales'], () => {
    if (hasLoadedOnce.current) void loadInvoices();
  });

  useEffect(() => {
    let active = true;
    void Promise.all([
      ApiClient.getCurrentCashSession('CDF'),
      ApiClient.getCurrentCashSession('USD'),
    ]).then(([cdfSession, usdSession]) => {
      if (active) {
        setCashSessionIds({
          CDF: cdfSession?.id,
          USD: usdSession?.id,
        });
        setCashSessionLoadError(null);
      }
    }).catch((error: unknown) => {
      if (active) {
        setCashSessionIds({});
        setCashSessionLoadError(error instanceof Error ? error.message : 'Impossible de vérifier la session de caisse.');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleOpenPayment = (inv: any) => {
    setPaymentInvoice(inv);
    setPaymentAmount(String(Number(inv.balance).toFixed(2)));
    setPaymentRef('');
    setPaymentError(null);
    setPaymentCashSessionId(cashSessionIds[inv.currency]);
    if (!cashSessionIds[inv.currency]) {
      void ApiClient.getCurrentCashSession(inv.currency)
        .then((session) => {
          setCashSessionIds((current) => ({ ...current, [inv.currency]: session?.id }));
          setPaymentCashSessionId(session?.id);
          setCashSessionLoadError(null);
        })
        .catch((error: unknown) => {
          setCashSessionLoadError(error instanceof Error ? error.message : 'Impossible de vérifier la session de caisse.');
        });
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    setPaymentError(null);

    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentError('Le montant doit être supérieur à 0.');
      return;
    }
    if (amt > Number(paymentInvoice.balance)) {
      setPaymentError(`Le montant ne peut pas dépasser le solde restant (${formatCurrency(Number(paymentInvoice.balance), paymentInvoice.currency)}).`);
      return;
    }
    if (paymentMethod === 'CASH' && !paymentCashSessionId) {
      setPaymentError(`Aucune session de caisse ${paymentInvoice.currency} n’est disponible. Vérifiez que la caisse est ouverte, puis réessayez.`);
      return;
    }

    setSubmittingPayment(true);
    const paymentPayload = {
      idempotencyKey: crypto.randomUUID(),
      invoiceId: paymentInvoice.id,
      customerId: paymentInvoice.customerId,
      amount: paymentAmount,
      method: paymentMethod,
      reference: paymentRef.trim() || undefined,
      currency: paymentInvoice.currency,
      cashSessionId: paymentMethod === 'CASH' ? paymentCashSessionId : undefined,
    };
    try {
      await ApiClient.createPayment(paymentPayload);
      setPaymentInvoice(null);
      success(`Règlement de ${formatCurrency(amt, paymentInvoice.currency)} enregistré avec succès.`);
      loadInvoices();
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        if (paymentMethod !== 'CASH') {
          setPaymentError('Un paiement par banque ou Mobile Money doit être confirmé en ligne. Aucun règlement n’a été enregistré.');
        } else if (!paymentCashSessionId) {
          setPaymentError(
            `Aucune session de caisse ${paymentInvoice.currency} n’est disponible. Ouvrez la caisse en ligne avant d’enregistrer ce règlement.${
              cashSessionLoadError ? ` ${cashSessionLoadError}` : ''
            }`,
          );
        } else {
          try {
            await offlineSync.enqueuePayment(paymentPayload);
            setPaymentInvoice(null);
            success(`Règlement de ${formatCurrency(amt, paymentInvoice.currency)} enregistré hors ligne. Il sera synchronisé dès le retour du réseau.`);
          } catch (storageError) {
            setPaymentError(storageError instanceof Error
              ? `Le règlement n’a pas été enregistré. ${storageError.message}`
              : 'Le règlement n’a pas été enregistré : stockage hors ligne indisponible.');
          }
        }
      } else {
        setPaymentError(err.message || 'Erreur lors de l\'enregistrement du règlement.');
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleExportInvoices = () => {
    if (!invoices.length) {
      toastError('Aucune facture à exporter.');
      return;
    }
    const rows = invoices.map((inv) => ({
      'N° Facture': inv.invoiceNumber,
      'Date Émission': new Date(inv.createdAt).toLocaleDateString('fr-FR'),
      'Client': inv.customer?.name || 'Client Comptoir',
      'Statut': statusLabel(inv.status),
      'Devise': inv.currency,
      'Sous-total HT': inv.subtotal,
      'TVA (16%)': inv.taxAmount,
      'Total TTC': inv.total,
      'Montant Réglé': inv.paidAmount,
      'Solde Restant': inv.balance,
    }));
    exportToCsv('Factures_OpenPME', rows);
    success('Export des factures téléchargé.');
  };

  const handleShareWhatsApp = (inv: any) => {
    const phone = inv.customer?.phone ? inv.customer.phone.replace(/[^0-9]/g, '') : '';
    const message = encodeURIComponent(
      `*${organization?.name || 'OpenPME'} - FACTURE*\n` +
      `N° Facture : *${inv.invoiceNumber}*\n` +
      `Client : *${inv.customer?.name || 'Client comptoir'}*\n` +
      `Date : ${new Date(inv.createdAt).toLocaleDateString('fr-FR')}\n` +
      `Total : *${formatCurrency(Number(inv.total), inv.currency)}*\n` +
      `Statut : *${statusLabel(inv.status)}*\n` +
      `Solde restant : *${formatCurrency(Number(inv.balance), inv.currency)}*\n\n` +
      `_Merci de votre confiance._`
    );
    const url = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const printThermal = (invoice: any) => {
    printThermalReceiptWeb({
      companyName: organization?.name || 'Smart PME Finance',
      companyAddress: organization?.address,
      companyPhone: organization?.phone,
      companyNif: organization?.taxId,
      receiptNumber: invoice.invoiceNumber,
      date: new Date(invoice.issueDate || invoice.createdAt).toLocaleString('fr-FR'),
      customerName: invoice.customer?.name,
      items: (invoice.items || []).map((i: any) => ({
        name: i.description || i.product?.name || 'Article',
        quantity: Number(i.quantity || 1),
        unitPrice: Number(i.unitPrice || 0),
        total: Number(i.total || (i.quantity * i.unitPrice) || 0),
      })),
      subtotal: Number(invoice.subtotal || invoice.total),
      taxAmount: Number(invoice.taxAmount || 0),
      total: Number(invoice.total),
      currency: invoice.currency || 'CDF',
      paymentMethod: invoice.status === 'PAID' ? 'RÉGLÉ' : 'EN COURS',
    }, { width: '80mm' });
  };

  const renderTable = () => {
    if (loading) return <TableSkeleton rows={6} columns={8} />;

    if (loadError && invoices.length === 0) {
      return <ErrorState title="Impossible de charger les factures" message={loadError} onRetry={loadInvoices} />;
    }

    if (invoices.length === 0) {
      return statusFilter ? (
        <EmptyState
          icon={ListChecks}
          title="Aucune facture dans cette catégorie"
          description={`Aucune facture avec le statut « ${statusLabel(statusFilter)} ».`}
          action={<Button onClick={() => setStatusFilter('')}>Afficher toutes les factures</Button>}
        />
      ) : (
        <EmptyState
          icon={Receipt}
          title="Aucune facture pour le moment"
          description="Les factures sont générées automatiquement lors des ventes."
        />
      );
    }

    return (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>N° de facture</th>
              <th>Client</th>
              <th>Émission</th>
              <th>Échéance</th>
              <th className="col-amount">Total TTC</th>
              <th className="col-amount">Réglé</th>
              <th className="col-amount">Solde dû</th>
              <th>Statut</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv: any) => {
              const balance = Number(inv.balance);
              const isOverdue = inv.status === 'OVERDUE' || (balance > 0 && new Date(inv.dueDate) < new Date());
              const status = getStatusMeta(INVOICE_STATUS, inv.status);
              return (
                <tr key={inv.id}>
                  <td className="col-mono">{inv.invoiceNumber}</td>
                  <td>
                    <span className="cell-primary">{inv.customer?.name || 'Client comptoir'}</span>
                    {inv.customer?.phone && <span className="cell-secondary">{inv.customer.phone}</span>}
                  </td>
                  <td className="nowrap">{formatDate(inv.issueDate)}</td>
                  <td className={`nowrap${isOverdue && balance > 0 ? ' text-danger' : ''}`}>{formatDate(inv.dueDate)}</td>
                  <td className="col-amount">{formatCurrency(Number(inv.total), inv.currency)}</td>
                  <td className="col-amount text-success">{formatCurrency(Number(inv.paidAmount), inv.currency)}</td>
                  <td className={`col-amount ${balance > 0 ? 'text-danger' : 'text-success'}`}>
                    {formatCurrency(balance, inv.currency)}
                  </td>
                  <td><StatusBadge tone={status.tone} dot>{status.label}</StatusBadge></td>
                  <td className="col-actions">
                    <div className="invoices-actions">
                      <IconButton icon={<Eye />} size="sm" aria-label={`Voir la facture ${inv.invoiceNumber}`} title="Voir et imprimer" onClick={() => setSelectedInvoice(inv)} />
                      {balance > 0 && canCollect && (
                        <Button size="sm" variant="primary" icon={<CreditCard size={13} />} onClick={() => handleOpenPayment(inv)}>
                          Régler
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const inv = selectedInvoice;
  const legalIds = [
    organization?.taxId ? `NIF : ${organization.taxId}` : null,
    organization?.rccm ? `RCCM : ${organization.rccm}` : null,
    organization?.idNat ? `ID NAT : ${organization.idNat}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="page">
      <PageToolbar
        start={(
          <>
            <div className="segmented" role="group" aria-label="Filtrer par statut">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`segmented-btn${statusFilter === opt.value ? ' active' : ''}`}
                  aria-pressed={statusFilter === opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {refreshing && <Spinner size="sm" label="Actualisation" />}
          </>
        )}
        end={(
          <>
            <Button icon={<FileSpreadsheet size={14} />} onClick={handleExportInvoices}>Exporter vers Excel</Button>
            <IconButton icon={<RefreshCw />} variant="secondary" aria-label="Actualiser la liste" onClick={loadInvoices} />
          </>
        )}
      />

      <div className="table-wrapper">{renderTable()}</div>

      {/* Aperçu et impression */}
      <Modal
        open={Boolean(inv)}
        onClose={() => setSelectedInvoice(null)}
        title={inv ? `Facture ${inv.invoiceNumber}` : ''}
        size="lg"
        className="invoice-modal"
        footer={inv ? (
          <div className="invoice-modal-footer">
            <Button onClick={() => setSelectedInvoice(null)}>Fermer</Button>
            <div className="cluster-sm">
              <Button icon={<Share2 size={14} />} onClick={() => handleShareWhatsApp(inv)} title="Partager le résumé sur WhatsApp">
                WhatsApp
              </Button>
              <Button icon={<Printer size={14} />} onClick={() => printThermal(inv)} title="Imprimer un ticket thermique 80 mm">
                Ticket 80 mm
              </Button>
              <Button variant="primary" icon={<Printer size={14} />} onClick={() => window.print()}>
                Imprimer (A4)
              </Button>
            </div>
          </div>
        ) : null}
      >
        {inv && (
          <div className="invoice-document">
            <header className="invoice-doc-head">
              <div>
                <div className="invoice-doc-company">{organization?.name}</div>
                <div className="invoice-doc-muted">
                  {organization?.address && <>{organization.address}<br /></>}
                  {[organization?.city, organization?.country].filter(Boolean).join(', ')}
                  {organization?.phone && <><br />Tél. : {organization.phone}</>}
                </div>
              </div>
              <div className="invoice-doc-meta">
                <div className="invoice-doc-kind">Facture</div>
                <div className="invoice-doc-number">N° {inv.invoiceNumber}</div>
                <div className="invoice-doc-muted">
                  Émise le {formatDate(inv.issueDate)}<br />
                  Échéance : {formatDate(inv.dueDate)}
                </div>
              </div>
            </header>

            <section className="invoice-doc-client">
              <div className="invoice-doc-label">Facturé à</div>
              <div className="invoice-doc-client-name">{inv.customer?.name || 'Client comptoir'}</div>
              {inv.customer?.companyName && <div>{inv.customer.companyName}</div>}
              {inv.customer?.address && <div className="invoice-doc-muted">{inv.customer.address}</div>}
              {inv.customer?.phone && <div className="invoice-doc-muted">Tél. : {inv.customer.phone}</div>}
            </section>

            <table className="invoice-doc-lines">
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th className="text-center">Qté</th>
                  <th className="text-right">P.U. HT</th>
                  <th className="text-right">TVA</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {inv.items?.map((item: any, i: number) => (
                  <tr key={i}>
                    <td>{item.product?.name || item.description}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{formatCurrency(Number(item.unitPrice), inv.currency)}</td>
                    <td className="text-right">{item.taxRatePercent} %</td>
                    <td className="text-right invoice-doc-strong">{formatCurrency(Number(item.total), inv.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="invoice-doc-totals">
              <div className="invoice-doc-total-row">
                <span>Sous-total HT</span>
                <span>{formatCurrency(Number(inv.subtotal), inv.currency)}</span>
              </div>
              {Number(inv.taxAmount) > 0 && (
                <div className="invoice-doc-total-row">
                  <span>TVA</span>
                  <span>{formatCurrency(Number(inv.taxAmount), inv.currency)}</span>
                </div>
              )}
              <div className="invoice-doc-total-row is-grand">
                <span>Total TTC</span>
                <span>{formatCurrency(Number(inv.total), inv.currency)}</span>
              </div>
              <div className="invoice-doc-total-row text-success">
                <span>Montant réglé</span>
                <span>{formatCurrency(Number(inv.paidAmount), inv.currency)}</span>
              </div>
              <div className={`invoice-doc-total-row ${Number(inv.balance) > 0 ? 'text-danger' : 'text-success'}`}>
                <span>Solde restant dû</span>
                <span>{formatCurrency(Number(inv.balance), inv.currency)}</span>
              </div>
            </div>

            <footer className="invoice-doc-foot">
              <div className="invoice-doc-legal">
                {legalIds && <div className="invoice-doc-strong">{legalIds}</div>}
                {organization?.settings?.invoiceFooterNote && <div>{organization.settings.invoiceFooterNote}</div>}
                {organization?.settings?.bankDetails && <div>Coordonnées bancaires : {organization.settings.bankDetails}</div>}
              </div>
              <QRCodeDisplay
                value={`OPENPME:FAC=${inv.invoiceNumber};NIF=${organization?.taxId || ''};TOTAL=${inv.total}${inv.currency};DATE=${inv.createdAt}`}
                size={92}
                label="Contrôle de la facture"
              />
            </footer>
          </div>
        )}
      </Modal>

      {/* Règlement */}
      <Modal
        open={Boolean(paymentInvoice)}
        onClose={() => setPaymentInvoice(null)}
        title="Enregistrer un règlement"
        icon={CreditCard}
        busy={submittingPayment}
        onSubmit={handleRecordPayment}
        footer={(
          <>
            <Button onClick={() => setPaymentInvoice(null)} disabled={submittingPayment}>Annuler</Button>
            <Button type="submit" variant="primary" icon={<CheckCircle size={14} />} loading={submittingPayment} loadingText="Enregistrement…">
              Valider le règlement
            </Button>
          </>
        )}
      >
        {paymentInvoice && (
          <>
            <dl className="invoices-recap">
              <div><dt>Facture</dt><dd className="font-mono">{paymentInvoice.invoiceNumber}</dd></div>
              <div><dt>Client</dt><dd>{paymentInvoice.customer?.name || 'Client comptoir'}</dd></div>
              <div><dt>Solde restant</dt><dd className="text-danger">{formatCurrency(Number(paymentInvoice.balance), paymentInvoice.currency)}</dd></div>
            </dl>

            {paymentError && <Alert tone="danger">{paymentError}</Alert>}

            <Field label="Montant du règlement" required htmlFor="pay-amount">
              <div className="input-addon">
                <input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(paymentInvoice.balance)}
                  required
                  className="input-field"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                <span className="input-addon-text">{paymentInvoice.currency}</span>
              </div>
            </Field>

            <Field label="Mode de paiement" required htmlFor="pay-method">
              <select
                id="pay-method"
                className="select-field"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement bancaire</option>
                <option value="MOBILE_MONEY_MPESA">Vodacom M-Pesa</option>
                <option value="MOBILE_MONEY_AIRTEL">Airtel Money</option>
                <option value="MOBILE_MONEY_ORANGE">Orange Money</option>
                <option value="CHECK">Chèque</option>
              </select>
            </Field>

            <Field label="Référence ou n° de bordereau" htmlFor="pay-ref" hint="Facultatif pour les espèces." className="mb-0">
              <input
                id="pay-ref"
                type="text"
                className="input-field"
                placeholder="Ex. VIR-RAWBANK-12093"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
            </Field>
          </>
        )}
      </Modal>
    </div>
  );
};
