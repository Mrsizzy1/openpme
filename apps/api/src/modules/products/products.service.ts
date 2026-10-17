import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Currency } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, search?: string, categoryId?: string) {
    const where: any = { organizationId, isActive: true };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        warehouseStocks: {
          include: { warehouse: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
      include: {
        category: true,
        warehouseStocks: { include: { warehouse: true } },
      },
    });

    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  async create(organizationId: string, data: any) {
    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { organizationId, isDefault: true },
    });

    const product = await this.prisma.product.create({
      data: {
        organizationId,
        code: data.code || `PRD-${Date.now().toString().slice(-6)}`,
        barcode: data.barcode,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        purchasePrice: data.purchasePrice || 0,
        salePrice: data.salePrice || 0,
        currency: data.currency || Currency.CDF,
        minStockLevel: data.minStockLevel ?? 5,
        currentStock: data.initialStock ?? 0,
        unit: data.unit || 'Pièce',
        isService: Boolean(data.isService),
      },
      include: { category: true },
    });

    if (defaultWarehouse && !product.isService) {
      await this.prisma.warehouseStock.create({
        data: {
          warehouseId: defaultWarehouse.id,
          productId: product.id,
          quantity: product.currentStock,
        },
      });
    }

    return product;
  }

  async update(organizationId: string, id: string, data: any) {
    await this.findById(organizationId, id);

    return this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
        currency: data.currency,
        minStockLevel: data.minStockLevel,
        unit: data.unit,
        isActive: data.isActive,
      },
      include: { category: true },
    });
  }

  async delete(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    const saleItemsCount = await this.prisma.saleItem.count({ where: { productId: id } });
    if (saleItemsCount > 0) {
      return this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    }
    await this.prisma.warehouseStock.deleteMany({ where: { productId: id } });
    return this.prisma.product.delete({ where: { id } });
  }

  async getLowStock(organizationId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        organizationId,
        isService: false,
        isActive: true,
      },
      include: { category: true },
    });

    return products.filter((p) => p.currentStock <= p.minStockLevel);
  }

  async listCategories(organizationId: string) {
    return this.prisma.category.findMany({
      where: { organizationId },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(organizationId: string, name: string, description?: string) {
    return this.prisma.category.create({
      data: {
        organizationId,
        name,
        description,
      },
    });
  }
}
