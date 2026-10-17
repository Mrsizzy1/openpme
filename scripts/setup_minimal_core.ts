import { PrismaClient, Currency } from '@prisma/client';

const prisma = new PrismaClient();

async function setupMinimalCore() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('Aucune organisation trouvée.');
    return;
  }

  // 1. Dépôt principal pour le stockage
  await prisma.warehouse.upsert({
    where: { id: 'wh-main-001' },
    update: {},
    create: {
      id: 'wh-main-001',
      organizationId: org.id,
      name: 'Dépôt Principal',
      location: 'Magasin / Showroom',
      isDefault: true,
    },
  });

  // 2. Client Comptant (standard pour les ventes directes)
  await prisma.customer.upsert({
    where: { id: 'cli-comptant-001' },
    update: {},
    create: {
      id: 'cli-comptant-001',
      organizationId: org.id,
      code: 'CLI-COMPTANT',
      name: 'Client Comptant',
      phone: '+243 00 000 0000',
      creditLimit: 0,
      outstandingBalance: 0,
      currency: Currency.CDF,
      isActive: true,
    },
  });

  // 3. Caisse enregistreuse principale
  await prisma.cashRegister.upsert({
    where: { id: 'csh-reg-001' },
    update: {},
    create: {
      id: 'csh-reg-001',
      organizationId: org.id,
      name: 'Caisse Principale 1',
      location: 'Comptoir de vente',
    },
  });

  console.log('✓ Socle minimal prêt : Dépôt, Caisse et Client Comptant configurés.');
}

setupMinimalCore().finally(() => prisma.$disconnect());
