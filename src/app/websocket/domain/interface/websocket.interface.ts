export interface IWebSocketData {
  clientId: string
  pseudoIP: string
  sim: string
  latitude: number
  longitude: number
  speed: number
  angle: number
  ignition: boolean
  oilResistance: number
  voltage: number
  mileage: number
  temperature: number
  timestamp: Date
  overSpeed: string
  nightTraffic: string
  vehicleId: number
  vehiclePlate: string
  vehicleColor: string
  vehicleDistrict: string
}
