import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RemoteControlService } from './remote-control.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Remote Control & Supervision')
@Controller('remote-control')
export class RemoteControlController {
  constructor(private remoteControlService: RemoteControlService) {}

  /**
   * Heartbeat envoyé par les applications Desktop PyQt6 et Web POS
   */
  @Post('heartbeat')
  @ApiOperation({ summary: 'Signal de présence et réception des ordres à distance' })
  async heartbeat(
    @Body() body: {
      terminalId: string;
      organizationId: string;
      userId?: string;
      clientType?: 'DESKTOP_PYQT' | 'WEB_POS' | 'BROWSER';
    },
    @Req() req: any,
  ) {
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    return this.remoteControlService.registerHeartbeat({
      ...body,
      ipAddress: ip,
    });
  }

  /**
   * Liste des terminaux actifs de l'entreprise
   */
  @Get('terminals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Superviser les postes de travail connectés en direct' })
  async listTerminals(@CurrentUser('organizationId') orgId: string) {
    return this.remoteControlService.listTerminals(orgId);
  }

  /**
   * Verrouiller un poste à distance
   */
  @Post('terminals/:id/lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verrouiller l\'écran d\'un poste de caisse à distance' })
  async lockTerminal(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') terminalId: string,
    @Body() body: { reason?: string },
  ) {
    return this.remoteControlService.lockTerminal(orgId, terminalId, body?.reason);
  }

  /**
   * Déverrouiller un poste à distance
   */
  @Post('terminals/:id/unlock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déverrouiller un poste de caisse à distance' })
  async unlockTerminal(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') terminalId: string,
  ) {
    return this.remoteControlService.unlockTerminal(orgId, terminalId);
  }

  /**
   * Fermer / Déconnecter le logiciel à distance (Kill switch)
   */
  @Post('terminals/:id/kill')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Forcer la fermeture et déconnexion du logiciel à distance' })
  async killTerminal(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') terminalId: string,
    @Body() body: { reason?: string },
  ) {
    return this.remoteControlService.killTerminal(orgId, terminalId, body?.reason);
  }
}
