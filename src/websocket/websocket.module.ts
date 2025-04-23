import { Module } from '@nestjs/common';
import { GpsWebSocketGateway } from './websocket.gateway';
import { RedisService } from './redis.service';
@Module({
  providers: [GpsWebSocketGateway, RedisService],
  exports: [GpsWebSocketGateway],
})
export class WebSocketModule {} 