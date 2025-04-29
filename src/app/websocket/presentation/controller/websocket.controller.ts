import { Controller, Get } from '@nestjs/common'
import { WebSocketService } from '../../application/service/websocket.service'

@Controller('websocket')
export class WebSocketController {
  constructor(private readonly webSocketService: WebSocketService) {}

  @Get('status')
  getWebSocketStatus() {
    return this.webSocketService.getWebSocketStatus()
  }
}
