import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function purgeAllData() {
  console.log('===========================================================');
  console.log('  PURGE INTEGRALE DE LA BASE DE DONNEES (RESET A ZERO)');
  console.log('===========================================================');

  try {
    // 1. Transactions commerciales et financières
    console.log('1. Suppression des ventes, paiements et factures...');
    await prisma.payment.deleteMany({});
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.saleItem.deleteMany({});
    await prisma.sale.deleteMany({});

    // 2. Caisse et sessions
    console.log('2. Suppression des sessions et caisses...');
    await prisma.cashSession.deleteMany({});
    await prisma.cashRegister.deleteMany({});

    // 3. Dépenses et comptes financiers
    console.log('3. Suppression des dépenses et comptes financiers...');
    await prisma.expense.deleteMany({});
    await prisma.financialAccount.deleteMany({});

    // 4. Mouvements de stock et stocks
    console.log('4. Suppression des stocks et mouvements...');
    await prisma.stockMovement.deleteMany({});
    await prisma.warehouseStock.deleteMany({});

    // 5. Produits et catégories
    console.log('5. Suppression des produits et catégories...');
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});

    // 6. Entrepôts
    console.log('6. Suppression des dépôts...');
    await prisma.warehouse.deleteMany({});

    // 7. Tiers (Clients et Fournisseurs)
    console.log('7. Suppression des clients et fournisseurs...');
    await prisma.customer.deleteMany({});
    await prisma.supplier.deleteMany({});

    // 8. Alertes et journaux d’audit
    console.log('8. Suppression des alertes et anomalies...');
    await prisma.anomalyAlert.deleteMany({});
    await prisma.auditLog.deleteMany({});

    console.log('\n===========================================================');
    console.log('  [SUCCES] La base de donnees est maintenant a 100% VIERGE !');
    console.log('  Aucun faux produit, aucune fausse vente, aucun faux client.');
    console.log('  Vous etes pret a saisir vos propres vraies donnees.');
    console.log('===========================================================');
  } catch (error) {
    console.error('[ERREUR] Echec lors de la purge :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

purgeAllData();
