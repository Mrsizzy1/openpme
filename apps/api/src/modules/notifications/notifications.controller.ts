import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Manager Alerts & Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('telegram/test')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Tester la liaison d\'un bot Telegram pour les alertes du gérant' })
  async testTelegram(@Body() body: { botToken: string; chatId: string }) {
    const text = '🔔 *Smart PME Finance* : Test de liaison réussi ! Vous recevrez ici les alertes de caisse et les clôtures journalières.';
    return this.notificationsService.sendTelegramMessage(body.botToken, body.chatId, text);
  }

  @Post('daily-report')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Générer le rapport de clôture pour WhatsApp ou Telegram' })
  async generateDailyReport(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: {
      date?: string;
      whatsappPhone?: string;
      telegramBotToken?: string;
      telegramChatId?: string;
    },
  ) {
    // Synthèse de démonstration pour le rapport journalier
    const summaryData = {
      organizationName: 'PME Commerciale SARL',
      date: body.date || new Date().toLocaleDateString('fr-FR'),
      totalSalesCDF: 1450000,
      totalSalesUSD: 850,
      salesCount: 18,
      totalExpensesCDF: 120000,
      totalExpensesUSD: 50,
      cashDiscrepancyCDF: 0,
      cashDiscrepancyUSD: 0,
      activeAnomaliesCount: 0,
    };

    const text = this.notificationsService.formatDailyReport(summaryData);

    let telegramSent = false;
    if (body.telegramBotToken && body.telegramChatId) {
      const res = await this.notificationsService.sendTelegramMessage(
        body.telegramBotToken,
        body.telegramChatId,
        text,
      );
      telegramSent = res.success;
    }

    const whatsappUrl = body.whatsappPhone
      ? this.notificationsService.generateWhatsAppUrl(body.whatsappPhone, text)
      : null;

    return {
      success: true,
      reportText: text,
      telegramSent,
      whatsappUrl,
    };
  }

  @Post('alert')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Envoyer une alerte critique immédiate au gérant' })
  async sendAlert(
    @Body() body: {
      title: string;
      details: string;
      operator: string;
      telegramBotToken?: string;
      telegramChatId?: string;
      whatsappPhone?: string;
    },
  ) {
    const text = this.notificationsService.formatCriticalAlert(
      body.title,
      body.details,
      body.operator,
    );

    let telegramSent = false;
    if (body.telegramBotToken && body.telegramChatId) {
      const res = await this.notificationsService.sendTelegramMessage(
        body.telegramBotToken,
        body.telegramChatId,
        text,
      );
      telegramSent = res.success;
    }

    const whatsappUrl = body.whatsappPhone
      ? this.notificationsService.generateWhatsAppUrl(body.whatsappPhone, text)
      : null;

    return {
      success: true,
      alertText: text,
      telegramSent,
      whatsappUrl,
    };
  }
}
