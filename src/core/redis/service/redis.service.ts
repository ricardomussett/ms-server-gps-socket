import { Injectable, Logger } from '@nestjs/common'
import { Redis } from 'ioredis'
import { FilterDto } from '../../../app/websocket/application/dto/filter.dto'
import { redisConfig } from 'src/core/config/redis.config'

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name)
  private redisSubscriber: Redis
  private redisClient: Redis

  constructor() {
    this.initializeRedis()
  }

  /**
   * Inicializa las instancias de Redis para cliente y suscriptor.
   * - Lee la configuración (host, port, db) desde variables de entorno o valores por defecto.
   * - Crea dos conexiones: una para operaciones generales (cliente) y otra para Pub/Sub (suscriptor).
   * - Registra manejadores de eventos para conexión y errores en ambas instancias.
   * - Al conectar el suscriptor, inicia la suscripción al canal de actualizaciones.
   * @private
   */
  private initializeRedis() {
    // Configuración de Redis extraída de las variables de entorno
    const redis = {
      host: redisConfig.host,
      port: redisConfig.port,
      db: redisConfig.db,
    }

    // Instancia de Redis para comandos de lectura/escritura
    this.redisClient = new Redis(redis)
    // Instancia de Redis dedicada a manejar pub/sub
    this.redisSubscriber = new Redis(redis)

    this.redisManagement()
  }

  private redisManagement() {
    // Evento 'connect' del suscriptor: log y llamada a setupRedisSubscription
    this.redisSubscriber.on('connect', () => {
      this.logger.log('Conectado a Redis como suscriptor')
      void this.setupRedisSubscription()
    })

    // Evento 'error' del suscriptor: registro de error
    this.redisSubscriber.on('error', (error: Error) => {
      this.logger.error('Error en la conexión Redis del suscriptor:', error)
    })

    // Evento 'connect' del cliente: registro de conexión exitosa
    this.redisClient.on('connect', () => {
      this.logger.log('Conectado a Redis como cliente')
    })

    // Evento 'error' del cliente: registro de error
    this.redisClient.on('error', (error: Error) => {
      this.logger.error('Error en la conexión Redis del cliente:', error)
    })
  }

  /**
   * Inicializa la suscripción al canal 'position-updates' de Redis.
   *
   * Al suscribirse, Redis emitirá eventos 'message' para cada mensaje
   * publicado en el canal, los cuales serán gestionados por onMessage().
   * Registra logs de éxito o error durante la suscripción.
   */
  private async setupRedisSubscription(): Promise<void> {
    await this.redisSubscriber.subscribe('position-updates', (err, count) => {
      if (err) {
        // Log de error en caso de fallo al suscribir
        this.logger.error('Error al suscribirse al canal position-updates de Redis:', err)
      } else {
        // Log de éxito indicando cuántos canales están suscritos
        this.logger.log(`Suscrito exitosamente al canal 'position-updates'. Canales suscritos: ${count as string}`)
      }
    })
  }

  /**
   * Registra un manejador para recibir mensajes desde Redis.
   * Cada vez que llegue un mensaje en cualquier canal suscrito,
   * se invocará la función callback proporcionada.
   *
   * @param callback - Función que recibe dos parámetros:
   *                   channel: nombre del canal que emite el mensaje,
   *                   message: contenido del mensaje recibido.
   */
  onMessage(callback: (channel: string, message: string) => void): void {
    this.redisSubscriber.on('message', callback)
  }

  /**
   * Recupera desde Redis todas las posiciones almacenadas y aplica los filtros indicados.
   * @param filters - Instancia de FilterDto con criterios de búsqueda (por ejemplo, pseudoIPs).
   * @returns Promise<any[]> - Array de objetos de posición que cumplen los filtros.
   *                           Devuelve array vacío si no hay coincidencias o ante un error.
   */
  async getFilteredPositions(filters: FilterDto): Promise<any[]> {
    try {
      // Definir prefijo para las claves en Redis. Por defecto 'truck'.
      const prefix = process.env.REDIS_KEY_PREFIX || 'truck'
      // Construir patrón para buscar todas las claves de posición
      const pattern = `${prefix}:*`
      // Obtener todas las claves que cumplan con el patrón
      let keys = await this.redisClient.keys(pattern)

      // Excluir posibles claves mal formadas como '<prefix>:undefined'
      const invalidKey = `${prefix}:undefined`
      keys = keys.filter((key) => key !== invalidKey)

      // Si no existen claves válidas, retornar lista vacía
      if (keys.length === 0) {
        return []
      }

      const positionsList: any[] = []
      // Recorrer cada clave válida para obtener sus datos y aplicar filtros
      for (const key of keys) {
        // Leer todos los campos del hash almacenado en Redis
        const data = await this.redisClient.hgetall(key)
        // Verificar que existan datos y que cumplan los criterios de filtrado
        if (data && Object.keys(data).length > 0 && this.matchesFilters(data, filters)) {
          positionsList.push(data)
        }
      }

      // Devolver el array con las posiciones que pasaron el filtro
      return positionsList
    } catch (error) {
      // En caso de error, registrar y devolver array vacío
      this.logger.error('Error al obtener posiciones filtradas:', error)
      return []
    }
  }

  /**
   * Determina si los datos de posición cumplen con los filtros proporcionados.
   * @param data - Objeto con información de posición, debe incluir la propiedad gpsPseudoIP.
   * @param filters - Filtros a aplicar (FilterDto), opcional.
   * @returns true si no hay filtros o si `data` coincide con los filtros; false en caso contrario.
   */
  public matchesFilters(data: Record<string, string>, filters: FilterDto): boolean {
    // Si no se proporcionan filtros, acepta todos los datos
    if (!filters) {
      return true
    }

    // Verificar filtro de pseudoIPs si existe
    if (filters.pseudoIPs) {
      // Caso: filtro con múltiples pseudoIPs
      if (Array.isArray(filters.pseudoIPs)) {
        // Rechaza si el gpsPseudoIP del dato no está en la lista
        if (!filters.pseudoIPs.includes(data.gpsPseudoIP)) {
          return false
        }
      } else {
        // Caso: filtro con un único pseudoIP
        if (data.gpsPseudoIP !== filters.pseudoIPs) {
          return false
        }
      }
    }

    // Todos los filtros pasaron, devuelve true
    return true
  }
}
