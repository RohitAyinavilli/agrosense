
import type { DashboardData } from "@/lib/dashboard-types"

export type Reading = DashboardData["readings"][number]

export const PAGE_SIZE = 20
export const TIME_ZONE = "Asia/Kolkata"

export const METRIC_STYLES: Record<string, string> = {
  temperature: "bg-[#fceee9] text-[#a65a3b]",
  humidity: "bg-[#eaf3fc] text-[#426f9b]",
  light: "bg-[#fff5dd] text-[#967018]",
  ph: "bg-[#f2ecfb] text-[#795aa4]",
  tds: "bg-[#e7f5ef] text-[#397b61]",
}

const dateKeyFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
})

const displayDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
})

export function getDateKey(timestamp: string) {
  const parts = dateKeyFormatter.formatToParts(
    new Date(timestamp)
  )

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ""

  return `${get("year")}-${get("month")}-${get("day")}`
}

export function formatDateTime(timestamp: string) {
  return dateTimeFormatter.format(new Date(timestamp))
}

export function formatDate(dateKey: string) {
  return displayDateFormatter.format(
    new Date(`${dateKey}T12:00:00+05:30`)
  )
}

export function metricLabel(metric: string) {
  if (metric.toLowerCase() === "ph") return "pH"
  if (metric.toLowerCase() === "tds") return "TDS"

  return metric.charAt(0).toUpperCase() + metric.slice(1)
}

export function exportReadingsCSV(readings: Reading[]) {
  const headers = [
    "ID",
    "Metric",
    "Value",
    "Unit",
    "Recorded At",
  ]

  const rows = readings.map((reading) => [
    reading.id,
    reading.metric,
    reading.value,
    reading.unit,
    reading.recordedAt,
  ])

  const escapeCSV = (value: unknown) => {
    const text = String(value ?? "")
    return `"${text.replace(/"/g, '""')}"`
  }

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(","))
    .join("\r\n")

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  })

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = "agrosense-sensor-readings.csv"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
