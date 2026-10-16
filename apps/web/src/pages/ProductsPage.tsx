import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { formatCurrency, Currency, roundMoney } from '@smart-pme/shared';
import { Package, Plus, Search, AlertTriangle, Layers, Tag, DollarSign, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProductsPage: React.FC = () => {
  const { organization } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState('0');
  const [formSalePrice, setFormSalePrice] = useState('0');
  const [formStock, setFormStock] = useState('10');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formUnit, setFormUnit] = useState('Pièce');
  const [formIsService, setFormIsService] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const exchangeRate = organization?.settings?.exchangeRateUsdToCdf || 2850;

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        ApiClient.getProducts(search, selectedCategory || undefined),
        ApiClient.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ApiClient.createProduct({
        name: formName,
        code: formCode || `PRD-${Date.now().toString().slice(-5)}`,
        categoryId: formCategoryId || undefined,
        purchasePrice: parseFloat(formPurchasePrice) || 0,
        salePrice: parseFloat(formSalePrice) || 0,
        initialStock: parseInt(formStock, 10) || 0,
        minStockLevel: parseInt(formMinStock, 10) || 5,
        unit: formUnit,
        isService: formIsService,
        currency: 'CDF',
      });
      setShowAddModal(false);
      setFormName('');
      setFormCode('');
      setFormPurchasePrice('0');
      setFormSalePrice('0');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création du produit');
    } finally {
      setSubmitting(false);
    }
  };

  // Margin calculation helper
  const buy = parseFloat(formPurchasePrice) || 0;
  const sell = parseFloat(formSalePrice) || 0;
  const marginAmt = sell - buy;
  const marginPct = sell > 0 ? ((marginAmt / sell) * 100).toFixed(1) : '0';

  const lowStockCount = products.filter((p) => !p.isService && p.currentStock <= p.minStockLevel).length;

  return (
    <div style={{ padding: '2rem' }}>
      {/* Low stock warning */}
      {lowStockCount > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          color: '#FCA5A5',
        }}>
          <AlertTriangle size={22} color="#EF4444" />
          <div style={{ flex: 1, fontSize: '0.9rem' }}>
            <strong>{lowStockCount} article(s) sous le seuil d’alerte de réapprovisionnement.</strong>
            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              Passez commande auprès de vos fournisseurs pour éviter des ruptures de vente.
            </span>
          </div>
        </div>
      )}

      {/* Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flex: 1, maxWidth: '600px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Rechercher par nom, référence ou code-barres..."
              className="input-field"
              style={{ paddingLeft: '2.5rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          </div>
          <select
            className="input-field"
            style={{ width: '220px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </form>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <Plus size={18} />
          <span>Nouveau Produit / Service</span>
        </button>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Désignation</th>
                <th>Catégorie</th>
                <th>Type</th>
                <th>Prix d'Achat</th>
                <th>Prix de Vente</th>
                <th>Marge Brute</th>
                <th>Stock Disponible</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const buyP = Number(p.purchasePrice);
                const sellP = Number(p.salePrice);
                const margin = sellP - buyP;
                const marginPercent = sellP > 0 ? ((margin / sellP) * 100).toFixed(0) : '0';
                const isCritical = !p.isService && p.currentStock <= p.minStockLevel;

                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {p.code}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{p.name}</div>
                      {p.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td>{p.category?.name || 'Général'}</td>
                    <td>
                      <span className={`badge ${p.isService ? 'badge-info' : 'badge-secondary'}`}>
                        {p.isService ? 'Service' : 'Matériel'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {formatCurrency(buyP, p.currency)}
                    </td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>
                      {formatCurrency(sellP, p.currency)}
                    </td>
                    <td style={{ color: margin > 0 ? '#34D399' : 'var(--text-subtle)', fontWeight: 600 }}>
                      +{formatCurrency(margin, p.currency)} ({marginPercent}%)
                    </td>
                    <td>
                      {p.isService ? (
                        <span style={{ color: 'var(--text-subtle)' }}>Illimité</span>
                      ) : (
                        <span style={{ fontWeight: 700, color: isCritical ? '#EF4444' : '#fff' }}>
                          {p.currentStock} {p.unit}
                        </span>
                      )}
                    </td>
                    <td>
                      {p.isService ? (
                        <span className="badge badge-info">Actif</span>
                      ) : isCritical ? (
                        <span className="badge badge-danger">Alerte Stock</span>
                      ) : (
                        <span className="badge badge-success">En Stock</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Ajouter un Article ou Service
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Désignation / Nom du produit *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Imprimante HP LaserJet..."
                  className="input-field"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Référence interne (Code)
                  </label>
                  <input
                    type="text"
                    placeholder="PRD-AUTO"
                    className="input-field"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Catégorie
                  </label>
                  <select
                    className="input-field"
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                  >
                    <option value="">Sélectionner catégorie</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Prix d'Achat Unitaire (CDF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Prix de Vente Unitaire (CDF) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="input-field"
                    value={formSalePrice}
                    onChange={(e) => setFormSalePrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Live Margin Indicator */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
              }}>
                <span>Marge estimée :</span>
                <strong style={{ color: marginAmt > 0 ? '#34D399' : '#F87171' }}>
                  +{marginAmt.toLocaleString()} CDF ({marginPct}%)
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  id="isSrv"
                  checked={formIsService}
                  onChange={(e) => setFormIsService(e.target.checked)}
                />
                <label htmlFor="isSrv" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  Cet article est une prestation de service (sans gestion de stock matériel)
                </label>
              </div>

              {!formIsService && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Stock Initial
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Seuil Min Alerte
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={formMinStock}
                      onChange={(e) => setFormMinStock(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Unité
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer le Produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
