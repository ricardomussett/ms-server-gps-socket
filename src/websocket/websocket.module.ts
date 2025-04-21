import { Module } from '@nestjs/common';
import { GpsWebSocketGateway } from './websocket.gateway';

@Module({
  providers: [GpsWebSocketGateway],
  exports: [GpsWebSocketGateway],
})
export class WebSocketModule {} 