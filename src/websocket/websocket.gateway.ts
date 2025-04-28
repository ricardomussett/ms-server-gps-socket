import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'
import { RedisService } from './redis.service'
import { FilterDto } from './dto/filter.dto'

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GpsWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(GpsWebSocketGateway.name)
  private clientFilters: Map<string, any> = new Map()

  constructor(private readonly redisService: RedisService) {
    this.redisService.onMessage((channel, message) => {
      this.handleRedisMessage(channel, message)
    })
  }

  /**
   * Manejador que se invoca cuando un cliente se conecta al WebSocket.
   *
   * - Registra en los logs el ID del cliente que acaba de conectarse.
   * - Aquí se pueden inicializar recursos o filtros por defecto para el cliente.
   *
   * @param client Socket que representa al cliente conectado.
   */
  handleConnection(client: Socket): void {
    // Loguea la conexión del cliente con su identificación única
    this.logger.log(`Cliente conectado: ${client.id}`)
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
  handleDisconnect(client: Socket): void {
    // Loguea la desconexión del cliente con identificación única
    this.logger.log(`Cliente desconectado: ${client.id}`)
    // Remueve el filtro previamente registrado para este cliente
    this.clientFilters.delete(client.id)
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
  @SubscribeMessage('request-data')
  async handleRequestData(client: Socket, payload: FilterDto): Promise<void> {
    try {
      // Guarda el filtro asociado al cliente usando su ID como clave
      this.clientFilters.set(client.id, payload)

      // Envía al cliente las posiciones iniciales aplicando el filtro registrado
      await this.sendInitialPositions(client)
    } catch (error) {
      // Registra el error en caso de fallo al obtener o enviar los datos filtrados
      this.logger.error('Error al obtener datos filtrados:', error)
    }
  }

  /**
   * Envía las posiciones iniciales al cliente según el filtro registrado.
   *
   * Pasos:
   *  1. Obtiene el filtro asociado al cliente `client.id`.
   *  2. Recupera desde Redis las posiciones que cumplen con dicho filtro.
   *  3. Si existen resultados, emite el evento 'positions' con los datos al cliente.
   *  4. Captura y registra cualquier error durante el proceso.
   *
   * @param client - Instancia de Socket del cliente que solicita los datos.
   */
  private async sendInitialPositions(client: Socket) {
    try {
      // 1. Obtener el filtro asignado al cliente
      const clientFilter = this.clientFilters.get(client.id) as FilterDto

      // 2. Consultar Redis para obtener las posiciones filtradas
      const positions = await this.redisService.getFilteredPositions(clientFilter)

      // 3. Solo emitir si hay posiciones válidas
      if (positions.length > 0) {
        client.emit('positions', positions)
      }
    } catch (error) {
      // 4. Registrar cualquier fallo en obtención o envío de datos
      this.logger.error('Error al enviar posiciones iniciales:', error)
    }
  }

  /**
   * Maneja los mensajes entrados desde Redis para actualizaciones de posición.
   *
   * Este método realiza las siguientes acciones:
   * 1. Verifica que el canal sea 'position-updates'.
   * 2. Parsea el mensaje JSON recibido.
   * 3. Si el tipo de mensaje es 'position', invoca handlePositionUpdate.
   * 4. Captura y registra errores de parseo o procesamiento.
   *
   * @param channel - Nombre del canal de Redis que envía el mensaje.
   * @param message - Mensaje en formato JSON con la actualización.
   */
  private handleRedisMessage(channel: string, message: string): void {
    // Solo procesar mensajes del canal 'position-updates'
    if (channel === 'position-updates') {
      try {
        // Convertir el string JSON en objeto
        const data = JSON.parse(message) as { type: string; data: unknown; timestamp: string }

        // Si el mensaje es de tipo 'position', manejar la actualización
        if (data.type === 'position') {
          this.handlePositionUpdate(data)
        }
      } catch (error) {
        // Registrar cualquier error al parsear o procesar el mensaje
        this.logger.error('Error al procesar mensaje de Redis:', error)
      }
    }
  }

  /**
   * Maneja la actualización de posición recibida desde Redis.
   *
   * Este método realiza los siguientes pasos:
   *   1. Extrae los datos de posición de `data.data` y añade la `timestamp`.
   *   2. Recorre todos los clientes conectados al servidor.
   *   3. Filtra y emite la actualización solo a los clientes cuyos filtros coincidan.
   *
   * @param data Objeto con la información de la actualización:
   *             - data.data: datos de posición (latitud, longitud, etc.).
   *             - data.timestamp: marca de tiempo de la actualización.
   * @returns void
   */
  private handlePositionUpdate(data: { data: unknown; timestamp: string }): void {
    try {
      // Construir objeto de posición a partir de los datos recibidos y la marca de tiempo
      const safeData = data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : {}
      const positionData = {
        ...safeData,
        timestamp: data.timestamp,
      }

      // Iterar sobre cada cliente conectado al servidor WebSocket
      this.server.sockets.sockets.forEach((client) => {
        // Obtener el filtro asociado a este cliente
        const clientFilter = this.clientFilters.get(client.id) as FilterDto

        // Si la posición cumple con el filtro del cliente, emitir el evento 'update-positions'
        if (this.redisService.matchesFilters(positionData, clientFilter)) {
          client.emit('update-positions', positionData)
        }
      })
    } catch (error) {
      // Registrar cualquier error que ocurra durante el proceso
      this.logger.error('Error al manejar actualización de posición:', error)
    }
  }
}
