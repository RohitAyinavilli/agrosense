
"use client"

import { useMemo } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { SensorReading } from "@/lib/dashboard-types"
import {
  METRICS,
  filterReadings,
  formatValue,
  type MetricKey,
  type TimeRange,
} from "./metric-config"

type Props = {
  readings: SensorReading[]
  metric: MetricKey
  range: TimeRange
}

export function QuickAnalytics({
  readings,
  metric,
  range,
}: Props) {
  const selected = useMemo(
    () => filterReadings(readings, metric, range),
    [readings, metric, range]
  )

  const values = selected.map((reading) => reading.value)

  const average = values.length
    ? values.reduce((sum, value) => sum + value, 0) /
      values.length
    : null

  const minimum = values.length ? Math.min(...values) : null
  const maximum = values.length ? Math.max(...values) : null

  const definition = METRICS.find(
    (item) => item.key === metric
  )!

  const unit = selected[0]?.unit || definition.unit

  function display(value: number | null) {
    return value === null
      ? "—"
      : `${formatValue(value)}${unit ? ` ${unit}` : ""}`
  }

  const stats = [
    { label: "Average", value: display(average) },
    { label: "Minimum", value: display(minimum) },
    { label: "Maximum", value: display(maximum) },
    { label: "Readings", value: formatValue(values.length) },
  ]

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle>Quick analytics</CardTitle>
        <CardDescription>
          {definition.label} statistics · {range}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-muted p-4"
            >
              <p className="text-xs text-muted-foreground">
                {stat.label}
              </p>

              <p className="mt-2 text-lg font-semibold tabular-nums">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
