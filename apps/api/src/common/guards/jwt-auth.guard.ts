import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Jeton d’authentification manquant ou invalide.');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'smart_pme_finance_super_secure_jwt_secret_key_prod_2026_xyz',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          organization: {
            include: { settings: true },
          },
        },
      });

      if (!user || !user.isActive || !user.organization.isActive) {
        throw new UnauthorizedException('Utilisateur ou entreprise désactivé(e).');
      }

      // Attach complete user & organization context to request
      request.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        organization: user.organization,
      };

      return true;
    } catch (err) {
      throw new UnauthorizedException('Session expirée ou jeton d’accès non valide.');
    }
  }
}
