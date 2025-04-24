import { Module } from '@nestjs/common';
import { StatusService } from './service/status.service';
import { StatusController } from './controller/status.controller';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [WebSocketModule],
  controllers: [StatusController],
  providers: [StatusService],
})
export class StatusModule {}
