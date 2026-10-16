import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterOrganizationDto } from './auth.dto';
import { UserRole, Currency } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private hashPassword(password: string): string {
    const salt = 'smart_pme_salt_2026';
    return crypto.createHash('sha256').update(password + salt).digest('hex');
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        organization: {
          include: { settings: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants de connexion invalides.');
    }

    const hashedInput = this.hashPassword(dto.password);
    if (user.passwordHash !== hashedInput) {
      throw new UnauthorizedException('Identifiants de connexion invalides.');
    }

    if (!user.isActive || !user.organization.isActive) {
      throw new UnauthorizedException('Compte ou entreprise désactivé(e).');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'smart_pme_finance_super_secure_jwt_secret_key_prod_2026_xyz',
      expiresIn: '7d',
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        legalName: user.organization.legalName,
        taxId: user.organization.taxId,
        rccm: user.organization.rccm,
        idNat: user.organization.idNat,
        email: user.organization.email,
        phone: user.organization.phone,
        address: user.organization.address,
        city: user.organization.city,
        country: user.organization.country,
        logoUrl: user.organization.logoUrl,
        sector: user.organization.sector,
        settings: user.organization.settings,
        createdAt: user.organization.createdAt.toISOString(),
      },
    };
  }

  async registerOrganization(dto: RegisterOrganizationDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }

    const passwordHash = this.hashPassword(dto.password);

    // Create organization, settings, default warehouse, and owner user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
          email: dto.email,
          phone: dto.phone,
          country: 'République démocratique du Congo',
          sector: 'Commerce Général & PME',
        },
      });

      await tx.organizationSettings.create({
        data: {
          organizationId: org.id,
          primaryCurrency: Currency.CDF,
          secondaryCurrency: Currency.USD,
          exchangeRateUsdToCdf: 2850.00,
          taxRatePercent: 16.00,
          enableTax: true,
          invoicePrefix: 'FAC-2026-',
          quotePrefix: 'DEV-2026-',
          receiptPrefix: 'REC-2026-',
          invoiceNextNumber: 1001,
          quoteNextNumber: 1001,
          primaryColor: '#1E40AF',
          themeMode: 'light',
        },
      });

      await tx.warehouse.create({
        data: {
          organizationId: org.id,
          name: 'Dépôt Principal',
          isDefault: true,
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: UserRole.ORG_OWNER,
        },
      });

      return { org, user };
    });

    return this.login({ email: dto.email, password: dto.password });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: { settings: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable.');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
      organization: user.organization,
    };
  }
}
