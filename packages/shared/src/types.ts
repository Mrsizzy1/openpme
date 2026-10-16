import {
  UserRole,
  Currency,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
  PaymentStatus,
  StockMovementType,
  TransactionType,
  CashSessionStatus,
  AnomalySeverity,
  AnomalyStatus,
  AnomalyRuleType,
  SaleStatus,
  PurchaseStatus
} from './enums';

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface OrganizationSettings {
  primaryCurrency: Currency;
  secondaryCurrency: Currency;
  exchangeRateUsdToCdf: number;
  taxRatePercent: number; // e.g. 16% TVA RDC
  enableTax: boolean;
  invoicePrefix: string;
  quotePrefix: string;
  receiptPrefix: string;
  invoiceNextNumber: number;
  quoteNextNumber: number;
  paymentTermsDays: number;
  invoiceFooterNote?: string;
  bankDetails?: string;
  mobileMoneyDetails?: string;
  alertMaxDiscountPercent: number;
  alertLargeExpenseThreshold: number;
  alertCashDiscrepancyThreshold: number;
  primaryColor: string;
  themeMode: 'light' | 'dark';
}

export interface OrganizationProfile {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string; // NIF / Numéro Impôt
  rccm?: string; // Registre du Commerce et du Crédit Mobilier
  idNat?: string; // Identification Nationale RDC
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  logoUrl?: string;
  sector?: string;
  settings?: OrganizationSettings;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: UserSummary;
  organization: OrganizationProfile;
}

export interface ProductDto {
  id: string;
  organizationId: string;
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  purchasePrice: number;
  salePrice: number;
  currency: Currency;
  minStockLevel: number;
  currentStock: number;
  unit: string;
  isService: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerDto {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit: number;
  outstandingBalance: number;
  currency: Currency;
  isActive: boolean;
  createdAt: string;
}

export interface SupplierDto {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  outstandingDebt: number;
  currency: Currency;
  isActive: boolean;
  createdAt: string;
}

export interface SaleItemDto {
  id?: string;
  productId: string;
  productName?: string;
  productCode?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRatePercent: number;
  total: number;
}

export interface SaleDto {
  id: string;
  organizationId: string;
  saleNumber: string;
  customerId?: string;
  customerName?: string;
  userId: string;
  userName?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  currency: Currency;
  status: SaleStatus;
  notes?: string;
  items: SaleItemDto[];
  invoiceId?: string;
  createdAt: string;
}

export interface InvoiceDto {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balance: number;
  currency: Currency;
  notes?: string;
  terms?: string;
  items: SaleItemDto[];
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  organizationId: string;
  paymentNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  reference?: string;
  status: PaymentStatus;
  notes?: string;
  cashSessionId?: string;
  createdAt: string;
}

export interface ExpenseDto {
  id: string;
  organizationId: string;
  expenseNumber: string;
  category: string;
  amount: number;
  currency: Currency;
  beneficiary: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  date: string;
  userId: string;
  userName?: string;
  createdAt: string;
}

export interface CashSessionDto {
  id: string;
  organizationId: string;
  cashRegisterId: string;
  cashRegisterName?: string;
  userId: string;
  userName?: string;
  openingBalance: number;
  closingBalance?: number;
  theoreticalBalance?: number;
  difference?: number;
  currency: Currency;
  status: CashSessionStatus;
  openedAt: string;
  closedAt?: string;
  notes?: string;
}

export interface AnomalyAlertDto {
  id: string;
  organizationId: string;
  ruleType: AnomalyRuleType;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  title: string;
  explanation: string;
  entityType: string;
  entityId: string;
  observedValue?: string;
  expectedThreshold?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  createdAt: string;
}

export interface DashboardMetrics {
  todaySales: number;
  todaySalesCount: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  netMargin: number;
  totalReceivables: number; // Créances clients
  totalPayables: number; // Dettes fournisseurs
  totalCashBalance: number;
  primaryCurrency: Currency;
  lowStockItemsCount: number;
  activeAnomaliesCount: number;
  unpaidInvoicesCount: number;
}
