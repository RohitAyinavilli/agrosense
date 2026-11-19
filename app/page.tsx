
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
import { SensorCorrelation } from "@/components/dashboard/sensor-correlation"
import { SensorDistribution } from "@/components/dashboard/sensor-distribution"
import { SensorAnomalies } from "@/components/dashboard/sensor-anomalies"


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


    // Check alerts whenever the Overview finishes loading.
    // Repeat every 3 hours while this page remains open.
    useEffect(() => {
      if (status !== "loaded") return

      async function checkNotifications() {
        try {
          const response = await fetch(
            "/api/notifications",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "check",
              }),
            }
          )

          if (!response.ok) {
            console.error(
              "Notification check failed:",
              response.status
            )
          }
        } catch (error) {
          console.error(
            "Could not check notifications:",
            error
          )
        }
      }

      checkNotifications()

      const interval = setInterval(
        checkNotifications,
        3 * 60 * 60 * 1000
      )

      return () => clearInterval(interval)
    }, [status, refreshKey])


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
    <main className="min-w-0 bg-background">
      <div className="mx-auto max-w-[1440px] space-y-7 px-5 py-8 sm:px-8 lg:px-10">
        {/* Dashboard heading */}
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>

            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Overview
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Environmental and nutrient monitoring for
              hydroponic lettuce cultivation.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={refresh}
            disabled={loading}
            className="bg-background"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </Button>
        </section>

        {/* Connection information */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100/70 p-3 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
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
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted-foreground">
          <span>
            Latest sensor record:{" "}
            <strong className="font-medium text-foreground">
              {status === "loaded" && latestReadingTime
                ? formatDateTime(latestReadingTime)
                : "—"}
            </strong>
          </span>

          <span>
            Last dashboard refresh:{" "}
            <strong className="font-medium text-foreground">
              {lastFetched
                ? formatDateTime(lastFetched)
                : "—"}
            </strong>
          </span>
        </div>

        {/* Error state */}
        {status === "error" && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-destructive">
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


        {/* Additional analytics */}
        {loading ? (
          <section className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-[470px] w-full rounded-xl" />
            <Skeleton className="h-[470px] w-full rounded-xl" />
          </section>
        ) : status === "loaded" ? (
          <section className="grid min-w-0 gap-5 lg:grid-cols-2">
            <SensorCorrelation
              readings={data.readings}
              range={range}
            />

            <SensorDistribution
              readings={data.readings}
              range={range}
            />
          </section>
        ) : null}



        {/* Sensor anomaly detection */}
        {loading ? (
          <Skeleton className="h-[550px] w-full rounded-xl" />
        ) : status === "loaded" ? (
          <SensorAnomalies
            readings={data.readings}
            range={range}
          />
        ) : null}



        {/* Plant images */}
        <RecentImages
          images={data.images}
          loading={loading}
        />

        <footer className="border-t border-border pt-5 text-xs text-muted-foreground">
          AgroSense · Hydroponic research monitoring ·
          Read-only dashboard
        </footer>
      </div>
    </main>
  )
}
