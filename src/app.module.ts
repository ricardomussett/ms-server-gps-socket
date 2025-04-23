import { Module } from '@nestjs/common';
import { WebSocketModule } from './websocket/websocket.module';
import { StatusModule } from './status/status.module';

@Module({
  imports: [WebSocketModule, StatusModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
