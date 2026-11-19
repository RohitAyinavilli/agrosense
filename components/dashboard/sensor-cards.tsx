
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import type { SensorReading } from "@/lib/dashboard-types"
import {
  METRICS,
  formatDateTime,
  formatValue,
} from "./metric-config"

type Props = {
  readings: SensorReading[]
  loading: boolean
}

export function SensorCards({ readings, loading }: Props) {
  const latest = new Map<string, SensorReading>()

  for (const reading of readings) {
    const timestamp = new Date(reading.recordedAt).getTime()
    if (!Number.isFinite(timestamp)) continue

    const previous = latest.get(reading.metric)

    if (
      !previous ||
      timestamp > new Date(previous.recordedAt).getTime()
    ) {
      latest.set(reading.metric, reading)
    }
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {METRICS.map((metric) => {
        const Icon = metric.icon
        const reading = latest.get(metric.key)

        return (
          <Card
            key={metric.key}
            className="gap-3 overflow-hidden border-border bg-card py-4 shadow-sm"
          >
            <div
              className="h-0.5"
              style={{ backgroundColor: metric.color }}
            />

            <CardHeader className="flex items-center justify-between px-4">
              <div
                className={`rounded-lg p-2.5 ${metric.iconClass}`}
              >
                <Icon size={19} />
              </div>

              <Badge variant="secondary">
                {loading
                  ? "Loading"
                  : reading
                    ? "Recorded"
                    : "No data"}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-2 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>

              {loading ? (
                <Skeleton className="h-10 w-28" />
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight tabular-nums">
                    {reading ? formatValue(reading.value) : "—"}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {reading?.unit || metric.unit}
                  </span>
                </div>
              )}

              <p className="min-h-8 text-xs leading-4 text-muted-foreground">
                {loading
                  ? "Fetching sensor data..."
                  : reading
                    ? formatDateTime(reading.recordedAt)
                    : "Awaiting readings"}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
