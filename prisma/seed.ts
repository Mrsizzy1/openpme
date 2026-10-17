import { PrismaClient, Currency, UserRole } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = 'smart_pme_salt_2026';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

async function main() {
  console.log('=== Initialisation de la base de données : Configuration Initiale Propre ===');

  // 1. Organisation principale
  const org = await prisma.organization.upsert({
    where: { id: 'org-main-001' },
    update: {
      name: 'Smart PME SARL',
      legalName: 'Smart PME Société à Responsabilité Limitée',
      taxId: 'A1234567B',
      idNat: '01-83-N12345P',
      rccm: 'CD/KIN/RCCM/14-B-3210',
      address: 'Kinshasa Gombe, République Démocratique du Congo',
      city: 'Kinshasa',
      phone: '+243 81 000 0001',
      email: 'contact@smartpme.cd',
    },
    create: {
      id: 'org-main-001',
      name: 'Smart PME SARL',
      legalName: 'Smart PME Société à Responsabilité Limitée',
      taxId: 'A1234567B',
      idNat: '01-83-N12345P',
      rccm: 'CD/KIN/RCCM/14-B-3210',
      address: 'Kinshasa Gombe, République Démocratique du Congo',
      city: 'Kinshasa',
      phone: '+243 81 000 0001',
      email: 'contact@smartpme.cd',
      sector: 'Commerce Général & Distribution',
    },
  });

  console.log(`✓ Organisation configurée : ${org.name}`);

  // 2. Paramètres système OHADA / RDC
  await prisma.organizationSettings.upsert({
    where: { organizationId: org.id },
    update: {
      primaryCurrency: Currency.CDF,
      secondaryCurrency: Currency.USD,
      exchangeRateUsdToCdf: 2850.00,
      taxRatePercent: 16.00,
      enableTax: true,
      invoicePrefix: 'FAC-',
      receiptPrefix: 'REC-',
      paymentTermsDays: 30,
    },
    create: {
      organizationId: org.id,
      primaryCurrency: Currency.CDF,
      secondaryCurrency: Currency.USD,
      exchangeRateUsdToCdf: 2850.00,
      taxRatePercent: 16.00,
      enableTax: true,
      invoicePrefix: 'FAC-',
      receiptPrefix: 'REC-',
      paymentTermsDays: 30,
    },
  });

  // 3. Taux de change officiel BCC initial
  await prisma.exchangeRate.create({
    data: {
      organizationId: org.id,
      fromCurrency: Currency.USD,
      toCurrency: Currency.CDF,
      rate: 2850.00,
      source: 'Banque Centrale du Congo (BCC)',
    },
  });

  // 4. Utilisateurs d'exploitation réels
  const users = [
    {
      id: 'usr-admin-001',
      email: 'admin@smartpme.cd',
      password: 'Admin@2026!',
      firstName: 'Directeur',
      lastName: 'Général',
      role: UserRole.ORG_OWNER,
      phone: '+243 82 111 2233',
    },
    {
      id: 'usr-manager-002',
      email: 'manager@smartpme.cd',
      password: 'Manager@2026!',
      firstName: 'Responsable',
      lastName: 'Opérations',
      role: UserRole.MANAGER,
      phone: '+243 81 222 3344',
    },
    {
      id: 'usr-comptable-003',
      email: 'comptable@smartpme.cd',
      password: 'Comptable@2026!',
      firstName: 'Comptable',
      lastName: 'Principal',
      role: UserRole.ACCOUNTANT,
      phone: '+243 85 333 4455',
    },
    {
      id: 'usr-caissier-004',
      email: 'caissier@smartpme.cd',
      password: 'Caissier@2026!',
      firstName: 'Opérateur',
      lastName: 'Caisse',
      role: UserRole.CASHIER,
      phone: '+243 89 444 5566',
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: hashPassword(u.password),
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: true,
      },
      create: {
        id: u.id,
        organizationId: org.id,
        email: u.email,
        passwordHash: hashPassword(u.password),
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        phone: u.phone,
        isActive: true,
      },
    });
  }

  console.log('✓ Utilisateurs configurés : Admin, Manager, Comptable, Caissier');

  // 5. Entrepôt principal par défaut
  await prisma.warehouse.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Dépôt Principal' } },
    update: {},
    create: {
      id: 'wh-main-001',
      organizationId: org.id,
      name: 'Dépôt Principal',
      location: 'Showroom & Stock Kinshasa',
      isDefault: true,
    },
  });

  // 6. Client Comptant Standard (pour les ventes comptoir directes)
  await prisma.customer.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'CLI-COMPTANT' } },
    update: {},
    create: {
      id: 'cli-comptant-001',
      organizationId: org.id,
      code: 'CLI-COMPTANT',
      name: 'Client Comptant',
      phone: '+243 00 000 0000',
      creditLimit: 0.00,
      outstandingBalance: 0.00,
      currency: Currency.CDF,
      isActive: true,
    },
  });

  // 7. Caisse de vente standard
  await prisma.cashRegister.upsert({
    where: { id: 'csh-reg-001' },
    update: {
      name: 'Caisse Principale',
      location: 'Point de vente',
    },
    create: {
      id: 'csh-reg-001',
      organizationId: org.id,
      name: 'Caisse Principale',
      location: 'Point de vente',
    },
  });

  // 8. Journal d'audit de l'initialisation
  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: 'usr-admin-001',
      action: 'SYSTEM_INITIALIZATION',
      entity: 'Organization',
      entityId: org.id,
      newValues: { message: 'Initialisation propre du système sans fausses données' },
      ipAddress: '127.0.0.1',
      userAgent: 'Smart PME Core Initializer',
    },
  });

  console.log('\n--- Initialisation terminée avec succès ---');
  console.log('Base de données initialisée sans aucune fausse donnée.');
  console.log('Les stocks, ventes, factures et alertes seront créés par vos opérations réelles.');
  console.log('Comptes de connexion :');
  console.log('  Admin     : admin@smartpme.cd     / Admin@2026!');
  console.log('  Manager   : manager@smartpme.cd   / Manager@2026!');
  console.log('  Comptable : comptable@smartpme.cd / Comptable@2026!');
  console.log('  Caissier  : caissier@smartpme.cd  / Caissier@2026!');
}

main()
  .catch((e) => {
    console.error('Erreur lors de l’initialisation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
