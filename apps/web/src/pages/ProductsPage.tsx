import React, { useEffect, useRef, useState } from 'react';
import { ApiClient } from '../api/client';
import { formatCurrency, Currency, roundMoney } from '@smart-pme/shared';
import { Package, Plus, RefreshCw, Pencil, Trash2, ArrowDownUp, SearchX, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isNetworkFailure, offlineSync } from '../services/offlineSync';
import { useShell } from '../lib/shell';
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Modal,
  PageToolbar,
  SearchInput,
  Spinner,
  StatusBadge,
  TableSkeleton,
  useConfirm,
} from '../components/ui';
import { formatNumber } from '../lib/format';
import { useRealtime } from '../lib/realtime';
import './ProductsPage.css';

function decimalInput(value: string): string {
  const normalized = value.trim().replace(/\s/g, '');
  if (!normalized.includes(',') || !normalized.includes('.')) return normalized.replace(',', '.');
  return normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized.replace(/,/g, '');
}

export const ProductsPage: React.FC = () => {
  const { organization, user } = useAuth();
  const { success, error: toastError } = useToast();
  const canManage = user?.role === 'ORG_OWNER'
    || user?.role === 'MANAGER'
    || user?.role === 'INVENTORY_MANAGER'
    || user?.role === 'SUPER_ADMIN';

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const confirm = useConfirm();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [stockProduct, setStockProduct] = useState<any | null>(null);
  const [stockDelta, setStockDelta] = useState('');
  const [stockDirection, setStockDirection] = useState<'IN' | 'OUT'>('IN');
  const [stockReason, setStockReason] = useState('');
  const [stockError, setStockError] = useState<string | null>(null);

  // Formulaire
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formSalePrice, setFormSalePrice] = useState('');
  const [formCurrency, setFormCurrency] = useState<Currency>(Currency.CDF);
  const [formStock, setFormStock] = useState('0');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formUnit, setFormUnit] = useState('Pièce');
  const [formIsService, setFormIsService] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const exchangeRate = organization?.settings?.exchangeRateUsdToCdf || 2850;

  const loadData = async () => {
    try {
      if (hasLoadedOnce.current) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);
      const [prods, cats] = await Promise.all([
        ApiClient.getProducts(search, selectedCategory || undefined),
        ApiClient.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      setLoadError(err.message || 'Impossible de charger les produits.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const resetForm = () => {
    setFormName('');
    setFormCode('');
    setFormCategoryId('');
    setFormDescription('');
    setFormPurchasePrice('');
    setFormSalePrice('');
    setFormCurrency(organization?.settings?.primaryCurrency === Currency.USD ? Currency.USD : Currency.CDF);
    setFormStock('0');
    setFormMinStock('5');
    setFormUnit('Pièce');
    setFormIsService(false);
    setFormError(null);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const salePrice = Number(decimalInput(formSalePrice));
    const purchasePrice = Number(decimalInput(formPurchasePrice || '0'));
    const initialStock = Number(formStock);
    const minStockLevel = Number(formMinStock);

    if (!formName.trim()) {
      setFormError('La désignation est obligatoire.');
      return;
    }
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      setFormError('Le prix de vente doit être supérieur à 0.');
      return;
    }
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      setFormError('Le prix d’achat doit être un nombre positif ou nul.');
      return;
    }
    if (!formIsService && (!Number.isInteger(initialStock) || initialStock < 0)) {
      setFormError('Le stock initial doit être un nombre entier positif ou nul.');
      return;
    }
    if (!formIsService && (!Number.isInteger(minStockLevel) || minStockLevel < 0)) {
      setFormError('Le seuil d’alerte doit être un nombre entier positif ou nul.');
      return;
    }

    setSubmitting(true);
    try {
      await ApiClient.createProduct({
        name: formName.trim(),
        code: formCode.trim() || undefined,
        categoryId: formCategoryId || undefined,
        description: formDescription.trim() || undefined,
        purchasePrice: decimalInput(formPurchasePrice || '0'),
        salePrice: decimalInput(formSalePrice),
        currency: formCurrency,
        initialStock: formIsService ? 0 : initialStock,
        minStockLevel: formIsService ? 0 : minStockLevel,
        unit: formUnit.trim() || 'Pièce',
        isService: formIsService,
      });
      setShowAddModal(false);
      resetForm();
      success(`Produit « ${formName} » enregistré avec succès.`);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la création du produit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setFormName(product.name || '');
    setFormCode(product.code || '');
    setFormCategoryId(product.categoryId || '');
    setFormDescription(product.description || '');
    setFormPurchasePrice(String(product.purchasePrice || '0'));
    setFormSalePrice(String(product.salePrice || '0'));
    setFormCurrency(product.currency === Currency.USD ? Currency.USD : Currency.CDF);
    setFormStock(String(product.currentStock || '0'));
    setFormMinStock(String(product.minStockLevel ?? 5));
    setFormUnit(product.unit || 'Pièce');
    setFormIsService(Boolean(product.isService));
    setFormError(null);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setFormError(null);
    const salePrice = Number(decimalInput(formSalePrice));
    const purchasePrice = Number(decimalInput(formPurchasePrice || '0'));
    const minStockLevel = Number(formMinStock);

    if (!formName.trim()) {
      setFormError('La désignation est obligatoire.');
      return;
    }
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      setFormError('Le prix de vente doit être supérieur à 0.');
      return;
    }
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      setFormError('Le prix d’achat doit être un nombre positif ou nul.');
      return;
    }
    if (!editingProduct.isService && (!Number.isInteger(minStockLevel) || minStockLevel < 0)) {
      setFormError('Le seuil d’alerte doit être un nombre entier positif ou nul.');
      return;
    }

    setSubmitting(true);
    const updatePayload = {
      name: formName.trim(),
      categoryId: formCategoryId || null,
      description: formDescription.trim() || null,
      purchasePrice: decimalInput(formPurchasePrice || '0'),
      salePrice: decimalInput(formSalePrice),
      currency: formCurrency,
      minStockLevel: editingProduct.isService ? 0 : minStockLevel,
      unit: formUnit.trim() || 'Pièce',
    };
    try {
      await ApiClient.updateProduct(editingProduct.id, updatePayload);
      setEditingProduct(null);
      resetForm();
      success(`Produit mis à jour avec succès.`);
      loadData();
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        try {
          await offlineSync.enqueueProductUpdate(editingProduct.id, updatePayload);
          setEditingProduct(null);
          resetForm();
          success('Modifications enregistrées hors-ligne. La dernière modification synchronisée sera conservée.');
        } catch (storageError) {
          setFormError(storageError instanceof Error
            ? `La modification n’a pas été enregistrée. ${storageError.message}`
            : 'La modification n’a pas été enregistrée : stockage hors-ligne indisponible.');
        }
      } else {
        setFormError(err.message || 'Erreur lors de la mise à jour.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stockProduct) return;
    const enteredQuantity = Number(stockDelta);
    if (!Number.isInteger(enteredQuantity) || enteredQuantity <= 0) {
      setStockError('Saisissez une quantité entière supérieure à zéro.');
      return;
    }
    if (!stockReason.trim()) {
      setStockError('Le motif du mouvement est obligatoire.');
      return;
    }
    const quantity = stockDirection === 'IN' ? enteredQuantity : -enteredQuantity;
    if (stockProduct.currentStock + quantity < 0) {
      setStockError(`Il reste ${stockProduct.currentStock} article(s). La sortie demandée dépasse le stock disponible.`);
      return;
    }
    setSubmitting(true);
    const movementPayload = {
      quantity,
      reason: stockReason.trim(),
      idempotencyKey: crypto.randomUUID(),
    };
    let queuedOffline = false;
    let serverStock: number | null = null;
    try {
      try {
        const movement = await ApiClient.createStockMovement(stockProduct.id, movementPayload);
        serverStock = Number(movement.newStock);
        offlineSync.markBackendAvailable();
      } catch (requestError) {
        if (!isNetworkFailure(requestError)) throw requestError;
        offlineSync.markBackendUnavailable();
        await offlineSync.enqueueStockMovement(stockProduct.id, movementPayload);
        queuedOffline = true;
      }
      setProducts((current) => current.map((product) => product.id === stockProduct.id
        ? { ...product, currentStock: queuedOffline || serverStock === null || !Number.isFinite(serverStock)
          ? product.currentStock + quantity
          : serverStock }
        : product));
      setStockProduct(null);
      setStockDelta('');
      setStockReason('');
      setStockError(null);
      success(queuedOffline
        ? 'Mouvement enregistré sur ce poste; il sera transmis au serveur dès que la connexion sera rétablie.'
        : quantity > 0
          ? `${enteredQuantity} ${stockProduct.unit} ajouté(s) au stock.`
          : `${enteredQuantity} ${stockProduct.unit} retiré(s) du stock.`);
    } catch (err) {
      setStockError(err instanceof Error
        ? `Le mouvement n’a pas été enregistré. ${err.message}`
        : 'Le mouvement n’a pas été enregistré : stockage hors-ligne indisponible.');
    } finally {
      setSubmitting(false);
    }
  };


  const buy = Number(decimalInput(formPurchasePrice)) || 0;
  const sell = Number(decimalInput(formSalePrice)) || 0;
  const marginAmt = roundMoney(sell - buy);
  const marginPct = sell > 0 ? ((marginAmt / sell) * 100).toFixed(1) : '0.0';

  const lowStockCount = products.filter((p) => !p.isService && p.currentStock <= p.minStockLevel).length;

  const { refreshIndicators } = useShell();

  // Recherche et filtre côté serveur, après une courte pause de frappe.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, hasLoadedOnce.current ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [search, selectedCategory]);

  // Le compteur « stock bas » de la barre latérale suit les mouvements de stock.
  useEffect(() => {
    if (hasLoadedOnce.current) refreshIndicators();
  }, [lowStockCount, refreshIndicators]);

  useRealtime(['products', 'sales'], () => {
    if (hasLoadedOnce.current) void loadData();
  });

  const handleDeleteProduct = async (product: any) => {
    const confirmed = await confirm({
      title: `Supprimer l’article « ${product.name} » ?`,
      message: 'S’il est déjà lié à des ventes passées, il sera désactivé afin de préserver l’historique comptable.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await ApiClient.deleteProduct(product.id);
      success('Article supprimé avec succès.');
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Impossible de supprimer cet article.');
    }
  };

  const openCreate = () => {
    resetForm();
    setShowAddModal(true);
  };

  const closeProductForm = () => {
    setShowAddModal(false);
    setEditingProduct(null);
    resetForm();
  };

  const isEditing = Boolean(editingProduct);
  const productFormOpen = showAddModal || isEditing;
  const isServiceForm = isEditing ? Boolean(editingProduct?.isService) : formIsService;

  const renderTable = () => {
    if (loading) return <TableSkeleton rows={8} columns={8} />;

    if (loadError && products.length === 0) {
      return <ErrorState title="Impossible de charger le catalogue" message={loadError} onRetry={loadData} />;
    }

    if (products.length === 0) {
      return search || selectedCategory ? (
        <EmptyState
          icon={SearchX}
          title="Aucun résultat"
          description="Aucun article ne correspond à ces critères."
          action={<Button onClick={() => { setSearch(''); setSelectedCategory(''); }}>Réinitialiser les filtres</Button>}
        />
      ) : (
        <EmptyState
          icon={Package}
          title="Aucun article dans le catalogue"
          description="Créez vos produits et services pour pouvoir les vendre en caisse et suivre leur stock."
          action={canManage ? <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>Nouvel article</Button> : undefined}
        />
      );
    }

    return (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Désignation</th>
              <th>Catégorie</th>
              <th className="col-amount">Prix d’achat</th>
              <th className="col-amount">Prix de vente</th>
              <th className="col-amount">Marge</th>
              <th className="col-num">Stock</th>
              <th>Statut</th>
              {canManage && <th className="col-actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const buyP = Number(p.purchasePrice);
              const sellP = Number(p.salePrice);
              const margin = roundMoney(sellP - buyP);
              const marginPercent = sellP > 0 ? ((margin / sellP) * 100).toFixed(0) : '0';
              const isOut = !p.isService && p.currentStock <= 0;
              const isCritical = !p.isService && p.currentStock <= p.minStockLevel;

              return (
                <tr key={p.id}>
                  <td className="col-mono">{p.code}</td>
                  <td>
                    <span className="cell-primary">{p.name}</span>
                    {p.description && <span className="cell-secondary products-desc" title={p.description}>{p.description}</span>}
                  </td>
                  <td>
                    {p.category?.name || <span className="text-tertiary">—</span>}
                    {p.isService && <span className="cell-secondary">Prestation de service</span>}
                  </td>
                  <td className="col-amount text-muted">{formatCurrency(buyP, p.currency)}</td>
                  <td className="col-amount">{formatCurrency(sellP, p.currency)}</td>
                  <td className={`col-amount ${margin > 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(margin, p.currency)}
                    <span className="cell-secondary">{marginPercent} %</span>
                  </td>
                  <td className={`col-num${isCritical ? ' text-danger' : ''}`}>
                    {p.isService ? <span className="text-tertiary">—</span> : `${formatNumber(p.currentStock)} ${p.unit}`}
                  </td>
                  <td>
                    {p.isService ? (
                      <StatusBadge tone="info" dot>Service</StatusBadge>
                    ) : isOut ? (
                      <StatusBadge tone="danger" dot>Rupture</StatusBadge>
                    ) : isCritical ? (
                      <StatusBadge tone="warning" dot>Stock bas</StatusBadge>
                    ) : (
                      <StatusBadge tone="success" dot>En stock</StatusBadge>
                    )}
                  </td>
                  {canManage && (
                    <td className="col-actions">
                      {!p.isService && (
                        <IconButton
                          icon={<ArrowDownUp />}
                          size="sm"
                          aria-label={`Mouvement de stock pour ${p.name}`}
                          title="Entrée ou sortie de stock"
                          onClick={() => {
                            setStockProduct(p);
                            setStockDelta('');
                            setStockDirection('IN');
                            setStockReason('');
                            setStockError(null);
                          }}
                        />
                      )}
                      <IconButton icon={<Pencil />} size="sm" aria-label={`Modifier ${p.name}`} title="Modifier" onClick={() => handleOpenEdit(p)} />
                      <IconButton icon={<Trash2 />} size="sm" variant="danger" aria-label={`Supprimer ${p.name}`} title="Supprimer" onClick={() => handleDeleteProduct(p)} />
                    </td>
                  )}
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
              placeholder="Rechercher par nom, référence ou code-barres…"
              aria-label="Rechercher un article"
              width={340}
            />
            <select
              className="select-field products-category"
              aria-label="Filtrer par catégorie"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {refreshing && <Spinner size="sm" label="Recherche en cours" />}
          </>
        )}
        end={(
          <>
            <IconButton icon={<RefreshCw />} variant="secondary" aria-label="Actualiser le catalogue" onClick={loadData} />
            {canManage && (
              <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>
                Nouvel article
              </Button>
            )}
          </>
        )}
      />

      {lowStockCount > 0 && (
        <Alert tone="warning" icon={AlertTriangle} title={`${formatNumber(lowStockCount)} article(s) sous le seuil d’alerte`}>
          Passez commande auprès de vos fournisseurs pour éviter les ruptures.
        </Alert>
      )}

      <div className="table-wrapper">{renderTable()}</div>

      {/* Création et modification d'article */}
      <Modal
        open={productFormOpen}
        onClose={closeProductForm}
        title={isEditing ? 'Modifier l’article' : 'Nouvel article'}
        description={isEditing ? editingProduct?.name : 'Produit stocké ou prestation de service.'}
        icon={isEditing ? Pencil : Package}
        size="lg"
        busy={submitting}
        onSubmit={isEditing ? handleUpdateProduct : handleCreateProduct}
        footer={(
          <>
            <Button onClick={closeProductForm} disabled={submitting}>Annuler</Button>
            <Button type="submit" variant="primary" loading={submitting} loadingText="Enregistrement…">
              {isEditing ? 'Enregistrer les modifications' : 'Enregistrer l’article'}
            </Button>
          </>
        )}
      >
        {formError && <Alert tone="danger">{formError}</Alert>}

        <Field label="Désignation" required htmlFor="prod-name">
          <input
            id="prod-name"
            type="text"
            required
            className="input-field"
            placeholder="Ex. Imprimante HP LaserJet M110we"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
        </Field>

        <div className="form-grid">
          {!isEditing && (
            <Field label="Référence interne" hint="Générée automatiquement si vide." htmlFor="prod-code">
              <input
                id="prod-code"
                type="text"
                className="input-field"
                placeholder="PRD-XXXX"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </Field>
          )}
          <Field label="Catégorie" htmlFor="prod-category">
            <select
              id="prod-category"
              className="select-field"
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(e.target.value)}
            >
              <option value="">Sans catégorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          {isEditing && (
            <Field label="Unité" htmlFor="prod-unit-edit">
              <input
                id="prod-unit-edit"
                type="text"
                className="input-field"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
              />
            </Field>
          )}
        </div>

        <Field label="Description" htmlFor="prod-desc">
          <input
            id="prod-desc"
            type="text"
            className="input-field"
            placeholder="Description courte de l’article"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />
        </Field>

        <div className="form-grid-3">
          <Field label="Devise des prix" htmlFor="prod-currency">
            <select id="prod-currency" className="select-field" value={formCurrency}
              onChange={(e) => setFormCurrency(e.target.value === Currency.USD ? Currency.USD : Currency.CDF)}>
              <option value="CDF">CDF — Franc congolais</option>
              <option value="USD">USD — Dollar américain</option>
            </select>
          </Field>
          <Field label="Prix d’achat" htmlFor="prod-buy">
            <div className="input-addon">
              <input
                id="prod-buy"
                type="text"
                inputMode="decimal"
                className="input-field"
                placeholder="0,00"
                value={formPurchasePrice}
                onChange={(e) => setFormPurchasePrice(e.target.value)}
              />
              <span className="input-addon-text">{formCurrency}</span>
            </div>
          </Field>
          <Field label="Prix de vente" required htmlFor="prod-sell">
            <div className="input-addon">
              <input
                id="prod-sell"
                type="text"
                inputMode="decimal"
                required
                className="input-field"
                placeholder="0,00"
                value={formSalePrice}
                onChange={(e) => setFormSalePrice(e.target.value)}
              />
              <span className="input-addon-text">{formCurrency}</span>
            </div>
          </Field>
        </div>

        {sell > 0 && (
          <div className={`products-margin ${marginAmt > 0 ? 'is-positive' : 'is-negative'}`}>
            <span>Marge estimée</span>
            <strong>{formatCurrency(marginAmt, formCurrency)} · {marginPct} %</strong>
          </div>
        )}

        {!isEditing && (
          <label className="products-check">
            <input
              type="checkbox"
              checked={formIsService}
              onChange={(e) => setFormIsService(e.target.checked)}
            />
            Prestation de service (sans gestion de stock physique)
          </label>
        )}

        {!isServiceForm && (
          <div className={isEditing ? 'form-grid' : 'form-grid-3'}>
            {!isEditing && (
              <Field label="Stock initial" htmlFor="prod-stock" className="mb-0">
                <input
                  id="prod-stock"
                  type="number"
                  min="0"
                  className="input-field"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                />
              </Field>
            )}
            <Field label="Seuil d’alerte" hint="Alerte quand le stock descend à ce niveau." htmlFor="prod-minstk" className="mb-0">
              <input
                id="prod-minstk"
                type="number"
                min="0"
                className="input-field"
                value={formMinStock}
                onChange={(e) => setFormMinStock(e.target.value)}
              />
            </Field>
            {!isEditing && (
              <Field label="Unité" htmlFor="prod-unit" className="mb-0">
                <input
                  id="prod-unit"
                  type="text"
                  className="input-field"
                  placeholder="Pièce, kg, L…"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                />
              </Field>
            )}
          </div>
        )}
      </Modal>

      {/* Mouvement de stock */}
      <Modal
        open={Boolean(stockProduct)}
        onClose={() => setStockProduct(null)}
        title="Mouvement de stock"
        description={stockProduct ? `${stockProduct.name} · stock actuel : ${formatNumber(stockProduct.currentStock)} ${stockProduct.unit}` : undefined}
        icon={ArrowDownUp}
        size="sm"
        busy={submitting}
        onSubmit={handleStockMovement}
        footer={(
          <>
            <Button onClick={() => setStockProduct(null)} disabled={submitting}>Annuler</Button>
            <Button type="submit" variant="primary" loading={submitting} loadingText="Enregistrement…">
              {stockDirection === 'IN' ? 'Ajouter au stock' : 'Retirer du stock'}
            </Button>
          </>
        )}
      >
        {stockError && <Alert tone="danger">{stockError}</Alert>}
        <div className="form-group">
          <span className="form-label">Opération</span>
          <div className="segmented products-direction" role="group" aria-label="Type de mouvement">
            <button type="button" className={`segmented-btn${stockDirection === 'IN' ? ' active' : ''}`} aria-pressed={stockDirection === 'IN'} onClick={() => setStockDirection('IN')}>
              Entrée
            </button>
            <button type="button" className={`segmented-btn${stockDirection === 'OUT' ? ' active' : ''}`} aria-pressed={stockDirection === 'OUT'} onClick={() => setStockDirection('OUT')}>
              Sortie
            </button>
          </div>
        </div>
        <Field label="Quantité" required htmlFor="stock-delta">
          <div className="input-addon">
            <input
              id="stock-delta"
              type="number"
              min="1"
              step="1"
              required
              className="input-field"
              value={stockDelta}
              onChange={(event) => setStockDelta(event.target.value)}
              placeholder="Ex. 10"
            />
            <span className="input-addon-text">{stockProduct?.unit}</span>
          </div>
        </Field>
        <Field label="Motif" required htmlFor="stock-reason" className="mb-0">
          <input
            id="stock-reason"
            type="text"
            required
            maxLength={240}
            className="input-field"
            value={stockReason}
            onChange={(event) => setStockReason(event.target.value)}
            placeholder="Réception, inventaire, casse…"
          />
        </Field>
      </Modal>
    </div>
  );
};
