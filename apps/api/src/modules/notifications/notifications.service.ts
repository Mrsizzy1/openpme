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
   * Formate un rapport de synthèse journalière pour WhatsApp ou Telegram
   */
  formatDailyReport(data: DailySummaryData): string {
    return (
      `📊 *RAPPORT DE CLÔTURE JOURNALIÈRE*\n` +
      `🏢 *Entreprise :* ${data.organizationName}\n` +
      `📅 *Date :* ${data.date}\n` +
      `--------------------------------\n` +
      `🛒 *Ventes Réalisées :* ${data.salesCount} transactions\n` +
      `💵 *Chiffre d'Affaires USD :* $${data.totalSalesUSD.toLocaleString('fr-FR')}\n` +
      `💵 *Chiffre d'Affaires CDF :* ${data.totalSalesCDF.toLocaleString('fr-FR')} CDF\n\n` +
      `📉 *Dépenses & Sorties :* $${data.totalExpensesUSD} / ${data.totalExpensesCDF} CDF\n` +
      `⚠️ *Écart de Caisse Constaté :* ${data.cashDiscrepancyCDF !== 0 || data.cashDiscrepancyUSD !== 0 ? 'ANORMAL' : 'AUCUN (0 $)'}\n` +
      `🛡️ *Anomalies en Attente :* ${data.activeAnomaliesCount}\n` +
      `--------------------------------\n` +
      `_Généré automatiquement par Smart PME Finance._`
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
