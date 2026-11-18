
import {
  Droplets,
  FlaskConical,
  Lightbulb,
  Thermometer,
  Waves,
} from "lucide-react"

import type { SensorReading } from "@/lib/dashboard-types"

export const METRICS = [
  {
    key: "temperature",
    label: "Temperature",
    unit: "°C",
    icon: Thermometer,
    color: "#ea8b45",
    iconClass: "bg-orange-50 text-orange-700",
  },
  {
    key: "humidity",
    label: "Humidity",
    unit: "%",
    icon: Droplets,
    color: "#4793d2",
    iconClass: "bg-blue-50 text-blue-700",
  },
  {
    key: "ph",
    label: "pH level",
    unit: "",
    icon: FlaskConical,
    color: "#329b87",
    iconClass: "bg-teal-50 text-teal-700",
  },
  {
    key: "tds",
    label: "TDS",
    unit: "ppm",
    icon: Waves,
    color: "#8b71cf",
    iconClass: "bg-violet-50 text-violet-700",
  },
  {
    key: "light",
    label: "Light intensity",
    unit: "lux",
    icon: Lightbulb,
    color: "#d7a12e",
    iconClass: "bg-amber-50 text-amber-700",
  },
] as const

export type MetricKey = (typeof METRICS)[number]["key"]

export type TimeRange = "24h" | "7d" | "30d" | "All"

export const TIME_RANGES: TimeRange[] = [
  "24h",
  "7d",
  "30d",
  "All",
]

const RANGE_HOURS: Record<TimeRange, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  All: Infinity,
}

export function formatValue(value: number) {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })
}

export function formatDateTime(value: string | number) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "Unknown"

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function filterReadings(
  readings: SensorReading[],
  metric: MetricKey,
  range: TimeRange
) {
  const matching = readings
    .filter(
      (reading) =>
        reading.metric === metric &&
        Number.isFinite(reading.value) &&
        Number.isFinite(
          new Date(reading.recordedAt).getTime()
        )
    )
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() -
        new Date(b.recordedAt).getTime()
    )

  if (!matching.length || range === "All") {
    return matching
  }

  const latest = new Date(
    matching[matching.length - 1].recordedAt
  ).getTime()

  const cutoff = latest - RANGE_HOURS[range] * 3600000

  return matching.filter(
    (reading) =>
      new Date(reading.recordedAt).getTime() >= cutoff
  )
}
