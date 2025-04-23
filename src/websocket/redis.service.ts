import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private redisSubscriber: Redis;
  private redisClient: Redis;

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
  }

  onMessage(callback: (channel: string, message: string) => void) {
    this.redisSubscriber.on('message', callback);
  }

  async getFilteredPositions(filters: any) {
    try {
      const pattern = `${process.env.REDIS_KEY_PREFIX || 'truck'}:*`;
      const keys = await this.redisClient.keys(pattern);
      if (keys.length === 0) return {};

      const positions = {};
      for (const key of keys) {
        const data = await this.redisClient.hgetall(key);
        if (data && Object.keys(data).length > 0) {
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

  public matchesFilters(data: any, filters: any): boolean {
    if (!filters) return true;

    if (filters.pseudoIP && data.pseudoIP !== filters.pseudoIP) {
      return false;
    }

    if (filters.startDate || filters.endDate) {
      const lastUpdate = new Date(data.lastUpdate);
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (lastUpdate < startDate) {
          return false;
        }
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        if (lastUpdate > endDate) {
          return false;
        }
      }
    }

    return true;
  }

  async updatePosition(key: string, data: any) {
    try {
      await this.redisClient.hmset(key, {
        ...data,
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error al actualizar posición en Redis:', error);
    }
  }
}
