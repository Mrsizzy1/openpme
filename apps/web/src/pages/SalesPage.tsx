import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { formatCurrency, Currency, roundMoney } from '@smart-pme/shared';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Receipt,
  AlertTriangle,
  User,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SalesPage: React.FC = () => {
  const { organization } = useAuth();
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [immediatePayment, setImmediatePayment] = useState<boolean>(true);
  const [notes, setNotes] = useState('');
  const [successSale, setSuccessSale] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const exchangeRate = organization?.settings?.exchangeRateUsdToCdf || 2850;
  const taxRate = organization?.settings?.enableTax ? Number(organization.settings.taxRatePercent) : 0;

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, custs, sales] = await Promise.all([
        ApiClient.getProducts(),
        ApiClient.getCustomers(),
        ApiClient.getSales(50),
      ]);
      setProducts(prods);
      setCustomers(custs);
      setSalesHistory(sales);
      if (custs.length > 0) {
        const comptant = custs.find((c) => c.code === 'CLI-COMPTANT');
        setSelectedCustomerId(comptant ? comptant.id : custs[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addToCart = (product: any) => {
    setErrorMsg(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          code: product.code,
          unitPrice: Number(product.salePrice),
          quantity: 1,
          discountPercent: 0,
          currentStock: product.currentStock,
          isService: product.isService,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any[]
    );
  };

  const updateDiscount = (productId: string, discount: number) => {
    const val = Math.min(Math.max(0, discount), 100);
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, discountPercent: val } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Calculations
  const subtotal = roundMoney(
    cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0)
  );
  const totalDiscount = roundMoney(
    cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice * (item.discountPercent / 100)), 0)
  );
  const taxable = roundMoney(subtotal - totalDiscount);
  const taxAmount = roundMoney(taxable * (taxRate / 100));
  const netTotal = roundMoney(taxable + taxAmount);
  const totalInUsd = roundMoney(netTotal / exchangeRate, 2);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await ApiClient.createSale({
        customerId: selectedCustomerId,
        immediatePayment,
        paymentMethod,
        paymentReference,
        currency: 'CDF',
        notes,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent,
          taxRatePercent: taxRate,
        })),
      });

      setSuccessSale(res);
      setCart([]);
      setNotes('');
      setPaymentReference('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement de la vente');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search))
  );

  return (
    <div style={{ padding: '2rem' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('pos')}
          className={`btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <ShoppingCart size={16} />
          <span>Caisse & Enregistrement Vente</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        >
          <Receipt size={16} />
          <span>Journal des Ventes ({salesHistory.length})</span>
        </button>
      </div>

      {activeTab === 'pos' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem' }}>
          {/* Left: Product Selection */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Catalogue des Articles
              </h3>
              <div style={{ position: 'relative', width: '280px' }}>
                <input
                  type="text"
                  placeholder="Rechercher produit, code..."
                  className="input-field"
                  style={{ paddingLeft: '2.4rem' }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              </div>
            </div>

            {/* Product Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
              {filteredProducts.map((p) => {
                const isOutOfStock = !p.isService && p.currentStock <= 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '1.1rem',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.6 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                        {p.code}
                      </span>
                      <span className={`badge ${p.isService ? 'badge-info' : p.currentStock <= p.minStockLevel ? 'badge-danger' : 'badge-success'}`}>
                        {p.isService ? 'Service' : `${p.currentStock} ${p.unit}`}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '0.65rem', minHeight: '38px', lineHeight: 1.3 }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--primary-light)', fontSize: '1rem' }}>
                          {formatCurrency(Number(p.salePrice), p.currency)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                          ≈ {(Number(p.salePrice) / exchangeRate).toFixed(2)} USD
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.35rem' }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Cart & Checkout */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={20} color="var(--primary-light)" />
              <span>Panier de Vente</span>
              <span className="badge badge-info" style={{ marginLeft: 'auto' }}>
                {cart.reduce((acc, i) => acc + i.quantity, 0)} article(s)
              </span>
            </h3>

            {errorMsg && (
              <div style={{
                background: 'var(--danger-bg)',
                color: '#F87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                {errorMsg}
              </div>
            )}

            {/* Cart Items */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px', marginBottom: '1.25rem' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-subtle)' }}>
                  <ShoppingCart size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                  <div>Le panier est vide. Cliquez sur un article pour l’ajouter.</div>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '0.75rem 0.9rem',
                      marginBottom: '0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff', flex: 1, paddingRight: '0.5rem' }}>
                        {item.name}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.4rem' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontWeight: 700, padding: '0 0.4rem', fontSize: '0.9rem' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.4rem' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>Remise %:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) => updateDiscount(item.productId, parseFloat(e.target.value) || 0)}
                            style={{ width: '45px', padding: '2px 4px', background: '#0F172A', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', textAlign: 'center' }}
                          />
                        </div>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                          {formatCurrency(roundMoney(item.quantity * item.unitPrice * (1 - item.discountPercent / 100)), Currency.CDF)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer & Payment Options */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Client attribué
                </label>
                <select
                  className="input-field"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Mode d'encaissement
                  </label>
                  <select
                    className="input-field"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Espèces (Caisse)</option>
                    <option value="BANK_TRANSFER">Virement Bancaire</option>
                    <option value="MOBILE_MONEY_MPESA">M-Pesa Vodacom</option>
                    <option value="MOBILE_MONEY_AIRTEL">Airtel Money</option>
                    <option value="CHECK">Chèque</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Réf. ou Pièce jointe
                  </label>
                  <input
                    type="text"
                    placeholder="Bordereau / TxID..."
                    className="input-field"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="immPay"
                  checked={immediatePayment}
                  onChange={(e) => setImmediatePayment(e.target.checked)}
                />
                <label htmlFor="immPay" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Paiement comptant immédiat (Émettre Reçu N° automatique)
                </label>
              </div>
            </div>

            {/* Totals Summary */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                <span>Sous-total Brut :</span>
                <span>{formatCurrency(subtotal, Currency.CDF)}</span>
              </div>
              {totalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#F87171', marginBottom: '0.25rem' }}>
                  <span>Remise accordée :</span>
                  <span>- {formatCurrency(totalDiscount, Currency.CDF)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <span>TVA légale ({taxRate}%) :</span>
                  <span>{formatCurrency(taxAmount, Currency.CDF)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: '#fff', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <span>Net à Payer :</span>
                <span style={{ color: 'var(--primary-light)' }}>{formatCurrency(netTotal, Currency.CDF)}</span>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '0.2rem' }}>
                Soit environ <strong>{totalInUsd} USD</strong>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || submitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
            >
              {submitting ? 'Validation et écriture comptable...' : 'Valider & Encaisser la Vente'}
            </button>
          </div>
        </div>
      ) : (
        /* Sales History View */
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>
            Historique des Ventes Enregistrées
          </h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>N° Vente</th>
                  <th>Date & Heure</th>
                  <th>Client</th>
                  <th>Vendeur</th>
                  <th>Articles</th>
                  <th>Montant Total</th>
                  <th>Facture Liée</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary-light)' }}>
                      {s.saleNumber}
                    </td>
                    <td>{new Date(s.createdAt).toLocaleString('fr-FR')}</td>
                    <td>{s.customer?.name || 'Client Comptant'}</td>
                    <td>{s.user?.firstName} {s.user?.lastName}</td>
                    <td>{s.items?.length || 0} article(s)</td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>
                      {formatCurrency(Number(s.total), s.currency)}
                    </td>
                    <td>
                      {s.invoice ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                          {s.invoice.invoiceNumber}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <span className="badge badge-success">Effectuée</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10B981',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Vente N° {successSale.sale.saleNumber} enregistrée avec succès !
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Les stocks ont été décrémentés, la facture <strong>{successSale.invoice?.invoiceNumber}</strong> a été générée et les écritures financières sont validées.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span>Montant Net Encaissé :</span>
                <strong style={{ color: '#34D399' }}>{formatCurrency(Number(successSale.sale.total), successSale.sale.currency)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Statut Facture :</span>
                <span className="badge badge-success">{successSale.invoice?.status}</span>
              </div>
            </div>
            <button
              onClick={() => setSuccessSale(null)}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Fermer et continuer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
