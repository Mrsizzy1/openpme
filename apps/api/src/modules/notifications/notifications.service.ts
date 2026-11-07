import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import https from 'https';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface DailySummaryData {
  organizationName: string;
  date: string;
  totalSalesCDF: number;
  totalSalesUSD: number;
  salesCount: number;
  totalExpensesCDF: number;
  totalExpensesUSD: number;
  cashDiscrepancyCDF: number;
  cashDiscrepancyUSD: number;
  activeAnomaliesCount: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Synthèse réelle d'une journée pour une organisation (heure de Kinshasa, UTC+1).
   * `date` au format AAAA-MM-JJ ; par défaut, la journée en cours.
   */
  async buildDailySummary(organizationId: string, date?: string): Promise<DailySummaryData> {
    const KINSHASA_OFFSET_MS = 60 * 60 * 1000;
    const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Date(Date.now() + KINSHASA_OFFSET_MS).toISOString().slice(0, 10);
    const start = new Date(new Date(`${day}T00:00:00.000Z`).getTime() - KINSHASA_OFFSET_MS);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const range = { gte: start, lt: end };

    const [organization, sales, expenses, closedSessions, activeAnomaliesCount] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
      this.prisma.sale.groupBy({
        by: ['currency'],
        where: { organizationId, createdAt: range, status: { not: 'CANCELLED' } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.expense.groupBy({
        by: ['currency'],
        where: { organizationId, date: range },
        _sum: { amount: true },
      }),
      this.prisma.cashSession.groupBy({
        by: ['currency'],
        where: { organizationId, closedAt: range },
        _sum: { difference: true },
      }),
      this.prisma.anomalyAlert.count({
        where: { organizationId, status: { in: ['DETECTED', 'UNDER_REVIEW'] } },
      }),
    ]);

    const sumFor = (rows: any[], currency: 'CDF' | 'USD', field: 'total' | 'amount' | 'difference') =>
      Number(rows.find((row) => row.currency === currency)?._sum?.[field] ?? 0);

    return {
      organizationName: organization?.name ?? '—',
      date: new Date(`${day}T12:00:00.000Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' }),
      totalSalesCDF: sumFor(sales, 'CDF', 'total'),
      totalSalesUSD: sumFor(sales, 'USD', 'total'),
      salesCount: sales.reduce((count, row) => count + row._count._all, 0),
      totalExpensesCDF: sumFor(expenses, 'CDF', 'amount'),
      totalExpensesUSD: sumFor(expenses, 'USD', 'amount'),
      cashDiscrepancyCDF: sumFor(closedSessions, 'CDF', 'difference'),
      cashDiscrepancyUSD: sumFor(closedSessions, 'USD', 'difference'),
      activeAnomaliesCount,
    };
  }

  /**
   * Formate un rapport de synthèse journalière pour WhatsApp ou Telegram
   */
  formatDailyReport(data: DailySummaryData): string {
    return (
      `📊 *RAPPORT DE CLÔTURE JOURNALIÈRE*\n` +
      `🏢 *Entreprise :* ${data.organizationName}\n` +
      `📅 *Date :* ${data.date}\n` +
      `--------------------------------\n` +
      `🛒 *Ventes :* ${data.salesCount} transaction(s)\n` +
      `💵 *Chiffre d'affaires CDF :* ${data.totalSalesCDF.toLocaleString('fr-FR')} CDF\n` +
      `💵 *Chiffre d'affaires USD :* ${data.totalSalesUSD.toLocaleString('fr-FR')} USD\n\n` +
      `📉 *Dépenses :* ${data.totalExpensesCDF.toLocaleString('fr-FR')} CDF / ${data.totalExpensesUSD.toLocaleString('fr-FR')} USD\n` +
      `⚠️ *Écart de caisse (sessions clôturées) :* ${
        data.cashDiscrepancyCDF === 0 && data.cashDiscrepancyUSD === 0
          ? 'aucun'
          : `${data.cashDiscrepancyCDF.toLocaleString('fr-FR')} CDF / ${data.cashDiscrepancyUSD.toLocaleString('fr-FR')} USD`
      }\n` +
      `🛡️ *Anomalies en attente :* ${data.activeAnomaliesCount}\n` +
      `--------------------------------\n` +
      `_Généré par Smart PME Finance._`
    );
  }

  /**
   * Formate un message d'alerte critique immédiat pour le gérant
   */
  formatCriticalAlert(title: string, details: string, operator: string): string {
    return (
      `🚨 *ALERTE SÉCURITÉ PME IMMÉDIATE*\n` +
      `⚠️ *Incident :* ${title}\n` +
      `👤 *Opérateur :* ${operator}\n` +
      `📝 *Détails :* ${details}\n` +
      `⏰ *Heure :* ${new Date().toLocaleTimeString('fr-FR')}\n` +
      `--------------------------------\n` +
      `_Intervention recommandée dans la console Smart PME._`
    );
  }

  /**
   * Envoi réel d'un message via l'API Telegram Bot
   */
  async sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!botToken || !chatId) {
        return resolve({ success: false, error: 'Token bot ou Chat ID Telegram manquant.' });
      }

      const payload = JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      });

      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true });
          } else {
            this.logger.warn(`Telegram API error: ${body}`);
            resolve({ success: false, error: `Erreur Telegram HTTP ${res.statusCode}` });
          }
        });
      });

      req.on('error', (err) => {
        this.logger.error(`Telegram network error: ${err.message}`);
        resolve({ success: false, error: err.message });
      });

      req.write(payload);
      req.end();
    });
  }

  /**
   * Génère le lien direct WhatsApp Click-to-Chat pour partager au gérant
   */
  generateWhatsAppUrl(phoneNumber: string, message: string): string {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
}
