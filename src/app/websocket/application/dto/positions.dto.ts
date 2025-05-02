import { DeviceDTO } from './device.dto'
import { geometryDTO } from './geometry.dto'
import { SensorDTO } from './sensor.dto'
import { TelemetryDTO } from './telemetry.dto'
import { VehicleDTO } from './vehicle.dto'
import { visualizationDTO } from './visualization.dto'

export class PositionsDTO {
  type: 'Feature'
  geometry: geometryDTO
  properties: {
    vehicle: VehicleDTO
    device: DeviceDTO
    telemetry: TelemetryDTO
    sensors: SensorDTO
    visualization: visualizationDTO
  }
}
