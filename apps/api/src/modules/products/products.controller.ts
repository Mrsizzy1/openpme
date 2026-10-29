import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Products & Inventory')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER, UserRole.INVENTORY_MANAGER, UserRole.ACCOUNTANT)
@ApiBearerAuth()
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les produits et services avec filtrage et recherche' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  async findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.productsService.findAll(orgId, search, categoryId);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Lister les articles sous le seuil d’alerte de stock' })
  async getLowStock(@CurrentUser('organizationId') orgId: string) {
    return this.productsService.getLowStock(orgId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lister les catégories de produits' })
  async listCategories(@CurrentUser('organizationId') orgId: string) {
    return this.productsService.listCategories(orgId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Créer une nouvelle catégorie' })
  async createCategory(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { name: string; description?: string },
  ) {
    return this.productsService.createCategory(orgId, body.name, body.description);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir les détails d’un produit par ID' })
  async findById(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
    return this.productsService.findById(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau produit ou service' })
  async create(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
    return this.productsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un produit ou service' })
  async update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.productsService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un produit ou service' })
  async remove(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.delete(orgId, id);
  }
}
