import { PositionsDTO } from '../../application/dto/positions.dto'
import { IWebSocketData } from '../interface/websocket.interface'

export class WebSocketTransformer {
  constructor() {}

  wrap(data: IWebSocketData[]): PositionsDTO[] {
    return data.map((item) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [item.longitude, item.latitude],
      },
      properties: {
        vehicle: {
          id: item.vehicleId,
          plate: item.vehiclePlate,
          district: item.vehicleDistrict,
        },
        device: {
          clientId: item.clientId,
          ip: item.pseudoIP,
          sim: item.sim,
        },
        telemetry: {
          timestamp: item.timestamp,
          heading: item.angle,
          mileage: item.mileage,
          speed: item.speed,
          temperature: item.temperature,
          voltage: item.voltage,
        },
        sensors: {
          ignition: item.ignition,
          nightDriving: Number(item.nightTraffic),
          oilResistance: item.oilResistance,
          overSpeed: Number(item.overSpeed),
        },
        visualization: {
          icon: 'truck',
          iconColor: item.vehicleColor,
        },
      },
    }))
  }

  unwrap() {}
}
