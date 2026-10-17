import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les clients avec recherche' })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@CurrentUser('organizationId') orgId: string, @Query('search') search?: string) {
    return this.customersService.findAll(orgId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir la fiche client avec son historique de facturation et paiements' })
  async findById(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
    return this.customersService.findById(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau client' })
  async create(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
    return this.customersService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un client' })
  async update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.customersService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un client' })
  async remove(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.delete(orgId, id);
  }
}
