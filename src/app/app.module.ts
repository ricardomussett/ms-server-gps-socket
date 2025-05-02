import { Module } from '@nestjs/common'
import { WebSocketModule } from './websocket/websocket.module'

@Module({
  imports: [WebSocketModule],
  controllers: [],
  providers: [],
  exports: [WebSocketModule],
})
export class AppModule {}
