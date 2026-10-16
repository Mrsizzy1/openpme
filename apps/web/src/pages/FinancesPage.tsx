import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { formatCurrency, Currency, roundMoney } from '@smart-pme/shared';
import {
  Wallet,
  ArrowDownCircle,
  Plus,
  Lock,
  Unlock,
  AlertTriangle,
  Building,
  Smartphone,
  X,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const FinancesPage: React.FC = () => {
  const { organization } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cashRegisters, setCashRegisters] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // New Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState('Frais de Fonctionnement');
  const [expAmount, setExpAmount] = useState('');
  const [expBeneficiary, setExpBeneficiary] = useState('');
  const [expMethod, setExpMethod] = useState('CASH');
  const [expRef, setExpRef] = useState('');
  const [expAccountId, setExpAccountId] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Cash Session Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openBalance, setOpenBalance] = useState('200000');
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [submittingOpen, setSubmittingOpen] = useState(false);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [countedBalance, setCountedBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [submittingClose, setSubmittingClose] = useState(false);

  const loadFinances = async () => {
    try {
      setLoading(true);
      const [exps, accs, regs, session] = await Promise.all([
        ApiClient.getExpenses(),
        ApiClient.getFinancialAccounts(),
        ApiClient.getCashRegisters(),
        ApiClient.getCurrentCashSession(),
      ]);
      setExpenses(exps);
      setAccounts(accs);
      setCashRegisters(regs);
      setCurrentSession(session);
      if (regs.length > 0) setSelectedRegisterId(regs[0].id);
      if (accs.length > 0) setExpAccountId(accs[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinances();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingExpense(true);
    try {
      await ApiClient.createExpense({
        category: expCategory,
        amount: parseFloat(expAmount),
        beneficiary: expBeneficiary,
        method: expMethod,
        reference: expRef,
        financialAccountId: expAccountId || undefined,
        notes: expNotes,
      });
      setShowExpenseModal(false);
      setExpAmount('');
      setExpBeneficiary('');
      setExpRef('');
      loadFinances();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’enregistrement de la dépense');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingOpen(true);
    try {
      await ApiClient.openCashSession({
        cashRegisterId: selectedRegisterId,
        openingBalance: parseFloat(openBalance),
        notes: openNotes,
      });
      setShowOpenModal(false);
      loadFinances();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’ouverture de caisse');
    } finally {
      setSubmittingOpen(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    setSubmittingClose(true);
    try {
      await ApiClient.closeCashSession(
        currentSession.id,
        parseFloat(countedBalance),
        closeNotes
      );
      setShowCloseModal(false);
      loadFinances();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la clôture de caisse');
    } finally {
      setSubmittingClose(false);
    }
  };

  // Session calculations
  const totalSessionCashPayments = currentSession?.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
  const theoreticalSessionTotal = roundMoney((Number(currentSession?.openingBalance) || 0) + totalSessionCashPayments);
  const counted = parseFloat(countedBalance) || 0;
  const diff = roundMoney(counted - theoreticalSessionTotal);

  return (
    <div style={{ padding: '2rem' }}>
      {/* Financial Accounts & Cash Registers Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Cash Register Session Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                padding: '8px',
                borderRadius: '10px',
                background: currentSession ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: currentSession ? '#34D399' : '#FBBF24',
              }}>
                {currentSession ? <Unlock size={20} /> : <Lock size={20} />}
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  {currentSession ? 'Session de Caisse Active' : 'Caisse Actuellement Fermée'}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {currentSession ? `Ouverte le ${new Date(currentSession.openedAt).toLocaleDateString('fr-FR')} par ${currentSession.user?.firstName || 'Caissier'}` : 'Aucune caisse ouverte'}
                </div>
              </div>
            </div>

            {currentSession ? (
              <button
                onClick={() => {
                  setCountedBalance(theoreticalSessionTotal.toString());
                  setShowCloseModal(true);
                }}
                className="btn btn-danger btn-sm"
              >
                <Lock size={15} />
                <span>Clôturer la Caisse</span>
              </button>
            ) : (
              <button
                onClick={() => setShowOpenModal(true)}
                className="btn btn-primary btn-sm"
              >
                <Unlock size={15} />
                <span>Ouvrir une Caisse</span>
              </button>
            )}
          </div>

          {currentSession && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fond Initial :</div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                  {formatCurrency(Number(currentSession.openingBalance), currentSession.currency)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Espèces Encaissées :</div>
                <div style={{ fontWeight: 700, color: '#34D399', fontSize: '1rem' }}>
                  +{formatCurrency(totalSessionCashPayments, currentSession.currency)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Solde Théorique :</div>
                <div style={{ fontWeight: 800, color: 'var(--primary-light)', fontSize: '1.05rem' }}>
                  {formatCurrency(theoreticalSessionTotal, currentSession.currency)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Financial Accounts (Banks + M-Pesa) */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
            Comptes Bancaires & Mobile Money
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {accounts.map((acc) => (
              <div
                key={acc.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {acc.type === 'MOBILE_MONEY' ? (
                    <Smartphone size={20} color="#F59E0B" />
                  ) : (
                    <Building size={20} color="#3B82F6" />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{acc.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>
                      N° {acc.accountNumber || '-'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
                    {formatCurrency(Number(acc.balance), acc.currency)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>Actif</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses Section */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
              Journal des Dépenses & Décaissements
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Suivi des charges d'exploitation et pièces justificatives
            </p>
          </div>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} />
            <span>Enregistrer une Dépense</span>
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>N° Pièce</th>
                <th>Date</th>
                <th>Catégorie</th>
                <th>Bénéficiaire</th>
                <th>Moyen de Règlement</th>
                <th>Montant</th>
                <th>Compte Débité</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary-light)' }}>
                    {e.expenseNumber}
                  </td>
                  <td>{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <span className="badge badge-info">{e.category}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{e.beneficiary}</td>
                  <td>{e.method}</td>
                  <td style={{ fontWeight: 700, color: '#F87171' }}>
                    - {formatCurrency(Number(e.amount), e.currency)}
                  </td>
                  <td>{e.financialAccount?.name || 'Caisse Espèces'}</td>
                  <td>{e.user?.firstName} {e.user?.lastName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Expense */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Enregistrer une Dépense
              </h3>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Catégorie de la dépense *
                </label>
                <select
                  className="input-field"
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                >
                  <option value="Loyer & Charges Immobilières">Loyer & Charges Immobilières</option>
                  <option value="Énergie & Électricité SNEL">Énergie & Électricité SNEL</option>
                  <option value="Eau Régideso">Eau Régideso</option>
                  <option value="Frais de Transport & Logistique">Frais de Transport & Logistique</option>
                  <option value="Fournitures de bureau">Fournitures de bureau</option>
                  <option value="Salaires & Rémunérations">Salaires & Rémunérations</option>
                  <option value="Communication & Internet">Communication & Internet</option>
                  <option value="Divers & Imprévus">Divers & Imprévus</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Montant (CDF) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input-field"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Bénéficiaire / Fournisseur *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nom du bénéficiaire"
                    className="input-field"
                    value={expBeneficiary}
                    onChange={(e) => setExpBeneficiary(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Moyen de paiement *
                  </label>
                  <select
                    className="input-field"
                    value={expMethod}
                    onChange={(e) => setExpMethod(e.target.value)}
                  >
                    <option value="CASH">Espèces (Caisse)</option>
                    <option value="BANK_TRANSFER">Virement Bancaire</option>
                    <option value="MOBILE_MONEY_MPESA">M-Pesa Marchand</option>
                    <option value="CHECK">Chèque</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Compte Financier Débité
                  </label>
                  <select
                    className="input-field"
                    value={expAccountId}
                    onChange={(e) => setExpAccountId(e.target.value)}
                  >
                    <option value="">Caisse Directe</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance), a.currency)})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Motif / Justification
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Justification de la dépense..."
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={submittingExpense} className="btn btn-primary">
                  {submittingExpense ? 'Enregistrement...' : 'Valider la Dépense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Open Cash Session */}
      {showOpenModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Ouvrir une Caisse
              </h3>
              <button onClick={() => setShowOpenModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleOpenSession}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Caisse physique
                </label>
                <select
                  className="input-field"
                  value={selectedRegisterId}
                  onChange={(e) => setSelectedRegisterId(e.target.value)}
                >
                  {cashRegisters.map((cr) => (
                    <option key={cr.id} value={cr.id}>{cr.name} ({cr.location || 'Magasin'})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Fond de roulement initial (CDF) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input-field"
                  value={openBalance}
                  onChange={(e) => setOpenBalance(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowOpenModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={submittingOpen} className="btn btn-primary">
                  {submittingOpen ? 'Ouverture...' : 'Ouvrir la Caisse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Close Cash Session */}
      {showCloseModal && currentSession && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Clôture de Caisse & Rapprochement
              </h3>
              <button onClick={() => setShowCloseModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span>Fond Initial :</span>
                <strong>{formatCurrency(Number(currentSession.openingBalance), currentSession.currency)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span>Encaissements Espèces :</span>
                <strong style={{ color: '#34D399' }}>+{formatCurrency(totalSessionCashPayments, currentSession.currency)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                <span>Solde Théorique Attendu :</span>
                <span>{formatCurrency(theoreticalSessionTotal, currentSession.currency)}</span>
              </div>
            </div>

            <form onSubmit={handleCloseSession}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Montant physique compté en caisse (CDF) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input-field"
                  value={countedBalance}
                  onChange={(e) => setCountedBalance(e.target.value)}
                />
              </div>

              {/* Discrepancy indicator */}
              <div style={{
                background: diff === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: diff === 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
              }}>
                <span>Écart de caisse :</span>
                <strong style={{ color: diff === 0 ? '#34D399' : '#F87171' }}>
                  {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} CDF {diff === 0 ? '(Conforme)' : '(Anomalie)'}
                </strong>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Commentaire / Justification de clôture
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Justification en cas d'écart constaté..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowCloseModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={submittingClose} className="btn btn-danger">
                  {submittingClose ? 'Clôture en cours...' : 'Valider la Clôture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
