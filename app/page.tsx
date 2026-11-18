
"use client"

import { useEffect, useState } from "react"
import { Database, RefreshCw, Sprout } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { SensorCards } from "@/components/dashboard/sensor-cards"
import { SensorChart } from "@/components/dashboard/sensor-chart"
import { QuickAnalytics } from "@/components/dashboard/quick-analytics"
import { RecentImages } from "@/components/dashboard/recent-images"

import {
  formatDateTime,
  type MetricKey,
  type TimeRange,
} from "@/components/dashboard/metric-config"

import type { DashboardData } from "@/lib/dashboard-types"

type LoadStatus = "loading" | "loaded" | "error"

export default function HomePage() {
  const [data, setData] = useState<DashboardData>({
    readings: [],
    images: [],
  })

  const [status, setStatus] = useState<LoadStatus>("loading")
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastFetched, setLastFetched] = useState<string | null>(
    null
  )

  const [metric, setMetric] = useState<MetricKey>("temperature")
  const [range, setRange] = useState<TimeRange>("All")

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboard() {
      setStatus("loading")

      try {
        const response = await fetch("/api/dashboard", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(
            `Dashboard API returned ${response.status}`
          )
        }

        const result: DashboardData = await response.json()

        if (controller.signal.aborted) return

        setData(result)
        setLastFetched(new Date().toISOString())
        setStatus("loaded")
      } catch (error) {
        if (controller.signal.aborted) return

        console.error("Dashboard loading failed:", error)
        setStatus("error")
      }
    }

    loadDashboard()

    return () => controller.abort()
  }, [refreshKey])

  const loading = status === "loading"

  const latestReadingTime = data.readings.reduce(
    (latest, reading) => {
      const timestamp = new Date(
        reading.recordedAt
      ).getTime()

      return Number.isFinite(timestamp)
        ? Math.max(latest, timestamp)
        : latest
    },
    0
  )

  function refresh() {
    setRefreshKey((key) => key + 1)
  }

  return (
    <main className="min-w-0 bg-[#f5f7f5]">
      <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-8 sm:px-8 lg:px-10">
        {/* Dashboard heading */}
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>

            <h1 className="text-3xl font-semibold tracking-tight text-[#17251f] sm:text-4xl">
              Overview
            </h1>

            <p className="mt-2 text-sm text-[#718078]">
              Environmental and nutrient monitoring for
              hydroponic lettuce cultivation.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={refresh}
            disabled={loading}
            className="bg-white"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </Button>
        </section>

        {/* Connection information */}
        <Card className="border-[#dfe8e0] bg-white shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
                <Database size={19} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Data source
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {status === "loaded"
                    ? "Turso database query successful"
                    : status === "error"
                      ? "Unable to retrieve dashboard data"
                      : "Fetching data from Turso..."}
                </p>
              </div>
            </div>

            <Badge
              variant={
                status === "error"
                  ? "destructive"
                  : "secondary"
              }
            >
              {status === "loaded"
                ? `${data.readings.length} readings loaded`
                : status === "error"
                  ? "Connection error"
                  : "Loading"}
            </Badge>
          </CardContent>
        </Card>

        {/* Sensor values */}
        <SensorCards
          readings={data.readings}
          loading={loading}
        />

        {/* Recording and fetch timestamps */}
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-[#819087]">
          <span>
            Latest sensor record:{" "}
            <strong className="font-medium text-[#526159]">
              {status === "loaded" && latestReadingTime
                ? formatDateTime(latestReadingTime)
                : "—"}
            </strong>
          </span>

          <span>
            Last dashboard refresh:{" "}
            <strong className="font-medium text-[#526159]">
              {lastFetched
                ? formatDateTime(lastFetched)
                : "—"}
            </strong>
          </span>
        </div>

        {/* Error state */}
        {status === "error" && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-red-700">
                The dashboard could not load sensor data.
                Please check the API connection.
              </p>

              <Button variant="outline" onClick={refresh}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Historical chart and statistics */}
        {loading ? (
          <div className="space-y-5">
            <Skeleton className="h-[430px] w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
        ) : status === "loaded" ? (
          <section className="space-y-5">
            <SensorChart
              readings={data.readings}
              metric={metric}
              onMetricChange={setMetric}
              range={range}
              onRangeChange={setRange}
            />

            <QuickAnalytics
              readings={data.readings}
              metric={metric}
              range={range}
            />
          </section>
        ) : null}

        {/* Plant images */}
        <RecentImages
          images={data.images}
          loading={loading}
        />

        <footer className="border-t border-[#dfe8e0] pt-5 text-xs text-[#91a097]">
          AgroSense · Hydroponic research monitoring ·
          Read-only dashboard
        </footer>
      </div>
    </main>
  )
}
