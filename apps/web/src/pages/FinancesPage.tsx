import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { formatCurrency, Currency, subtractMoney, sumMoney } from '@smart-pme/shared';
import {
  ArrowDownCircle,
  Plus,
  Lock,
  Unlock,
  Building,
  Smartphone,
  RefreshCw,
  CheckCircle,
  FileSpreadsheet,
  Wallet,
  Calculator,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isNetworkFailure, offlineSync } from '../services/offlineSync';
import { exportToCsv } from '../utils/exportCsv';
import { useShell } from '../lib/shell';
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  Modal,
  SectionCard,
  StatusBadge,
} from '../components/ui';
import { formatDate, formatDateTime } from '../lib/format';
import { PAYMENT_METHOD_LABELS } from '../lib/status';
import { useRealtime } from '../lib/realtime';
import { can } from '../role-permissions';
import './FinancesPage.css';


const EXPENSE_CATEGORIES = [
  'Frais de fonctionnement',
  'Salaires & RH',
  'Loyer & charges immobilières',
  'Transport & déplacements',
  'Fournitures & consommables',
  'Télécommunications',
  'Eau & électricité',
  'Marketing & publicité',
  'Achats de marchandises',
  'Frais bancaires',
  'Taxes & impôts',
  'Maintenance & réparations',
  'Autres dépenses',
];

