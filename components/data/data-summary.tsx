
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type DataSummaryProps = {
  totalReadings: number
  recordedDates: number
  sensorMetrics: number
  loading?: boolean
}

export function DataSummary({
  totalReadings,
  recordedDates,
  sensorMetrics,
  loading = false,
}: DataSummaryProps) {
  const stats = [
    { label: "Total readings", value: totalReadings },
    { label: "Recorded dates", value: recordedDates },
    { label: "Sensor metrics", value: sensorMetrics },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="border-border bg-card shadow-sm"
        >
          <CardContent className="space-y-2">
            {loading ? (
              <>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-20" />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {stat.label}
                </p>

                <p className="text-3xl font-semibold tabular-nums">
                  {stat.value.toLocaleString()}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
