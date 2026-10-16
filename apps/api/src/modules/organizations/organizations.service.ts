import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async getProfile(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        settings: true,
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        warehouses: true,
        exchangeRates: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!org) throw new NotFoundException('Entreprise non trouvée');
    return org;
  }

  async updateSettings(organizationId: string, data: any) {
    return this.prisma.organizationSettings.upsert({
      where: { organizationId },
      update: {
        ...data,
      },
      create: {
        organizationId,
        ...data,
      },
    });
  }

  async updateProfile(organizationId: string, data: any) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data,
      include: { settings: true },
    });
  }

  async listUsers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
