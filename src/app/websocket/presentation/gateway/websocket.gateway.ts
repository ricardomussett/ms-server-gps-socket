import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, UseGuards } from '@nestjs/common'
import { RedisService } from 'src/core/redis/service/redis.service'
import { WebSocketService } from '../../application/service/websocket.service'
import { FilterDto } from '../../application/dto/filter.dto'
import { ApiKeyGuard } from 'src/core/guards/api-key.guard'

@WebSocketGateway(Number(process.env.WS_PORT || 90), {
  cors: {
    origin: '*',
    // allowedHeaders: ['api-key'],
    credentials: true,
  },
})
export class GpsWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(GpsWebSocketGateway.name)
  private clientFilters: Map<string, FilterDto> = new Map()

  constructor(
    private readonly redisService: RedisService,
    private readonly webSocketService: WebSocketService,
    private readonly apiKeyGuard: ApiKeyGuard
  ) {
    this.redisService.onMessage((channel, message) => {
      this.handleRedisMessage(channel, message)
    })
  }

  private handleRedisMessage(channel: string, message: string) {
    this.webSocketService.handleMessage(channel, message, this.server, this.clientFilters)
  }

  /**
   * Manejador que se invoca cuando un cliente se conecta al WebSocket.
   *
   * - Registra en los logs el ID del cliente que acaba de conectarse.
   * - Aquí se pueden inicializar recursos o filtros por defecto para el cliente.
   *
   * @param client Socket que representa al cliente conectado.
   */
  handleConnection(client: Socket) {
    const apiKey = client.handshake.query['x-api-key'] as string
    const active = this.apiKeyGuard.validateApiKey(apiKey)

    if (!active) this.handleDisconnect(client)
    else {
      this.logger.log(`Cliente conectado: ${client.id}`)
    }
  }

  /**
   * Manejador de desconexión de clientes WebSocket.
   *
   * Este método se invoca automáticamente cuando un cliente pierde la conexión.
   * - Registra un mensaje informativo con el ID del cliente desconectado.
   * - Elimina los filtros asociados a ese cliente para liberar memoria.
   *
   * @param client Instancia de Socket del cliente que se ha desconectado.
   */
  handleDisconnect(client: Socket, text?: string) {
    if (text) this.logger.log(`Cliente desconectado. Reason: ${text}`)
    else this.logger.log(`Cliente desconectado: ${client.id}`)
    this.clientFilters.delete(client.id)
    client.disconnect()
  }

  /**
   * Maneja la petición de datos iniciales desde el cliente.
   *
   * Este método se ejecuta cuando el cliente emite el evento 'request-data'.
   * Almacena el filtro recibido y posteriormente envía las posiciones iniciales
   * que cumplen con dicho filtro.
   *
   * @param client  Instancia del socket del cliente que solicita los datos.
   * @param payload Objeto FilterDto con los criterios de filtrado proporcionados por el cliente.
   */
  @UseGuards(ApiKeyGuard)
  @SubscribeMessage('request-data')
  async handleRequestData(client: Socket, payload: FilterDto): Promise<void> {
    try {
      // Guarda el filtro asociado al cliente usando su ID como clave
      this.clientFilters.set(client.id, payload)

      // Envía al cliente las posiciones iniciales aplicando el filtro registrado
      await this.webSocketService.sendInitialPositions(client, this.clientFilters)
    } catch (error) {
      // Registra el error en caso de fallo al obtener o enviar los datos filtrados
      this.logger.error('Error al obtener datos filtrados:', error)
    }
  }

  getWebSocketStatus() {
    if (!this.server) {
      return {
        status: 'offline',
        port: null,
        connectedClients: 0,
      }
    }

    return {
      status: 'online',
      port: process.env.PORT ?? 3069,
      connectedClients: this.server.engine.clientsCount,
    }
  }
}
