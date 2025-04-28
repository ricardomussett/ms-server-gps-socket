import { WebSocketGateway, SubscribeMessage, WebSocketServer } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { FilterDto } from '../../application/dto/filter.dto'
import { WebSocketService } from '../../application/service/websocket.service'
import { Logger } from '@nestjs/common'

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GpsWebSocketGateway {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(WebSocketGateway.name)
  private clientFilters: Map<string, any> = new Map()

  constructor(private readonly webSocketService: WebSocketService) {}

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
  @SubscribeMessage('request-data')
  async handleRequestData(client: Socket, payload: FilterDto): Promise<void> {
    try {
      // Guarda el filtro asociado al cliente usando su ID como clave
      this.clientFilters.set(client.id, payload)

      // Envía al cliente las posiciones iniciales aplicando el filtro registrado
      await this.webSocketService.sendInitialPositions(client)
    } catch (error) {
      // Registra el error en caso de fallo al obtener o enviar los datos filtrados
      this.logger.error('Error al obtener datos filtrados:', error)
    }
  }
}
