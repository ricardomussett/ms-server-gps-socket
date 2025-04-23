import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GpsWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GpsWebSocketGateway.name);
  private redisSubscriber: Redis;
  private redisClient: Redis;
  private clientFilters: Map<string, any> = new Map();

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: parseInt(process.env.REDIS_DB || '1')
    };

    this.redisClient = new Redis(redisConfig);
    this.redisSubscriber = new Redis(redisConfig);

    this.redisSubscriber.on('connect', () => {
      this.logger.log('Conectado a Redis como suscriptor');
      this.setupRedisSubscription();
    });

    this.redisSubscriber.on('error', (error) => {
      this.logger.error('Error en la conexión Redis:', error);
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Conectado a Redis como cliente');
    });

    this.redisClient.on('error', (error) => {
      this.logger.error('Error en la conexión Redis:', error);
    });
  }

  private setupRedisSubscription() {
    this.redisSubscriber.subscribe('position-updates', (err) => {
      if (err) {
        this.logger.error('Error al suscribirse a Redis:', err);
      } else {
        this.logger.log('Suscrito exitosamente al canal position-updates');
      }
    });

    this.redisSubscriber.on('message', (channel, message) => {
      this.logger.log(`Mensaje recibido en el canal ${channel}:`, message);
      this.handleRedisMessage(channel, message);
    });
  }

  private handleRedisMessage(channel: string, message: string) {
    if (channel === 'position-updates') {
      try {
        const data = JSON.parse(message);
        this.logger.log('Mensaje recibido de Redis:', data);
        
        if (data.type === 'position') {
          this.handlePositionUpdate(data);
        }
      } catch (error) {
        this.logger.error('Error al procesar mensaje de Redis:', error);
      }
    }
  }

  private handlePositionUpdate(data: any) {
    try {
      const positionData = {
        ...data.data,
        timestamp: data.timestamp
      };

      this.logger.log('---Enviando actualización de posición:', positionData);
      
      // Enviar la actualización solo a los clientes cuyos filtros coincidan
      this.server.sockets.sockets.forEach((client) => {
        const clientFilter = this.clientFilters.get(client.id);
        if (this.matchesFilters(positionData, clientFilter || {})) {
          client.emit('all-positions', positionData);
        }
      });
      
      // Actualizar Redis con la nueva posición
      const key = `${process.env.REDIS_KEY_PREFIX || 'truck'}:${data.data.id}`;
      this.redisClient.hmset(key, {
        ...data.data,
        lastUpdate: data.timestamp
      });
    } catch (error) {
      this.logger.error('Error al manejar actualización de posición:', error);
    }
  }

  private broadcastPosition(data: any) {
    this.server.emit('position', data);
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
    await this.sendInitialPositions(client);
    
    // Suscribir al cliente a las actualizaciones en tiempo real
    client.on('position-updates', () => {
      this.logger.log(`Cliente ${client.id} solicitó actualizaciones de posición`);
      this.handleRequestData(client, {});
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
    // Limpiar los filtros del cliente al desconectarse
    this.clientFilters.delete(client.id);
  }

  private async sendInitialPositions(client: Socket) {
    try {
  
      const clientFilter = this.clientFilters.get(client.id);

      const positions = await this.getFilteredPositions(clientFilter);
      if (Object.keys(positions).length > 0) {
        client.emit('all-positions', positions);
      }
    } catch (error) {
      this.logger.error('Error al enviar posiciones iniciales:', error);
    }
  }

  private async getAllPositions() {
    try {
      const pattern = `${process.env.REDIS_KEY_PREFIX || 'truck'}:*`;
      const keys = await this.redisClient.keys(pattern);
      if (keys.length === 0) return {};

      const positions = {};
      for (const key of keys) {
        const data = await this.redisClient.hgetall(key);
        if (data && Object.keys(data).length > 0) {
          positions[key] = data;
        }
      }
      return positions;
    } catch (error) {
      this.logger.error('Error al obtener posiciones de Redis:', error);
      return {};
    }
  }

  @SubscribeMessage('request-data')
  async handleRequestData(client: Socket, payload: any) {
    try {
      this.logger.log('Solicitud de datos recibida con filtros:', payload);
      // Almacenar los filtros del cliente
      this.clientFilters.set(client.id, payload);
      const filteredPositions = await this.getFilteredPositions(payload);
      client.emit('all-positions', filteredPositions);
    } catch (error) {
      this.logger.error('Error al obtener datos filtrados:', error);
    }
  }

  private async getFilteredPositions(filters: any) {
    try {
      const pattern = `${process.env.REDIS_KEY_PREFIX || 'truck'}:*`;
      const keys = await this.redisClient.keys(pattern);
      if (keys.length === 0) return {};

      const positions = {};
      for (const key of keys) {
        const data = await this.redisClient.hgetall(key);
        if (data && Object.keys(data).length > 0) {
          // Aplicar filtros
          if (this.matchesFilters(data, filters)) {
            positions[key] = data;
          }
        }
      }
      return positions;
    } catch (error) {
      this.logger.error('Error al obtener posiciones filtradas:', error);
      return {};
    }
  }

  /**
   * Comprueba si los datos de posición cumplen con los filtros especificados.
   *
   * @param data - Objeto con la información de la posición (p. ej., pseudoIP, lastUpdate).
   * @param filters - Criterios de filtrado opcionales:
   *   • pseudoIP: si se proporciona, debe coincidir exactamente con data.pseudoIP.
   *   • startDate: fecha mínima (inclusive) permitida para lastUpdate.
   *   • endDate: fecha máxima (inclusive) permitida para lastUpdate.
   * @returns `true` si todos los filtros se satisfacen; en caso contrario, `false`.
   */
  private matchesFilters(data: any, filters: any): boolean {
    // 1. Filtro por pseudoIP: si existe, debe coincidir exactamente.
    if (filters.pseudoIP && data.pseudoIP !== filters.pseudoIP) {
      return false;
    }

    // 2. Filtro por rango de fechas: sólo aplica si se define startDate o endDate.
    if (filters.startDate || filters.endDate) {
      const lastUpdate = new Date(data.lastUpdate);

      // 2.1. Verificar fecha de inicio (no debe ser anterior a startDate).
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (lastUpdate < startDate) {
          return false;
        }
      }

      // 2.2. Verificar fecha de fin (no debe ser posterior a endDate).
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        if (lastUpdate > endDate) {
          return false;
        }
      }
    }

    // Todos los filtros pasaron: incluir la posición.
    return true;
  }
} 
