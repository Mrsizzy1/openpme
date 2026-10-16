import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnomalySeverity,
  AnomalyStatus,
  AnomalyRuleType,
} from '@prisma/client';

@Injectable()
export class AnomaliesService {
  constructor(private prisma: PrismaService) {}

  async listAlerts(organizationId: string, status?: AnomalyStatus, severity?: AnomalySeverity) {
    const where: any = { organizationId };
    if (status) where.status = status;
    if (severity) where.severity = severity;

    return this.prisma.anomalyAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async scanAnomalies(organizationId: string) {
    const alertsCreated: any[] = [];
    const orgSettings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    // 1. Scan Critical / Low Stocks
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        organizationId,
        isService: false,
        isActive: true,
      },
    });

    for (const prod of lowStockProducts) {
      if (prod.currentStock <= prod.minStockLevel) {
        // Check if alert already exists in DETECTED or UNDER_REVIEW status
        const existing = await this.prisma.anomalyAlert.findFirst({
          where: {
            organizationId,
            ruleType: AnomalyRuleType.NEGATIVE_STOCK,
            entityId: prod.id,
            status: { in: [AnomalyStatus.DETECTED, AnomalyStatus.UNDER_REVIEW] },
          },
        });

        if (!existing) {
          const alert = await this.prisma.anomalyAlert.create({
            data: {
              organizationId,
              ruleType: AnomalyRuleType.NEGATIVE_STOCK,
              severity: prod.currentStock <= 0 ? AnomalySeverity.CRITICAL : AnomalySeverity.HIGH,
              status: AnomalyStatus.DETECTED,
              title: prod.currentStock <= 0 ? 'Stock épuisé ou négatif' : 'Seuil de sécurité atteint',
              explanation: `Le stock du produit "${prod.name}" est à ${prod.currentStock} unités (Seuil minimum : ${prod.minStockLevel}).`,
              entityType: 'Product',
              entityId: prod.id,
              observedValue: `${prod.currentStock} ${prod.unit}`,
              expectedThreshold: `Seuil min: ${prod.minStockLevel} ${prod.unit}`,
            },
          });
          alertsCreated.push(alert);
        }
      }
    }

    // 2. Scan Overdue Invoices
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
        dueDate: { lt: new Date() },
      },
      include: { customer: true },
    });

    for (const inv of overdueInvoices) {
      const existing = await this.prisma.anomalyAlert.findFirst({
        where: {
          organizationId,
          ruleType: AnomalyRuleType.UNJUSTIFIED_PAYMENT,
          entityId: inv.id,
          status: { in: [AnomalyStatus.DETECTED, AnomalyStatus.UNDER_REVIEW] },
        },
      });

      if (!existing) {
        const daysOverdue = Math.floor((Date.now() - inv.dueDate.getTime()) / (1000 * 3600 * 24));
        const alert = await this.prisma.anomalyAlert.create({
          data: {
            organizationId,
            ruleType: AnomalyRuleType.UNJUSTIFIED_PAYMENT,
            severity: daysOverdue > 30 ? AnomalySeverity.HIGH : AnomalySeverity.MEDIUM,
            status: AnomalyStatus.DETECTED,
            title: 'Facture client impayée en retard',
            explanation: `La facture ${inv.invoiceNumber} émise à ${inv.customer.name} pour un solde de ${inv.balance} ${inv.currency} accuse un retard d'échéance de ${daysOverdue} jours.`,
            entityType: 'Invoice',
            entityId: inv.id,
            observedValue: `En retard de ${daysOverdue} jours`,
            expectedThreshold: 'Paiement à l’échéance',
          },
        });
        alertsCreated.push(alert);
      }
    }

    return {
      scannedAt: new Date(),
      newAlertsCount: alertsCreated.length,
      alerts: alertsCreated,
    };
  }

  async resolveAlert(organizationId: string, alertId: string, resolutionNote: string) {
    const alert = await this.prisma.anomalyAlert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) throw new NotFoundException('Alerte d’anomalie non trouvée');

    return this.prisma.anomalyAlert.update({
      where: { id: alertId },
      data: {
        status: AnomalyStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionNote: resolutionNote || 'Résolu et validé par le responsable',
      },
    });
  }

  async dismissAlert(organizationId: string, alertId: string) {
    const alert = await this.prisma.anomalyAlert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) throw new NotFoundException('Alerte non trouvée');

    return this.prisma.anomalyAlert.update({
      where: { id: alertId },
      data: {
        status: AnomalyStatus.DISMISSED,
        resolvedAt: new Date(),
        resolutionNote: 'Alerte ignorée / Faux positif analysé',
      },
    });
  }
}
