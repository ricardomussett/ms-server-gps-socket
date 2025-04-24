import { Injectable } from '@nestjs/common';
import { CreateStatusDto } from '../dto/create-status.dto';
import { UpdateStatusDto } from '../dto/update-status.dto';
import { GpsWebSocketGateway } from '../../websocket/websocket.gateway';

@Injectable()
export class StatusService {
  constructor(private readonly wsGateway: GpsWebSocketGateway) {}

  create(createStatusDto: CreateStatusDto) {
    return 'This action adds a new status';
  }

  getWebSocketStatus() {
    const server = this.wsGateway.server;
    if (!server) {
      return {
        status: 'offline',
        port: null,
        connectedClients: 0
      };
    }

    return {
      status: 'online',
      port: process.env.PORT ?? 3069,
      connectedClients: server.engine.clientsCount
    };
  }
}
