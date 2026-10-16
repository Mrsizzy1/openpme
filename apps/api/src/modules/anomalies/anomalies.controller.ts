import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnomaliesService } from './anomalies.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnomalySeverity, AnomalyStatus } from '@prisma/client';

@ApiTags('Intelligent Anomaly Detection')
@Controller('anomalies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnomaliesController {
  constructor(private anomaliesService: AnomaliesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les alertes d’anomalies' })
  @ApiQuery({ name: 'status', enum: AnomalyStatus, required: false })
  @ApiQuery({ name: 'severity', enum: AnomalySeverity, required: false })
  async listAlerts(
    @CurrentUser('organizationId') orgId: string,
    @Query('status') status?: AnomalyStatus,
    @Query('severity') severity?: AnomalySeverity,
  ) {
    return this.anomaliesService.listAlerts(orgId, status, severity);
  }

  @Post('scan')
  @ApiOperation({ summary: 'Exécuter le moteur d’inspection des anomalies en direct' })
  async scanAnomalies(@CurrentUser('organizationId') orgId: string) {
    return this.anomaliesService.scanAnomalies(orgId);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Marquer une anomalie comme résolue avec commentaire' })
  async resolveAlert(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body('resolutionNote') note: string,
  ) {
    return this.anomaliesService.resolveAlert(orgId, id, note);
  }

  @Patch(':id/dismiss')
  @ApiOperation({ summary: 'Rejeter / classer sans suite une alerte' })
  async dismissAlert(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
    return this.anomaliesService.dismissAlert(orgId, id);
  }
}
