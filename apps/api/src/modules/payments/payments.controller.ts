import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments & Receipts')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les paiements et reçus' })
  @ApiQuery({ name: 'invoiceId', required: false })
  async findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('invoiceId') invoiceId?: string,
  ) {
    return this.paymentsService.findAll(orgId, invoiceId);
  }

  @Post()
  @ApiOperation({ summary: 'Enregistrer un paiement avec lettrage automatique de la facture' })
  async createPayment(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.paymentsService.createPayment(orgId, userId, body);
  }
}
