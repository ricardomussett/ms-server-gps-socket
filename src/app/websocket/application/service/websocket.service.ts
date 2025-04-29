import { Server, Socket } from 'socket.io'
import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../../../../core/redis/service/redis.service'
import { FilterDto } from '../dto/filter.dto'

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name)

  constructor(private readonly redisService: RedisService) {}

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
  public async sendInitialPositions(client: Socket, clientFilters: Map<string, FilterDto>) {
    try {
      // 1. Obtener el filtro asignado al cliente
      const clientFilter = clientFilters.get(client.id) as FilterDto
      

      // 2. Consultar Redis para obtener las posiciones filtradas
      const positions = await this.redisService.getFilteredPositions(clientFilter)

      // 3. Solo emitir si hay posiciones válidas
      if (positions.length > 0) {
        client.emit('initial-positions', positions)
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
  async handleMessage(
    channel: string,
    message: string,
    server: Server,
    clientFilters: Map<string, FilterDto>,
  ): Promise<void> {
    try {
      if (channel === 'position-updates') {
        try {
          const data = JSON.parse(message) as { data: { id: number }; timestamp: string; type: string }
          if (data.type === 'position') {
            await this.handlePositionUpdate(data, server, clientFilters)
          }
        } catch (error) {
          this.logger.error('Error al procesar mensaje de Redis:', error)
        }
      }
    } catch (error) {
      // Registrar cualquier error que ocurra durante el proceso
      this.logger.error('Error al manejar mensaje de Redis:', error)
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
  async handlePositionUpdate(
    data: { data: { id: number }; timestamp: string },
    server: Server,
    clientFilters: Map<string, FilterDto>,
  ) {
    try {
      const safeData = data.data && typeof data.data === 'object' ? data.data : {}
      const positionData = {
        ...safeData,
        timestamp: data.timestamp,
      }

      this.logger.log('<- Obteniendo actualización de posición:', positionData)

      // Enviar la actualización solo a los clientes cuyos filtros coincidan
      server.sockets.sockets.forEach((client) => {
        const clientFilter = clientFilters.get(client.id) as FilterDto
        if (this.redisService.matchesFilters(positionData, clientFilter)) {
          client.emit('positions', positionData)
        }
      })
    } catch (error) {
      this.logger.error('Error al manejar actualización de posición:', error)
    }
  }

  
}
