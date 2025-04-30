import { Module } from '@nestjs/common'
import { WebSocketService } from './application/service/websocket.service'
import { CoreModule } from 'src/core/core.module'
import { WebSocketController } from './presentation/controller/websocket.controller'
import { GpsWebSocketGateway } from './presentation/gateway/websocket.gateway'
import { ApiKeyGuard } from 'src/core/guards/api-key.guard'
import { EncryptionModule } from 'src/core/encryption/encryption.module'
import { EncryptService } from 'src/core/encryption/service/encryption.service'
@Module({
  imports: [CoreModule, EncryptionModule],
  controllers: [WebSocketController],
  providers: [GpsWebSocketGateway, EncryptService, WebSocketService, ApiKeyGuard],
  exports: [GpsWebSocketGateway],
})
export class WebSocketModule {}
