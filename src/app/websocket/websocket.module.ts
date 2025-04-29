import { Module } from '@nestjs/common'
import { WebSocketService } from './application/service/websocket.service'
import { CoreModule } from 'src/core/core.module'
import { WebSocketController } from './presentation/controller/websocket.controller'
import { GpsWebSocketGateway } from './presentation/gateway/websocket.gateway'
@Module({
  imports: [CoreModule],
  controllers: [WebSocketController],
  providers: [GpsWebSocketGateway, WebSocketService],
  exports: [GpsWebSocketGateway],
})
export class WebSocketModule {}
