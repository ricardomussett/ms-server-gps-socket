import { Module } from '@nestjs/common';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [WebSocketModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
