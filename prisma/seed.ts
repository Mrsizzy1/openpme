import { PrismaClient, UserRole, Currency, InvoiceStatus, InvoiceType, PaymentMethod, PaymentStatus, StockMovementType, AnomalySeverity, AnomalyStatus, AnomalyRuleType, SaleStatus, CashSessionStatus } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  // SHA-256 + salt for secure reproducible seed
  const salt = 'smart_pme_salt_2026';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

async function main() {
  console.log('--- Seeding Smart PME Finance Database ---');

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { id: 'org-kivu-commerce-001' },
    update: {},
    create: {
      id: 'org-kivu-commerce-001',
      name: 'Kivu Commerce & Services SARL',
      legalName: 'Kivu Commerce et Services Société à Responsabilité Limitée',
      taxId: 'A1209384B', // NIF
      rccm: 'CD/KIN/RCCM/24-B-01429',
      idNat: '01-83-N48201J',
      email: 'contact@kivucommerce.cd',
      phone: '+243 81 000 1234',
      address: '142 Avenue de la Justice, Commune de la Gombe',
      city: 'Kinshasa',
      country: 'République démocratique du Congo',
      sector: 'Commerce Général & Technologies',
      logoUrl: '/assets/logo-kivu.svg',
      isActive: true,
    },
  });

  console.log(`✓ Organization created: ${org.name}`);

  // 2. Organization Settings
  await prisma.organizationSettings.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      primaryCurrency: Currency.CDF,
      secondaryCurrency: Currency.USD,
      exchangeRateUsdToCdf: 2850.00,
      taxRatePercent: 16.00,
      enableTax: true,
      invoicePrefix: 'FAC-2026-',
      quotePrefix: 'DEV-2026-',
      receiptPrefix: 'REC-2026-',
      invoiceNextNumber: 1003,
      quoteNextNumber: 1001,
      paymentTermsDays: 30,
      invoiceFooterNote: 'Facture soumise à la TVA de 16% en vigueur en RDC. Tout retard de paiement engendre des pénalités légales.',
      bankDetails: 'Rawbank CDF: 01002-00049281001-44 | EquityBCDC USD: 00012-99283741002-18',
      mobileMoneyDetails: 'M-Pesa Marchand Vodacom: +243 81 000 1234 / Code: 89321',
      alertMaxDiscountPercent: 15.00,
      alertLargeExpenseThreshold: 2000000.00, // 2M CDF
      alertCashDiscrepancyThreshold: 15000.00,
      primaryColor: '#1E3A8A',
      themeMode: 'light',
    },
  });

  // 3. Create Exchange Rates
  await prisma.exchangeRate.create({
    data: {
      organizationId: org.id,
      fromCurrency: Currency.USD,
      toCurrency: Currency.CDF,
      rate: 2850.00,
      source: 'Banque Centrale du Congo (BCC)',
    },
  });

  // 4. Create Users
  const passwordHash = hashPassword('Admin@2026!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartpme.cd' },
    update: {},
    create: {
      id: 'usr-admin-001',
      organizationId: org.id,
      email: 'admin@smartpme.cd',
      passwordHash,
      firstName: 'Alain',
      lastName: 'Mukendi',
      role: UserRole.ORG_OWNER,
      phone: '+243 82 111 2233',
      isActive: true,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@smartpme.cd' },
    update: {},
    create: {
      id: 'usr-manager-002',
      organizationId: org.id,
      email: 'manager@smartpme.cd',
      passwordHash: hashPassword('Manager@2026!'),
      firstName: 'Grace',
      lastName: 'Kalonji',
      role: UserRole.MANAGER,
      phone: '+243 81 222 3344',
      isActive: true,
    },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'comptable@smartpme.cd' },
    update: {},
    create: {
      id: 'usr-comptable-003',
      organizationId: org.id,
      email: 'comptable@smartpme.cd',
      passwordHash: hashPassword('Comptable@2026!'),
      firstName: 'Christian',
      lastName: 'Ilunga',
      role: UserRole.ACCOUNTANT,
      phone: '+243 85 333 4455',
      isActive: true,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'caissier@smartpme.cd' },
    update: {},
    create: {
      id: 'usr-caissier-004',
      organizationId: org.id,
      email: 'caissier@smartpme.cd',
      passwordHash: hashPassword('Caissier@2026!'),
      firstName: 'Dorcas',
      lastName: 'Mwamba',
      role: UserRole.CASHIER,
      phone: '+243 89 444 5566',
      isActive: true,
    },
  });

  console.log(`✓ Users created: Admin (${admin.email}), Manager, Accountant, Cashier`);

  // 5. Create Warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Dépôt Central Kinshasa' } },
    update: {},
    create: {
      id: 'wh-kinshasa-001',
      organizationId: org.id,
      name: 'Dépôt Central Kinshasa',
      location: 'Hangar B, Zone Industrielle Limete, Kinshasa',
      isDefault: true,
    },
  });

  // 6. Create Categories
  const catIT = await prisma.category.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Informatique & Électronique' } },
    update: {},
    create: {
      id: 'cat-it-001',
      organizationId: org.id,
      name: 'Informatique & Électronique',
      description: 'Ordinateurs portables, serveurs, accessoires et périphériques',
    },
  });

  const catAgro = await prisma.category.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Agro-Alimentaire' } },
    update: {},
    create: {
      id: 'cat-agro-002',
      organizationId: org.id,
      name: 'Agro-Alimentaire',
      description: 'Produits de première nécessité, vivres frais et conserves',
    },
  });

  const catServices = await prisma.category.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Services Professionnels' } },
    update: {},
    create: {
      id: 'cat-serv-003',
      organizationId: org.id,
      name: 'Services Professionnels',
      description: 'Conseil, assistance technique et maintenance',
    },
  });

  // 7. Create Products
  const prodLaptop = await prisma.product.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'PRD-DELL-5420' } },
    update: {},
    create: {
      id: 'prd-dell-001',
      organizationId: org.id,
      categoryId: catIT.id,
      code: 'PRD-DELL-5420',
      barcode: '694123456001',
      name: 'Ordinateur Portable Dell Latitude 5420 i7 16GB',
      description: 'PC portable professionnel pour entreprise avec garantie constructeur 1 an',
      purchasePrice: 1400000.00,
      salePrice: 1850000.00,
      currency: Currency.CDF,
      minStockLevel: 3,
      currentStock: 15,
      unit: 'Pièce',
      isService: false,
    },
  });

  const prodPrinter = await prisma.product.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'PRD-HP-M404' } },
    update: {},
    create: {
      id: 'prd-hp-002',
      organizationId: org.id,
      categoryId: catIT.id,
      code: 'PRD-HP-M404',
      barcode: '694123456002',
      name: 'Imprimante Laser HP LaserJet Pro M404dn',
      description: 'Imprimante réseau recto-verso ultra rapide pour bureaux PME',
      purchasePrice: 720000.00,
      salePrice: 950000.00,
      currency: Currency.CDF,
      minStockLevel: 2,
      currentStock: 8,
      unit: 'Pièce',
      isService: false,
    },
  });

  const prodRiz = await prisma.product.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'PRD-RIZ-25KG' } },
    update: {},
    create: {
      id: 'prd-riz-003',
      organizationId: org.id,
      categoryId: catAgro.id,
      code: 'PRD-RIZ-25KG',
      barcode: '694123456003',
      name: 'Sac de Riz Blanc Parfumé 25kg (Lion)',
      description: 'Riz de qualité supérieure importé conditionné en sac renforcé',
      purchasePrice: 62000.00,
      salePrice: 75000.00,
      currency: Currency.CDF,
      minStockLevel: 10,
      currentStock: 45,
      unit: 'Sac',
      isService: false,
    },
  });

  const prodLait = await prisma.product.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'PRD-LAIT-NIDO' } },
    update: {},
    create: {
      id: 'prd-lait-004',
      organizationId: org.id,
      categoryId: catAgro.id,
      code: 'PRD-LAIT-NIDO',
      barcode: '694123456004',
      name: 'Carton Lait en Poudre Nido 2.5kg (x6 boîtes)',
      description: 'Lait entier instantané enrichi en vitamines et minéraux',
      purchasePrice: 155000.00,
      salePrice: 185000.00,
      currency: Currency.CDF,
      minStockLevel: 5,
      currentStock: 2, // Low stock on purpose to trigger alert!
      unit: 'Carton',
      isService: false,
    },
  });

  const prodServiceIT = await prisma.product.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'SRV-MAINT-INF' } },
    update: {},
    create: {
      id: 'srv-maint-005',
      organizationId: org.id,
      categoryId: catServices.id,
      code: 'SRV-MAINT-INF',
      name: 'Maintenance & Support Réseau / Postes (Forfait Mensuel)',
      description: 'Intervention préventive et curative mensuelle sur site et à distance',
      purchasePrice: 0.00,
      salePrice: 450000.00,
      currency: Currency.CDF,
      minStockLevel: 0,
      currentStock: 999,
      unit: 'Forfait',
      isService: true,
    },
  });

  // Link stocks to default warehouse
  for (const prod of [prodLaptop, prodPrinter, prodRiz, prodLait]) {
    await prisma.warehouseStock.upsert({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: prod.id } },
      update: { quantity: prod.currentStock },
      create: {
        warehouseId: warehouse.id,
        productId: prod.id,
        quantity: prod.currentStock,
      },
    });
  }

  // 8. Create Customers
  const customer1 = await prisma.customer.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'CLI-SOMIKAT' } },
    update: {},
    create: {
      id: 'cli-somikat-001',
      organizationId: org.id,
      code: 'CLI-SOMIKAT',
      name: 'Société Minière du Katanga SARL (SOMIKAT)',
      companyName: 'SOMIKAT SARL',
      email: 'appro@somikat-rdc.com',
      phone: '+243 99 876 5432',
      address: 'Route Likasi, Kolwezi / Bureau de liaison Gombe Kinshasa',
      creditLimit: 25000000.00,
      outstandingBalance: 1850000.00,
      currency: Currency.CDF,
      isActive: true,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'CLI-KINEXPRESS' } },
    update: {},
    create: {
      id: 'cli-kinexpress-002',
      organizationId: org.id,
      code: 'CLI-KINEXPRESS',
      name: 'Supermarché Kin-Express SARL',
      companyName: 'Kin-Express Distribution',
      email: 'compta@kinexpress.cd',
      phone: '+243 81 555 4433',
      address: 'Boulevard du 30 Juin, Kinshasa Gombe',
      creditLimit: 10000000.00,
      outstandingBalance: 0.00,
      currency: Currency.CDF,
      isActive: true,
    },
  });

  const customerComptant = await prisma.customer.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'CLI-COMPTANT' } },
    update: {},
    create: {
      id: 'cli-comptant-003',
      organizationId: org.id,
      code: 'CLI-COMPTANT',
      name: 'Client Comptant / Magasin',
      phone: '+243 00 000 0000',
      creditLimit: 0.00,
      outstandingBalance: 0.00,
      currency: Currency.CDF,
      isActive: true,
    },
  });

  // 9. Create Suppliers
  const supplier1 = await prisma.supplier.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'FRS-CONGOTECH' } },
    update: {},
    create: {
      id: 'frs-congotech-001',
      organizationId: org.id,
      code: 'FRS-CONGOTECH',
      name: 'Congo Tech Distribution SARL',
      contactPerson: 'Michel Van Der Broeck',
      email: 'commandes@congotech.cd',
      phone: '+243 82 999 8877',
      address: 'Avenue du Port, Kinshasa Gombe',
      outstandingDebt: 4200000.00,
      currency: Currency.CDF,
      isActive: true,
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'FRS-GMC' } },
    update: {},
    create: {
      id: 'frs-gmc-002',
      organizationId: org.id,
      code: 'FRS-GMC',
      name: 'Grands Moulins du Congo (GMC)',
      contactPerson: 'Patrice Kabeya',
      email: 'ventes@gmc.cd',
      phone: '+243 81 777 6655',
      address: 'Route Matadi, Kinshasa Ngaliema',
      outstandingDebt: 0.00,
      currency: Currency.CDF,
      isActive: true,
    },
  });

  // 10. Financial Accounts
  const accRawbank = await prisma.financialAccount.create({
    data: {
      id: 'acc-rawbank-cdf-001',
      organizationId: org.id,
      name: 'Compte Courant Principal Rawbank (CDF)',
      type: 'BANK',
      accountNumber: '01002-00049281001-44',
      bankName: 'Rawbank Kinshasa Gombe',
      balance: 14850000.00,
      currency: Currency.CDF,
    },
  });

  const accEquity = await prisma.financialAccount.create({
    data: {
      id: 'acc-equity-usd-002',
      organizationId: org.id,
      name: 'Compte Commercial EquityBCDC (USD)',
      type: 'BANK',
      accountNumber: '00012-99283741002-18',
      bankName: 'EquityBCDC RDC',
      balance: 8500.00,
      currency: Currency.USD,
    },
  });

  const accMpesa = await prisma.financialAccount.create({
    data: {
      id: 'acc-mpesa-003',
      organizationId: org.id,
      name: 'Compte M-Pesa Vodacom Marchand',
      type: 'MOBILE_MONEY',
      accountNumber: '89321',
      bankName: 'Vodacom Congo',
      balance: 1250000.00,
      currency: Currency.CDF,
    },
  });

  // 11. Cash Register and Cash Session
  const cashReg = await prisma.cashRegister.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Caisse Magasin 1' } },
    update: {},
    create: {
      id: 'csh-reg-001',
      organizationId: org.id,
      name: 'Caisse Magasin 1',
      location: 'Showroom Principal Kinshasa',
    },
  });

  const cashSession = await prisma.cashSession.create({
    data: {
      id: 'csh-sess-001',
      organizationId: org.id,
      cashRegisterId: cashReg.id,
      userId: cashier.id,
      openingBalance: 300000.00,
      currency: Currency.CDF,
      status: CashSessionStatus.OPEN,
      notes: 'Session ouverte pour la journée commerciale',
    },
  });

  // 12. Sales and Invoices
  // Sale 1: Paid in cash
  const sale1 = await prisma.sale.create({
    data: {
      id: 'sale-001',
      organizationId: org.id,
      saleNumber: 'VNT-2026-0001',
      customerId: customerComptant.id,
      userId: cashier.id,
      subtotal: 1850000.00,
      discountAmount: 0.00,
      taxAmount: 296000.00, // 16% TVA
      total: 2146000.00,
      currency: Currency.CDF,
      status: SaleStatus.COMPLETED,
      notes: 'Vente directe au comptoir d’un laptop Dell',
      items: {
        create: [
          {
            productId: prodLaptop.id,
            quantity: 1,
            unitPrice: 1850000.00,
            taxRatePercent: 16.00,
            total: 2146000.00,
          },
        ],
      },
    },
  });

  const inv1 = await prisma.invoice.create({
    data: {
      id: 'inv-001',
      organizationId: org.id,
      invoiceNumber: 'FAC-2026-1001',
      type: InvoiceType.STANDARD,
      status: InvoiceStatus.PAID,
      customerId: customerComptant.id,
      saleId: sale1.id,
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      subtotal: 1850000.00,
      discountAmount: 0.00,
      taxAmount: 296000.00,
      total: 2146000.00,
      paidAmount: 2146000.00,
      balance: 0.00,
      currency: Currency.CDF,
      notes: 'Règlement intégral effectué en caisse',
      items: {
        create: [
          {
            productId: prodLaptop.id,
            description: 'Ordinateur Portable Dell Latitude 5420 i7 16GB',
            quantity: 1,
            unitPrice: 1850000.00,
            taxRatePercent: 16.00,
            total: 2146000.00,
          },
        ],
      },
    },
  });

  // Payment for Inv 1
  await prisma.payment.create({
    data: {
      id: 'pay-001',
      organizationId: org.id,
      paymentNumber: 'REC-2026-1001',
      invoiceId: inv1.id,
      customerId: customerComptant.id,
      cashSessionId: cashSession.id,
      userId: cashier.id,
      amount: 2146000.00,
      currency: Currency.CDF,
      method: PaymentMethod.CASH,
      reference: 'RECU-CAISSE-001',
      status: PaymentStatus.COMPLETED,
      notes: 'Encaissement direct en espèces',
    },
  });

  // Invoice 2: Sent to SOMIKAT, partially paid (Créance)
  const inv2 = await prisma.invoice.create({
    data: {
      id: 'inv-002',
      organizationId: org.id,
      invoiceNumber: 'FAC-2026-1002',
      type: InvoiceType.STANDARD,
      status: InvoiceStatus.PARTIALLY_PAID,
      customerId: customer1.id,
      dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000),
      subtotal: 3750000.00,
      discountAmount: 0.00,
      taxAmount: 600000.00,
      total: 4350000.00,
      paidAmount: 2500000.00,
      balance: 1850000.00,
      currency: Currency.CDF,
      notes: 'Commande matériel réseau et imprimantes - Acompte 57% versé par virement Rawbank',
      terms: 'Solde payable sous 15 jours à réception des PV de mise en service',
      items: {
        create: [
          {
            productId: prodPrinter.id,
            description: 'Imprimante Laser HP LaserJet Pro M404dn (x3)',
            quantity: 3,
            unitPrice: 950000.00,
            taxRatePercent: 16.00,
            total: 3306000.00,
          },
          {
            productId: prodServiceIT.id,
            description: 'Installation & Paramétrage réseau imprimantes',
            quantity: 2,
            unitPrice: 450000.00,
            taxRatePercent: 16.00,
            total: 1044000.00,
          },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      id: 'pay-002',
      organizationId: org.id,
      paymentNumber: 'REC-2026-1002',
      invoiceId: inv2.id,
      customerId: customer1.id,
      userId: accountant.id,
      amount: 2500000.00,
      currency: Currency.CDF,
      method: PaymentMethod.BANK_TRANSFER,
      reference: 'VIR-RAWBANK-SOMIKAT-8819',
      status: PaymentStatus.COMPLETED,
      notes: 'Acompte reçu sur compte Rawbank',
    },
  });

  // 13. Expenses
  await prisma.expense.create({
    data: {
      id: 'exp-001',
      organizationId: org.id,
      expenseNumber: 'DEP-2026-0001',
      category: 'Loyer & Charges Immobilières',
      amount: 1500000.00,
      currency: Currency.CDF,
      beneficiary: 'Bailleur Immeuble Justice Gombe',
      method: PaymentMethod.BANK_TRANSFER,
      reference: 'LOYER-OCTOBRE-2026',
      notes: 'Loyer mensuel bureau principal Kinshasa',
      userId: manager.id,
      financialAccountId: accRawbank.id,
    },
  });

  await prisma.expense.create({
    data: {
      id: 'exp-002',
      organizationId: org.id,
      expenseNumber: 'DEP-2026-0002',
      category: 'Énergie & Électricité SNEL',
      amount: 320000.00,
      currency: Currency.CDF,
      beneficiary: 'SNEL Kinshasa',
      method: PaymentMethod.MOBILE_MONEY_MPESA,
      reference: 'SNEL-FAC-99201',
      notes: 'Consommation électrique locaux de stockage Limete',
      userId: accountant.id,
      financialAccountId: accMpesa.id,
    },
  });

  // 14. Stock Movements traceability
  await prisma.stockMovement.create({
    data: {
      organizationId: org.id,
      warehouseId: warehouse.id,
      productId: prodLaptop.id,
      userId: cashier.id,
      type: StockMovementType.OUT_SALE,
      quantity: 1,
      previousStock: 16,
      newStock: 15,
      reference: 'VNT-2026-0001',
      reason: 'Vente directe comptoir',
    },
  });

  // 15. Intelligent Anomaly Alerts
  await prisma.anomalyAlert.create({
    data: {
      id: 'anom-001',
      organizationId: org.id,
      ruleType: AnomalyRuleType.NEGATIVE_STOCK,
      severity: AnomalySeverity.HIGH,
      status: AnomalyStatus.DETECTED,
      title: 'Stock critique inférieur au seuil de sécurité',
      explanation: 'Le produit "Carton Lait en Poudre Nido 2.5kg" a un stock actuel de 2 unités, ce qui est en-dessous du seuil minimum configuré de 5 unités.',
      entityType: 'Product',
      entityId: prodLait.id,
      observedValue: '2 unités',
      expectedThreshold: 'Seuil min: 5 unités',
    },
  });

  await prisma.anomalyAlert.create({
    data: {
      id: 'anom-002',
      organizationId: org.id,
      ruleType: AnomalyRuleType.ABNORMAL_EXPENSE,
      severity: AnomalySeverity.MEDIUM,
      status: AnomalyStatus.UNDER_REVIEW,
      title: 'Dépense importante en attente de vérification',
      explanation: 'La dépense DEP-2026-0001 d’un montant de 1,500,000 CDF dépasse 75% du seuil d’alerte configuré (2,000,000 CDF).',
      entityType: 'Expense',
      entityId: 'exp-001',
      observedValue: '1,500,000 CDF',
      expectedThreshold: '2,000,000 CDF',
    },
  });

  // 16. Audit Log
  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: admin.id,
      action: 'INITIAL_SYSTEM_SETUP',
      entity: 'Organization',
      entityId: org.id,
      newValues: { message: 'Initialisation de la plateforme et chargement des paramètres par défaut' },
      ipAddress: '127.0.0.1',
      userAgent: 'Smart PME Platform Seed Initializer',
    },
  });

  console.log('--- Database Seeding Completed Successfully! ---');
  console.log('Identifiants de connexion pré-configurés :');
  console.log('1. Administrateur / Propriétaire : admin@smartpme.cd / Admin@2026!');
  console.log('2. Gérant / Manager             : manager@smartpme.cd / Manager@2026!');
  console.log('3. Comptable                     : comptable@smartpme.cd / Comptable@2026!');
  console.log('4. Caissier                      : caissier@smartpme.cd / Caissier@2026!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
