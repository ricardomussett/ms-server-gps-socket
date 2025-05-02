import { Controller, Get } from '@nestjs/common'
import { GpsWebSocketGateway } from '../gateway/websocket.gateway'

@Controller('websocket')
export class WebSocketController {
  private gateway: GpsWebSocketGateway
  constructor() {}

  @Get('status')
  getWebSocketStatus() {
    return this.gateway.getWebSocketStatus()
  }
}
