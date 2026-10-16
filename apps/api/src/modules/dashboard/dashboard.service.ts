import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { roundMoney } from '@smart-pme/shared';
import { AnomalyStatus, Currency, InvoiceStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(organizationId: string) {
    const orgSettings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const primaryCurrency = orgSettings?.primaryCurrency || Currency.CDF;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // 1. Sales Today
    const todaySales = await this.prisma.sale.findMany({
      where: {
        organizationId,
        createdAt: { gte: startOfToday },
      },
    });

    const todaySalesTotal = roundMoney(todaySales.reduce((acc, s) => acc + Number(s.total), 0));
    const todaySalesCount = todaySales.length;

    // 2. Monthly Revenue
    const monthlySales = await this.prisma.sale.findMany({
      where: {
        organizationId,
        createdAt: { gte: startOfMonth },
      },
    });
    const monthlyRevenue = roundMoney(monthlySales.reduce((acc, s) => acc + Number(s.total), 0));

    // 3. Monthly Expenses
    const monthlyExpensesList = await this.prisma.expense.findMany({
      where: {
        organizationId,
        date: { gte: startOfMonth },
      },
    });
    const monthlyExpenses = roundMoney(monthlyExpensesList.reduce((acc, e) => acc + Number(e.amount), 0));
    const netMargin = roundMoney(monthlyRevenue - monthlyExpenses);

    // 4. Receivables (Créances clients)
    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
      },
    });
    const totalReceivables = roundMoney(unpaidInvoices.reduce((acc, i) => acc + Number(i.balance), 0));
    const unpaidInvoicesCount = unpaidInvoices.length;

    // 5. Payables (Dettes fournisseurs)
    const suppliers = await this.prisma.supplier.findMany({
      where: { organizationId },
    });
    const totalPayables = roundMoney(suppliers.reduce((acc, s) => acc + Number(s.outstandingDebt), 0));

    // 6. Cash and Bank Balances
    const bankAccounts = await this.prisma.financialAccount.findMany({
      where: { organizationId, isActive: true },
    });
    const totalBankBalance = roundMoney(bankAccounts.reduce((acc, a) => acc + Number(a.balance), 0));

    // 7. Low Stock items count
    const allProducts = await this.prisma.product.findMany({
      where: { organizationId, isService: false, isActive: true },
    });
    const lowStockItemsCount = allProducts.filter((p) => p.currentStock <= p.minStockLevel).length;

    // 8. Active Anomalies count
    const activeAnomaliesCount = await this.prisma.anomalyAlert.count({
      where: {
        organizationId,
        status: { in: [AnomalyStatus.DETECTED, AnomalyStatus.UNDER_REVIEW] },
      },
    });

    // 9. Recent activities for live feed
    const recentSales = await this.prisma.sale.findMany({
      where: { organizationId },
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentInvoices = await this.prisma.invoice.findMany({
      where: { organizationId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentAnomalies = await this.prisma.anomalyAlert.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      metrics: {
        todaySales: todaySalesTotal,
        todaySalesCount,
        monthlyRevenue,
        monthlyExpenses,
        netMargin,
        totalReceivables,
        totalPayables,
        totalCashBalance: totalBankBalance,
        primaryCurrency,
        lowStockItemsCount,
        activeAnomaliesCount,
        unpaidInvoicesCount,
      },
      recentSales,
      recentInvoices,
      recentAnomalies,
    };
  }
}
