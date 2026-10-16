import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('System Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Vérification de l’état de l’API et de la base PostgreSQL' })
  async check() {
    let dbStatus = 'UP';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'DOWN';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Smart PME Finance API',
      version: '1.0.0',
      database: dbStatus,
      uptime: process.uptime(),
    };
  }
}
