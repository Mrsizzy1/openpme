import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Currency, PaymentMethod, Prisma } from '@prisma/client';
import { SalesService } from '../src/modules/sales/sales.service';

function createStockSaleService(initialStock: number, initialWarehouseStock = initialStock) {
  let productStock = initialStock;
  let warehouseStock = initialWarehouseStock;
  const movements: any[] = [];
  let createdSale = false;
  const product = {
    id: 'product-1',
    name: 'Riz 25 kg',
    purchasePrice: new Prisma.Decimal(50),
    salePrice: new Prisma.Decimal(100),
    currency: Currency.CDF,
    isService: false,
    currentStock: initialStock,
  };
  const settings = {
    primaryCurrency: Currency.CDF,
    exchangeRateUsdToCdf: new Prisma.Decimal(2850),
    enableTax: false,
    taxRatePercent: new Prisma.Decimal(16),
    alertMaxDiscountPercent: new Prisma.Decimal(15),
    invoiceNextNumber: 1001,
    invoicePrefix: 'FAC-',
    receiptPrefix: 'REC-',
  };
  const transaction = {
    organizationSettings: {
      findUnique: async () => settings,
      update: async () => settings,
    },
    exchangeRate: { findFirst: async () => null },
    warehouse: { findFirst: async () => ({ id: 'warehouse-1' }) },
    customer: { findFirst: async () => ({ id: 'customer-1' }) },
    product: {
      findFirst: async () => product,
      update: async ({ data }: any) => { productStock = data.currentStock; },
    },
    $queryRaw: async () => [{ currentStock: productStock }],
    warehouseStock: {
      findUnique: async () => ({ id: 'warehouse-stock-1', quantity: warehouseStock }),
      update: async ({ data }: any) => { warehouseStock = data.quantity; },
    },
    stockMovement: {
      create: async ({ data }: any) => { movements.push(data); return data; },
    },
    anomalyAlert: { create: async () => undefined },
    sale: {
      create: async () => {
        createdSale = true;
        return { id: 'sale-1', saleNumber: 'VNT-000001' };
      },
    },
    invoice: { create: async () => ({ id: 'invoice-1' }) },
  };
  const prisma = {
    $transaction: async (callback: (tx: any) => Promise<unknown>) => callback(transaction),
  };

  return {
    service: new SalesService(prisma as any),
    getStock: () => ({ productStock, warehouseStock }),
    movements,
    saleCreated: () => createdSale,
  };
}

const saleData = (quantity: number) => ({
  customerId: 'customer-1',
  currency: Currency.CDF,
  immediatePayment: false,
  items: [{ productId: 'product-1', quantity, discountPercent: 0, taxRatePercent: 0 }],
});

describe('sales inventory', () => {
  it('rejects a sale that exceeds stock without changing either stock balance', async () => {
    const fixture = createStockSaleService(2);

    await assert.rejects(
      fixture.service.createSale('org-1', 'user-1', saleData(3) as any),
      /Stock insuffisant.*2 disponible.*3 demandé/,
    );

    assert.deepEqual(fixture.getStock(), { productStock: 2, warehouseStock: 2 });
    assert.equal(fixture.saleCreated(), false);
    assert.equal(fixture.movements.length, 0);
  });

  it('deducts a completed sale from both product and warehouse stock', async () => {
    const fixture = createStockSaleService(5);

    await fixture.service.createSale('org-1', 'user-1', saleData(2) as any);

    assert.deepEqual(fixture.getStock(), { productStock: 3, warehouseStock: 3 });
    assert.equal(fixture.saleCreated(), true);
    assert.equal(fixture.movements.length, 1);
    assert.equal(fixture.movements[0].previousStock, 5);
    assert.equal(fixture.movements[0].newStock, 3);
  });

  it('refuses a sale when the default warehouse has less stock than the product balance', async () => {
    const fixture = createStockSaleService(5, 1);

    await assert.rejects(
      fixture.service.createSale('org-1', 'user-1', saleData(2) as any),
      /Stock insuffisant dans le dépôt.*1 disponible.*2 demandé/,
    );

    assert.deepEqual(fixture.getStock(), { productStock: 5, warehouseStock: 1 });
    assert.equal(fixture.saleCreated(), false);
    assert.equal(fixture.movements.length, 0);
  });

  it('does not mark an unverified electronic payment as received', async () => {
    const fixture = createStockSaleService(5);

    await assert.rejects(
      fixture.service.createSale('org-1', 'user-1', {
        ...saleData(1),
        immediatePayment: true,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      } as any),
      /paiements électroniques ou par banque ne sont pas vérifiables/,
    );

    assert.deepEqual(fixture.getStock(), { productStock: 5, warehouseStock: 5 });
    assert.equal(fixture.saleCreated(), false);
    assert.equal(fixture.movements.length, 0);
  });
});
