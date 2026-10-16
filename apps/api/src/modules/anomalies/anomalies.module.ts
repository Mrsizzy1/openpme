import { Module } from '@nestjs/common';
import { AnomaliesService } from './anomalies.service';
import { AnomaliesController } from './anomalies.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnomaliesController],
  providers: [AnomaliesService],
  exports: [AnomaliesService],
})
export class AnomaliesModule {}
