import { Module } from '@nestjs/common';
import { RemoteControlService } from './remote-control.service';
import { RemoteControlController } from './remote-control.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RemoteControlController],
  providers: [RemoteControlService],
  exports: [RemoteControlService],
})
export class RemoteControlModule {}
