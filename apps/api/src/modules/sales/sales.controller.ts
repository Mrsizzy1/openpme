import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { OWN_SALES_ONLY_ROLES, ROLE_GROUPS } from '../../common/security/role-groups';
import { CreateSaleDto } from './sales.dto';

/** Caissiers et commerciaux ne voient que leurs propres ventes. */
function ownSalesScope(user: { id: string; role: UserRole }): string | undefined {
  return OWN_SALES_ONLY_ROLES.includes(user.role) ? user.id : undefined;
}

@ApiTags('Sales & Commercial')
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ROLE_GROUPS.salesRead)
@ApiBearerAuth()
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les ventes avec pagination et relations' })
  async findAll(@CurrentUser() user: any, @Query('limit') limit?: string) {
    return this.salesService.findAll(user.organizationId, limit ? parseInt(limit, 10) : 50, ownSalesScope(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir le détail d’une vente' })
  async findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.salesService.findById(user.organizationId, id, ownSalesScope(user));
  }

  @Post()
  @Roles(...ROLE_GROUPS.salesWrite)
  @ApiOperation({ summary: 'Enregistrer une nouvelle vente avec décompte de stock, facturation et audit' })
  async createSale(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: CreateSaleDto,
  ) {
    return this.salesService.createSale(orgId, userId, body);
  }
}
