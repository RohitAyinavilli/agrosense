
"use client"

import { useMemo, useState } from "react"
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { SensorReading } from "@/lib/dashboard-types"
import {
  METRICS,
  filterReadings,
  formatDateTime,
  formatValue,
  type MetricKey,
  type TimeRange,
} from "./metric-config"

type Props = {
  readings: SensorReading[]
  range: TimeRange
}

type Point = {
  x: number
  y: number
  timestamp: number
}

const MATCH_WINDOW_MS = 10 * 60 * 1000

function getSamples(
  readings: SensorReading[],
  metric: MetricKey,
  range: TimeRange
) {
  return filterReadings(readings, metric, range)
    .map((reading) => ({
      time: new Date(reading.recordedAt).getTime(),
      value: reading.value,
    }))
    .filter(
      (item) =>
        Number.isFinite(item.time) &&
        Number.isFinite(item.value)
    )
    .sort((a, b) => a.time - b.time)
}

function matchReadings(
  xReadings: ReturnType<typeof getSamples>,
  yReadings: ReturnType<typeof getSamples>
): Point[] {
  const points: Point[] = []
  let i = 0
  let j = 0

  while (i < xReadings.length && j < yReadings.length) {
    const x = xReadings[i]
    const y = yReadings[j]
    const difference = x.time - y.time

    if (Math.abs(difference) <= MATCH_WINDOW_MS) {
      points.push({
        x: x.value,
        y: y.value,
        timestamp: Math.max(x.time, y.time),
      })
      i++
      j++
    } else if (difference < 0) {
      i++
    } else {
      j++
    }
  }

  return points
}

function calculateCorrelation(points: Point[]) {
  if (points.length < 2) return null

  const count = points.length
  const meanX =
    points.reduce((sum, point) => sum + point.x, 0) / count
  const meanY =
    points.reduce((sum, point) => sum + point.y, 0) / count

  let numerator = 0
  let sumX = 0
  let sumY = 0

  for (const point of points) {
    const dx = point.x - meanX
    const dy = point.y - meanY

    numerator += dx * dy
    sumX += dx * dx
    sumY += dy * dy
  }

  if (sumX === 0 || sumY === 0) return null

  return numerator / Math.sqrt(sumX * sumY)
}

export function SensorCorrelation({
  readings,
  range,
}: Props) {
  const [xMetric, setXMetric] =
    useState<MetricKey>("temperature")
  const [yMetric, setYMetric] =
    useState<MetricKey>("humidity")

  const xDefinition = METRICS.find(
    (item) => item.key === xMetric
  )!
  const yDefinition = METRICS.find(
    (item) => item.key === yMetric
  )!

  const points = useMemo(() => {
    if (xMetric === yMetric) return []

    return matchReadings(
      getSamples(readings, xMetric, range),
      getSamples(readings, yMetric, range)
    )
  }, [readings, xMetric, yMetric, range])

  const correlation = useMemo(
    () => calculateCorrelation(points),
    [points]
  )

  const strength =
    correlation === null
      ? "Insufficient variation"
      : Math.abs(correlation) >= 0.7
        ? "Strong"
        : Math.abs(correlation) >= 0.3
          ? "Moderate"
          : "Weak"

  const direction =
    correlation === null
      ? ""
      : correlation > 0
        ? "positive"
        : correlation < 0
          ? "negative"
          : "correlation"

  return (
    <Card className="min-w-0 border-border bg-card shadow-sm">
      <CardHeader className="gap-4">
        <div>
          <CardTitle>Sensor correlation</CardTitle>
          <CardDescription className="mt-1">
            Explore relationships between sensor measurements
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              X-axis
            </p>

            <Select
              value={xMetric}
              onValueChange={(value) => {
                if (
                  value &&
                  METRICS.some((item) => item.key === value)
                ) {
                  setXMetric(value as MetricKey)
                }
              }}
            >
              <SelectTrigger className="w-40 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((item) => (
                  <SelectItem
                    key={item.key}
                    value={item.key}
                    disabled={item.key === yMetric}
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Y-axis
            </p>

            <Select
              value={yMetric}
              onValueChange={(value) => {
                if (
                  value &&
                  METRICS.some((item) => item.key === value)
                ) {
                  setYMetric(value as MetricKey)
                }
              }}
            >
              <SelectTrigger className="w-40 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((item) => (
                  <SelectItem
                    key={item.key}
                    value={item.key}
                    disabled={item.key === xMetric}
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-4">
          <div>
            <p className="text-xs text-muted-foreground">
              Pearson correlation (r)
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {correlation === null
                ? "—"
                : correlation.toFixed(3)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium">
              {strength} {direction}
            </p>
            <p className="text-xs text-muted-foreground">
              {points.length} matched pairs
            </p>
          </div>
        </div>

        {points.length >= 2 ? (
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{
                  top: 10,
                  right: 20,
                  bottom: 5,
                  left: 0,
                }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />

                <XAxis
                  type="number"
                  dataKey="x"
                  name={xDefinition.label}
                  domain={["auto", "auto"]}
                  tick={{
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                  tickFormatter={(value) =>
                    formatValue(Number(value))
                  }
                />

                <YAxis
                  type="number"
                  dataKey="y"
                  name={yDefinition.label}
                  domain={["auto", "auto"]}
                  width={55}
                  tick={{
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                  tickFormatter={(value) =>
                    formatValue(Number(value))
                  }
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) {
                      return null
                    }

                    const point = payload[0].payload as Point

                    return (
                      <div className="rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-md">
                        <p className="mb-2 text-muted-foreground">
                          {formatDateTime(point.timestamp)}
                        </p>
                        <p>
                          {xDefinition.label}:{" "}
                          {formatValue(point.x)}{" "}
                          {xDefinition.unit}
                        </p>
                        <p>
                          {yDefinition.label}:{" "}
                          {formatValue(point.y)}{" "}
                          {yDefinition.unit}
                        </p>
                      </div>
                    )
                  }}
                />

                <Scatter
                  data={points}
                  fill={xDefinition.color}
                  fillOpacity={0.75}
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-72 items-center justify-center text-center text-sm text-muted-foreground">
            Not enough matching sensor readings.
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Readings are paired when recorded within 10 minutes
          of each other. Correlation describes association,
          not causation. Period: {range}.
        </p>
      </CardContent>
    </Card>
  )
}
