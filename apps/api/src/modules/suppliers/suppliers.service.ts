import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Currency } from '@prisma/client';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, search?: string) {
    const where: any = { organizationId };

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { code: { contains: search.trim(), mode: 'insensitive' } },
        { contactPerson: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    return this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId },
      include: {
        purchases: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Fournisseur introuvable.');
    }

    return supplier;
  }

  async create(organizationId: string, data: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    currency?: Currency;
    outstandingDebt?: number;
  }) {
    // Génération automatique du code fournisseur si non fourni (ex: FRN-001)
    const count = await this.prisma.supplier.count({ where: { organizationId } });
    const code = `FRN-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.supplier.create({
      data: {
        organizationId,
        code,
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        currency: data.currency || Currency.CDF,
        outstandingDebt: data.outstandingDebt || 0,
        isActive: true,
      },
    });
  }

  async update(organizationId: string, id: string, data: {
    name?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    outstandingDebt?: number;
    currency?: Currency;
    isActive?: boolean;
  }) {
    await this.findById(organizationId, id);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson?.trim() || null;
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.outstandingDebt !== undefined) updateData.outstandingDebt = data.outstandingDebt;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.prisma.supplier.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(organizationId: string, id: string) {
    await this.findById(organizationId, id);

    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
