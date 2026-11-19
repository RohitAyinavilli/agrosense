
"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
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
  formatValue,
  type MetricKey,
  type TimeRange,
} from "./metric-config"

type Props = {
  readings: SensorReading[]
  range: TimeRange
}

type Bin = {
  label: string
  count: number
  minimum: number
  maximum: number
}

const BIN_COUNT = 10

function createHistogram(values: number[]): Bin[] {
  if (!values.length) return []

  const minimum = Math.min(...values)
  const maximum = Math.max(...values)

  if (minimum === maximum) {
    return [
      {
        label: formatValue(minimum),
        count: values.length,
        minimum,
        maximum,
      },
    ]
  }

  const width = (maximum - minimum) / BIN_COUNT

  const bins: Bin[] = Array.from(
    { length: BIN_COUNT },
    (_, index) => {
      const start = minimum + index * width
      const end = start + width

      return {
        label: formatValue((start + end) / 2),
        count: 0,
        minimum: start,
        maximum: end,
      }
    }
  )

  for (const value of values) {
    const index = Math.min(
      Math.floor((value - minimum) / width),
      BIN_COUNT - 1
    )

    bins[index].count++
  }

  return bins
}

export function SensorDistribution({
  readings,
  range,
}: Props) {
  const [metric, setMetric] =
    useState<MetricKey>("temperature")

  const definition = METRICS.find(
    (item) => item.key === metric
  )!

  const values = useMemo(
    () =>
      filterReadings(readings, metric, range)
        .map((reading) => reading.value)
        .filter(Number.isFinite),
    [readings, metric, range]
  )

  const histogram = useMemo(
    () => createHistogram(values),
    [values]
  )

  const average = values.length
    ? values.reduce((sum, value) => sum + value, 0) /
      values.length
    : null

  const minimum = values.length
    ? Math.min(...values)
    : null

  const maximum = values.length
    ? Math.max(...values)
    : null

  return (
    <Card className="min-w-0 border-border bg-card shadow-sm">
      <CardHeader className="gap-4">
        <div>
          <CardTitle>Sensor distribution</CardTitle>
          <CardDescription className="mt-1">
            Frequency of recorded sensor values
          </CardDescription>
        </div>

        <Select
          value={metric}
          onValueChange={(value) => {
            if (
              value &&
              METRICS.some((item) => item.key === value)
            ) {
              setMetric(value as MetricKey)
            }
          }}
        >
          <SelectTrigger className="w-44 bg-background">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {METRICS.map((item) => (
              <SelectItem
                key={item.key}
                value={item.key}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-xl bg-muted p-4">
          <div>
            <p className="text-xs text-muted-foreground">
              Samples
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {values.length}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Average
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {average === null
                ? "—"
                : formatValue(average)}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Range
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {minimum === null || maximum === null
                ? "—"
                : `${formatValue(minimum)}–${formatValue(maximum)}`}
            </p>
          </div>
        </div>

        {histogram.length > 0 ? (
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={histogram}
                margin={{
                  top: 10,
                  right: 15,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  interval={0}
                  minTickGap={0}
                  tick={{
                    fill: "var(--muted-foreground)",
                    fontSize: 10,
                  }}
                />

                <YAxis
                  allowDecimals={false}
                  width={40}
                  tick={{
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                />

                <Tooltip
                  cursor={{
                    fill: "var(--muted)",
                    opacity: 0.5,
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) {
                      return null
                    }

                    const bin = payload[0].payload as Bin

                    return (
                      <div className="rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-md">
                        <p className="font-medium">
                          {formatValue(bin.minimum)} –{" "}
                          {formatValue(bin.maximum)}{" "}
                          {definition.unit}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {bin.count} readings
                        </p>
                      </div>
                    )
                  }}
                />

                <Bar
                  dataKey="count"
                  name="Readings"
                  fill={definition.color}
                  maxBarSize={55}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No readings available for this period.
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Values are grouped into up to 10 equally spaced
          intervals. Taller bars indicate more frequent
          readings. Period: {range}.
        </p>
      </CardContent>
    </Card>
  )
}
