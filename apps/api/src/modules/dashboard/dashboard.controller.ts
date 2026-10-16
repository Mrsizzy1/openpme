import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dashboard & Supervision')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Obtenir les indicateurs de pilotage financier, commercial et de détection' })
  async getMetrics(@CurrentUser('organizationId') orgId: string) {
    return this.dashboardService.getMetrics(orgId);
  }
}
