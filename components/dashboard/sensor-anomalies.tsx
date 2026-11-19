
"use client"

import { useMemo, useState } from "react"
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertTriangle, Activity, Clock3 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  formatDateTime,
  formatValue,
  type MetricKey,
  type TimeRange,
} from "./metric-config"

type Props = {
  readings: SensorReading[]
  range: TimeRange
}

type AnomalyType = "fault" | "warning" | "spike" | "gap"
type AnomalyFilter = "all" | AnomalyType

type Anomaly = {
  id: string
  metric: MetricKey
  timestamp: number
  value: number | null
  unit: string
  type: AnomalyType
  reason: string
  row: number
}

// Configurable lettuce-growing reference ranges.
// Temperature assumes an AIR temperature sensor.
const REFERENCE_RANGES: Partial<
  Record<MetricKey, { min: number; max: number }>
> = {
  ph: { min: 6.0, max: 7.0 },
  humidity: { min: 50, max: 70 },
  temperature: { min: 18, max: 28 },
}

// Heuristic changes between consecutive readings.
// These are monitoring settings, not published crop limits.
const JUMP_LIMITS: Partial<Record<MetricKey, number>> = {
  ph: 0.4,
  temperature: 5,
  humidity: 25,
  tds: 250,
}

const HOUR_MS = 60 * 60 * 1000
const MAX_GAP_MS = 6 * HOUR_MS
const MIN_SPIKE_INTERVAL_MS = 30 * 60 * 1000

const COLORS: Record<AnomalyType, string> = {
  fault: "var(--destructive)",
  warning: "var(--chart-4)",
  spike: "var(--chart-2)",
  gap: "var(--muted-foreground)",
}

const TYPE_LABELS: Record<AnomalyType, string> = {
  fault: "Sensor fault",
  warning: "Growing warning",
  spike: "Sudden change",
  gap: "Data gap",
}

function getFaultReason(
  metric: string,
  value: number
): string | null {
  if (!Number.isFinite(value)) {
    return "Invalid numeric sensor reading"
  }

  if (metric === "ph" && (value <= 0 || value > 14)) {
    return "Implausible pH reading; check probe calibration"
  }

  if (
    metric === "humidity" &&
    (value <= 0 || value > 100)
  ) {
    return "Implausible relative humidity reading"
  }

  if (metric === "tds" && value <= 0) {
    return "Zero or negative TDS; check probe and solution"
  }

  if (metric === "voltage" && value <= 0) {
    return "Zero or negative sensor voltage"
  }

  if (metric === "light" && value < 0) {
    return "Negative light intensity is invalid"
  }

  if (
    metric === "temperature" &&
    (value < -10 || value > 60)
  ) {
    return "Extreme temperature; check sensor accuracy"
  }

  return null
}

function getRangeWarning(
  metric: MetricKey,
  value: number,
  unit: string
): string | null {
  const range = REFERENCE_RANGES[metric]

  if (!range) return null

  if (value < range.min || value > range.max) {
    return (
      `Outside configured lettuce reference range ` +
      `(${formatValue(range.min)}–` +
      `${formatValue(range.max)} ${unit})`
    )
  }

  return null
}

function formatDuration(milliseconds: number) {
  const hours = milliseconds / HOUR_MS

  if (hours >= 48) {
    return `${(hours / 24).toFixed(1)} days`
  }

  return `${hours.toFixed(1)} hours`
}

