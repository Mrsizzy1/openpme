import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private hashPassword(password: string): string {
    const salt = 'smart_pme_salt_2026';
    return crypto.createHash('sha256').update(password + salt).digest('hex');
  }

  async findAll(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable dans cette entreprise.');
    }

    return user;
  }

  async create(organizationId: string, data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Cette adresse email est déjà utilisée par un autre collaborateur.');
    }

    const defaultPassword = data.password || 'Pme@2026!';
    const passwordHash = this.hashPassword(defaultPassword);

    return this.prisma.user.create({
      data: {
        organizationId,
        email: data.email.toLowerCase().trim(),
        passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: data.role || UserRole.CASHIER,
        phone: data.phone?.trim() || null,
        isActive: true,
      },
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
    });
  }

  async update(organizationId: string, id: string, data: {
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    phone?: string;
    isActive?: boolean;
    password?: string;
  }) {
    await this.findById(organizationId, id);

    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
    if (data.role !== undefined) updateData.role = data.role;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) {
      updateData.passwordHash = this.hashPassword(data.password);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async delete(organizationId: string, currentUserId: string, id: string) {
    if (id === currentUserId) {
      throw new ForbiddenException('Vous ne pouvez pas désactiver ou supprimer votre propre compte.');
    }

    await this.findById(organizationId, id);

    // Soft delete en basculant isActive = false pour préserver l'historique des ventes
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });
  }
}
