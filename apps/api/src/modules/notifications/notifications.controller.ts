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
    const text = '🔔 *Smart PME Finance* : Test de liaison réussi. Les rapports de clôture envoyés depuis Smart PME Finance arriveront ici.';
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
    // Chiffres réels de la journée, calculés depuis la base de l'organisation.
    const summaryData = await this.notificationsService.buildDailySummary(orgId, body.date);

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
