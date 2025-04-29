import { Module } from '@nestjs/common'
import { WebSocketService } from './application/service/websocket.service'
import { CoreModule } from 'src/core/core.module'
import { WebSocketController } from './presentation/controller/websocket.controller'
import { GpsWebSocketGateway } from './presentation/gateway/websocket.gateway'
import { ApiKeyGuard } from 'src/core/guards/api-key.guard'
@Module({
  imports: [CoreModule],
  controllers: [WebSocketController],
  providers: [GpsWebSocketGateway, WebSocketService, ApiKeyGuard],
  exports: [GpsWebSocketGateway],
})
export class WebSocketModule {}