function detectAnomalies(
  readings: SensorReading[],
  range: TimeRange
): Anomaly[] {
  const anomalies: Anomaly[] = []

  // Use the newest available record as the reference point.
  // This avoids treating an old historical dataset as if it
  // should still be producing readings right now.
  const latestTimestamp = readings.reduce((latest, reading) => {
    const time = new Date(reading.recordedAt).getTime()

    return Number.isFinite(time)
      ? Math.max(latest, time)
      : latest
  }, 0)

  METRICS.forEach((metric, row) => {
    const samples = filterReadings(
      readings,
      metric.key,
      range
    )
      .map((reading) => ({
        timestamp: new Date(reading.recordedAt).getTime(),
        value: reading.value,
        unit: reading.unit || metric.unit,
      }))
      .filter((sample) =>
        Number.isFinite(sample.timestamp)
      )
      .sort((a, b) => a.timestamp - b.timestamp)

    if (samples.length === 0) {
      if (latestTimestamp > 0) {
        anomalies.push({
          id: `${metric.key}-missing`,
          metric: metric.key,
          timestamp: latestTimestamp,
          value: null,
          unit: metric.unit,
          type: "gap",
          reason: "No readings available for this sensor",
          row,
        })
      }

      return
    }

    for (let i = 0; i < samples.length; i++) {
      const current = samples[i]
      const previous = i > 0 ? samples[i - 1] : null

      const elapsed = previous
        ? current.timestamp - previous.timestamp
        : 0

      // Check for missing expected 3-hour samples.
      if (previous && elapsed > MAX_GAP_MS) {
        anomalies.push({
          id: `${metric.key}-gap-${i}`,
          metric: metric.key,
          timestamp: current.timestamp,
          value: null,
          unit: current.unit,
          type: "gap",
          reason:
            `No readings for ${formatDuration(elapsed)} ` +
            `before this sample`,
          row,
        })
      }

      // An implausible reading takes priority over other
      // warnings for the same sample.
      const faultReason = getFaultReason(
        metric.key,
        current.value
      )

      if (faultReason) {
        anomalies.push({
          id: `${metric.key}-fault-${i}`,
          metric: metric.key,
          timestamp: current.timestamp,
          value: current.value,
          unit: current.unit,
          type: "fault",
          reason: faultReason,
          row,
        })

        continue
      }

      // Only compare relatively nearby valid samples.
      // Light changes can reflect lamps switching on/off.
      // Voltage may represent multiple probes, so neither
      // is included in sudden-change detection by default.
      const jumpLimit = JUMP_LIMITS[metric.key]

      if (
        previous &&
        jumpLimit !== undefined &&
        elapsed >= MIN_SPIKE_INTERVAL_MS &&
        elapsed <= MAX_GAP_MS &&
        !getFaultReason(metric.key, previous.value)
      ) {
        const difference = Math.abs(
          current.value - previous.value
        )

        if (difference >= jumpLimit) {
          anomalies.push({
            id: `${metric.key}-spike-${i}`,
            metric: metric.key,
            timestamp: current.timestamp,
            value: current.value,
            unit: current.unit,
            type: "spike",
            reason:
              `Changed by ${formatValue(difference)} ` +
              `${current.unit} since the previous reading`,
            row,
          })

          continue
        }
      }

      const rangeWarning = getRangeWarning(
        metric.key,
        current.value,
        current.unit
      )

      if (rangeWarning) {
        anomalies.push({
          id: `${metric.key}-warning-${i}`,
          metric: metric.key,
          timestamp: current.timestamp,
          value: current.value,
          unit: current.unit,
          type: "warning",
          reason: rangeWarning,
          row,
        })
      }
    }

    // Detect a sensor that stopped recording while other
    // sensors continued to produce data.
    const last = samples[samples.length - 1]
    const trailingGap = latestTimestamp - last.timestamp

    if (trailingGap > MAX_GAP_MS) {
      anomalies.push({
        id: `${metric.key}-trailing-gap`,
        metric: metric.key,
        timestamp: latestTimestamp,
        value: null,
        unit: last.unit,
        type: "gap",
        reason:
          `No new readings for ` +
          `${formatDuration(trailingGap)} while other ` +
          `sensors continued recording`,
        row,
      })
    }
  })

  return anomalies.sort(
    (a, b) => b.timestamp - a.timestamp
  )
}

