import { Module } from '@nestjs/common';
import { StatusService } from './service/status.service';
import { StatusController } from './controller/status.controller';

@Module({
  controllers: [StatusController],
  providers: [StatusService],
})
export class StatusModule {}
