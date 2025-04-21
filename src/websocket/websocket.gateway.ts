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

  constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: parseInt(process.env.REDIS_DB || '1')
    };

    // Cliente para suscripciones
    this.redisSubscriber = new Redis(redisConfig);
    
    // Cliente para comandos regulares
    this.redisClient = new Redis(redisConfig);

    // Suscribirse a los cambios en Redis usando el cliente de suscripción
    this.redisSubscriber.subscribe('position-updates', (err) => {
      if (err) {
        this.logger.error('Error al suscribirse a Redis:', err);
      } else {
        this.logger.log('Suscrito exitosamente al canal position-updates');
      }
    });

    // Escuchar mensajes de Redis
    this.redisSubscriber.on('message', (channel, message) => {
      this.logger.log(`Mensaje recibido en canal ${channel}: ${message}`);
      if (channel === 'position-updates') {
        try {
          const data = JSON.parse(message);
          if (data.type === 'position') {
            this.server.emit('position', data);
          }
        } catch (error) {
          this.logger.error('Error al procesar mensaje de Redis:', error);
        }
      }
    });
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('position-updates')
  async handleRequestData(client: Socket) {
    try {
      // Obtener todas las claves que coincidan con el patrón
      const keys = await this.redisClient.keys('*');

      console.log("-------------------------------------------------------");

      if (keys.length > 0) {
        // Obtener todos los valores correspondientes
        const values = await this.redisClient.mget(keys);
        
        // Crear un objeto con todas las posiciones
        const positions = keys.reduce((acc, key, index) => {
          const value = values[index];
          if (value !== null) {
            try {
              acc[key] = JSON.parse(value);
            } catch (e) {
              this.logger.error(`Error al parsear datos para la clave ${key}:`, e);
            }
          }
          return acc;
        }, {});

        client.emit('all-positions', positions);
      }
    } catch (error) {
      this.logger.error('Error al obtener datos de Redis:', error);
    }
  }
} 