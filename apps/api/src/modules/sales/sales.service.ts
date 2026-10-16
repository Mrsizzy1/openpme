import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateInvoiceTotals, roundMoney } from '@smart-pme/shared';
import {
  Currency,
  SaleStatus,
  StockMovementType,
  InvoiceType,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  AnomalySeverity,
  AnomalyStatus,
  AnomalyRuleType,
} from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, limit = 50) {
    return this.prisma.sale.findMany({
      where: { organizationId },
      include: {
        customer: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: true } },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findById(organizationId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: true } },
        invoice: {
          include: { payments: true },
        },
      },
    });
    if (!sale) throw new NotFoundException('Vente non trouvée');
    return sale;
  }

  async createSale(organizationId: string, userId: string, data: any) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Une vente doit contenir au moins un article');
    }

    const orgSettings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { organizationId, isDefault: true },
    });

    if (!defaultWarehouse) {
      throw new BadRequestException('Aucun dépôt de stockage par défaut configuré');
    }

    // Recalculate totals on backend to guarantee financial integrity
    const itemsWithCalc = data.items.map((item: any) => {
      const qty = Math.max(1, parseInt(item.quantity, 10));
      const price = Math.max(0, parseFloat(item.unitPrice));
      const discount = Math.min(Math.max(0, parseFloat(item.discountPercent || 0)), 100);
      const taxRate = orgSettings?.enableTax ? parseFloat(item.taxRatePercent ?? orgSettings.taxRatePercent.toString()) : 0;

      const gross = roundMoney(qty * price);
      const discAmt = roundMoney(gross * (discount / 100));
      const taxable = roundMoney(gross - discAmt);
      const taxAmt = roundMoney(taxable * (taxRate / 100));
      const total = roundMoney(taxable + taxAmt);

      return {
        productId: item.productId,
        quantity: qty,
        unitPrice: price,
        discountPercent: discount,
        taxRatePercent: taxRate,
        gross,
        discAmt,
        taxAmt,
        total,
      };
    });

    const subtotal = roundMoney(itemsWithCalc.reduce((acc, i) => acc + i.gross, 0));
    const discountAmount = roundMoney(itemsWithCalc.reduce((acc, i) => acc + i.discAmt, 0));
    const taxAmount = roundMoney(itemsWithCalc.reduce((acc, i) => acc + i.taxAmt, 0));
    const total = roundMoney(itemsWithCalc.reduce((acc, i) => acc + i.total, 0));

    const saleNumber = `VNT-${Date.now().toString().slice(-6)}`;
    const currency = (data.currency as Currency) || orgSettings?.primaryCurrency || Currency.CDF;

    return this.prisma.$transaction(async (tx) => {
      // 1. Check & Decrement Stock for each physical product
      for (const item of itemsWithCalc) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod) throw new NotFoundException(`Produit ID ${item.productId} introuvable`);

        if (!prod.isService) {
          const currentStock = prod.currentStock;
          const newStock = currentStock - item.quantity;

          // Check for negative stock anomaly rule
          if (newStock < 0) {
            await tx.anomalyAlert.create({
              data: {
                organizationId,
                ruleType: AnomalyRuleType.NEGATIVE_STOCK,
                severity: AnomalySeverity.HIGH,
                status: AnomalyStatus.DETECTED,
                title: 'Stock négatif après tentative de vente',
                explanation: `Vente de ${item.quantity} unités de "${prod.name}" alors que le stock disponible était de ${currentStock}.`,
                entityType: 'Product',
                entityId: prod.id,
                observedValue: `${newStock} unités`,
                expectedThreshold: 'Stock >= 0',
              },
            });
          }

          // Update product current stock
          await tx.product.update({
            where: { id: prod.id },
            data: { currentStock: newStock },
          });

          // Update warehouse stock
          const whStock = await tx.warehouseStock.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: defaultWarehouse.id,
                productId: prod.id,
              },
            },
          });

          if (whStock) {
            await tx.warehouseStock.update({
              where: { id: whStock.id },
              data: { quantity: whStock.quantity - item.quantity },
            });
          }

          // Trace stock movement
          await tx.stockMovement.create({
            data: {
              organizationId,
              warehouseId: defaultWarehouse.id,
              productId: prod.id,
              userId,
              type: StockMovementType.OUT_SALE,
              quantity: item.quantity,
              previousStock: currentStock,
              newStock,
              reference: saleNumber,
              reason: 'Vente directe client',
            },
          });
        }

        // Anomaly Rule: Check excessive discount
        const maxDiscountThreshold = orgSettings?.alertMaxDiscountPercent
          ? Number(orgSettings.alertMaxDiscountPercent)
          : 15.0;

        if (item.discountPercent > maxDiscountThreshold) {
          await tx.anomalyAlert.create({
            data: {
              organizationId,
              ruleType: AnomalyRuleType.HIGH_DISCOUNT,
              severity: AnomalySeverity.MEDIUM,
              status: AnomalyStatus.DETECTED,
              title: 'Remise commerciale inhabituelle appliquée',
              explanation: `Une remise de ${item.discountPercent}% a été accordée sur l'article "${prod.name}", dépassant le seuil d’alerte de ${maxDiscountThreshold}%.`,
              entityType: 'Sale',
              entityId: saleNumber,
              observedValue: `${item.discountPercent}%`,
              expectedThreshold: `Max: ${maxDiscountThreshold}%`,
            },
          });
        }
      }

      // 2. Create Sale
      const sale = await tx.sale.create({
        data: {
          organizationId,
          saleNumber,
          customerId: data.customerId || null,
          userId,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          currency,
          status: SaleStatus.COMPLETED,
          notes: data.notes,
          items: {
            create: itemsWithCalc.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              taxRatePercent: item.taxRatePercent,
              total: item.total,
            })),
          },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      // 3. Create associated invoice and direct payment if requested
      const nextInvNum = orgSettings?.invoiceNextNumber || 1001;
      const prefix = orgSettings?.invoicePrefix || 'FAC-2026-';
      const invoiceNumber = `${prefix}${nextInvNum}`;

      const isPaid = Boolean(data.immediatePayment);

      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          invoiceNumber,
          type: InvoiceType.STANDARD,
          status: isPaid ? InvoiceStatus.PAID : InvoiceStatus.ISSUED,
          customerId: data.customerId || (await tx.customer.findFirst({ where: { organizationId, code: 'CLI-COMPTANT' } }))?.id || data.customerId,
          saleId: sale.id,
          dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          subtotal,
          discountAmount,
          taxAmount,
          total,
          paidAmount: isPaid ? total : 0,
          balance: isPaid ? 0 : total,
          currency,
          notes: data.notes,
          items: {
            create: itemsWithCalc.map((i) => ({
              productId: i.productId,
              description: `Article vente ${saleNumber}`,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountPercent: i.discountPercent,
              taxRatePercent: i.taxRatePercent,
              total: i.total,
            })),
          },
        },
      });

      // Increment next invoice number in settings
      await tx.organizationSettings.update({
        where: { organizationId },
        data: { invoiceNextNumber: nextInvNum + 1 },
      });

      // 4. If immediate payment (cash or mobile money)
      if (isPaid) {
        const paymentMethod = (data.paymentMethod as PaymentMethod) || PaymentMethod.CASH;
        const receiptPrefix = orgSettings?.receiptPrefix || 'REC-2026-';
        const paymentNumber = `${receiptPrefix}${nextInvNum}`;

        await tx.payment.create({
          data: {
            organizationId,
            paymentNumber,
            invoiceId: invoice.id,
            customerId: invoice.customerId,
            cashSessionId: data.cashSessionId || null,
            userId,
            amount: total,
            currency,
            method: paymentMethod,
            reference: data.paymentReference || `ENCAISSEMENT-${saleNumber}`,
            status: PaymentStatus.COMPLETED,
            notes: 'Paiement direct à la vente',
          },
        });
      }

      return {
        sale,
        invoice,
      };
    });
  }
}