export function SensorAnomalies({
  readings,
  range,
}: Props) {
  const [filter, setFilter] =
    useState<AnomalyFilter>("all")
  const [visibleCount, setVisibleCount] = useState(8)

  const anomalies = useMemo(
    () => detectAnomalies(readings, range),
    [readings, range]
  )

  const filtered = useMemo(
    () =>
      filter === "all"
        ? anomalies
        : anomalies.filter((item) => item.type === filter),
    [anomalies, filter]
  )

  const counts = useMemo(() => {
    return {
      fault: anomalies.filter((a) => a.type === "fault").length,
      warning: anomalies.filter((a) => a.type === "warning")
        .length,
      spike: anomalies.filter((a) => a.type === "spike").length,
      gap: anomalies.filter((a) => a.type === "gap").length,
    }
  }, [anomalies])

  const filters: {
    key: AnomalyFilter
    label: string
    count: number
  }[] = [
    {
      key: "all",
      label: "All",
      count: anomalies.length,
    },
    {
      key: "fault",
      label: "Faults",
      count: counts.fault,
    },
    {
      key: "warning",
      label: "Growing warnings",
      count: counts.warning,
    },
    {
      key: "spike",
      label: "Sudden changes",
      count: counts.spike,
    },
    {
      key: "gap",
      label: "Data gaps",
      count: counts.gap,
    },
  ]

  function selectFilter(next: AnomalyFilter) {
    setFilter(next)
    setVisibleCount(8)
  }

  return (
    <Card className="min-w-0 border-border bg-card shadow-sm">
      <CardHeader className="gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2.5">
            <Activity
              size={20}
              className="text-foreground"
            />
          </div>

          <div>
            <CardTitle>Sensor anomaly timeline</CardTitle>
            <CardDescription className="mt-1">
              Sensor irregularities, lettuce growing warnings,
              and recording gaps
            </CardDescription>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((option) => (
            <Button
              key={option.key}
              type="button"
              size="sm"
              variant={
                filter === option.key
                  ? "default"
                  : "outline"
              }
              onClick={() => selectFilter(option.key)}
              className="gap-2"
            >
              {option.label}
              <span className="tabular-nums opacity-70">
                {option.count}
              </span>
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {(
            ["fault", "warning", "spike", "gap"] as const
          ).map((type) => (
            <div
              key={type}
              className="flex items-center gap-2"
            >
              <span
                className="size-2.5 rounded-full"
                style={{
                  backgroundColor: COLORS[type],
                }}
              />
              <span className="text-xs text-muted-foreground">
                {TYPE_LABELS[type]}
              </span>
            </div>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{
                  top: 15,
                  right: 20,
                  bottom: 5,
                  left: 5,
                }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />

                <XAxis
                  type="number"
                  dataKey="timestamp"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  minTickGap={35}
                  tick={{
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                  tickFormatter={(timestamp) =>
                    new Date(timestamp).toLocaleDateString(
                      "en-IN",
                      {
                        timeZone: "Asia/Kolkata",
                        day: "numeric",
                        month: "short",
                      }
                    )
                  }
                />

                <YAxis
                  type="number"
                  dataKey="row"
                  domain={[-0.5, METRICS.length - 0.5]}
                  ticks={METRICS.map((_, index) => index)}
                  width={85}
                  tick={{
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                  tickFormatter={(value) =>
                    METRICS[value]?.label || ""
                  }
                />

                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) {
                      return null
                    }

                    const event = payload[0]
                      .payload as Anomaly

                    const definition = METRICS.find(
                      (item) => item.key === event.metric
                    )

                    return (
                      <div className="max-w-64 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-md">
                        <p className="font-semibold">
                          {definition?.label || event.metric}
                        </p>

                        <p className="mt-1 text-muted-foreground">
                          {formatDateTime(event.timestamp)}
                        </p>

                        <p className="mt-2 font-medium">
                          {TYPE_LABELS[event.type]}
                        </p>

                        {event.value !== null && (
                          <p className="mt-1">
                            Value: {formatValue(event.value)}{" "}
                            {event.unit}
                          </p>
                        )}

                        <p className="mt-1 text-muted-foreground">
                          {event.reason}
                        </p>
                      </div>
                    )
                  }}
                />

                <Scatter
                  data={filtered}
                  isAnimationActive={false}
                >
                  {filtered.map((event) => (
                    <Cell
                      key={event.id}
                      fill={COLORS[event.type]}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-72 flex-col items-center justify-center gap-2 text-center">
            <Activity
              size={26}
              className="text-muted-foreground"
            />
            <p className="text-sm font-medium">
              No anomalies detected
            </p>
            <p className="text-xs text-muted-foreground">
              Nothing matched the selected filter and period.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Detected events
            </h3>

            <span className="text-xs text-muted-foreground">
              {filtered.length} events
            </span>
          </div>

          {filtered.slice(0, visibleCount).map((event) => {
            const definition = METRICS.find(
              (item) => item.key === event.metric
            )

            return (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="rounded-lg bg-muted p-2">
                  {event.type === "gap" ? (
                    <Clock3
                      size={17}
                      className="text-muted-foreground"
                    />
                  ) : (
                    <AlertTriangle
                      size={17}
                      className={
                        event.type === "fault"
                          ? "text-destructive"
                          : "text-foreground"
                      }
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {definition?.label || event.metric}
                      {event.value !== null &&
                        ` · ${formatValue(event.value)} ${event.unit}`}
                    </p>

                    <Badge
                      variant={
                        event.type === "fault"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {TYPE_LABELS[event.type]}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {event.reason}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.timestamp)}
                  </p>
                </div>
              </div>
            )
          })}

          {filtered.length > visibleCount && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                setVisibleCount((count) => count + 10)
              }
            >
              Show more events
            </Button>
          )}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Period: {range}. Monitoring rules are configurable.
          A warning indicates a value worth reviewing, not
          a confirmed sensor failure or plant health problem.
          Data gaps assume approximately three-hour sampling.
        </p>
      </CardContent>
    </Card>
  )
}
