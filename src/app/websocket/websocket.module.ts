import { Module } from '@nestjs/common'
import { GpsWebSocketGateway } from './presentation/gateway/websocket.gateway'
import { WebSocketService } from './application/service/websocket.service'
import { WebSocketController } from './presentation/controller/websocket.controller'
import { CoreModule } from 'src/core/core.module'
@Module({
  imports: [CoreModule],
  controllers: [WebSocketController],
  providers: [GpsWebSocketGateway, WebSocketService],
  exports: [GpsWebSocketGateway],
})
export class WebSocketModule {}
