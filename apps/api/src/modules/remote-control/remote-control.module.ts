import { Module } from '@nestjs/common';
import { RemoteControlService } from './remote-control.service';
import { RemoteControlController } from './remote-control.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RemoteControlController],
  providers: [RemoteControlService],
  exports: [RemoteControlService],
})
export class RemoteControlModule {}
