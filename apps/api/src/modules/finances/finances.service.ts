import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { roundMoney } from '@smart-pme/shared';
import {
  Currency,
  PaymentMethod,
  CashSessionStatus,
  AnomalySeverity,
  AnomalyStatus,
  AnomalyRuleType,
} from '@prisma/client';

@Injectable()
export class FinancesService {
  constructor(private prisma: PrismaService) {}

  // --- Expenses ---
  async listExpenses(organizationId: string) {
    return this.prisma.expense.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        financialAccount: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async createExpense(organizationId: string, userId: string, data: any) {
    const amount = roundMoney(parseFloat(data.amount));
    if (amount <= 0) {
      throw new BadRequestException('Le montant de la dépense doit être supérieur à zéro.');
    }

    const orgSettings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    const expenseNumber = `DEP-${Date.now().toString().slice(-6)}`;

    // Check for abnormal expense anomaly rule
    const alertThreshold = orgSettings?.alertLargeExpenseThreshold
      ? Number(orgSettings.alertLargeExpenseThreshold)
      : 2000000;

    const expense = await this.prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          organizationId,
          expenseNumber,
          category: data.category || 'Frais Généraux',
          amount,
          currency: (data.currency as Currency) || Currency.CDF,
          beneficiary: data.beneficiary,
          method: (data.method as PaymentMethod) || PaymentMethod.CASH,
          reference: data.reference,
          notes: data.notes,
          userId,
          financialAccountId: data.financialAccountId || null,
        },
      });

      // If tied to financial account, decrement balance
      if (data.financialAccountId) {
        await tx.financialAccount.update({
          where: { id: data.financialAccountId },
          data: { balance: { decrement: amount } },
        });
      }

      if (amount >= alertThreshold) {
        await tx.anomalyAlert.create({
          data: {
            organizationId,
            ruleType: AnomalyRuleType.ABNORMAL_EXPENSE,
            severity: AnomalySeverity.HIGH,
            status: AnomalyStatus.DETECTED,
            title: 'Dépense exceptionnelle dépassant le seuil de contrôle',
            explanation: `Dépense N° ${expenseNumber} de ${amount} ${exp.currency} enregistrée pour "${exp.beneficiary}", supérieure au seuil d’alerte de ${alertThreshold}.`,
            entityType: 'Expense',
            entityId: exp.id,
            observedValue: `${amount}`,
            expectedThreshold: `Seuil max: ${alertThreshold}`,
          },
        });
      }

      return exp;
    });

    return expense;
  }

  // --- Cash Registers & Sessions ---
  async listCashRegisters(organizationId: string) {
    return this.prisma.cashRegister.findMany({
      where: { organizationId },
      include: {
        sessions: {
          where: { status: CashSessionStatus.OPEN },
          include: { user: true },
        },
      },
    });
  }

  async getCurrentSession(organizationId: string, userId: string) {
    return this.prisma.cashSession.findFirst({
      where: {
        organizationId,
        userId,
        status: CashSessionStatus.OPEN,
      },
      include: {
        cashRegister: true,
        payments: true,
      },
    });
  }

  async openSession(organizationId: string, userId: string, data: any) {
    // Check if user already has an active session
    const existing = await this.getCurrentSession(organizationId, userId);
    if (existing) {
      throw new BadRequestException('Vous avez déjà une session de caisse active. Veuillez la clôturer avant d’en ouvrir une nouvelle.');
    }

    const openingBalance = roundMoney(parseFloat(data.openingBalance || 0));

    return this.prisma.cashSession.create({
      data: {
        organizationId,
        cashRegisterId: data.cashRegisterId,
        userId,
        openingBalance,
        currency: (data.currency as Currency) || Currency.CDF,
        status: CashSessionStatus.OPEN,
        notes: data.notes,
      },
      include: { cashRegister: true },
    });
  }

  async closeSession(organizationId: string, sessionId: string, closingCountedBalance: number, notes?: string) {
    const session = await this.prisma.cashSession.findFirst({
      where: { id: sessionId, organizationId },
      include: {
        payments: { where: { method: PaymentMethod.CASH } },
      },
    });

    if (!session) throw new NotFoundException('Session de caisse non trouvée');
    if (session.status === CashSessionStatus.CLOSED) {
      throw new BadRequestException('Cette session est déjà clôturée.');
    }

    const orgSettings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    // Calculate theoretical balance: openingBalance + cash collected
    const totalCashPayments = session.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const theoreticalBalance = roundMoney(Number(session.openingBalance) + totalCashPayments);
    const countedBalance = roundMoney(closingCountedBalance);
    const difference = roundMoney(countedBalance - theoreticalBalance);

    const discrepancyThreshold = orgSettings?.alertCashDiscrepancyThreshold
      ? Number(orgSettings.alertCashDiscrepancyThreshold)
      : 15000;

    return this.prisma.$transaction(async (tx) => {
      const closed = await tx.cashSession.update({
        where: { id: sessionId },
        data: {
          closingBalance: countedBalance,
          theoreticalBalance,
          difference,
          status: CashSessionStatus.CLOSED,
          closedAt: new Date(),
          notes: notes || session.notes,
        },
      });

      // Anomaly: Cash discrepancy detected
      if (Math.abs(difference) > discrepancyThreshold) {
        await tx.anomalyAlert.create({
          data: {
            organizationId,
            ruleType: AnomalyRuleType.CASH_DISCREPANCY,
            severity: Math.abs(difference) > discrepancyThreshold * 3 ? AnomalySeverity.CRITICAL : AnomalySeverity.HIGH,
            status: AnomalyStatus.DETECTED,
            title: 'Écart de caisse significatif à la clôture',
            explanation: `Écart de ${difference} ${session.currency} (Compté: ${countedBalance}, Théorique: ${theoreticalBalance}), supérieur au seuil d’écart toléré de ${discrepancyThreshold}.`,
            entityType: 'CashSession',
            entityId: sessionId,
            observedValue: `${difference}`,
            expectedThreshold: `Tolérance: +/- ${discrepancyThreshold}`,
          },
        });
      }

      return closed;
    });
  }

  // --- Financial Accounts ---
  async listAccounts(organizationId: string) {
    return this.prisma.financialAccount.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