export const FinancesPage: React.FC = () => {
  const { organization, user } = useAuth();
  const { success, error: toastError } = useToast();
  const isManager = user?.role === 'ORG_OWNER' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';
  // Le caissier ne gère que sa caisse ; dépenses et comptes relèvent de la comptabilité.
  const canViewFinances = can(user?.role, 'viewFinances');
  const canManageExpenses = can(user?.role, 'manageExpenses');
  const canOperateCash = can(user?.role, 'operateCash');

  const [expenses, setExpenses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cashRegisters, setCashRegisters] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any | null>(null);
  const [cashSessions, setCashSessions] = useState<Partial<Record<Currency, any>>>({});
  const [cashCurrency, setCashCurrency] = useState<Currency>(Currency.CDF);
  const [expenseCurrency, setExpenseCurrency] = useState<Currency>(Currency.CDF);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal dépense
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState('Frais de fonctionnement');
  const [expAmount, setExpAmount] = useState('');
  const [expBeneficiary, setExpBeneficiary] = useState('');
  const [expMethod, setExpMethod] = useState('CASH');
  const [expRef, setExpRef] = useState('');
  const [expAccountId, setExpAccountId] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [expError, setExpError] = useState<string | null>(null);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Modal ouverture caisse
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openBalance, setOpenBalance] = useState('');
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [openError, setOpenError] = useState<string | null>(null);
  const [submittingOpen, setSubmittingOpen] = useState(false);

  // Modal clôture caisse & Billetage à l'aveugle
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [countedBalance, setCountedBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closeError, setCloseError] = useState<string | null>(null);
  const [submittingClose, setSubmittingClose] = useState(false);

  // Billetage CDF
  const [useBilletage, setUseBilletage] = useState(false);
  const [b20k, setB20k] = useState<string>('');
  const [b10k, setB10k] = useState<string>('');
  const [b5k, setB5k] = useState<string>('');
  const [b1k, setB1k] = useState<string>('');
  const [b500, setB500] = useState<string>('');
  const [bPieces, setBPieces] = useState<string>('');

  /** `silent` : actualisation en arrière-plan, sans écran de chargement. */
  const loadFinances = async (silent?: unknown) => {
    try {
      if (silent !== true) setLoading(true);
      setLoadError(null);
      const [exps, accs, regs, session, cdfSession, usdSession] = await Promise.all([
        canViewFinances ? ApiClient.getExpenses() : Promise.resolve([]),
        canViewFinances ? ApiClient.getFinancialAccounts() : Promise.resolve([]),
        ApiClient.getCashRegisters(),
        ApiClient.getCurrentCashSession(cashCurrency),
        ApiClient.getCurrentCashSession(Currency.CDF),
        ApiClient.getCurrentCashSession(Currency.USD),
      ]);
      setExpenses(exps);
      setAccounts(accs);
      setCashRegisters(regs);
      setCurrentSession(session);
      setCashSessions({
        [Currency.CDF]: cdfSession,
        [Currency.USD]: usdSession,
      });
      if (regs.length > 0 && !selectedRegisterId) setSelectedRegisterId(regs[0].id);
      if (accs.length > 0 && !expAccountId) setExpAccountId(accs[0].id);
    } catch (err: any) {
      setLoadError(err.message || 'Impossible de charger les données financières.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinances();
  }, [cashCurrency]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError(null);
    const amt = parseFloat(expAmount);
    if (!amt || amt <= 0) {
      setExpError('Le montant doit être supérieur à 0.');
      return;
    }
    if (!expBeneficiary.trim()) {
      setExpError('Le bénéficiaire est obligatoire.');
      return;
    }
    if (expMethod === 'CASH' && !cashSessions[expenseCurrency]?.id) {
      setExpError(`Ouvrez d’abord la session de caisse ${expenseCurrency} dans Finances.`);
      return;
    }
    setSubmittingExpense(true);
    const expensePayload = {
      idempotencyKey: crypto.randomUUID(),
      category: expCategory,
      amount: expAmount,
      beneficiary: expBeneficiary.trim(),
      method: expMethod,
      reference: expRef.trim() || undefined,
      notes: expNotes.trim() || undefined,
      currency: expenseCurrency,
      cashSessionId: expMethod === 'CASH' ? cashSessions[expenseCurrency]?.id : undefined,
      financialAccountId: expMethod === 'CASH' ? undefined : expAccountId || undefined,
    };
    try {
      await ApiClient.createExpense(expensePayload);
      setShowExpenseModal(false);
      setExpAmount('');
      setExpBeneficiary('');
      setExpRef('');
      setExpNotes('');
      success(`Dépense de ${formatCurrency(amt, expenseCurrency)} enregistrée.`);
      loadFinances();
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        if (expMethod !== 'CASH') {
          setExpError('Une dépense hors espèces doit être confirmée par le service de paiement. Rétablissez la connexion avant de réessayer.');
        } else {
          try {
            await offlineSync.enqueueExpense(expensePayload);
            setShowExpenseModal(false);
            setExpAmount('');
            setExpBeneficiary('');
            setExpRef('');
            setExpNotes('');
            success(`Dépense de ${formatCurrency(amt, expenseCurrency)} enregistrée hors-ligne. Elle sera synchronisée dès le retour du réseau.`);
          } catch (storageError) {
            setExpError(storageError instanceof Error
              ? `La dépense n’a pas été enregistrée. ${storageError.message}`
              : 'La dépense n’a pas été enregistrée : stockage hors-ligne indisponible.');
          }
        }
      } else {
        setExpError(err.message || 'Erreur lors de l\'enregistrement de la dépense.');
      }
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpenError(null);
    const bal = Number(openBalance);
    if (!Number.isFinite(bal) || bal < 0) {
      setOpenError('Le fond d\'ouverture doit être un nombre valide (0 ou plus).');
      return;
    }
    if (!selectedRegisterId) {
      setOpenError('Veuillez sélectionner une caisse.');
      return;
    }
    setSubmittingOpen(true);
    try {
      await ApiClient.openCashSession({
        cashRegisterId: selectedRegisterId,
        openingBalance: openBalance,
        currency: cashCurrency,
        notes: openNotes.trim() || undefined,
      });
      setShowOpenModal(false);
      setOpenBalance('');
      setOpenNotes('');
      success('Session de caisse ouverte avec succès.');
      loadFinances();
    } catch (err: any) {
      setOpenError(err.message || 'Erreur lors de l\'ouverture de la caisse.');
    } finally {
      setSubmittingOpen(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    setCloseError(null);
    const counted = Number(countedBalance);
    if (!Number.isFinite(counted) || counted < 0) {
      setCloseError('Veuillez saisir un solde compté valide.');
      return;
    }
    setSubmittingClose(true);
    try {
      await ApiClient.closeCashSession(currentSession.id, countedBalance, closeNotes.trim() || undefined);
      setShowCloseModal(false);
      setCountedBalance('');
      setCloseNotes('');
      success('Caisse clôturée et enregistrée avec succès.');
      loadFinances();
    } catch (err: any) {
      setCloseError(err.message || 'Erreur lors de la clôture de caisse.');
    } finally {
      setSubmittingClose(false);
    }
  };

  // Calculs session
  const totalSessionCash = sumMoney((currentSession?.payments || []).map((payment: any) => String(payment.amount)));
  const cashMovementsIn = sumMoney((currentSession?.movements || [])
    .filter((movement: any) => movement.type === 'IN')
    .map((movement: any) => String(movement.amount)));
  const cashMovementsOut = sumMoney((currentSession?.movements || [])
    .filter((movement: any) => movement.type === 'OUT')
    .map((movement: any) => String(movement.amount)));
  const theoreticalTotal = subtractMoney(sumMoney([
    String(currentSession?.openingBalance || '0'),
    String(totalSessionCash),
    String(cashMovementsIn),
  ]), String(cashMovementsOut));
  const diff = subtractMoney(countedBalance || '0', String(theoreticalTotal));

  const { refreshIndicators } = useShell();
  useRealtime(['finances', 'payments', 'sales'], () => {
    void loadFinances(true);
  });
  // L'en-tête (« Caisse ouverte / fermée ») suit l'ouverture et la clôture de session.
  useEffect(() => {
    refreshIndicators();
  }, [currentSession?.id, refreshIndicators]);
  const sessionCurrency = currentSession?.currency || cashCurrency;
  const diffTone = Math.abs(diff) < 1 ? 'success' : diff < 0 ? 'danger' : 'warning';

  const billetageItems = [
    { label: '20 000 CDF', val: b20k, set: setB20k, factor: 20000 },
    { label: '10 000 CDF', val: b10k, set: setB10k, factor: 10000 },
    { label: '5 000 CDF', val: b5k, set: setB5k, factor: 5000 },
    { label: '1 000 CDF', val: b1k, set: setB1k, factor: 1000 },
    { label: '500 CDF', val: b500, set: setB500, factor: 500 },
    { label: 'Monnaie et pièces (montant)', val: bPieces, set: setBPieces, factor: 1 },
  ];

  const updateBilletage = (factor: number, value: string) => {
    const read = (f: number, current: string) => (factor === f ? value : current);
    const total = (parseInt(read(20000, b20k), 10) || 0) * 20000
      + (parseInt(read(10000, b10k), 10) || 0) * 10000
      + (parseInt(read(5000, b5k), 10) || 0) * 5000
      + (parseInt(read(1000, b1k), 10) || 0) * 1000
      + (parseInt(read(500, b500), 10) || 0) * 500
      + (parseFloat(read(1, bPieces)) || 0);
    setCountedBalance(String(total));
  };

  const openExpenseModal = () => {
    setExpError(null);
    setExpAmount('');
    setExpBeneficiary('');
    setExpRef('');
    setExpNotes('');
    setShowExpenseModal(true);
  };

  const exportExpenses = () => {
    if (!expenses.length) {
      toastError('Aucune dépense à exporter.');
      return;
    }
    const rows = expenses.map((exp) => ({
      'Date': new Date(exp.createdAt).toLocaleDateString('fr-FR'),
      'Catégorie': exp.category,
      'Bénéficiaire': exp.beneficiary,
      'Mode Paiement': PAYMENT_METHOD_LABELS[exp.method] || exp.method,
      'Référence': exp.reference || '—',
      'Montant': exp.amount,
      'Devise': exp.currency || 'CDF',
      'Observations': exp.notes || '—',
    }));
    exportToCsv('Depenses_OpenPME', rows);
    success('Journal des dépenses exporté.');
  };

  if (loading) {
    return <LoadingState label="Chargement des données financières…" />;
  }

  if (loadError) {
    return (
      <div className="card">
        <ErrorState title="Impossible de charger les finances" message={loadError} onRetry={loadFinances} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className={`finances-top${canViewFinances ? '' : ' is-single'}`}>
        {/* Session de caisse */}
        <SectionCard
          title={currentSession ? `Caisse ${cashCurrency} ouverte` : `Caisse ${cashCurrency} fermée`}
          description={currentSession
            ? `Depuis le ${formatDateTime(currentSession.openedAt)} · ${[currentSession.user?.firstName, currentSession.user?.lastName].filter(Boolean).join(' ')}`
            : 'Ouvrez une session pour enregistrer les encaissements en espèces.'}
          icon={currentSession ? Unlock : Lock}
          iconTone={currentSession ? 'success' : 'warning'}
          actions={(
            <>
              <div className="segmented" role="group" aria-label="Devise de la caisse">
                {[Currency.CDF, Currency.USD].map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    className={`segmented-btn${cashCurrency === currency ? ' active' : ''}`}
                    aria-pressed={cashCurrency === currency}
                    onClick={() => {
                      setCashCurrency(currency);
                      setUseBilletage(false);
                    }}
                  >
                    {currency}
                  </button>
                ))}
              </div>
              {canOperateCash && (currentSession ? (
                <Button
                  size="sm"
                  variant="danger-outline"
                  icon={<Lock size={13} />}
                  onClick={() => {
                    // Clôture à l'aveugle : le caissier saisit ce qu'il a réellement compté.
                    setCountedBalance(isManager ? String(theoreticalTotal) : '');
                    setCloseNotes('');
                    setCloseError(null);
                    setShowCloseModal(true);
                  }}
                >
                  Clôturer
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Unlock size={13} />}
                  onClick={() => { setOpenError(null); setShowOpenModal(true); }}
                  disabled={cashRegisters.length === 0}
                  title={cashRegisters.length === 0 ? 'Aucune caisse configurée' : undefined}
                >
                  Ouvrir
                </Button>
              ))}
            </>
          )}
        >
          {currentSession ? (
            isManager ? (
              <dl className="finances-lines">
                <div>
                  <dt>Fond d’ouverture</dt>
                  <dd>{formatCurrency(Number(currentSession.openingBalance), sessionCurrency)}</dd>
                </div>
                <div>
                  <dt>Espèces encaissées</dt>
                  <dd className="text-success">+{formatCurrency(totalSessionCash, sessionCurrency)}</dd>
                </div>
                {(cashMovementsIn > 0 || cashMovementsOut > 0) && (
                  <div>
                    <dt>Mouvements de caisse</dt>
                    <dd>{formatCurrency(subtractMoney(cashMovementsIn, cashMovementsOut), sessionCurrency)}</dd>
                  </div>
                )}
                <div className="is-total">
                  <dt>Total théorique</dt>
                  <dd>{formatCurrency(theoreticalTotal, sessionCurrency)}</dd>
                </div>
              </dl>
            ) : (
              <p className="finances-note">
                Session en cours. Le total attendu n’est visible que par le gérant : à la clôture, comptez les espèces du tiroir et saisissez le montant réel.
              </p>
            )
          ) : (
            <EmptyState
              compact
              icon={Wallet}
              title="Aucune caisse ouverte"
              description={cashRegisters.length === 0
                ? 'Aucune caisse n’est configurée pour votre entreprise.'
                : 'Les ventes en espèces nécessitent une session ouverte.'}
            />
          )}
        </SectionCard>

        {/* Comptes financiers */}
        {canViewFinances && (
        <SectionCard
          title="Comptes financiers"
          description="Banques et portefeuilles Mobile Money"
          icon={Building}
          flush
          actions={<IconButton icon={<RefreshCw />} size="sm" variant="secondary" aria-label="Actualiser" onClick={loadFinances} />}
        >
          {accounts.length === 0 ? (
            <EmptyState compact icon={Building} title="Aucun compte enregistré" description="Les comptes bancaires et Mobile Money apparaîtront ici." />
          ) : (
            <ul className="finances-accounts">
              {accounts.map((acc: any) => (
                <li key={acc.id} className="finances-account">
                  <span className={`icon-tile icon-tile-sm icon-tile-${acc.type === 'BANK' ? 'primary' : 'success'}`} aria-hidden="true">
                    {acc.type === 'BANK' ? <Building size={15} /> : <Smartphone size={15} />}
                  </span>
                  <div className="flex-1">
                    <div className="cell-primary">{acc.name}</div>
                    <div className="cell-secondary">{acc.type === 'BANK' ? 'Compte bancaire' : 'Mobile Money'}</div>
                  </div>
                  <div className={`finances-account-balance${Number(acc.balance) < 0 ? ' text-danger' : ''}`}>
                    {formatCurrency(Number(acc.balance), acc.currency || Currency.CDF)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        )}
      </div>

      {/* Journal des dépenses */}
      {canViewFinances && (
      <SectionCard
        title="Journal des dépenses"
        icon={ArrowDownCircle}
        iconTone="danger"
        flush
        actions={(
          <>
            <Button size="sm" icon={<FileSpreadsheet size={13} />} onClick={exportExpenses}>Exporter vers Excel</Button>
            <IconButton icon={<RefreshCw />} size="sm" variant="secondary" aria-label="Actualiser" onClick={loadFinances} />
            {canManageExpenses && <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={openExpenseModal}>Nouvelle dépense</Button>}
          </>
        )}
      >
        {expenses.length === 0 ? (
          <EmptyState
            icon={ArrowDownCircle}
            title="Aucune dépense enregistrée"
            description="Enregistrez vos dépenses pour suivre la trésorerie et la marge nette."
            action={canManageExpenses ? <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={openExpenseModal}>Enregistrer une dépense</Button> : undefined}
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Catégorie</th>
                  <th>Bénéficiaire</th>
                  <th>Mode</th>
                  <th>Référence</th>
                  <th className="col-amount">Montant</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp: any) => (
                  <tr key={exp.id}>
                    <td className="nowrap">{formatDate(exp.createdAt)}</td>
                    <td><StatusBadge tone="neutral">{exp.category}</StatusBadge></td>
                    <td className="cell-primary">{exp.beneficiary}</td>
                    <td className="nowrap">{PAYMENT_METHOD_LABELS[exp.method] || exp.method}</td>
                    <td className="col-mono">{exp.reference || <span className="text-tertiary">—</span>}</td>
                    <td className="col-amount text-danger">− {formatCurrency(Number(exp.amount), exp.currency || 'CDF')}</td>
                    <td>
                      {exp.notes
                        ? <span className="truncate finances-note-cell" title={exp.notes}>{exp.notes}</span>
                        : <span className="text-tertiary">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      )}

      {/* Nouvelle dépense */}
      <Modal
        open={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Nouvelle dépense"
        description="Les dépenses en espèces sont imputées sur la session de caisse ouverte de la même devise."
        icon={ArrowDownCircle}
        tone="danger"
        busy={submittingExpense}
        onSubmit={handleCreateExpense}
        footer={(
          <>
            <Button onClick={() => setShowExpenseModal(false)} disabled={submittingExpense}>Annuler</Button>
            <Button type="submit" variant="primary" loading={submittingExpense} loadingText="Enregistrement…">Enregistrer la dépense</Button>
          </>
        )}
      >
        {expError && <Alert tone="danger">{expError}</Alert>}

        <Field label="Catégorie" required htmlFor="exp-cat">
          <select id="exp-cat" className="select-field" value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <div className="form-grid-3">
          <Field label="Devise" htmlFor="exp-currency">
            <select id="exp-currency" className="select-field" value={expenseCurrency}
              onChange={(e) => {
                const currency = e.target.value === Currency.USD ? Currency.USD : Currency.CDF;
                setExpenseCurrency(currency);
                setExpAccountId(accounts.find((account: any) => account.currency === currency)?.id || '');
              }}>
              <option value={Currency.CDF}>CDF</option>
              <option value={Currency.USD}>USD</option>
            </select>
          </Field>
          <Field label="Montant" required htmlFor="exp-amount">
            <input id="exp-amount" type="number" min="0.01" step={expenseCurrency === Currency.CDF ? '1' : '0.01'} required className="input-field"
              placeholder="0" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
          </Field>
          <Field label="Mode de paiement" htmlFor="exp-method">
            <select id="exp-method" className="select-field" value={expMethod} onChange={(e) => setExpMethod(e.target.value)}>
              <option value="CASH">Espèces</option>
              <option value="BANK_TRANSFER">Virement bancaire</option>
              <option value="MOBILE_MONEY_MPESA">M-Pesa</option>
              <option value="MOBILE_MONEY_AIRTEL">Airtel Money</option>
              <option value="CHECK">Chèque</option>
            </select>
          </Field>
        </div>

        {expMethod === 'CASH' && !cashSessions[expenseCurrency]?.id && (
          <Alert tone="warning">Aucune session de caisse {expenseCurrency} n’est ouverte : ouvrez-la avant d’enregistrer une dépense en espèces.</Alert>
        )}

        <Field label="Bénéficiaire" required htmlFor="exp-beneficiary">
          <input id="exp-beneficiary" type="text" required className="input-field"
            placeholder="Nom du fournisseur ou du bénéficiaire" value={expBeneficiary}
            onChange={(e) => setExpBeneficiary(e.target.value)} />
        </Field>

        <div className="form-grid">
          <Field label="Référence ou pièce justificative" htmlFor="exp-ref">
            <input id="exp-ref" type="text" className="input-field"
              placeholder="N° de reçu, de facture…" value={expRef}
              onChange={(e) => setExpRef(e.target.value)} />
          </Field>
          {expMethod !== 'CASH' && (
            <Field label="Compte débité" htmlFor="exp-account">
              <select id="exp-account" className="select-field" value={expAccountId} onChange={(e) => setExpAccountId(e.target.value)}>
                <option value="">Sélectionner un compte</option>
                {accounts.filter((account: any) => account.currency === expenseCurrency)
                  .map((account: any) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </Field>
          )}
        </div>

        <Field label="Notes internes" htmlFor="exp-notes" className="mb-0">
          <input id="exp-notes" type="text" className="input-field"
            placeholder="Commentaire facultatif" value={expNotes}
            onChange={(e) => setExpNotes(e.target.value)} />
        </Field>
      </Modal>

      {/* Ouverture de caisse */}
      <Modal
        open={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        title={`Ouvrir la caisse ${cashCurrency}`}
        description="Saisissez le montant réellement compté en espèces au moment de l’ouverture."
        icon={Unlock}
        tone="success"
        busy={submittingOpen}
        onSubmit={handleOpenSession}
        footer={(
          <>
            <Button onClick={() => setShowOpenModal(false)} disabled={submittingOpen}>Annuler</Button>
            <Button type="submit" variant="success" icon={<Unlock size={14} />} loading={submittingOpen} loadingText="Ouverture…">Ouvrir la caisse</Button>
          </>
        )}
      >
        {openError && <Alert tone="danger">{openError}</Alert>}

        <Field label="Caisse" required htmlFor="open-register">
          <select id="open-register" className="select-field" value={selectedRegisterId}
            onChange={(e) => setSelectedRegisterId(e.target.value)}>
            {cashRegisters.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Fond de caisse initial" required htmlFor="open-balance">
          <div className="input-addon">
            <input id="open-balance" type="number" min="0" step={cashCurrency === Currency.CDF ? '1' : '0.01'} required className="input-field"
              placeholder="Montant compté" value={openBalance}
              onChange={(e) => setOpenBalance(e.target.value)} />
            <span className="input-addon-text">{cashCurrency}</span>
          </div>
        </Field>
        <Field label="Notes d’ouverture" htmlFor="open-notes" className="mb-0">
          <input id="open-notes" type="text" className="input-field"
            placeholder="Observation facultative" value={openNotes}
            onChange={(e) => setOpenNotes(e.target.value)} />
        </Field>
      </Modal>

      {/* Clôture de caisse */}
      <Modal
        open={Boolean(showCloseModal && currentSession)}
        onClose={() => setShowCloseModal(false)}
        title={`Clôturer la caisse ${sessionCurrency}`}
        description={isManager
          ? 'Vérifiez le montant compté : l’écart avec le total théorique est enregistré.'
          : 'Clôture à l’aveugle : comptez physiquement les espèces du tiroir et saisissez le montant total.'}
        icon={Lock}
        tone="danger"
        busy={submittingClose}
        onSubmit={handleCloseSession}
        footer={(
          <>
            <Button onClick={() => setShowCloseModal(false)} disabled={submittingClose}>Annuler</Button>
            <Button type="submit" variant="danger" icon={<Lock size={14} />} loading={submittingClose} loadingText="Clôture en cours…">Valider la clôture</Button>
          </>
        )}
      >
        {closeError && <Alert tone="danger">{closeError}</Alert>}

        {isManager && currentSession && (
          <dl className="finances-lines finances-lines-boxed">
            <div>
              <dt>Fond d’ouverture</dt>
              <dd>{formatCurrency(Number(currentSession.openingBalance), sessionCurrency)}</dd>
            </div>
            <div>
              <dt>Encaissements en espèces</dt>
              <dd className="text-success">+{formatCurrency(totalSessionCash, sessionCurrency)}</dd>
            </div>
            <div className="is-total">
              <dt>Total théorique attendu</dt>
              <dd>{formatCurrency(theoreticalTotal, sessionCurrency)}</dd>
            </div>
          </dl>
        )}

        <div className="finances-count-head">
          <label className="form-label mb-0" htmlFor="close-balance">
            Montant réel compté ({sessionCurrency}) <span className="required">*</span>
          </label>
          {cashCurrency === Currency.CDF && (
            <Button size="xs" variant="ghost" icon={<Calculator size={13} />} onClick={() => setUseBilletage(!useBilletage)}>
              {useBilletage ? 'Saisie directe' : 'Compter par coupures'}
            </Button>
          )}
        </div>

        {cashCurrency === Currency.CDF && useBilletage ? (
          <div className="finances-billetage">
            <div className="finances-billetage-grid">
              {billetageItems.map((item) => (
                <Field key={item.label} label={item.label} htmlFor={`bill-${item.factor}`} className="mb-0">
                  <input
                    id={`bill-${item.factor}`}
                    type="number"
                    min="0"
                    placeholder="0"
                    className="input-field input-sm"
                    value={item.val}
                    onChange={(e) => {
                      item.set(e.target.value);
                      updateBilletage(item.factor, e.target.value);
                    }}
                  />
                </Field>
              ))}
            </div>
            <div className="finances-billetage-total">
              Total compté : <strong>{formatCurrency(parseFloat(countedBalance) || 0, sessionCurrency)}</strong>
            </div>
          </div>
        ) : (
          <div className="form-group">
            <input id="close-balance" type="number" min="0" step={sessionCurrency === Currency.CDF ? '1' : '0.01'} required className="input-field"
              placeholder={`Montant compté en ${sessionCurrency}`}
              value={countedBalance} onChange={(e) => setCountedBalance(e.target.value)} />
          </div>
        )}

        {isManager && countedBalance !== '' && (
          <div className={`finances-diff finances-diff-${diffTone}`}>
            <span>Écart de caisse</span>
            <strong>
              {diff >= 0 ? '+' : ''}{formatCurrency(diff, sessionCurrency)}
              {Math.abs(diff) < 1 && ' · caisse équilibrée'}
              {diff < -1 && ' · manquant'}
              {diff > 1 && ' · excédent'}
            </strong>
          </div>
        )}

        <Field
          label="Observations de clôture"
          required={isManager && diff < -1}
          hint={isManager && diff < -1 ? 'Obligatoire en cas de manquant.' : 'Raison d’un éventuel écart ou remarque.'}
          htmlFor="close-notes"
          className="mb-0"
        >
          <input id="close-notes" type="text" className="input-field"
            required={isManager && diff < -1}
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
};
