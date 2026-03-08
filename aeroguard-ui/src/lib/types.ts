export interface LiveFlight {
  callsign: string
  flightIata: string
  airline: string
  depIata: string
  depAirport: string
  arrIata: string
  arrAirport: string
  aircraft: string
  status: string
  depCoords: [number, number]
  arrCoords: [number, number]
  currentPos: [number, number]
  progress: number
  altitude: number
  speed: number
  direction: number
  hasLiveGps: boolean
}
