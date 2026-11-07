import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import {
  calculateInvoiceTotals,
  calculateLine,
  convertCurrency,
  formatCurrency,
  Currency,
  PaymentMethod,
  roundMoney,
  subtractMoney,
  sumMoney,
} from '@smart-pme/shared';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Receipt,
  AlertTriangle,
  RefreshCw,
  Barcode,
  DollarSign,
  Banknote,
  CornerDownLeft,
  FileSpreadsheet,
  Printer,
  Share2,
  Keyboard,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { exportToCsv } from '../utils/exportCsv';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { printThermalReceiptWeb } from '../utils/escpos';
import { isNetworkFailure, offlineSync } from '../services/offlineSync';
import { useConfirm } from '../components/ui/ConfirmProvider';
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  Modal,
  SearchInput,
  StatusBadge,
} from '../components/ui';
import { formatDateTime, formatNumber } from '../lib/format';
import { INVOICE_STATUS, PAYMENT_METHOD_LABELS, SALE_STATUS, getStatusMeta } from '../lib/status';
import { useRealtime } from '../lib/realtime';
import { can } from '../role-permissions';
import './SalesPage.css';

export const SalesPage: React.FC = () => {
  const { organization, user } = useAuth();
  // L'auditeur consulte le journal des ventes sans accès à la caisse.
  const canSell = can(user?.role, 'sell');
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>(() => (can(user?.role, 'sell') ? 'pos' : 'history'));
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offlineSnapshotAt, setOfflineSnapshotAt] = useState<string | null>(null);
  const [offlineCacheWarning, setOfflineCacheWarning] = useState<string | null>(null);

  // Panier
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [immediatePayment, setImmediatePayment] = useState<boolean>(true);
  const [saleCurrency, setSaleCurrency] = useState<Currency>(Currency.CDF);
  const [cashSessions, setCashSessions] = useState<Partial<Record<Currency, any>>>({});
  const [notes, setNotes] = useState('');
  const [successSale, setSuccessSale] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Calculateur de monnaie bi-devise (CDF / USD)
  const [amountPaidCDF, setAmountPaidCDF] = useState<string>('');
  const [amountPaidUSD, setAmountPaidUSD] = useState<string>('');
  const [changeCurrency, setChangeCurrency] = useState<'CDF' | 'USD'>('CDF');

  const [isOfflineSale, setIsOfflineSale] = useState(false);

  const exchangeRate = organization?.settings?.exchangeRateUsdToCdf || 2850;
  const taxRate = organization?.settings?.enableTax ? Number(organization.settings.taxRatePercent) : 0;
  const cachedPosDataKey = (name: string) => `org:${organization?.id ?? 'unknown'}:pos:${name}`;

  const productsAfterSale = (soldItems: any[], requireAvailableStock: boolean) => {
    const updatedProducts = products.map((product) => {
      if (product.isService) return product;
      const soldQuantity = soldItems
        .filter((item) => item.productId === product.id)
        .reduce((total, item) => total + Number(item.quantity), 0);
      if (soldQuantity === 0) return product;
      const availableStock = Number(product.currentStock ?? 0);
      if (requireAvailableStock && soldQuantity > availableStock) {
        throw new Error(
          `Stock local insuffisant pour « ${product.name} » : ${availableStock} disponible(s), ${soldQuantity} demandé(s). Reconnectez-vous pour actualiser le catalogue.`,
        );
      }
      return { ...product, currentStock: Math.max(0, availableStock - soldQuantity) };
    });
    if (requireAvailableStock) {
      const missingProduct = soldItems.find((item) => !item.isService
        && !products.some((product) => product.id === item.productId));
      if (missingProduct) {
        throw new Error('Un article du panier est absent du catalogue local. Reconnectez-vous avant d’enregistrer cette vente.');
      }
    }
    return updatedProducts;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [prods, custs, sales, cdfSession, usdSession] = await Promise.all([
        ApiClient.getProducts(),
        ApiClient.getCustomers(),
        ApiClient.getSales(100),
        ApiClient.getCurrentCashSession(Currency.CDF),
        ApiClient.getCurrentCashSession(Currency.USD),
      ]);
      offlineSync.markBackendAvailable();
      setProducts(prods);
      setCustomers(custs);
      setSalesHistory(sales);
      setCashSessions({
        [Currency.CDF]: cdfSession,
        [Currency.USD]: usdSession,
      });
      if (custs.length > 0) {
        const comptant = custs.find((c: any) => c.code === 'CLI-COMPTANT');
        setSelectedCustomerId(comptant ? comptant.id : custs[0].id);
      }
      setOfflineSnapshotAt(null);
      setOfflineCacheWarning(null);
      if (window.SMART_PME_CONFIG?.desktop) {
        try {
          const updatedAt = new Date().toISOString();
          await Promise.all([
            offlineSync.saveCachedData(cachedPosDataKey('products'), prods),
            offlineSync.saveCachedData(cachedPosDataKey('customers'), custs),
            offlineSync.saveCachedData(cachedPosDataKey('sales-history'), sales),
            offlineSync.saveCachedData(cachedPosDataKey('cash-sessions'), {
              [Currency.CDF]: cdfSession,
              [Currency.USD]: usdSession,
            }),
          ]);
          setOfflineSnapshotAt(updatedAt);
        } catch (cacheError) {
          const message = cacheError instanceof Error ? cacheError.message : 'Erreur inconnue.';
          setOfflineCacheWarning(`Catalogue chargé, mais la copie hors-ligne n’a pas pu être enregistrée : ${message}`);
        }
      }
    } catch (err: any) {
      if (window.SMART_PME_CONFIG?.desktop && ApiClient.isNetworkFailure(err)) {
        offlineSync.markBackendUnavailable();
        try {
          const [cachedProducts, cachedCustomers, cachedSales, cachedCashSessions] = await Promise.all([
            offlineSync.getCachedData<any[]>(cachedPosDataKey('products')),
            offlineSync.getCachedData<any[]>(cachedPosDataKey('customers')),
            offlineSync.getCachedData<any[]>(cachedPosDataKey('sales-history')),
            offlineSync.getCachedData<Partial<Record<Currency, any>>>(cachedPosDataKey('cash-sessions')),
          ]);
          if (!cachedProducts?.value.length || !cachedCustomers?.value.length || !cachedCashSessions) {
            setLoadError('Serveur indisponible et données de caisse locales absentes. Reconnectez-vous au serveur pour préparer le catalogue et les caisses avant la prochaine coupure.');
            return;
          }
          setProducts(cachedProducts.value);
          setCustomers(cachedCustomers.value);
          setSalesHistory(cachedSales?.value ?? []);
          setCashSessions(cachedCashSessions.value);
          setOfflineSnapshotAt([
            cachedProducts.updatedAt,
            cachedCustomers.updatedAt,
            cachedCashSessions.updatedAt,
          ].sort()[0]);
          const comptant = cachedCustomers.value.find((customer: any) => customer.code === 'CLI-COMPTANT');
          if (comptant) setSelectedCustomerId(comptant.id);
          else if (cachedCustomers.value[0]) setSelectedCustomerId(cachedCustomers.value[0].id);
          setOfflineCacheWarning(null);
          setLoadError(null);
        } catch (cacheError) {
          const message = cacheError instanceof Error ? cacheError.message : 'Erreur inconnue.';
          setLoadError(`Serveur indisponible et lecture des données locales impossible : ${message}`);
        }
      } else {
        setLoadError(err.message || 'Impossible de charger les données.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (organization?.settings?.primaryCurrency === Currency.CDF
      || organization?.settings?.primaryCurrency === Currency.USD) {
      setSaleCurrency(organization.settings.primaryCurrency);
    }
  }, [organization?.settings?.primaryCurrency]);

  // Écouteur global pour lecteur code-barre / douchette USB (EAN-13, Code128)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Une boîte de dialogue est ouverte : elle gère seule le clavier (Échap, Entrée…).
      if (document.querySelector('.modal-overlay > [aria-modal="true"]')) return;
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 65) {
        buffer = '';
      }
      // Raccourcis clavier caisse express
      if (e.key === 'F1') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-search-input');
        if (searchInput) searchInput.focus();
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'pos' ? 'history' : 'pos'));
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0 && !submitting) {
          handleCheckout();
        }
        return;
      }
      if (e.key === 'Escape') {
        if (cart.length > 0) {
          void clearCart();
        }
        return;
      }

      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.trim().length >= 3) {
          const scanned = buffer.trim().toUpperCase();
          const found = products.find(
            (p) =>
              (p.barcode && p.barcode.toUpperCase() === scanned) ||
              (p.code && p.code.toUpperCase() === scanned)
          );
          if (found) {
            addToCart(found);
            success(`Article scanné : « ${found.name} »`);
          } else {
            toastError(`Code article non reconnu : ${scanned}`);
          }
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [products, cart, submitting]);

  const addToCart = (product: any) => {
    setErrorMsg(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (!product.isService && existing.quantity >= product.currentStock) {
          setErrorMsg(`Stock insuffisant pour « ${product.name} ». Disponible : ${product.currentStock}`);
          return prev;
        }
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
          currency: product.currency || Currency.CDF,
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
            if (!item.isService && newQty > item.currentStock) {
              setErrorMsg(`Stock insuffisant. Maximum disponible : ${item.currentStock}`);
              return item;
            }
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

  const clearCart = async () => {
    if (cart.length > 0) {
      const confirmed = await confirm({
        title: 'Vider le panier ?',
        message: 'Tous les articles de la vente en cours seront retirés du panier.',
        confirmLabel: 'Vider le panier',
        tone: 'danger',
      });
      if (!confirmed) return;
    }
    setCart([]);
    setErrorMsg(null);
  };

  // Calculs (côté client uniquement pour affichage — le serveur recalcule)
  const cartTotals = calculateInvoiceTotals(cart.map((item) => ({
    quantity: item.quantity,
    unitPrice: convertCurrency(item.unitPrice, item.currency, saleCurrency, exchangeRate),
    discountPercent: item.discountPercent,
    taxRatePercent: taxRate,
  })));
  const subtotal = cartTotals.subtotal;
  const totalDiscount = cartTotals.discountAmount;
  const taxAmount = cartTotals.taxAmount;
  const netTotal = cartTotals.total;

  const cashReceivedCdf = sumMoney([
    amountPaidCDF || '0',
    convertCurrency(Number(amountPaidUSD || 0), Currency.USD, Currency.CDF, exchangeRate),
  ], 0);
  const dueCdf = convertCurrency(netTotal, saleCurrency, Currency.CDF, exchangeRate);
  const changeAmountCdf = subtractMoney(cashReceivedCdf, dueCdf, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!selectedCustomerId) {
      setErrorMsg('Veuillez sélectionner un client.');
      return;
    }
    if (immediatePayment && paymentMethod !== 'CASH') {
      setErrorMsg(
        'Ce moyen de paiement n’est pas relié à un service de confirmation. Enregistrez la vente à crédit, puis comptabilisez le règlement après vérification effective.',
      );
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    setIsOfflineSale(false);

    const cashPayments = [
      ...(Number(amountPaidCDF) > 0
        ? [{ amount: amountPaidCDF, currency: Currency.CDF, method: PaymentMethod.CASH }]
        : []),
      ...(Number(amountPaidUSD) > 0
        ? [{ amount: amountPaidUSD, currency: Currency.USD, method: PaymentMethod.CASH }]
        : []),
    ].map((payment) => ({
      ...payment,
      cashSessionId: cashSessions[payment.currency]?.id,
    }));

    if (immediatePayment && paymentMethod === 'CASH') {
      if (!cashPayments.length) {
        setErrorMsg('Saisissez le montant reçu en CDF et/ou en USD.');
        setSubmitting(false);
        return;
      }
      const missingCurrency = cashPayments.find((payment) => !payment.cashSessionId)?.currency;
      if (missingCurrency) {
        setErrorMsg(`Ouvrez d’abord la session de caisse ${missingCurrency} dans Finances.`);
        setSubmitting(false);
        return;
      }
      if (cashReceivedCdf < dueCdf) {
        setErrorMsg('Le montant reçu est inférieur au total de la vente.');
        setSubmitting(false);
        return;
      }
      if (changeAmountCdf > 0 && !cashSessions[Currency.CDF]?.id) {
        setErrorMsg('Une session de caisse CDF ouverte est nécessaire pour rendre la monnaie.');
        setSubmitting(false);
        return;
      }
    }

    const salePayload = {
      idempotencyKey: crypto.randomUUID(),
      customerId: selectedCustomerId,
      immediatePayment,
      paymentMethod,
      paymentReference,
      currency: saleCurrency,
      payments: immediatePayment
        ? paymentMethod === 'CASH'
          ? cashPayments
          : [{ amount: String(netTotal), currency: saleCurrency, method: paymentMethod, reference: paymentReference }]
        : [],
      changeCashSessionId: changeAmountCdf > 0 ? cashSessions[Currency.CDF]?.id : undefined,
      notes,
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: String(convertCurrency(i.unitPrice, i.currency, saleCurrency, exchangeRate)),
        discountPercent: i.discountPercent,
        taxRatePercent: taxRate,
      })),
    };

    const enqueueOfflineSale = async () => {
      const updatedProducts = productsAfterSale(cart, true);
      const operation = await offlineSync.enqueueSale(salePayload, {
        key: cachedPosDataKey('products'),
        value: updatedProducts,
      });
      setProducts(updatedProducts);
      return operation;
    };

    // Vérifier si le navigateur est hors-ligne
    if (!navigator.onLine) {
      offlineSync.markBackendUnavailable();
      if (immediatePayment && paymentMethod !== 'CASH') {
        setErrorMsg('Un paiement par banque ou Mobile Money doit être confirmé en ligne avant la vente.');
        setSubmitting(false);
        return;
      }
      try {
        const offlineRecord = await enqueueOfflineSale();

        setIsOfflineSale(true);
        setSuccessSale({
          sale: {
            saleNumber: offlineRecord.id,
            total: netTotal,
            currency: saleCurrency,
            createdAt: offlineRecord.createdAt,
            items: cart,
          },
          invoice: {
            invoiceNumber: `PROV-${offlineRecord.id.slice(-6)}`,
            status: 'PENDING_SYNC',
          },
        });
        setCart([]);
        setNotes('');
        setPaymentReference('');
        success('Vente enregistrée HORS-LIGNE avec succès ! Elle sera synchronisée dès le retour d\'internet.');
      } catch (err: any) {
        setErrorMsg(err.message || 'La vente n’a pas été enregistrée : stockage hors-ligne indisponible.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await ApiClient.createSale(salePayload);
      offlineSync.markBackendAvailable();
      setIsOfflineSale(false);
      setSuccessSale(res);
      const updatedProducts = productsAfterSale(cart, false);
      setProducts(updatedProducts);
      if (window.SMART_PME_CONFIG?.desktop) {
        try {
          const updatedAt = await offlineSync.saveCachedData(cachedPosDataKey('products'), updatedProducts);
          setOfflineSnapshotAt(updatedAt);
          setOfflineCacheWarning(null);
        } catch (cacheError) {
          const message = cacheError instanceof Error ? cacheError.message : 'Erreur inconnue.';
          setOfflineCacheWarning(`Vente enregistrée, mais le stock local ne peut pas être actualisé : ${message}`);
        }
      }
      setCart([]);
      setNotes('');
      setPaymentReference('');
      void loadData();
    } catch (err: any) {
      // Si l'erreur est réseau, basculer automatiquement en enregistrement hors-ligne
      if (ApiClient.isNetworkFailure(err) || !navigator.onLine) {
        offlineSync.markBackendUnavailable();
        if (immediatePayment && paymentMethod !== 'CASH') {
          setErrorMsg('Le paiement par banque ou Mobile Money n’a pas pu être confirmé. La vente n’a pas été enregistrée.');
          return;
        }
        try {
          const offlineRecord = await enqueueOfflineSale();
          setIsOfflineSale(true);
          setSuccessSale({
            sale: {
              saleNumber: offlineRecord.id,
              total: netTotal,
              currency: saleCurrency,
              createdAt: offlineRecord.createdAt,
              items: cart,
            },
            invoice: {
              invoiceNumber: `PROV-${offlineRecord.id.slice(-6)}`,
              status: 'PENDING_SYNC',
            },
          });
          setCart([]);
          setNotes('');
          setPaymentReference('');
          success('Réseau indisponible : Vente sécurisée en HORS-LIGNE !');
        } catch (storageError: any) {
          setErrorMsg(storageError.message || 'La vente n’a pas été enregistrée : stockage hors-ligne indisponible.');
        }
      } else {
        setErrorMsg(err.message || 'Erreur lors de l\'enregistrement de la vente.');
      }
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

  const statusLabel: Record<string, string> = {
    COMPLETED: 'Effectuée', PENDING: 'En attente', CANCELLED: 'Annulée', PARTIAL: 'Partielle',
  };
  const statusClass: Record<string, string> = {
    COMPLETED: 'badge-success', PENDING: 'badge-warning', CANCELLED: 'badge-danger', PARTIAL: 'badge-info',
  };

  /**
   * Actualisation déclenchée par un autre poste : catalogue, stock, clients, journal et caisses.
   * Le panier et le client sélectionné ne sont jamais touchés.
   */
  const refreshLive = async () => {
    if (offlineSnapshotAt) return;
    try {
      const [prods, custs, sales, cdfSession, usdSession] = await Promise.all([
        ApiClient.getProducts(),
        ApiClient.getCustomers(),
        ApiClient.getSales(100),
        ApiClient.getCurrentCashSession(Currency.CDF),
        ApiClient.getCurrentCashSession(Currency.USD),
      ]);
      setProducts(prods);
      setCustomers(custs);
      setSalesHistory(sales);
      setCashSessions({ [Currency.CDF]: cdfSession, [Currency.USD]: usdSession });
    } catch {
      // Réseau indisponible : la prochaine actualisation rattrapera l'écart.
    }
  };

  useRealtime(['sales', 'products', 'customers', 'finances', 'payments'], () => {
    void refreshLive();
  });

  // Ticket affiché : F4 ou Entrée lance une nouvelle vente.
  useEffect(() => {
    if (!successSale) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F4') {
        event.preventDefault();
        setSuccessSale(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [successSale]);

  const paymentLabel = (method: string) => PAYMENT_METHOD_LABELS[method] || method;

  const printReceipt = (width: '80mm' | '58mm') => {
    const s = successSale?.sale || successSale;
    const items = s?.items || cart;
    printThermalReceiptWeb({
      companyName: organization?.name || 'Smart PME Finance',
      companyAddress: organization?.address,
      companyPhone: organization?.phone,
      companyNif: organization?.taxId,
      receiptNumber: s?.saleNumber || 'Provisoire',
      date: new Date(s?.createdAt || Date.now()).toLocaleString('fr-FR'),
      customerName: customers.find((c) => c.id === selectedCustomerId)?.name,
      items: items.map((it: any) => ({
        name: it.name || it.product?.name || 'Article',
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unitPrice || 0),
        total: Number(it.quantity || 1) * Number(it.unitPrice || 0),
      })),
      subtotal: Number(s?.total || 0),
      total: Number(s?.total || 0),
      currency: s?.currency || 'CDF',
      paymentMethod,
    }, { width });
  };

  const shareReceipt = () => {
    const s = successSale?.sale || successSale;
    const inv = successSale?.invoice;
    const message = encodeURIComponent(
      `*${organization?.name || 'OpenPME'} - TICKET DE CAISSE*\n` +
      `Ticket N° : *${s?.saleNumber || 'provisoire'}*\n` +
      (inv ? `Facture : *${inv?.invoiceNumber}*\n` : '') +
      `Date : ${new Date(s?.createdAt || Date.now()).toLocaleString('fr-FR')}\n` +
      `Total : *${formatCurrency(Number(s?.total || 0), s?.currency || 'CDF')}*\n` +
      `Paiement : *${paymentLabel(paymentMethod)}*\n\n` +
      `_Merci pour votre visite chez ${organization?.name || 'OpenPME'} !_`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const exportSales = () => {
    if (!salesHistory.length) {
      toastError('Aucune vente à exporter.');
      return;
    }
    const rows = salesHistory.map((s) => ({
      'N° Vente': s.saleNumber,
      'Date & Heure': new Date(s.createdAt).toLocaleString('fr-FR'),
      'Client': s.customer?.name || 'Client comptant',
      'Vendeur': `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim(),
      'Articles': s.items?.length || 0,
      'Devise': s.currency,
      'Total Encaissé': s.total,
      'Facture Rattachée': s.invoice?.invoiceNumber || '—',
      'Statut': getStatusMeta(SALE_STATUS, s.status).label,
    }));
    exportToCsv('Journal_Ventes_OpenPME', rows);
    success('Journal des ventes exporté.');
  };

  if (loading) {
    return <LoadingState label="Préparation de la caisse…" />;
  }

  if (loadError) {
    return (
      <div className="card">
        <ErrorState title="Caisse indisponible" message={loadError} onRetry={loadData} />
      </div>
    );
  }

  const isPosCashier = new URLSearchParams(window.location.search).get('posMode') === 'cashier';
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const otherCurrency = saleCurrency === Currency.CDF ? Currency.USD : Currency.CDF;
  const successInvoiceStatus = getStatusMeta(INVOICE_STATUS, successSale?.invoice?.status);

  return (
    <div className="page sales-page">
      {offlineSnapshotAt && (
        <Alert
          tone="warning"
          icon={WifiOff}
          title="Mode hors ligne — catalogue local"
          actions={<Button size="sm" icon={<RefreshCw size={13} />} onClick={loadData}>Vérifier la connexion et actualiser</Button>}
        >
          Données de caisse enregistrées le {formatDateTime(offlineSnapshotAt)}. Le stock peut avoir changé depuis ; les ventes seront vérifiées à la synchronisation.
          {!cashSessions[Currency.CDF]?.id && !cashSessions[Currency.USD]?.id
            ? ' Aucune session de caisse locale : seules les ventes non encaissées sont possibles.'
            : ''}
        </Alert>
      )}
      {offlineCacheWarning && <Alert tone="warning">{offlineCacheWarning}</Alert>}

      <div className="sales-topbar">
        <div className="tabs mb-0" role="tablist" aria-label="Caisse et journal">
          {canSell && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pos'}
            className={`tab-btn${activeTab === 'pos' ? ' active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            <ShoppingCart size={15} aria-hidden="true" />
            Caisse
            {cart.length > 0 && <span className="tab-count">{cartCount}</span>}
          </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={`tab-btn${activeTab === 'history' ? ' active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Receipt size={15} aria-hidden="true" />
            Journal des ventes
            <span className="tab-count">{salesHistory.length}</span>
          </button>
        </div>

        {canSell && (
        <div className="sales-topbar-end">
          <span className="sales-shortcuts" title="Raccourcis clavier de la caisse">
            <Keyboard size={14} aria-hidden="true" />
            <kbd>F1</kbd> recherche
            <kbd>F2</kbd> journal
            <kbd>F4</kbd> valider
            <kbd>Échap</kbd> vider
          </span>
          {isPosCashier ? (
            <a href="/sales" className="btn btn-secondary btn-sm">Afficher le menu complet</a>
          ) : (
            <a href="/sales?posMode=cashier" className="btn btn-secondary btn-sm">Mode caisse plein écran</a>
          )}
        </div>
        )}
      </div>

      {activeTab === 'pos' && canSell ? (
        <div className="sales-pos">
          {/* Catalogue */}
          <section className="card sales-catalog" aria-label="Catalogue des articles">
            <div className="card-header">
              <div className="card-heading">
                <span className="card-title">Catalogue</span>
                <span className="card-subtitle">{formatNumber(filteredProducts.length)} article(s)</span>
              </div>
              <SearchInput
                id="pos-search-input"
                value={search}
                onChange={setSearch}
                placeholder="Rechercher un article ou un code…"
                aria-label="Rechercher un article"
                shortcut="F1"
                width={300}
              />
            </div>
            <div className="card-body">
              {filteredProducts.length === 0 ? (
                products.length === 0 ? (
                  <EmptyState
                    icon={Barcode}
                    title="Catalogue vide"
                    description={offlineSnapshotAt
                      ? 'Aucun produit n’est disponible dans le catalogue hors ligne. Reconnectez-vous et actualisez après le chargement du catalogue par un responsable.'
                      : (can(user?.role, 'manageProducts') ? 'Aucun produit actif. Ajoutez vos articles au catalogue avant de commencer les ventes.' : 'Aucun produit actif. Demandez à votre responsable d’ajouter les articles au catalogue.')}
                    action={!offlineSnapshotAt && can(user?.role, 'manageProducts') ? <a href="/products" className="btn btn-primary btn-sm">Ouvrir le catalogue</a> : undefined}
                  />
                ) : search.trim() ? (
                  <EmptyState
                    icon={Search}
                    title="Aucun article trouvé"
                    description="Aucun article ne correspond à votre recherche."
                    action={<Button size="sm" onClick={() => setSearch('')}>Effacer la recherche</Button>}
                  />
                ) : (
                  <EmptyState title="Aucun article disponible" description="Vérifiez le stock et la disponibilité des articles auprès de votre responsable." />
                )
              ) : (
                <div className="product-grid">
                  {filteredProducts.map((p) => {
                    const isOutOfStock = !p.isService && p.currentStock <= 0;
                    const isLow = !p.isService && p.currentStock <= (p.minStockLevel || 0);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`product-card${isOutOfStock ? ' out-of-stock' : ''}`}
                        onClick={() => addToCart(p)}
                        disabled={isOutOfStock}
                        title={isOutOfStock ? 'Rupture de stock' : `Ajouter « ${p.name} » au panier`}
                      >
                        <span className="product-card-top">
                          <span className="product-card-code">{p.code}</span>
                          <StatusBadge tone={p.isService ? 'info' : isOutOfStock ? 'danger' : isLow ? 'warning' : 'success'} size="sm">
                            {p.isService ? 'Service' : isOutOfStock ? 'Rupture' : `${formatNumber(p.currentStock)} ${p.unit || 'pcs'}`}
                          </StatusBadge>
                        </span>
                        <span className="product-card-name">{p.name}</span>
                        <span className="product-card-footer">
                          <span className="product-card-price">{formatCurrency(Number(p.salePrice), p.currency || Currency.CDF)}</span>
                          {!isOutOfStock && <Plus size={15} aria-hidden="true" className="product-card-add" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Panier et encaissement */}
          <section className="card sales-cart" aria-label="Panier">
            <div className="card-header">
              <div className="card-heading">
                <span className="card-title">Panier</span>
                {cart.length > 0 && <StatusBadge tone="primary" size="sm">{cartCount} article(s)</StatusBadge>}
              </div>
              {cart.length > 0 && (
                <Button size="sm" variant="ghost" icon={<Trash2 size={13} />} onClick={clearCart} className="btn-ghost-danger">
                  Vider
                </Button>
              )}
            </div>

            <div className="card-body">
              {errorMsg && <Alert tone="danger" className="sales-error">{errorMsg}</Alert>}

              {cart.length === 0 ? (
                <EmptyState
                  compact
                  icon={ShoppingCart}
                  title="Panier vide"
                  description="Cliquez sur un article ou scannez un code-barres pour l’ajouter."
                />
              ) : (
                <>
                  <ul className="sales-lines">
                    {cart.map((item) => (
                      <li key={item.productId} className="sales-line">
                        <div className="sales-line-head">
                          <span className="sales-line-name">{item.name}</span>
                          <IconButton
                            icon={<Trash2 />}
                            size="xs"
                            variant="danger"
                            aria-label={`Retirer ${item.name} du panier`}
                            title="Retirer"
                            onClick={() => removeFromCart(item.productId)}
                          />
                        </div>
                        <div className="sales-line-body">
                          <div className="sales-qty" role="group" aria-label={`Quantité de ${item.name}`}>
                            <IconButton icon={<Minus />} size="xs" variant="secondary" aria-label="Diminuer la quantité" onClick={() => updateQuantity(item.productId, -1)} />
                            <span className="sales-qty-value">{item.quantity}</span>
                            <IconButton icon={<Plus />} size="xs" variant="secondary" aria-label="Augmenter la quantité" onClick={() => updateQuantity(item.productId, 1)} />
                          </div>
                          <label className="sales-discount">
                            Remise
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="input-field input-sm"
                              value={item.discountPercent}
                              onChange={(e) => updateDiscount(item.productId, parseFloat(e.target.value) || 0)}
                              aria-label={`Remise en pourcentage sur ${item.name}`}
                            />
                            %
                          </label>
                          <span className="sales-line-total">
                            {formatCurrency(
                              calculateLine(
                                item.quantity,
                                convertCurrency(item.unitPrice, item.currency, saleCurrency, exchangeRate),
                                item.discountPercent,
                              ).total,
                              saleCurrency,
                            )}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="sales-form">
                    <Field label="Client" required htmlFor="sale-customer">
                      <select
                        id="sale-customer"
                        className="select-field"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.companyName ? ` — ${c.companyName}` : ''}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <div className="form-grid">
                      <Field label="Devise de facturation" htmlFor="sale-currency">
                        <select
                          id="sale-currency"
                          className="select-field"
                          value={saleCurrency}
                          onChange={(e) => setSaleCurrency(e.target.value === Currency.USD ? Currency.USD : Currency.CDF)}
                        >
                          <option value={Currency.CDF}>CDF — Franc congolais</option>
                          <option value={Currency.USD}>USD — Dollar américain</option>
                        </select>
                      </Field>
                      <Field label="Mode de paiement" htmlFor="sale-payment">
                        <select
                          id="sale-payment"
                          className="select-field"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          <option value="CASH">Espèces</option>
                          <option value="MOBILE_MONEY_MPESA" disabled>Vodacom M-Pesa — intégration requise</option>
                          <option value="MOBILE_MONEY_AIRTEL" disabled>Airtel Money — intégration requise</option>
                          <option value="MOBILE_MONEY_ORANGE" disabled>Orange Money — intégration requise</option>
                          <option value="BANK_TRANSFER">Virement bancaire (à rapprocher)</option>
                          <option value="CHECK">Chèque (à rapprocher)</option>
                        </select>
                      </Field>
                    </div>

                    {paymentMethod !== 'CASH' && (
                      <Field label="Référence du paiement" htmlFor="sale-ref">
                        <input
                          id="sale-ref"
                          type="text"
                          className="input-field"
                          placeholder="N° de bordereau ou de chèque"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                        />
                      </Field>
                    )}

                    {paymentMethod !== 'CASH' && immediatePayment && (
                      <Alert tone="warning">
                        Aucun rapprochement bancaire n’est connecté. Enregistrez d’abord la vente à crédit ; le règlement sera comptabilisé après vérification réelle.
                      </Alert>
                    )}

                    <label className="sales-check">
                      <input
                        type="checkbox"
                        checked={immediatePayment}
                        onChange={(e) => setImmediatePayment(e.target.checked)}
                      />
                      Paiement immédiat
                      <span className="text-tertiary">(décochez pour une vente à crédit)</span>
                    </label>
                  </div>

                  <dl className="sales-totals">
                    <div>
                      <dt>Sous-total</dt>
                      <dd>{formatCurrency(subtotal, saleCurrency)}</dd>
                    </div>
                    {totalDiscount > 0 && (
                      <div>
                        <dt>Remise accordée</dt>
                        <dd className="text-danger">− {formatCurrency(totalDiscount, saleCurrency)}</dd>
                      </div>
                    )}
                    {taxRate > 0 && (
                      <div>
                        <dt>TVA ({taxRate} %)</dt>
                        <dd>{formatCurrency(taxAmount, saleCurrency)}</dd>
                      </div>
                    )}
                    <div className="is-total">
                      <dt>Net à payer</dt>
                      <dd>
                        {formatCurrency(netTotal, saleCurrency)}
                        <span className="sales-equivalent">
                          ≈ {formatCurrency(convertCurrency(netTotal, saleCurrency, otherCurrency, exchangeRate), otherCurrency)}
                        </span>
                      </dd>
                    </div>
                  </dl>

                  {immediatePayment && paymentMethod === 'CASH' && (
                    <div className="sales-cash">
                      <div className="sales-cash-head">
                        <span className="sales-cash-title">
                          <Banknote size={15} aria-hidden="true" /> Encaissement en espèces
                        </span>
                        <Button
                          size="xs"
                          onClick={() => {
                            setAmountPaidCDF(saleCurrency === Currency.CDF ? String(netTotal) : '0');
                            setAmountPaidUSD(saleCurrency === Currency.USD ? String(netTotal) : '0');
                          }}
                        >
                          Montant exact
                        </Button>
                      </div>

                      <div className="form-grid">
                        <div>
                          <label className="form-label" htmlFor="cash-cdf">Reçu en francs</label>
                          <div className="input-addon">
                            <input
                              id="cash-cdf"
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              className="input-field"
                              value={amountPaidCDF}
                              onChange={(e) => setAmountPaidCDF(e.target.value)}
                            />
                            <span className="input-addon-text">CDF</span>
                          </div>
                          <div className="sales-quick">
                            {[10000, 20000, 50000].map((val) => (
                              <Button key={val} size="xs" onClick={() => setAmountPaidCDF(String((parseFloat(amountPaidCDF) || 0) + val))}>
                                +{formatNumber(val)}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="form-label" htmlFor="cash-usd">Reçu en dollars</label>
                          <div className="input-addon">
                            <input
                              id="cash-usd"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              className="input-field"
                              value={amountPaidUSD}
                              onChange={(e) => setAmountPaidUSD(e.target.value)}
                            />
                            <span className="input-addon-text">USD</span>
                          </div>
                          <div className="sales-quick">
                            {[10, 20, 50, 100].map((val) => (
                              <Button key={val} size="xs" onClick={() => setAmountPaidUSD(String((parseFloat(amountPaidUSD) || 0) + val))}>
                                +{val} $
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {cashReceivedCdf !== 0 && (
                        changeAmountCdf >= 0 ? (
                          <div className="sales-change is-ok" role="status">
                            <span className="sales-change-label">Monnaie à rendre</span>
                            <span className="sales-change-value">{formatCurrency(changeAmountCdf, Currency.CDF)}</span>
                            {changeAmountCdf > 0 && exchangeRate > 0 && (
                              <span className="sales-change-sub">
                                soit {formatCurrency(convertCurrency(changeAmountCdf, Currency.CDF, Currency.USD, exchangeRate), Currency.USD)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="sales-change is-missing" role="status">
                            <span className="sales-change-label">Reste à payer</span>
                            <span className="sales-change-value">{formatCurrency(Math.abs(changeAmountCdf), Currency.CDF)}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <Button
                    variant="success"
                    size="lg"
                    block
                    icon={<CheckCircle size={18} />}
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                    loading={submitting}
                    loadingText="Enregistrement en cours…"
                    className="sales-checkout"
                  >
                    Valider la vente
                    <kbd className="sales-checkout-kbd">F4</kbd>
                  </Button>
                </>
              )}
            </div>
          </section>
        </div>
      ) : (
        /* Journal des ventes */
        <div className="table-wrapper">
          <div className="table-toolbar">
            <span className="table-toolbar-title">Journal des ventes</span>
            <div className="table-toolbar-actions">
              <Button size="sm" icon={<FileSpreadsheet size={13} />} onClick={exportSales}>Exporter vers Excel</Button>
              <IconButton icon={<RefreshCw />} size="sm" variant="secondary" aria-label="Actualiser" onClick={loadData} />
            </div>
          </div>
          {salesHistory.length === 0 ? (
            <EmptyState icon={Receipt} title="Aucune vente enregistrée" description="Les ventes apparaîtront ici dès leur enregistrement." />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N° de vente</th>
                    <th>Date et heure</th>
                    <th>Client</th>
                    <th>Vendeur</th>
                    <th className="col-num">Articles</th>
                    <th className="col-amount">Montant</th>
                    <th>Facture</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map((s: any) => {
                    const status = getStatusMeta(SALE_STATUS, s.status);
                    return (
                      <tr key={s.id}>
                        <td className="col-mono">{s.saleNumber}</td>
                        <td className="nowrap">{formatDateTime(s.createdAt)}</td>
                        <td>{s.customer?.name || 'Client comptant'}</td>
                        <td>{[s.user?.firstName, s.user?.lastName].filter(Boolean).join(' ') || '—'}</td>
                        <td className="col-num">{formatNumber(s.items?.length || 0)}</td>
                        <td className="col-amount">{formatCurrency(Number(s.total), s.currency)}</td>
                        <td>{s.invoice ? <span className="col-mono">{s.invoice.invoiceNumber}</span> : <span className="text-tertiary">—</span>}</td>
                        <td><StatusBadge tone={status.tone} dot>{status.label}</StatusBadge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vente enregistrée */}
      <Modal
        open={Boolean(successSale)}
        onClose={() => setSuccessSale(null)}
        title={isOfflineSale ? 'Vente enregistrée sur ce poste' : 'Vente enregistrée'}
        description={successSale?.sale?.saleNumber ? `Vente n° ${successSale.sale.saleNumber}` : undefined}
        icon={CheckCircle}
        tone="success"
        closeOnBackdrop={false}
        footer={(
          <div className="sales-success-footer">
            <div className="cluster-sm">
              <Button size="sm" icon={<Share2 size={13} />} onClick={shareReceipt} title="Envoyer le ticket par WhatsApp">WhatsApp</Button>
              <Button size="sm" icon={<Printer size={13} />} onClick={() => printReceipt('80mm')} title="Impression thermique 80 mm">Ticket 80 mm</Button>
              <Button size="sm" onClick={() => printReceipt('58mm')} title="Impression thermique 58 mm">58 mm</Button>
            </div>
            <Button variant="primary" onClick={() => setSuccessSale(null)} data-autofocus>
              Nouvelle vente <kbd className="sales-checkout-kbd">F4</kbd>
            </Button>
          </div>
        )}
      >
        {successSale && (
          <>
            {isOfflineSale ? (
              <Alert tone="warning" icon={WifiOff} title="Reçu provisoire">
                La vente est enregistrée sur ce poste et sera transmise au serveur dès la reconnexion. La facture définitive sera générée à ce moment-là.
              </Alert>
            ) : (
              <p className="sales-success-text">Le stock est mis à jour et la facture a été générée.</p>
            )}
            <dl className="sales-totals sales-totals-boxed">
              <div className="is-total">
                <dt>{immediatePayment ? 'Montant de la vente' : 'Montant à crédit'}</dt>
                <dd>{formatCurrency(Number(successSale.sale?.total), successSale.sale?.currency)}</dd>
              </div>
              <div>
                <dt>Facture</dt>
                <dd className="font-mono">{successSale.invoice?.invoiceNumber || '—'}</dd>
              </div>
              <div>
                <dt>Statut de la facture</dt>
                <dd>{successSale.invoice?.status ? <StatusBadge tone={successInvoiceStatus.tone} size="sm">{successInvoiceStatus.label}</StatusBadge> : '—'}</dd>
              </div>
            </dl>
            <div className="sales-success-qr">
              <QRCodeDisplay
                value={`OPENPME:VENTE=${successSale.sale?.saleNumber};MONTANT=${successSale.sale?.total}${successSale.sale?.currency};DATE=${new Date().toISOString()}`}
                size={96}
                label="Contrôle du reçu"
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
