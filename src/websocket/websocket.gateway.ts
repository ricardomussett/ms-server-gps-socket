import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GpsWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GpsWebSocketGateway.name);
  private clientFilters: Map<string, any> = new Map();

  constructor(private readonly redisService: RedisService) {
    this.redisService.onMessage((channel, message) => {
      this.handleRedisMessage(channel, message);
    });
  }

  private handleRedisMessage(channel: string, message: string) {
    if (channel === 'position-updates') {
      try {
        const data = JSON.parse(message);
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
        if (this.redisService.matchesFilters(positionData, clientFilter)) {
          client.emit('all-positions', positionData);
        }
      });
      
      // Actualizar Redis con la nueva posición
      const key = `${process.env.REDIS_KEY_PREFIX || 'truck'}:${data.data.id}`;
      this.redisService.updatePosition(key, data.data);
    } catch (error) {
      this.logger.error('Error al manejar actualización de posición:', error);
    }
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
    await this.sendInitialPositions(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
    this.clientFilters.delete(client.id);
  }

  private async sendInitialPositions(client: Socket) {
    try {
      const clientFilter = this.clientFilters.get(client.id);
      const positions = await this.redisService.getFilteredPositions(clientFilter);
      if (Object.keys(positions).length > 0) {
        client.emit('all-positions', positions);
      }
    } catch (error) {
      this.logger.error('Error al enviar posiciones iniciales:', error);
    }
  }

  @SubscribeMessage('request-data')
  async handleRequestData(client: Socket, payload: any) {
    try {
      this.logger.log('Solicitud de datos recibida con filtros:', payload);
      this.clientFilters.set(client.id, payload);
      const filteredPositions = await this.redisService.getFilteredPositions(payload);
      client.emit('all-positions', filteredPositions);
    } catch (error) {
      this.logger.error('Error al obtener datos filtrados:', error);
    }
  }
} 
