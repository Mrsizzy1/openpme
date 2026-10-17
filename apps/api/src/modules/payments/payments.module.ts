import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { MobileMoneyService } from './mobile-money.service';
import { PaymentsController } from './payments.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MobileMoneyService],
  exports: [PaymentsService, MobileMoneyService],
})
export class PaymentsModule {}

