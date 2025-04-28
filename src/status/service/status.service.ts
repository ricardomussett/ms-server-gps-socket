import { Injectable } from '@nestjs/common'
import { GpsWebSocketGateway } from '../../websocket/websocket.gateway'

@Injectable()
export class StatusService {
  constructor(private readonly wsGateway: GpsWebSocketGateway) {}

  getWebSocketStatus() {
    const server = this.wsGateway.server
    if (!server) {
      return {
        status: 'offline',
        port: null,
        connectedClients: 0,
      }
    }

    return {
      status: 'online',
      port: process.env.PORT ?? 3069,
      connectedClients: server.engine.clientsCount,
    }
  }
}
