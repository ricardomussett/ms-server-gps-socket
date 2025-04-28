import { Controller, Get } from '@nestjs/common'
import { WebSocketService } from '../../application/service/websocket.service'
import { RedisService } from 'src/core/redis/service/redis.service'

@Controller('websocket')
export class WebSocketController {
  constructor(
    private readonly redisService: RedisService,
    private readonly webSocketService: WebSocketService,
  ) {
    this.redisService.onMessage((channel, message) => {
      this.handleRedisMessage(channel, message)
    })
  }

  /**
   * Controlador de los mensajes entrados desde Redis para actualizaciones de posición.
   *
   * @param channel - Nombre del canal de Redis que envía el mensaje.
   * @param message - Mensaje en formato JSON con la actualización.
   */
  private handleRedisMessage(channel: string, message: string): void {
    this.webSocketService.handleMessage(channel, message)
  }

  @Get('status')
  getWebSocketStatus() {
    return this.webSocketService.getWebSocketStatus()
  }
}
