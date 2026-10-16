import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { roundMoney } from '@smart-pme/shared';
import {
  Currency,
  PaymentMethod,
  PaymentStatus,
  InvoiceStatus,
  AnomalySeverity,
  AnomalyStatus,
  AnomalyRuleType,
} from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, invoiceId?: string) {
    const where: any = { organizationId };
    if (invoiceId) where.invoiceId = invoiceId;

    return this.prisma.payment.findMany({
      where,
      include: {
        invoice: true,
        customer: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        cashSession: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPayment(organizationId: string, userId: string, data: any) {
    const amount = roundMoney(parseFloat(data.amount));
    if (amount <= 0) {
      throw new BadRequestException('Le montant du paiement doit être supérieur à zéro.');
    }

    const orgSettings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    return this.prisma.$transaction(async (tx) => {
      let invoice = null;

      if (data.invoiceId) {
        invoice = await tx.invoice.findFirst({
          where: { id: data.invoiceId, organizationId },
        });

        if (!invoice) throw new NotFoundException('Facture introuvable.');

        if (Number(invoice.balance) <= 0) {
          throw new BadRequestException('Cette facture est déjà totalement soldée.');
        }

        if (amount > Number(invoice.balance)) {
          throw new BadRequestException(
            `Le montant du paiement (${amount}) dépasse le solde restant dû (${invoice.balance}).`
          );
        }
      }

      // Check Duplicate Payment Anomaly (rule: same amount + customer + within 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentDup = await tx.payment.findFirst({
        where: {
          organizationId,
          amount,
          customerId: data.customerId || invoice?.customerId,
          createdAt: { gte: tenMinutesAgo },
        },
      });

      if (recentDup) {
        await tx.anomalyAlert.create({
          data: {
            organizationId,
            ruleType: AnomalyRuleType.DUPLICATE_PAYMENT,
            severity: AnomalySeverity.HIGH,
            status: AnomalyStatus.DETECTED,
            title: 'Suspicion de double encaissement',
            explanation: `Un paiement identique de ${amount} a déjà été enregistré il y a moins de 10 minutes (Paiement N° ${recentDup.paymentNumber}).`,
            entityType: 'Payment',
            entityId: recentDup.paymentNumber,
            observedValue: `${amount}`,
            expectedThreshold: 'Unicité des règlements rapprochés',
          },
        });
      }

      // Generate receipt number
      const nextNum = orgSettings?.invoiceNextNumber || 1001;
      const receiptPrefix = orgSettings?.receiptPrefix || 'REC-2026-';
      const paymentNumber = `${receiptPrefix}${Date.now().toString().slice(-6)}`;

      const method = (data.method as PaymentMethod) || PaymentMethod.CASH;
      const currency = (data.currency as Currency) || invoice?.currency || Currency.CDF;

      const payment = await tx.payment.create({
        data: {
          organizationId,
          paymentNumber,
          invoiceId: data.invoiceId || null,
          customerId: data.customerId || invoice?.customerId || null,
          cashSessionId: data.cashSessionId || null,
          userId,
          amount,
          currency,
          method,
          reference: data.reference,
          status: PaymentStatus.COMPLETED,
          notes: data.notes,
        },
      });

      // Update invoice if applicable
      if (invoice) {
        const newPaidAmount = roundMoney(Number(invoice.paidAmount) + amount);
        const newBalance = roundMoney(Number(invoice.total) - newPaidAmount);
        const newStatus = newBalance <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            balance: newBalance,
            status: newStatus,
          },
        });

        // Decrement customer's debt
        if (invoice.customerId) {
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: {
              outstandingBalance: {
                decrement: amount,
              },
            },
          });
        }
      }

      return payment;
    });
  }
}
