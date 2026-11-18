export interface SensorReading {
  id: string
  metric: string
  value: number
  unit: string
  recordedAt: string
}

export interface PlantImage {
  id: string
  camera: string
  imageUrl: string
  capturedAt: string
}

export interface DashboardData {
  readings: SensorReading[]
  images: PlantImage[]
}
