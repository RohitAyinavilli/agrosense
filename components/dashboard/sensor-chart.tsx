
"use client"

import { useMemo } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
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
  TIME_RANGES,
  filterReadings,
  formatDateTime,
  formatValue,
  type MetricKey,
  type TimeRange,
} from "./metric-config"

type Props = {
  readings: SensorReading[]
  metric: MetricKey
  onMetricChange: (metric: MetricKey) => void
  range: TimeRange
  onRangeChange: (range: TimeRange) => void
}

export function SensorChart({
  readings,
  metric,
  onMetricChange,
  range,
  onRangeChange,
}: Props) {
  const filtered = useMemo(
    () => filterReadings(readings, metric, range),
    [readings, metric, range]
  )

  const chartData = useMemo(
    () =>
      filtered.map((reading) => ({
        timestamp: new Date(reading.recordedAt).getTime(),
        value: reading.value,
      })),
    [filtered]
  )

  const selectedMetric = METRICS.find(
    (item) => item.key === metric
  )!

  const unit = filtered[0]?.unit || selectedMetric.unit

  return (
    <Card className="border-[#dfe8e0] bg-white shadow-sm">
      <CardHeader className="gap-4">
        <div>
          <CardTitle>Sensor trends</CardTitle>
          <CardDescription className="mt-1">
            Historical sensor measurements over time
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={metric}
            onValueChange={(value) => {
              if (
                value !== null &&
                METRICS.some((item) => item.key === value)
              ) {
                onMetricChange(value as MetricKey)
              }
            }}
          >
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="Select sensor" />
            </SelectTrigger>

            <SelectContent>
              {METRICS.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-1">
            {TIME_RANGES.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={range === option ? "default" : "outline"}
                onClick={() => onRangeChange(option)}
                className={
                  range === option
                    ? "bg-emerald-700 text-white hover:bg-emerald-800"
                    : ""
                }
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="mb-4 text-xs text-muted-foreground">
          Time ranges are measured backward from the latest
          recorded sample, not the current time.
        </p>

        {chartData.length > 0 ? (
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 15,
                  left: 0,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  stroke="#e7eee8"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  minTickGap={40}
                  fontSize={11}
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
                  width={60}
                  fontSize={11}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) =>
                    formatValue(Number(value))
                  }
                />

                <Tooltip
                  labelFormatter={(label) =>
                    formatDateTime(Number(label))
                  }
                  formatter={(value) => [
                    `${formatValue(Number(value))} ${unit}`,
                    selectedMetric.label,
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={selectedMetric.color}
                  strokeWidth={2.5}
                  dot={chartData.length <= 30}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-80 items-center justify-center text-center text-sm text-muted-foreground">
            No readings available for this sensor and period.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
