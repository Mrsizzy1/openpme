import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, search?: string) {
    const where: any = { organizationId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!customer) throw new NotFoundException('Client introuvable');
    return customer;
  }

  async create(organizationId: string, data: any) {
    return this.prisma.customer.create({
      data: {
        organizationId,
        code: data.code || `CLI-${Date.now().toString().slice(-6)}`,
        name: data.name,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        creditLimit: data.creditLimit || 0,
        currency: data.currency || 'CDF',
      },
    });
  }

  async update(organizationId: string, id: string, data: any) {
    await this.findById(organizationId, id);
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async delete(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    const invoiceCount = await this.prisma.invoice.count({ where: { customerId: id } });
    if (invoiceCount > 0) {
      return this.prisma.customer.update({
        where: { id },
        data: { isActive: false },
      });
    }
    return this.prisma.customer.delete({ where: { id } });
  }
}
